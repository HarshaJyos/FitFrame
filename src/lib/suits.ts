import {
    doc, getDoc, setDoc, addDoc, updateDoc, getDocs,
    collection, query, where, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ── Suit type (single source of truth for the catalog) ────────────────────────

export interface Suit {
    id?: string;                   // Firestore document ID
    name: string;
    description: string;
    price: number;                 // selling price (INR)
    originalPrice: number;         // strike-through price
    highlights: string[];          // short bullet points
    tags?: string[];               // keywords for recommendations
    fabric: string;
    category: string;
    gender: 'male' | 'female' | 'unisex';
    badge?: string;                // e.g. "Best Seller", "New", "Premium"
    color: string;                 // hex for UI swatch
    textureUrl: string;            // Cloudinary URL
    cloudinaryPublicId?: string;
    bannerUrl?: string;            // Cloudinary URL for product display photo
    cloudinaryBannerPublicId?: string;
    sizes: string[];               // available sizes (e.g., 'XS', '32"')
    stock: number;
    isActive: boolean;
    isDeleted: boolean;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getAllSuits(): Promise<Suit[]> {
    const col = collection(db, 'suits');
    const snap = await getDocs(query(col, where('isDeleted', '==', false), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Suit));
}

/** Active suits only (for shop page) */
export async function getActiveSuits(): Promise<Suit[]> {
    const col = collection(db, 'suits');
    // Fetch all non-deleted and filter active in memory to avoid composite Firestore index
    const snap = await getDocs(query(col, where('isDeleted', '==', false)));
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Suit))
        .filter(s => s.isActive)
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export async function getSuit(id: string): Promise<Suit | null> {
    const ref = doc(db, 'suits', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const suit = { id: snap.id, ...snap.data() } as Suit;
    if (suit.isDeleted) return null;
    return suit;
}

export async function createSuit(suit: Omit<Suit, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const col = collection(db, 'suits');
    const ref = await addDoc(col, {
        ...suit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateSuit(id: string, data: Partial<Suit>): Promise<void> {
    await setDoc(doc(db, 'suits', id), {
        ...data,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

export async function softDeleteSuit(id: string): Promise<void> {
    await updateDoc(doc(db, 'suits', id), {
        isDeleted: true,
        isActive: false,
        updatedAt: serverTimestamp(),
    });
}

export async function updateSuitStock(id: string, stock: number): Promise<void> {
    await updateDoc(doc(db, 'suits', id), {
        stock,
        updatedAt: serverTimestamp(),
    });
}

export async function toggleSuitActive(id: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(db, 'suits', id), {
        isActive,
        updatedAt: serverTimestamp(),
    });
}

/** Fetch suits matching at least one tag */
export async function getRelatedSuits(tags: string[], excludeId: string, limitCount: number = 4): Promise<Suit[]> {
    if (!tags || tags.length === 0) return [];
    // Firestore 'array-contains-any' allows max 10 elements
    const searchTags = tags.slice(0, 10);
    const col = collection(db, 'suits');
    const q = query(
        col,
        where('tags', 'array-contains-any', searchTags)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Suit))
        .filter(s => s.id !== excludeId && !s.isDeleted && s.isActive)
        .slice(0, limitCount);
}
