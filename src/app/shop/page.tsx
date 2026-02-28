'use client';

import Link from 'next/link';
import { SUIT_TEXTURES } from '@/utils/modelSelector';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { addToCart, toggleWishlist, getWishlist } from '@/lib/firestore';

export default function ShopPage() {
    const { user } = useAuth();
    const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());
    const [cartFeedback, setCartFeedback] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (!user) return;
        getWishlist(user.uid).then(items => {
            setWishlistedIds(new Set(items.map(i => i.suitId)));
        });
    }, [user]);

    const handleWishlist = useCallback(async (suit: typeof SUIT_TEXTURES[0], e: React.MouseEvent) => {
        e.preventDefault();
        if (!user) return;
        const added = await toggleWishlist(user.uid, { suitId: suit.id, label: suit.label, price: suit.price, color: suit.color });
        setWishlistedIds(prev => {
            const next = new Set(prev);
            if (added) next.add(suit.id); else next.delete(suit.id);
            return next;
        });
    }, [user]);

    const handleAddCart = useCallback(async (suit: typeof SUIT_TEXTURES[0], e: React.MouseEvent) => {
        e.preventDefault();
        if (!user) return;
        await addToCart(user.uid, { suitId: suit.id, label: suit.label, price: suit.price, originalPrice: suit.originalPrice, quantity: 1, textureFile: suit.file, color: suit.color });
        setCartFeedback(p => ({ ...p, [suit.id]: true }));
        setTimeout(() => setCartFeedback(p => ({ ...p, [suit.id]: false })), 1800);
    }, [user]);

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
                    <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>{SUIT_TEXTURES.length} styles · Try any on your 3D avatar</p>
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-6xl mx-auto px-5 py-10">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {SUIT_TEXTURES.map(suit => {
                        const disc = Math.round((1 - suit.price / suit.originalPrice) * 100);
                        const wishlisted = wishlistedIds.has(suit.id);
                        const cartAdded = cartFeedback[suit.id];
                        return (
                            <div key={suit.id} style={{ position: 'relative' }}>
                                <Link href={`/shop/${suit.id}`} className="product-card card overflow-hidden block">
                                    {/* Swatch */}
                                    <div style={{ height: 180, background: `linear-gradient(160deg, ${suit.color}88, ${suit.color})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 1rem 1rem', position: 'relative' }}>
                                        <span style={{ fontSize: '3rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-65%)' }}>🧥</span>
                                        <div className="flex gap-1.5 flex-wrap justify-center">
                                            {suit.badge && <span className="badge" style={{ fontSize: '10px' }}>{suit.badge}</span>}
                                            <span style={{ background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: 99 }}>{disc}% off</span>
                                        </div>
                                        {/* Wishlist button */}
                                        {user && (
                                            <button onClick={e => handleWishlist(suit, e)}
                                                style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, transition: 'all 0.15s' }}>
                                                {wishlisted ? '❤️' : '🤍'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div style={{ padding: '0.85rem' }}>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{suit.category}</p>
                                        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 6 }}>{suit.label}</p>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1rem' }}>₹{suit.price.toLocaleString()}</span>
                                            <span style={{ textDecoration: 'line-through', fontSize: '0.78rem', color: 'var(--text-3)' }}>₹{suit.originalPrice.toLocaleString()}</span>
                                        </div>

                                        <div className="flex gap-2">
                                            <div style={{ flex: 1, padding: '0.45rem 0', textAlign: 'center', background: 'var(--accent-lt)', color: 'var(--accent)', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>
                                                Try On →
                                            </div>
                                            {user && (
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
            </div>

            <footer style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
                <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>© 2025 FitFrame</p>
            </footer>
        </div>
    );
}
