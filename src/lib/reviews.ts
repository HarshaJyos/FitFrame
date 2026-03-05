import {
    doc, getDoc, setDoc, addDoc, updateDoc, getDocs, deleteDoc,
    collection, query, where, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface Review {
    id?: string;
    suitId: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    rating: number; // 1 to 5
    comment: string;
    isApproved: boolean; // For admin moderation (default true)
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

const COLLECTION_NAME = 'reviews';

/** Get approved reviews for a specific suit */
export async function getSuitReviews(suitId: string): Promise<Review[]> {
    const col = collection(db, COLLECTION_NAME);
    const q = query(
        col,
        where('suitId', '==', suitId)
    );
    const snap = await getDocs(q);
    const allReviews = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
    return allReviews
        .filter(r => r.isApproved)
        .sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() ?? 0;
            const timeB = b.createdAt?.toMillis?.() ?? 0;
            return timeB - timeA;
        });
}

/** Get all reviews (for Admin Dashboard) */
export async function getAllReviews(): Promise<Review[]> {
    const col = collection(db, COLLECTION_NAME);
    const snap = await getDocs(col);
    const allReviews = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
    return allReviews.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() ?? 0;
        const timeB = b.createdAt?.toMillis?.() ?? 0;
        return timeB - timeA;
    });
}

/** Add a new review */
export async function addReview(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'isApproved'>): Promise<string> {
    const col = collection(db, COLLECTION_NAME);
    const ref = await addDoc(col, {
        ...review,
        isApproved: true, // Auto-approve by default, admin can hide later
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

/** Toggle review visibility (Admin) */
export async function updateReviewStatus(id: string, isApproved: boolean): Promise<void> {
    const ref = doc(db, COLLECTION_NAME, id);
    await updateDoc(ref, {
        isApproved,
        updatedAt: serverTimestamp(),
    });
}

/** Delete a review (Admin) */
export async function deleteReview(id: string): Promise<void> {
    const ref = doc(db, COLLECTION_NAME, id);
    await deleteDoc(ref);
}
