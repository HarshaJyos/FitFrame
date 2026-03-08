'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/chatEngine';
import ProductCard from './ProductCard';
import Link from 'next/link';

interface ChatMessagesProps {
    messages: ChatMessage[];
    isTyping: boolean;
}

function formatText(text: string): string {
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br/>');
    return html;
}

export default function ChatMessages({ messages, isTyping }: ChatMessagesProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    return (
        <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--bg)',
        }}>
            {messages.map((msg) => (
                <div key={msg.id} style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    animation: 'fadeIn 0.3s ease',
                }}>
                    {msg.role === 'bot' && (
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent-lt), #fff7ed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, flexShrink: 0,
                            border: '1px solid var(--border)',
                            marginTop: 2,
                        }}>
                            <span>✨</span>
                        </div>
                    )}
                    <div style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: 16,
                        fontSize: '0.85rem',
                        lineHeight: 1.55,
                        ...(msg.role === 'user'
                            ? {
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-dk))',
                                color: '#fff',
                                borderBottomRightRadius: 4,
                            }
                            : {
                                background: '#fff',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                borderBottomLeftRadius: 4,
                            }),
                    }}>
                        <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />

                        {/* Product cards */}
                        {msg.products && msg.products.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                                {msg.products.map((p) => (
                                    <ProductCard key={p.id} {...p} />
                                ))}
                            </div>
                        )}

                        {/* Action button */}
                        {msg.action && (
                            <Link
                                href={msg.action.url ?? '/login'}
                                style={{
                                    display: 'inline-block',
                                    marginTop: 10,
                                    padding: '7px 14px',
                                    background: 'var(--accent)',
                                    color: '#fff',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    borderRadius: 8,
                                    textDecoration: 'none',
                                }}
                            >
                                {msg.action.label}
                            </Link>
                        )}
                    </div>
                </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-lt), #fff7ed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, flexShrink: 0,
                        border: '1px solid var(--border)',
                    }}>
                        <span>✨</span>
                    </div>
                    <div style={{
                        padding: '12px 16px',
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        borderBottomLeftRadius: 4,
                        display: 'flex',
                        gap: 5,
                        alignItems: 'center',
                    }}>
                        {[0, 1, 2].map(i => (
                            <span key={i} style={{
                                width: 6, height: 6,
                                background: 'var(--text-3)',
                                borderRadius: '50%',
                                display: 'inline-block',
                                animation: `typingBounce 1.4s ease-in-out infinite ${i * 0.2}s`,
                            }} />
                        ))}
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
