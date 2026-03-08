import {
    collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditEventType = 'search' | 'product_view' | 'chat_intent' | 'page_view';

export interface AuditEvent {
    id?: string;
    type: AuditEventType;
    data: Record<string, string | number>;
    timestamp?: number;
    createdAt?: Timestamp;
}

// ── Guest Audit (localStorage) ────────────────────────────────────────────────

const GUEST_AUDIT_KEY = 'fitframe_audit';
const MAX_GUEST_EVENTS = 50;

interface GuestAuditData {
    events: AuditEvent[];
}

function saveGuestAudit(event: AuditEvent): void {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(GUEST_AUDIT_KEY);
    let data: GuestAuditData;
    try {
        data = raw ? JSON.parse(raw) : { events: [] };
    } catch {
        data = { events: [] };
    }
    data.events.push({ ...event, timestamp: Date.now() });
    if (data.events.length > MAX_GUEST_EVENTS) {
        data.events = data.events.slice(-MAX_GUEST_EVENTS);
    }
    localStorage.setItem(GUEST_AUDIT_KEY, JSON.stringify(data));
}

function loadGuestAudits(): AuditEvent[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(GUEST_AUDIT_KEY);
    if (!raw) return [];
    try {
        const data: GuestAuditData = JSON.parse(raw);
        return data.events;
    } catch {
        return [];
    }
}

// ── Firestore Audit ───────────────────────────────────────────────────────────

async function saveFirestoreAudit(uid: string, event: AuditEvent): Promise<void> {
    const col = collection(db, 'users', uid, 'audits');
    await addDoc(col, {
        ...event,
        createdAt: serverTimestamp(),
    });
}

// ── Public API ────────────────────────────────────────────────────────────────

export function logSearchEvent(userId: string | null, searchQuery: string): void {
    const event: AuditEvent = {
        type: 'search',
        data: { query: searchQuery },
    };
    if (userId) {
        saveFirestoreAudit(userId, event).catch(console.error);
    } else {
        saveGuestAudit(event);
    }
}

export function logProductView(userId: string | null, suitId: string, suitName: string): void {
    const event: AuditEvent = {
        type: 'product_view',
        data: { suitId, suitName },
    };
    if (userId) {
        saveFirestoreAudit(userId, event).catch(console.error);
    } else {
        saveGuestAudit(event);
    }
}

export function logChatIntent(userId: string | null, intent: string, message: string): void {
    const event: AuditEvent = {
        type: 'chat_intent',
        data: { intent, message: message.substring(0, 200) },
    };
    if (userId) {
        saveFirestoreAudit(userId, event).catch(console.error);
    } else {
        saveGuestAudit(event);
    }
}

export async function getRecentActivity(uid: string): Promise<AuditEvent[]> {
    const col = collection(db, 'users', uid, 'audits');
    const q = query(col, orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: (d.data().createdAt as Timestamp)?.toMillis?.() ?? 0,
    } as AuditEvent));
}

/**
 * Sync guest audit events to Firestore on sign-in.
 */
export async function migrateGuestAudits(uid: string): Promise<void> {
    const events = loadGuestAudits();
    if (events.length === 0) return;
    for (const event of events) {
        await saveFirestoreAudit(uid, event);
    }
    if (typeof window !== 'undefined') {
        localStorage.removeItem(GUEST_AUDIT_KEY);
    }
}

/** Admin: fetch all audit events across all users (collectionGroup query) */
export async function getAllAuditEvents(maxEvents: number = 200): Promise<(AuditEvent & { userId?: string })[]> {
    const { collectionGroup } = await import('firebase/firestore');
    // No orderBy to avoid needing a Firestore composite index — sort in memory
    const snap = await getDocs(collectionGroup(db, 'audits'));
    const results = snap.docs.map(d => {
        const pathParts = d.ref.path.split('/');
        const userId = pathParts.length >= 2 ? pathParts[1] : undefined;
        return {
            id: d.id,
            ...d.data(),
            userId,
            timestamp: (d.data().createdAt as Timestamp)?.toMillis?.() ?? 0,
        } as AuditEvent & { userId?: string };
    });
    // Sort by timestamp descending in memory
    results.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    return results.slice(0, maxEvents);
}
