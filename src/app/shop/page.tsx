'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { addToCart, toggleWishlist, getWishlist } from '@/lib/firestore';
import { getActiveSuits, Suit } from '@/lib/suits';

const CATEGORIES = ['All', 'Formal', 'Business', 'Casual'];

export default function ShopPage() {
    const { user } = useAuth();
    const [suits, setSuits] = useState<Suit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
    const [cartFeedback, setCartFeedback] = useState<Record<string, boolean>>({});
    const [category, setCategory] = useState('All');

    // Load suits from Firestore
    useEffect(() => {
        getActiveSuits()
            .then(setSuits)
            .catch(() => setError('Failed to load suits. Please try again.'))
            .finally(() => setLoading(false));
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

    const displayed = category === 'All' ? suits : suits.filter(s => s.category === category);

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
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setCategory(c)}
                            style={{ padding: '0.4rem 1rem', borderRadius: 99, fontSize: '0.82rem', fontWeight: 600, border: category === c ? 'none' : '1px solid var(--border)', cursor: 'pointer', background: category === c ? 'var(--accent)' : '#fff', color: category === c ? '#fff' : 'var(--text-2)', boxShadow: category === c ? '0 2px 8px rgba(234,88,12,0.25)' : 'none', transition: 'all 0.15s' }}>
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-6xl mx-auto px-5 py-8">
                {loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
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
                                        {/* Texture / swatch */}
                                        <div style={{ height: 200, background: `linear-gradient(160deg, ${suit.color}55, ${suit.color}cc)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 0.75rem 0.75rem', position: 'relative', overflow: 'hidden' }}>
                                            {suit.textureUrl ? (
                                                <img src={suit.textureUrl} alt={suit.name}
                                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }}
                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            ) : null}
                                            <span style={{ fontSize: '3.5rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-65%)', zIndex: 1 }}>🧥</span>

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
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{suit.category}</p>
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
