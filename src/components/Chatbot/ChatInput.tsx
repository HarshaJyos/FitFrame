'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

const QUICK_REPLIES = [
    { emoji: '👔', label: 'Suggest an outfit' },
    { emoji: '📏', label: 'My size' },
    { emoji: '🔥', label: 'Trending' },
    { emoji: '🎭', label: '3D Try-On help' },
    { emoji: '💰', label: 'Budget finds' },
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

    return (
        <div style={{
            padding: '10px 14px 14px',
            borderTop: '1px solid var(--border)',
            background: '#fff',
            flexShrink: 0,
        }}>
            {/* Quick replies */}
            <div style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 8,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}>
                {QUICK_REPLIES.map((qr) => (
                    <button
                        key={qr.label}
                        onClick={() => onSend(qr.label)}
                        disabled={disabled}
                        style={{
                            whiteSpace: 'nowrap',
                            padding: '5px 10px',
                            borderRadius: 99,
                            border: '1px solid var(--border)',
                            background: 'var(--bg)',
                            color: 'var(--text-2)',
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                            flexShrink: 0,
                            transition: 'border-color 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                    >
                        {qr.emoji} {qr.label}
                    </button>
                ))}
            </div>

            {/* Input bar */}
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about fashion..."
                    disabled={disabled}
                    autoComplete="off"
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: '0.85rem',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={disabled || !text.trim()}
                    aria-label="Send message"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: (disabled || !text.trim()) ? 'not-allowed' : 'pointer',
                        opacity: (disabled || !text.trim()) ? 0.5 : 1,
                        flexShrink: 0,
                    }}
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
