'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { getAllOrders, getAllUsers, Order } from '@/lib/firestore';
import { getAllSuits, Suit } from '@/lib/suits';

function AdminDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [users, setUsers] = useState<number>(0);
    const [suits, setSuits] = useState<Suit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getAllOrders(), getAllUsers(), getAllSuits()])
            .then(([o, u, s]) => {
                setOrders(o);
                setUsers(u.filter(u => u.email !== 'admin@admin.com').length);
                setSuits(s);
            })
            .finally(() => setLoading(false));
    }, []);

    const totalRevenue = orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.amount, 0);
    const paidOrders = orders.filter(o => o.status === 'paid').length;
    const lowStockSuits = suits.filter(s => s.isActive && (s.stock ?? 0) < 10);
    const pendingShipment = orders.filter(o => o.shipmentStatus === 'placed' || o.shipmentStatus === 'processing').length;

    const stats = [
        { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: '💰', color: '#10b981', bg: '#d1fae5' },
        { label: 'Total Orders', value: paidOrders, icon: '📦', color: '#6366f1', bg: '#ede9fe' },
        { label: 'Registered Users', value: users, icon: '👥', color: '#f59e0b', bg: '#fef3c7' },
        { label: 'Pending Shipments', value: pendingShipment, icon: '🚚', color: '#ea580c', bg: '#fff7ed' },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="loader" />
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Dashboard</h1>
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Overview of your FitFrame store</p>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: '0.75rem' }}>{s.icon}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, marginBottom: 2 }}>{s.value}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Low Stock Alert */}
            {lowStockSuits.length > 0 && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 700, color: '#9a3412', fontSize: '0.9rem' }}>Low Stock Alert</div>
                        <div style={{ color: '#c2410c', fontSize: '0.82rem' }}>
                            {lowStockSuits.map(s => `${s.name} (${s.stock ?? 0} left)`).join(' · ')}
                        </div>
                    </div>
                    <Link href="/admin/inventory" style={{ marginLeft: 'auto', color: '#ea580c', fontSize: '0.82rem', fontWeight: 600 }}>Fix →</Link>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Recent Orders */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>Recent Orders</h2>
                        <Link href="/admin/orders" style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600 }}>View all →</Link>
                    </div>
                    {orders.slice(0, 6).map(order => (
                        <Link key={order.id} href={`/admin/orders/${order.id}?uid=${order.userId}`}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid #f1f5f9', textDecoration: 'none' }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                                    {order.shippingAddress?.name ?? 'Customer'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    {order.items?.[0]?.label ?? 'Order'} · {order.shipmentStatus?.replace(/_/g, ' ') ?? 'placed'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>₹{order.amount?.toLocaleString()}</div>
                            </div>
                        </Link>
                    ))}
                    {orders.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>No orders yet</p>}
                </div>

                {/* Inventory summary */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>Inventory ({suits.length} suits)</h2>
                        <Link href="/admin/inventory" style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600 }}>Manage →</Link>
                    </div>
                    {suits.slice(0, 8).map(suit => (
                        <div key={suit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: suit.color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>{suit.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: (suit.stock ?? 0) < 10 ? '#dc2626' : (suit.stock ?? 0) < 20 ? '#f59e0b' : '#10b981' }}>
                                    {suit.stock ?? 0} left
                                </span>
                                {!suit.isActive && <span style={{ fontSize: '0.68rem', background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 99 }}>OFF</span>}
                            </div>
                        </div>
                    ))}
                    {suits.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 8 }}>No suits added yet</p>
                            <Link href="/admin/inventory/new" style={{ fontSize: '0.82rem', color: '#6366f1', fontWeight: 600 }}>+ Add first suit →</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    return <AdminGuard><AdminDashboard /></AdminGuard>;
}
