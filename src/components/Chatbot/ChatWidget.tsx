'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { processMessage, type ChatMessage } from '@/lib/chatEngine';
import { getActiveSuits, type Suit } from '@/lib/suits';
import { getUserProfile, getWishlist, getOrders } from '@/lib/firestore';
import {
    saveGuestMessage, loadGuestMessages,
    saveChatMessage, loadChatMessages, migrateGuestToFirestore,
} from '@/lib/chatStore';
import { logChatIntent, migrateGuestAudits } from '@/lib/userAudit';

const WELCOME_MSG: ChatMessage = {
    id: 'welcome',
    role: 'bot',
    text: "Hey there! 👋 I'm your **TryOnME fashion stylist**. I can help you with:\n\n• 👔 Outfit suggestions\n• 📏 Size recommendations\n• 🔥 Trending styles\n• 🎭 3D virtual try-on guidance\n• 💰 Budget-friendly finds\n\nWhat would you like help with?",
    timestamp: Date.now(),
};

export default function ChatWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const suitsRef = useRef<Suit[]>([]);
    const suitsLoadedRef = useRef(false);

    useEffect(() => {
        if (!suitsLoadedRef.current) {
            getActiveSuits().then(s => {
                suitsRef.current = s;
                suitsLoadedRef.current = true;
            }).catch(console.error);
        }
    }, []);

    useEffect(() => {
        const loadHistory = async () => {
            if (user) {
                await migrateGuestToFirestore(user.uid).catch(console.error);
                await migrateGuestAudits(user.uid).catch(console.error);
                try {
                    const msgs = await loadChatMessages(user.uid);
                    setMessages(msgs.length > 0 ? msgs : [WELCOME_MSG]);
                } catch {
                    setMessages([WELCOME_MSG]);
                }
            } else {
                const msgs = loadGuestMessages();
                setMessages(msgs.length > 0 ? msgs : [WELCOME_MSG]);
            }
            setHasLoaded(true);
        };
        loadHistory();
    }, [user]);

    const sendMessage = useCallback(async (text: string) => {
        const userMsg: ChatMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            text,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMsg]);
        if (user) {
            saveChatMessage(user.uid, userMsg).catch(console.error);
        } else {
            saveGuestMessage(userMsg);
        }
        logChatIntent(user?.uid ?? null, 'chat', text);

        setIsTyping(true);
        try {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
            let userCtx: Parameters<typeof processMessage>[1] = { isLoggedIn: false };
            if (user) {
                try {
                    const [profile, wishlist, orders] = await Promise.all([
                        getUserProfile(user.uid),
                        getWishlist(user.uid).catch(() => []),
                        getOrders(user.uid).catch(() => []),
                    ]);
                    userCtx = {
                        isLoggedIn: true,
                        displayName: profile?.displayName ?? user.displayName ?? undefined,
                        gender: profile?.gender,
                        measurements: profile?.measurements ? {
                            height: profile.measurements.height,
                            weight: profile.measurements.weight,
                            chest: profile.measurements.chest,
                            waist: profile.measurements.waist,
                            hip: profile.measurements.hip,
                        } : undefined,
                        sizes: profile?.sizes,
                        recentOrders: orders.flatMap(o => o.items.map(i => i.suitId)),
                        wishlistIds: wishlist.map(w => w.suitId),
                    };
                } catch {
                    userCtx = { isLoggedIn: true, displayName: user.displayName ?? undefined };
                }
            }
            const response = processMessage(text.trim(), userCtx, suitsRef.current);
            const botMsg: ChatMessage = {
                id: `bot_${Date.now()}`,
                role: 'bot',
                text: response.text,
                products: response.products,
                action: response.action,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, botMsg]);
            if (user) {
                saveChatMessage(user.uid, botMsg).catch(console.error);
            } else {
                saveGuestMessage(botMsg);
            }
        } catch (err) {
            console.error('Chat error:', err);
            const errorMsg: ChatMessage = {
                id: `err_${Date.now()}`,
                role: 'bot',
                text: "Sorry, I'm having trouble right now. Please try again in a moment! 😅",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    }, [user]);

    if (!hasLoaded) return null;

    return (
        <>
            {/* Floating Bubble */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    aria-label="Open chat"
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 9998,
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent), var(--accent-dk))',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(234,88,12,0.35)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </button>
            )}

            {/* Chat Panel Overlay */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0,0,0,0.25)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'flex-end',
                        padding: 16,
                    }}
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: 400,
                            maxWidth: '100%',
                            height: 'min(680px, calc(100vh - 32px))',
                            background: '#fff',
                            borderRadius: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
                            animation: 'chatSlideUp 0.3s ease',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 18px',
                            background: 'linear-gradient(135deg, var(--accent), var(--accent-dk))',
                            color: '#fff',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18,
                                }}>✨</div>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>TryOnME Stylist</div>
                                    <div style={{ fontSize: '0.72rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                                        Online
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                aria-label="Close chat"
                                style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    border: 'none',
                                    borderRadius: 8,
                                    width: 32, height: 32,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Messages */}
                        <ChatMessages messages={messages} isTyping={isTyping} />

                        {/* Input */}
                        <ChatInput onSend={sendMessage} disabled={isTyping} />
                    </div>
                </div>
            )}

            {/* Mobile full-screen override via CSS media query */}
            <style>{`
                @media (max-width: 639px) {
                    [data-chatbot-overlay] { padding: 0 !important; }
                    [data-chatbot-panel] { width: 100% !important; height: 100% !important; border-radius: 0 !important; max-width: 100% !important; }
                }
            `}</style>
        </>
    );
}
