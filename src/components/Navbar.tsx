'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getCart } from '@/lib/firestore';

export default function Navbar() {
    const { user, signOut, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [cartCount, setCartCount] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!user) { setCartCount(0); return; }
        getCart(user.uid).then(c => setCartCount(c.reduce((s, i) => s + i.quantity, 0)));
    }, [user, pathname]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <nav style={{ background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
            <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>F</div>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>FitFrame</span>
                </Link>

                {/* Desktop nav */}
                <div className="hidden sm:flex items-center gap-6">
                    <Link href="/shop" className="nav-link">Shop</Link>

                    {user && <Link href="/wishlist" className="nav-link">Wishlist</Link>}
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-3">
                    {/* Cart */}
                    {user && (
                        <Link href="/cart" style={{ position: 'relative', padding: '6px', borderRadius: 8, display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}>
                            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                            </svg>
                            {cartCount > 0 && (
                                <span style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {cartCount > 9 ? '9+' : cartCount}
                                </span>
                            )}
                        </Link>
                    )}

                    {loading ? (
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)' }} />
                    ) : user ? (
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setMenuOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 10, border: '1px solid var(--border)', background: 'none', cursor: 'pointer' }}>
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                        {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
                                    </div>
                                )}
                                <span style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 600, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user.displayName ?? user.email?.split('@')[0]}
                                </span>
                            </button>
                            {menuOpen && (
                                <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: 160, overflow: 'hidden', zIndex: 100 }}
                                    onMouseLeave={() => setMenuOpen(false)}>
                                    <Link href="/account" style={{ display: 'block', padding: '0.7rem 1rem', fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }} onClick={() => setMenuOpen(false)}>👤 My Account</Link>
                                    <Link href="/cart" style={{ display: 'block', padding: '0.7rem 1rem', fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }} onClick={() => setMenuOpen(false)}>🛒 Cart</Link>
                                    <Link href="/wishlist" style={{ display: 'block', padding: '0.7rem 1rem', fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }} onClick={() => setMenuOpen(false)}>❤️ Wishlist</Link>
                                    <div style={{ height: 1, background: 'var(--border)', margin: '0.25rem 0' }} />
                                    <button onClick={handleSignOut} style={{ width: '100%', textAlign: 'left', padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#dc2626', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
                                        🚪 Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link href="/login" className="btn-primary text-sm px-4 py-2">Sign In</Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
