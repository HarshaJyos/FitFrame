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
    // Convert **bold** to <strong>
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert newlines to <br>
    html = html.replace(/\n/g, '<br/>');
    return html;
}

export default function ChatMessages({ messages, isTyping }: ChatMessagesProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    return (
        <div className="chatbot-messages">
            {messages.map((msg) => (
                <div key={msg.id} className={`chatbot-msg chatbot-msg-${msg.role}`}>
                    {msg.role === 'bot' && (
                        <div className="chatbot-avatar">
                            <span>✨</span>
                        </div>
                    )}
                    <div className={`chatbot-bubble-msg chatbot-bubble-${msg.role}`}>
                        <div
                            className="chatbot-text"
                            dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                        />

                        {/* Product cards */}
                        {msg.products && msg.products.length > 0 && (
                            <div className="chatbot-products-list">
                                {msg.products.map((p) => (
                                    <ProductCard key={p.id} {...p} />
                                ))}
                            </div>
                        )}

                        {/* Action button */}
                        {msg.action && (
                            <Link
                                href={msg.action.url ?? '/login'}
                                className="chatbot-action-btn"
                            >
                                {msg.action.label}
                            </Link>
                        )}
                    </div>
                </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
                <div className="chatbot-msg chatbot-msg-bot">
                    <div className="chatbot-avatar"><span>✨</span></div>
                    <div className="chatbot-bubble-msg chatbot-bubble-bot">
                        <div className="chatbot-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
