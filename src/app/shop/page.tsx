'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { addToCart, toggleWishlist, getWishlist } from '@/lib/firestore';
import { getAllReviews } from '@/lib/reviews';
import { getActiveSuits, Suit } from '@/lib/suits';

const CATEGORIES = ['All', 'Formal', 'Business', 'Casual'];

export default function ShopPage() {
    const { user } = useAuth();
    const [suits, setSuits] = useState<Suit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
    const [cartFeedback, setCartFeedback] = useState<Record<string, boolean>>({});
    const [suitRatings, setSuitRatings] = useState<Record<string, { avg: number; count: number }>>({});

    // Filter States
    const [category, setCategory] = useState('All');
    const [showFilters, setShowFilters] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [minRating, setMinRating] = useState<number>(0);

    // Derived Filters
    const availableSizes = useMemo(() => Array.from(new Set(suits.flatMap(s => s.sizes || []))).sort(), [suits]);
    const availableColors = useMemo(() => Array.from(new Set(suits.map(s => s.color).filter(Boolean))), [suits]);
    const maxPrice = useMemo(() => suits.length > 0 ? Math.max(...suits.map(s => s.price)) : 50000, [suits]);

    useEffect(() => {
        if (suits.length > 0) setPriceRange([0, Math.max(...suits.map(s => s.price))]);
    }, [suits]);

    // Load suits
    useEffect(() => {
        getActiveSuits()
            .then(setSuits)
            .catch(() => setError('Failed to load suits. Please try again.'))
            .finally(() => setLoading(false));

        getAllReviews().then(reviews => {
            const approved = reviews.filter(r => r.isApproved);
            const ratingsMap: Record<string, { total: number; count: number }> = {};
            for (const r of approved) {
                if (!ratingsMap[r.suitId]) ratingsMap[r.suitId] = { total: 0, count: 0 };
                ratingsMap[r.suitId].total += r.rating;
                ratingsMap[r.suitId].count += 1;
            }
            const result: Record<string, { avg: number; count: number }> = {};
            for (const [id, data] of Object.entries(ratingsMap)) {
                result[id] = { avg: data.total / data.count, count: data.count };
            }
            setSuitRatings(result);
        }).catch(console.error);
    }, []);

    // Load wishlist
    useEffect(() => {
        if (!user) return;
        getWishlist(user.uid).then(items => {
            setWishlistedIds(new Set(items.map(i => i.suitId)));
        });
    }, [user]);

    const handleWishlist = useCallback(async (suit: Suit, e: React.MouseEvent) => {
        e.preventDefault();
        if (!user || !suit.id) return;
        const added = await toggleWishlist(user.uid, { suitId: suit.id, label: suit.name, price: suit.price, originalPrice: suit.originalPrice, textureUrl: suit.textureUrl, color: suit.color });
        setWishlistedIds(prev => {
            const next = new Set(prev);
            if (added) next.add(suit.id!); else next.delete(suit.id!);
            return next;
        });
    }, [user]);

    const handleAddCart = useCallback(async (suit: Suit, e: React.MouseEvent) => {
        e.preventDefault();
        if (!user || !suit.id) return;
        await addToCart(user.uid, {
            suitId: suit.id,
            label: suit.name,
            price: suit.price,
            originalPrice: suit.originalPrice,
            quantity: 1,
            textureUrl: suit.textureUrl,
            color: suit.color,
        });
        setCartFeedback(p => ({ ...p, [suit.id!]: true }));
        setTimeout(() => setCartFeedback(p => ({ ...p, [suit.id!]: false })), 1800);
    }, [user]);

    const renderStars = (rating: number, size: number = 14) => {
        return (
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                    const fill = Math.min(Math.max(rating - star + 1, 0), 1);
                    return (
                        <div key={star} style={{ position: 'relative', width: size, height: size }}>
                            <svg viewBox="0 0 24 24" fill="#e2e8f0" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
                                <svg viewBox="0 0 24 24" fill="#fbbf24" xmlns="http://www.w3.org/2000/svg" style={{ width: size, height: size }}>
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const displayed = useMemo(() => suits.filter(s => {
        if (category !== 'All' && s.category !== category) return false;
        if (s.price < priceRange[0] || s.price > priceRange[1]) return false;
        if (selectedSizes.length > 0 && !(s.sizes || []).some(size => selectedSizes.includes(size))) return false;
        if (selectedColors.length > 0 && !selectedColors.includes(s.color)) return false;
        if (minRating > 0) {
            const rating = suitRatings[s.id!]?.avg || 0;
            if (rating < minRating) return false;
        }
        return true;
    }), [suits, category, priceRange, selectedSizes, selectedColors, minRating, suitRatings]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #fff7ed, #fdf8f3)', padding: '2.5rem 1.25rem 2rem', borderBottom: '1px solid var(--border)' }}>
                <div className="max-w-6xl mx-auto">
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 4 }}>
                        <Link href="/" style={{ color: 'var(--text-3)' }}>Home</Link> / Men&apos;s Suits
                    </p>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Men&apos;s Suits</h1>
                    <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
                        {loading ? 'Loading…' : `${displayed.length} style${displayed.length !== 1 ? 's' : ''}`} · Try any on your 3D avatar
                    </p>
                </div>
            </div>

            {/* Category filter */}
            <div className="max-w-6xl mx-auto px-5 pt-6">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {CATEGORIES.map(c => (
                            <button key={c} onClick={() => setCategory(c)}
                                style={{ padding: '0.4rem 1rem', borderRadius: 99, fontSize: '0.82rem', fontWeight: 600, border: category === c ? 'none' : '1px solid var(--border)', cursor: 'pointer', background: category === c ? 'var(--accent)' : '#fff', color: category === c ? '#fff' : 'var(--text-2)', boxShadow: category === c ? '0 2px 8px rgba(234,88,12,0.25)' : 'none', transition: 'all 0.15s' }}>
                                {c}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setShowFilters(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.45rem 1rem', borderRadius: 8, background: '#fff', border: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                        Filters
                        {(selectedColors.length > 0 || selectedSizes.length > 0 || minRating > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                            <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.7rem', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Filter Modal */}
            {showFilters && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: 360, height: '100%', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease forwards' }} className="shadow-2xl">
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Filters</h2>
                            <button onClick={() => setShowFilters(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-2)' }}>&times;</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                            {/* Price */}
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '.75rem' }}>Price Range</h3>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input type="number" min={0} max={priceRange[1]} value={priceRange[0]} onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])} style={{ flex: 1, padding: '.5rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.85rem' }} />
                                    <span>-</span>
                                    <input type="number" min={priceRange[0]} max={maxPrice} value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])} style={{ flex: 1, padding: '.5rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.85rem' }} />
                                </div>
                            </div>

                            {/* Sizes */}
                            {availableSizes.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '.75rem' }}>Sizes</h3>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {availableSizes.map(s => (
                                            <button key={s} onClick={() => setSelectedSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 6, border: selectedSizes.includes(s) ? '1px solid var(--accent)' : '1px solid var(--border)', background: selectedSizes.includes(s) ? 'var(--accent-lt)' : '#fff', color: selectedSizes.includes(s) ? 'var(--accent)' : 'var(--text-2)' }}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Colors */}
                            {availableColors.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '.75rem' }}>Colors</h3>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        {availableColors.map(c => (
                                            <button key={c} onClick={() => setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                                                style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: selectedColors.includes(c) ? '2px solid var(--accent)' : '1px solid var(--border)', outline: selectedColors.includes(c) ? '2px solid var(--bg)' : 'none', outlineOffset: -2, cursor: 'pointer', transition: 'transform 0.1s', transform: selectedColors.includes(c) ? 'scale(1.1)' : 'scale(1)' }}
                                                aria-label={`Color ${c}`} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rating */}
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '.75rem' }}>Customer Ratings</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[4, 3, 2, 1].map(star => (
                                        <label key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: minRating === star ? 'var(--text)' : 'var(--text-2)' }}>
                                            <input type="radio" name="rating" checked={minRating === star} onChange={() => setMinRating(star)} style={{ accentColor: 'var(--accent)' }} />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {renderStars(star, 14)} &amp; Up
                                            </div>
                                        </label>
                                    ))}
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: minRating === 0 ? 'var(--text)' : 'var(--text-2)' }}>
                                        <input type="radio" name="rating" checked={minRating === 0} onChange={() => setMinRating(0)} style={{ accentColor: 'var(--accent)' }} />
                                        Any Rating
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                            <button onClick={() => {
                                setPriceRange([0, maxPrice]); setSelectedSizes([]); setSelectedColors([]); setMinRating(0);
                            }} style={{ flex: 1, padding: '0.8rem', borderRadius: 8, background: '#f1f5f9', color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem' }}>Clear All</button>
                            <button onClick={() => setShowFilters(false)} className="btn-primary" style={{ flex: 2, padding: '0.8rem', borderRadius: 8, fontSize: '0.9rem' }}>Show {displayed.length} results</button>
                        </div>
                    </div>
                </div>
            )}
            <style jsx global>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>

            {/* Grid */}
            <div className="max-w-6xl mx-auto px-5 py-8">
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} style={{ borderRadius: 14, overflow: 'hidden', background: '#fff', border: '1px solid var(--border)' }}>
                                <div style={{ height: 180, background: '#f1f5f9', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                <div style={{ padding: '0.85rem' }}>
                                    <div style={{ height: 12, background: '#f1f5f9', borderRadius: 4, marginBottom: 8 }} />
                                    <div style={{ height: 10, background: '#f1f5f9', borderRadius: 4, width: '60%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
                        <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>{error}</p>
                        <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>Retry</button>
                    </div>
                )}

                {!loading && !error && displayed.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧥</div>
                        <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No suits in this category yet</h2>
                        <p style={{ color: 'var(--text-2)' }}>Check back soon or browse another category.</p>
                    </div>
                )}

                {!loading && !error && displayed.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {displayed.map(suit => {
                            const disc = suit.originalPrice > suit.price
                                ? Math.round((1 - suit.price / suit.originalPrice) * 100)
                                : 0;
                            const wishlisted = wishlistedIds.has(suit.id!);
                            const cartAdded = cartFeedback[suit.id!];
                            const outOfStock = suit.stock <= 0;

                            return (
                                <div key={suit.id} style={{ position: 'relative', opacity: outOfStock ? 0.75 : 1 }}>
                                    <Link href={`/shop/${suit.id}`} className="product-card card overflow-hidden block">
                                        {/* Texture / swatch / banner */}
                                        <div style={{ height: 200, background: suit.bannerUrl ? '#fff' : `linear-gradient(160deg, ${suit.color}55, ${suit.color}cc)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 0.75rem 0.75rem', position: 'relative', overflow: 'hidden' }}>
                                            {suit.bannerUrl ? (
                                                <img src={suit.bannerUrl} alt={suit.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            ) : suit.textureUrl ? (
                                                <img src={suit.textureUrl} alt={suit.name}
                                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }}
                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            ) : null}
                                            {!suit.bannerUrl && <span style={{ fontSize: '3.5rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-65%)', zIndex: 1 }}>🧥</span>}

                                            <div className="flex gap-1.5 flex-wrap justify-center" style={{ zIndex: 2, position: 'relative' }}>
                                                {suit.badge && <span className="badge" style={{ fontSize: '10px' }}>{suit.badge}</span>}
                                                {disc > 0 && <span style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: 99 }}>{disc}% off</span>}
                                                {outOfStock && <span style={{ background: '#dc2626', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>Out of Stock</span>}
                                            </div>

                                            {user && !outOfStock && (
                                                <button onClick={e => handleWishlist(suit, e)}
                                                    style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, transition: 'all 0.15s', zIndex: 2 }}>
                                                    {wishlisted ? '❤️' : '🤍'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div style={{ padding: '0.85rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{suit.category}</p>
                                                {(suitRatings[suit.id!]?.count > 0) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                        {renderStars(suitRatings[suit.id!].avg, 10)}
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 600 }}>({suitRatings[suit.id!].count})</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 6 }}>{suit.name}</p>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1rem' }}>₹{suit.price.toLocaleString()}</span>
                                                {disc > 0 && <span style={{ textDecoration: 'line-through', fontSize: '0.78rem', color: 'var(--text-3)' }}>₹{suit.originalPrice.toLocaleString()}</span>}
                                            </div>

                                            <div className="flex gap-2">
                                                <div style={{ flex: 1, padding: '0.45rem 0', textAlign: 'center', background: 'var(--accent-lt)', color: 'var(--accent)', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>
                                                    Try On →
                                                </div>
                                                {user && !outOfStock && (
                                                    <button onClick={e => handleAddCart(suit, e)}
                                                        style={{ padding: '0.45rem 0.6rem', borderRadius: 8, background: cartAdded ? '#dcfce7' : 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: cartAdded ? '#15803d' : 'var(--text-2)', transition: 'all 0.2s' }}>
                                                        {cartAdded ? '✓' : '🛒'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <footer style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
                <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>© 2025 FitFrame</p>
            </footer>
        </div>
    );
}
