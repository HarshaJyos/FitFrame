import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp,
    collection, addDoc, getDocs, deleteDoc, query, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ── Types ────────────────────────────────────────────────────────────────────

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
    selectedModel?: string;        // e.g. "/models/male_m05.gltf"
    selectedModelNumber?: number;  // e.g. 5
    sizes?: { shirt: string; pants: string; confidence: number };
    bmi?: number;
    suitId?: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface CartItem {
    id?: string;         // Firestore doc id
    suitId: number;
    label: string;
    price: number;
    originalPrice: number;
    quantity: number;
    textureFile: string;
    color: string;
    addedAt?: Timestamp;
}

export interface WishlistItem {
    id?: string;
    suitId: number;
    label: string;
    price: number;
    color: string;
    addedAt?: Timestamp;
}

export interface OrderItem {
    suitId: number;
    label: string;
    price: number;
    shirtSize: string;
    pantsSize: string;
}

export interface Order {
    id?: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    items: OrderItem[];
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    createdAt?: Timestamp;
}

// ── User Profile ─────────────────────────────────────────────────────────────

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

// ── Cart ─────────────────────────────────────────────────────────────────────

export async function getCart(uid: string): Promise<CartItem[]> {
    const col = collection(db, 'users', uid, 'cart');
    const snap = await getDocs(query(col, orderBy('addedAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CartItem));
}

export async function addToCart(uid: string, item: Omit<CartItem, 'id' | 'addedAt'>): Promise<void> {
    const col = collection(db, 'users', uid, 'cart');
    // Check if already in cart
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
        return false; // removed
    } else {
        await addDoc(col, { ...item, addedAt: serverTimestamp() });
        return true; // added
    }
}

export async function isWishlisted(uid: string, suitId: number): Promise<boolean> {
    const col = collection(db, 'users', uid, 'wishlist');
    const snap = await getDocs(col);
    return snap.docs.some(d => d.data().suitId === suitId);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function createOrder(uid: string, order: Omit<Order, 'id' | 'createdAt'>): Promise<string> {
    const col = collection(db, 'users', uid, 'orders');
    const ref = await addDoc(col, { ...order, createdAt: serverTimestamp() });
    return ref.id;
}

export async function getOrders(uid: string): Promise<Order[]> {
    const col = collection(db, 'users', uid, 'orders');
    const snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
}
