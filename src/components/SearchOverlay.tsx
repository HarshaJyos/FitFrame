'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logSearchEvent } from '@/lib/userAudit';
import { getActiveSuits, Suit } from '@/lib/suits';

interface SearchResult {
    id: string;
    name: string;
    price: number;
    originalPrice: number;
    bannerUrl?: string;
    category: string;
    color: string;
}

export default function SearchOverlay({ onCloseAction }: { onCloseAction: () => void }) {
    const { user } = useAuth();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [allSuits, setAllSuits] = useState<Suit[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getActiveSuits().then(setAllSuits).catch(console.error);
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const timer = setTimeout(() => {
            setLoading(true);
            const lower = query.trim().toLowerCase();
            const words = lower.split(/\s+/);
            const matches = allSuits
                .filter(s => {
                    const searchable = `${s.name} ${s.category} ${s.fabric} ${(s.tags ?? []).join(' ')} ${s.description} ${s.color}`.toLowerCase();
                    return words.some(w => searchable.includes(w));
                })
                .slice(0, 8)
                .map(s => ({
                    id: s.id ?? '',
                    name: s.name,
                    price: s.price,
                    originalPrice: s.originalPrice,
                    bannerUrl: s.bannerUrl,
                    category: s.category,
                    color: s.color,
                }));
            setResults(matches);
            setLoading(false);
            logSearchEvent(user?.uid ?? null, query.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [query, allSuits, user]);

    const handleSelect = useCallback((id: string) => {
        router.push(`/shop/${id}`);
        onCloseAction();
    }, [router, onCloseAction]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9990,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                paddingTop: 80,
                animation: 'fadeIn 0.2s ease',
            }}
            onClick={onCloseAction}
            onKeyDown={e => { if (e.key === 'Escape') onCloseAction(); }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: 560,
                    maxWidth: 'calc(100% - 32px)',
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                    animation: 'chatSlideUp 0.25s ease',
                }}
            >
                {/* Search input */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--border)',
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') onCloseAction(); }}
                        placeholder="Search suits, fabrics, styles..."
                        autoComplete="off"
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.95rem',
                            color: 'var(--text)',
                            background: 'transparent',
                        }}
                    />
                    <button
                        onClick={onCloseAction}
                        style={{
                            background: 'none', border: 'none',
                            color: 'var(--text-3)', cursor: 'pointer',
                            padding: 4, borderRadius: 6,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Results */}
                {query.trim() && (
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                                <div className="loader" style={{ width: 24, height: 24 }} />
                            </div>
                        ) : results.length > 0 ? (
                            results.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => handleSelect(r.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        width: '100%',
                                        padding: '10px 18px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                                >
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 8,
                                        overflow: 'hidden', flexShrink: 0,
                                        border: '1px solid var(--border)',
                                    }}>
                                        {r.bannerUrl ? (
                                            <img src={r.bannerUrl} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: r.color || 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧥</div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{r.category} · ₹{r.price.toLocaleString('en-IN')}</span>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.88rem' }}>
                                No results for &ldquo;{query}&rdquo;
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
