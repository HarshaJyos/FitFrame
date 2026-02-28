'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, getOrders, Order, UserProfile } from '@/lib/firestore';

import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';

function AccountContent() {
    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        Promise.all([getUserProfile(user.uid), getOrders(user.uid)]).then(([p, o]) => {
            setProfile(p);
            setOrders(o);
            setLoading(false);
        });
    }, [user]);

    const modelNum = profile?.selectedModelNumber ?? 5;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <div className="max-w-4xl mx-auto px-5 py-8">
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: '2rem' }}>My Account</h1>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Profile card */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <div className="flex items-center gap-4">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', color: '#fff', fontWeight: 800 }}>
                                        {(user?.displayName ?? user?.email ?? 'U')[0].toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)', marginBottom: 2 }}>{user?.displayName ?? 'FitFrame User'}</h2>
                                    <p style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>{user?.email}</p>
                                </div>
                                <div style={{ flex: 1 }} />
                                <button onClick={signOut} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                                    Sign Out
                                </button>
                            </div>
                        </div>

                        {/* Measurements & Avatar */}
                        {profile?.measurements && (
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <div className="flex items-start justify-between mb-4">
                                    <h3 style={{ fontWeight: 700, color: 'var(--text)' }}>Your Body Profile</h3>
                                    <Link href="/onboarding" style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>Edit →</Link>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {[
                                        ['Height', `${profile.measurements.height} cm`],
                                        ['Weight', `${profile.measurements.weight} kg`],
                                        ['Chest', `${profile.measurements.chest} cm`],
                                        ['Waist', `${profile.measurements.waist} cm`],
                                        ['BMI', `${profile.bmi}`],
                                        ['Body Type', profile.measurements.bodyType],
                                    ].map(([label, val]) => (
                                        <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '0.75rem', border: '1px solid var(--border)' }}>
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 2 }}>{label}</p>
                                            <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem', textTransform: 'capitalize' }}>{val}</p>
                                        </div>
                                    ))}
                                </div>
                                {profile.sizes && (
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ flex: 1, background: 'var(--accent-lt)', borderRadius: 10, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(234,88,12,0.15)' }}>
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 2 }}>Shirt / Jacket</p>
                                            <p style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent)' }}>{profile.sizes.shirt}</p>
                                        </div>
                                        <div style={{ flex: 1, background: 'var(--accent-lt)', borderRadius: 10, padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(234,88,12,0.15)' }}>
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 2 }}>Trousers</p>
                                            <p style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent)' }}>{profile.sizes.pants}</p>
                                        </div>
                                        <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 10, padding: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 2 }}>3D Model</p>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>Model #{modelNum}</p>
                                        </div>
                                    </div>
                                )}
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                                    <Link href="/shop" className="btn-primary" style={{ flex: 1, padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem' }}>
                                        🛍️ Browse &amp; Try On Suits
                                    </Link>
                                    <Link href="/onboarding" style={{ flex: 1, padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem', borderRadius: 12, border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text)', fontWeight: 600, display: 'block' }}>
                                        📐 Update Measurements
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Order history */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>Order History</h3>
                            {orders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
                                    <p style={{ color: 'var(--text-2)' }}>No orders yet</p>
                                    <Link href="/shop" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem' }}>Browse suits →</Link>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {orders.map(order => (
                                        <div key={order.id} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                                            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 2 }}>Order ID: <code style={{ fontSize: '0.7rem' }}>{order.razorpayOrderId}</code></p>
                                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Payment: <code style={{ fontSize: '0.7rem' }}>{order.razorpayPaymentId}</code></p>
                                                </div>
                                                <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.72rem', padding: '3px 10px', borderRadius: 99 }}>
                                                    ✓ {order.status.toUpperCase()}
                                                </span>
                                            </div>
                                            {order.items.map((item, i) => (
                                                <div key={i} style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                                    <div>
                                                        <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.88rem' }}>{item.label}</p>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Size: {item.shirtSize} jacket · {item.pantsSize} trousers</p>
                                                    </div>
                                                    <p style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{item.price.toLocaleString()}</p>
                                                </div>
                                            ))}
                                            <div style={{ padding: '0.6rem 1rem', background: 'var(--accent-lt)', display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>Total Paid</span>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--accent)' }}>₹{order.amount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AccountPage() {
    return <AuthGuard><AccountContent /></AuthGuard>;
}
