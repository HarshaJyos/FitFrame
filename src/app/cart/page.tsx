'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCart, removeFromCart, updateCartQuantity, toggleWishlist, CartItem } from '@/lib/firestore';

import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import PaymentModal from '@/components/PaymentModal';

function CartContent() {
    const { user } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<CartItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [showPayment, setShowPayment] = useState(false);

    const loadCart = useCallback(async () => {
        if (!user) return;
        const cart = await getCart(user.uid);
        setItems(cart);
        // Auto-select all items by default on load
        setSelectedIds(new Set(cart.map(i => i.id).filter((id): id is string => !!id)));
        setLoading(false);
    }, [user]);

    useEffect(() => { loadCart(); }, [loadCart]);

    const handleQty = async (item: CartItem, delta: number) => {
        if (!user || !item.id) return;
        const newQty = item.quantity + delta;
        await updateCartQuantity(user.uid, item.id, newQty);
        setItems(prev => newQty <= 0 ? prev.filter(i => i.id !== item.id) : prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));

        // If reduced to 0, also remove from selected pool just in case
        if (newQty <= 0) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(item.id!);
                return next;
            });
        }
    };

    const handleRemove = async (item: CartItem) => {
        if (!user || !item.id) return;
        // Transfer to wishlist before removing
        await toggleWishlist(user.uid, {
            suitId: item.suitId,
            label: item.label,
            price: item.price,
            originalPrice: item.originalPrice,
            textureUrl: item.textureUrl,
            color: item.color
        });
        await removeFromCart(user.uid, item.id);
        setItems(prev => prev.filter(i => i.id !== item.id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(item.id!);
            return next;
        });
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id).filter((id): id is string => !!id)));
        }
    };

    const selectedItems = items.filter(i => i.id && selectedIds.has(i.id));
    const total = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const orderItems = selectedItems.map(i => ({
        suitId: i.suitId,
        label: i.label,
        price: i.price * i.quantity,
        shirtSize: 'M',
        pantsSize: '32"',
    }));

    const handleCheckoutSuccess = async () => {
        // Only remove the checked-out items from the UI
        setItems(prev => prev.filter(i => !i.id || !selectedIds.has(i.id)));
        setSelectedIds(new Set());
        setShowPayment(false);
        router.push('/account');
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <div className="max-w-3xl mx-auto px-5 py-8">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>Your Cart</h1>
                    {items.length > 0 && (
                        <button onClick={toggleAll} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            {selectedIds.size === items.length ? 'Deselect All' : 'Select All'}
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
                ) : items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
                        <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Your cart is empty</h2>
                        <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>Add some suits to get started</p>
                        <Link href="/shop" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Browse Suits →</Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {items.map(item => (
                            <div key={item.id} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: item.id && selectedIds.has(item.id) ? '2px solid var(--accent)' : '2px solid transparent' }}>
                                <input
                                    type="checkbox"
                                    checked={item.id ? selectedIds.has(item.id) : false}
                                    onChange={() => item.id && toggleSelection(item.id)}
                                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent)' }}
                                />
                                <div style={{ width: 60, height: 60, borderRadius: 10, background: `linear-gradient(160deg, ${item.color}88, ${item.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                                    {(item.bannerUrl || item.textureUrl) ? (
                                        <img src={item.bannerUrl || item.textureUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: item.bannerUrl ? 1 : 0.7 }} />
                                    ) : (
                                        <span>🧥</span>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{item.label}</p>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: 6 }}>₹{item.price.toLocaleString()} each</p>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleQty(item, -1)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>−</button>
                                        <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                                        <button onClick={() => handleQty(item, 1)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>+</button>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1rem' }}>₹{(item.price * item.quantity).toLocaleString()}</p>
                                    <button onClick={() => handleRemove(item)} style={{ marginTop: 6, fontSize: '0.78rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Remove to Wishlist</button>
                                </div>
                            </div>
                        ))}

                        <div className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                                    Total ({selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'})
                                </span>
                                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent)' }}>₹{total.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={() => setShowPayment(true)}
                                disabled={selectedIds.size === 0}
                                className={selectedIds.size === 0 ? "btn-secondary w-full" : "btn-primary w-full"}
                                style={{ width: '100%', padding: '1rem', fontSize: '1rem', textAlign: 'center', opacity: selectedIds.size === 0 ? 0.5 : 1 }}>
                                {selectedIds.size === 0 ? 'Select items to checkout' : '🛍️ Proceed to Pay →'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <PaymentModal
                isOpen={showPayment}
                onClose={() => setShowPayment(false)}
                onSuccess={handleCheckoutSuccess}
                items={orderItems}
                totalAmount={total}
                shirtSize="M"
                pantsSize={'32"'}
            />
        </div>
    );
}

export default function CartPage() {
    return <AuthGuard><CartContent /></AuthGuard>;
}
