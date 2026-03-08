import {
    doc, setDoc, getDocs, addDoc, collection,
    query, orderBy, serverTimestamp, Timestamp, limit
} from 'firebase/firestore';
import { db } from './firebase';
import type { ChatMessage } from './chatEngine';

// ── Constants ─────────────────────────────────────────────────────────────────

const GUEST_STORAGE_KEY = 'fitframe_chat';
const GUEST_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Guest (localStorage) ──────────────────────────────────────────────────────

interface GuestChatData {
    messages: ChatMessage[];
    createdAt: number;
}

export function saveGuestMessage(message: ChatMessage): void {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    let data: GuestChatData;

    if (raw) {
        try {
            data = JSON.parse(raw);
            // Check TTL
            if (Date.now() - data.createdAt > GUEST_TTL_MS) {
                data = { messages: [], createdAt: Date.now() };
            }
        } catch {
            data = { messages: [], createdAt: Date.now() };
        }
    } else {
        data = { messages: [], createdAt: Date.now() };
    }

    data.messages.push(message);
    // Keep last 100 messages max
    if (data.messages.length > 100) {
        data.messages = data.messages.slice(-100);
    }
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));
}

export function loadGuestMessages(): ChatMessage[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    try {
        const data: GuestChatData = JSON.parse(raw);
        if (Date.now() - data.createdAt > GUEST_TTL_MS) {
            localStorage.removeItem(GUEST_STORAGE_KEY);
            return [];
        }
        return data.messages;
    } catch {
        return [];
    }
}

export function clearGuestMessages(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(GUEST_STORAGE_KEY);
}

// ── Logged-in User (Firestore) ────────────────────────────────────────────────

export async function saveChatMessage(uid: string, message: ChatMessage): Promise<void> {
    const sessionsCol = collection(db, 'users', uid, 'chats');
    // Use a single "current" session doc
    const sessionRef = doc(sessionsCol, 'current');
    await setDoc(sessionRef, { updatedAt: serverTimestamp() }, { merge: true });

    // Strip undefined fields — Firestore rejects undefined values
    const clean: Record<string, unknown> = {
        id: message.id,
        role: message.role,
        text: message.text,
        timestamp: message.timestamp,
        createdAt: serverTimestamp(),
    };
    if (message.products && message.products.length > 0) {
        clean.products = message.products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            originalPrice: p.originalPrice,
            bannerUrl: p.bannerUrl ?? null,
            category: p.category,
            color: p.color,
        }));
    }
    if (message.action) {
        clean.action = {
            type: message.action.type,
            label: message.action.label,
            url: message.action.url ?? null,
        };
    }

    const messagesCol = collection(db, 'users', uid, 'chats', 'current', 'messages');
    await addDoc(messagesCol, clean);
}

export async function loadChatMessages(uid: string): Promise<ChatMessage[]> {
    const messagesCol = collection(db, 'users', uid, 'chats', 'current', 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: data.id || d.id,
            role: data.role,
            text: data.text,
            products: data.products,
            action: data.action,
            timestamp: data.timestamp || (data.createdAt as Timestamp)?.toMillis?.() || Date.now(),
        } as ChatMessage;
    });
}

/**
 * Migrate guest messages to Firestore on sign-in.
 */
export async function migrateGuestToFirestore(uid: string): Promise<void> {
    const guestMessages = loadGuestMessages();
    if (guestMessages.length === 0) return;

    for (const msg of guestMessages) {
        await saveChatMessage(uid, msg);
    }
    clearGuestMessages();
}
