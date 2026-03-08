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

    // Load catalog on mount
    useEffect(() => {
        getActiveSuits().then(setAllSuits).catch(console.error);
        inputRef.current?.focus();
    }, []);

    // Debounced client-side search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

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

            // Log search event
            logSearchEvent(user?.uid ?? null, query.trim());
        }, 300);

        return () => clearTimeout(timer);
    }, [query, allSuits, user]);

    const handleSelect = useCallback((id: string) => {
        router.push(`/shop/${id}`);
        onCloseAction();
    }, [router, onCloseAction]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onCloseAction();
    };

    return (
        <div className="search-overlay" onClick={onCloseAction} onKeyDown={handleKeyDown}>
            <div className="search-container" onClick={(e) => e.stopPropagation()}>
                {/* Search input */}
                <div className="search-input-wrap">
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search suits, fabrics, styles..."
                        className="search-text-input"
                        autoComplete="off"
                    />
                    <button className="search-close" onClick={onCloseAction}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Results */}
                {query.trim() && (
                    <div className="search-results">
                        {loading ? (
                            <div className="search-loading">
                                <div className="loader" style={{ width: 24, height: 24 }} />
                            </div>
                        ) : results.length > 0 ? (
                            results.map((r) => (
                                <button key={r.id} className="search-result-item" onClick={() => handleSelect(r.id)}>
                                    <div className="search-result-img">
                                        {r.bannerUrl ? (
                                            <img src={r.bannerUrl} alt={r.name} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: r.color || 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧥</div>
                                        )}
                                    </div>
                                    <div className="search-result-info">
                                        <span className="search-result-name">{r.name}</span>
                                        <span className="search-result-meta">{r.category} · ₹{r.price.toLocaleString('en-IN')}</span>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="search-no-results">
                                No results for &ldquo;{query}&rdquo;
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
