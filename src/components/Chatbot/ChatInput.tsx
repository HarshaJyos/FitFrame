'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

const QUICK_REPLIES = [
    '👔 Suggest an outfit',
    '📏 My size',
    '🔥 Trending',
    '🎭 3D Try-On help',
    '💰 Budget finds',
];

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setText('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleQuickReply = (reply: string) => {
        // Remove emoji prefix for cleaner queries
        const clean = reply.replace(/^[^\w]*\s*/, '');
        onSend(clean);
    };

    return (
        <div className="chatbot-input-area">
            {/* Quick replies */}
            <div className="chatbot-quick-replies">
                {QUICK_REPLIES.map((qr) => (
                    <button
                        key={qr}
                        className="chatbot-chip"
                        onClick={() => handleQuickReply(qr)}
                        disabled={disabled}
                    >
                        {qr}
                    </button>
                ))}
            </div>

            {/* Input bar */}
            <div className="chatbot-input-bar">
                <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about fashion..."
                    disabled={disabled}
                    className="chatbot-text-input"
                    autoComplete="off"
                />
                <button
                    onClick={handleSend}
                    disabled={disabled || !text.trim()}
                    className="chatbot-send-btn"
                    aria-label="Send message"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
