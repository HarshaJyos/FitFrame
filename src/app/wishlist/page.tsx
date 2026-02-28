'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getWishlist, toggleWishlist, addToCart, WishlistItem } from '@/lib/firestore';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';

function WishlistContent() {
    const { user } = useAuth();
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [cartFeedback, setCartFeedback] = useState<Record<number, boolean>>({});

    const loadWishlist = useCallback(async () => {
        if (!user) return;
        const wl = await getWishlist(user.uid);
        setItems(wl);
        setLoading(false);
    }, [user]);

    useEffect(() => { loadWishlist(); }, [loadWishlist]);

    const handleRemove = async (item: WishlistItem) => {
        if (!user) return;
        await toggleWishlist(user.uid, { suitId: item.suitId, label: item.label, price: item.price, color: item.color });
        setItems(prev => prev.filter(i => i.suitId !== item.suitId));
    };

    const handleAddCart = async (item: WishlistItem) => {
        if (!user) return;
        await addToCart(user.uid, { suitId: item.suitId, label: item.label, price: item.price, originalPrice: item.price, quantity: 1, textureFile: '', color: item.color });
        setCartFeedback(p => ({ ...p, [item.suitId]: true }));
        setTimeout(() => setCartFeedback(p => ({ ...p, [item.suitId]: false })), 2000);
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <div className="max-w-3xl mx-auto px-5 py-8">
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1.5rem' }}>❤️ Wishlist</h1>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
                ) : items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤍</div>
                        <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Nothing wishlisted yet</h2>
                        <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>Save suits you love by clicking the heart icon</p>
                        <Link href="/shop" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Browse Suits →</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {items.map(item => {
                            const cartAdded = cartFeedback[item.suitId];
                            return (
                                <div key={item.suitId} className="card overflow-hidden">
                                    <Link href={`/shop/${item.suitId}`}>
                                        <div style={{ height: 140, background: `linear-gradient(160deg, ${item.color}88, ${item.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🧥</div>
                                    </Link>
                                    <div style={{ padding: '1rem' }}>
                                        <Link href={`/shop/${item.suitId}`}>
                                            <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{item.label}</p>
                                            <p style={{ fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>₹{item.price.toLocaleString()}</p>
                                        </Link>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleAddCart(item)} style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border)', background: cartAdded ? '#dcfce7' : '#fff', color: cartAdded ? '#15803d' : 'var(--text)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                                {cartAdded ? '✓ Added' : '🛒 Add to Cart'}
                                            </button>
                                            <button onClick={() => handleRemove(item)} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem', cursor: 'pointer' }}>
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function WishlistPage() {
    return <AuthGuard><WishlistContent /></AuthGuard>;
}
