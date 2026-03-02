import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp,
    collection, addDoc, getDocs, deleteDoc, query, orderBy, Timestamp,
    collectionGroup, where
} from 'firebase/firestore';
import { db } from './firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    measurements?: {
        height: number; weight: number;
        chest: number; waist: number; hip: number;
        bodyType: string;
    };
    selectedModel?: string;
    selectedModelNumber?: number;
    sizes?: { shirt: string; pants: string; confidence: number };
    bmi?: number;
    suitId?: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface Address {
    id?: string;
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    isDefault?: boolean;
    createdAt?: Timestamp;
}

export interface CartItem {
    id?: string;         // Firestore doc id
    suitId: string;      // Firestore suit document ID
    label: string;
    price: number;
    originalPrice: number;
    quantity: number;
    textureUrl: string;  // Cloudinary URL
    color: string;
    addedAt?: Timestamp;
}

export interface WishlistItem {
    id?: string;
    suitId: string;      // Firestore suit document ID
    label: string;
    price: number;
    originalPrice: number;
    textureUrl: string;
    color: string;
    addedAt?: Timestamp;
}

export interface OrderItem {
    suitId: string;      // Firestore suit document ID
    label: string;
    price: number;
    shirtSize: string;
    pantsSize: string;
}

export type ShipmentStatus = 'placed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered';

export interface Order {
    id?: string;
    userId?: string;         // for admin queries
    razorpayOrderId: string;
    razorpayPaymentId: string;
    items: OrderItem[];
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    shippingAddress?: Address;
    shipmentStatus?: ShipmentStatus;
    trackingNumber?: string;
    estimatedDelivery?: string;
    shipmentNote?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// ── User Profile ──────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
    const ref = doc(db, 'users', profile.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            ...profile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export async function getAddresses(uid: string): Promise<Address[]> {
    const col = collection(db, 'users', uid, 'addresses');
    const snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Address));
}

export async function addAddress(uid: string, address: Omit<Address, 'id' | 'createdAt'>): Promise<string> {
    const col = collection(db, 'users', uid, 'addresses');
    // Clear isDefault from others if this one is default
    if (address.isDefault) {
        const snap = await getDocs(col);
        await Promise.all(snap.docs.map(d => updateDoc(d.ref, { isDefault: false })));
    }
    const ref = await addDoc(col, { ...address, createdAt: serverTimestamp() });
    return ref.id;
}

export async function updateAddress(uid: string, addressId: string, data: Partial<Address>): Promise<void> {
    const col = collection(db, 'users', uid, 'addresses');
    if (data.isDefault) {
        const snap = await getDocs(col);
        await Promise.all(snap.docs.map(d => updateDoc(d.ref, { isDefault: false })));
    }
    await updateDoc(doc(db, 'users', uid, 'addresses', addressId), { ...data });
}

export async function deleteAddress(uid: string, addressId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid, 'addresses', addressId));
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export async function getCart(uid: string): Promise<CartItem[]> {
    const col = collection(db, 'users', uid, 'cart');
    const snap = await getDocs(query(col, orderBy('addedAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CartItem));
}

export async function addToCart(uid: string, item: Omit<CartItem, 'id' | 'addedAt'>): Promise<void> {
    const col = collection(db, 'users', uid, 'cart');
    const snap = await getDocs(col);
    const existing = snap.docs.find(d => d.data().suitId === item.suitId);
    if (existing) {
        const currentQty = existing.data().quantity ?? 1;
        await updateDoc(existing.ref, { quantity: currentQty + 1 });
    } else {
        await addDoc(col, { ...item, addedAt: serverTimestamp() });
    }
}

export async function removeFromCart(uid: string, itemId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid, 'cart', itemId));
}

export async function updateCartQuantity(uid: string, itemId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
        await removeFromCart(uid, itemId);
    } else {
        await updateDoc(doc(db, 'users', uid, 'cart', itemId), { quantity });
    }
}

export async function clearCart(uid: string): Promise<void> {
    const snap = await getDocs(collection(db, 'users', uid, 'cart'));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

// ── Wishlist ──────────────────────────────────────────────────────────────────

export async function getWishlist(uid: string): Promise<WishlistItem[]> {
    const col = collection(db, 'users', uid, 'wishlist');
    const snap = await getDocs(query(col, orderBy('addedAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as WishlistItem));
}

export async function toggleWishlist(uid: string, item: Omit<WishlistItem, 'id' | 'addedAt'>): Promise<boolean> {
    const col = collection(db, 'users', uid, 'wishlist');
    const snap = await getDocs(col);
    const existing = snap.docs.find(d => d.data().suitId === item.suitId);
    if (existing) {
        await deleteDoc(existing.ref);
        return false;
    } else {
        await addDoc(col, { ...item, addedAt: serverTimestamp() });
        return true;
    }
}

export async function isWishlisted(uid: string, suitId: number): Promise<boolean> {
    const col = collection(db, 'users', uid, 'wishlist');
    const snap = await getDocs(col);
    return snap.docs.some(d => d.data().suitId === suitId);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function createOrder(uid: string, order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const col = collection(db, 'users', uid, 'orders');
    const ref = await addDoc(col, {
        ...order,
        userId: uid,
        shipmentStatus: 'placed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function getOrders(uid: string): Promise<Order[]> {
    const col = collection(db, 'users', uid, 'orders');
    const snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
}

export async function getOrder(uid: string, orderId: string): Promise<Order | null> {
    const ref = doc(db, 'users', uid, 'orders', orderId);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Order) : null;
}

export async function updateOrderShipment(uid: string, orderId: string, data: {
    shipmentStatus?: ShipmentStatus;
    trackingNumber?: string;
    estimatedDelivery?: string;
    shipmentNote?: string;
}): Promise<void> {
    await updateDoc(doc(db, 'users', uid, 'orders', orderId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// ── Admin: All Orders (requires Firestore collectionGroup index) ───────────────

export async function getAllOrders(): Promise<Order[]> {
    const snap = await getDocs(collectionGroup(db, 'orders'));
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    // Sort in memory — avoids needing a Firestore collectionGroup index
    return orders.sort((a, b) => {
        const aMs = a.createdAt?.toMillis?.() ?? 0;
        const bMs = b.createdAt?.toMillis?.() ?? 0;
        return bMs - aMs;
    });
}

export async function adminUpdateOrder(uid: string, orderId: string, data: Partial<Order>): Promise<void> {
    await setDoc(doc(db, 'users', uid, 'orders', orderId), {
        ...data,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

// ── Admin: Users ───────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => d.data() as UserProfile);
}
