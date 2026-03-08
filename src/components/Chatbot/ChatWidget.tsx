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
import { logChatIntent } from '@/lib/userAudit';
import { migrateGuestAudits } from '@/lib/userAudit';

const WELCOME_MSG: ChatMessage = {
    id: 'welcome',
    role: 'bot',
    text: "Hey there! 👋 I'm your **FitFrame fashion stylist**. I can help you with:\n\n• 👔 Outfit suggestions\n• 📏 Size recommendations\n• 🔥 Trending styles\n• 🎭 3D virtual try-on guidance\n• 💰 Budget-friendly finds\n\nWhat would you like help with?",
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

    // Load suits catalog once
    useEffect(() => {
        if (!suitsLoadedRef.current) {
            getActiveSuits().then(s => {
                suitsRef.current = s;
                suitsLoadedRef.current = true;
            }).catch(console.error);
        }
    }, []);

    // Load chat history on mount / auth change
    useEffect(() => {
        const loadHistory = async () => {
            if (user) {
                // Migrate guest data on login
                await migrateGuestToFirestore(user.uid).catch(console.error);
                await migrateGuestAudits(user.uid).catch(console.error);
                // Load from Firestore
                try {
                    const msgs = await loadChatMessages(user.uid);
                    setMessages(msgs.length > 0 ? msgs : [WELCOME_MSG]);
                } catch {
                    setMessages([WELCOME_MSG]);
                }
            } else {
                // Load from localStorage
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

        // Persist user message
        if (user) {
            saveChatMessage(user.uid, userMsg).catch(console.error);
        } else {
            saveGuestMessage(userMsg);
        }

        // Log chat intent
        logChatIntent(user?.uid ?? null, 'chat', text);

        // Process message client-side
        setIsTyping(true);
        try {
            // Small delay for natural feel
            await new Promise(r => setTimeout(r, 400 + Math.random() * 400));

            // Build user context
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

            // Persist bot message
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
                    className="chatbot-bubble"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open chat"
                >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="chatbot-bubble-pulse" />
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div className="chatbot-overlay" onClick={() => setIsOpen(false)}>
                    <div className="chatbot-panel" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="chatbot-header">
                            <div className="chatbot-header-left">
                                <div className="chatbot-header-icon">✨</div>
                                <div>
                                    <h3 className="chatbot-header-title">FitFrame Stylist</h3>
                                    <span className="chatbot-header-status">
                                        <span className="chatbot-status-dot" />
                                        Online
                                    </span>
                                </div>
                            </div>
                            <button
                                className="chatbot-close-btn"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close chat"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
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
        </>
    );
}
