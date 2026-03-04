'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { getAllOrders, Order, ShipmentStatus } from '@/lib/firestore';

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string; bg: string }> = {
    placed: { label: 'Order Placed', color: '#6366f1', bg: '#ede9fe' },
    processing: { label: 'Processing', color: '#f59e0b', bg: '#fef3c7' },
    shipped: { label: 'Shipped', color: '#0ea5e9', bg: '#e0f2fe' },
    out_for_delivery: { label: 'Out for Delivery', color: '#ea580c', bg: '#fff7ed' },
    delivered: { label: 'Delivered', color: '#10b981', bg: '#d1fae5' },
};

type Filter = 'all' | ShipmentStatus;

function OrdersContent() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');

    const load = useCallback(async () => {
        const o = await getAllOrders();
        setOrders(o);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = filter === 'all' ? orders : orders.filter(o => o.shipmentStatus === filter);

    const counts: Record<string, number> = { all: orders.length };
    Object.keys(STATUS_CONFIG).forEach(k => {
        counts[k] = orders.filter(o => o.shipmentStatus === k).length;
    });

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>📦 All Orders</h1>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {(['all', ...Object.keys(STATUS_CONFIG)] as Filter[]).map(f => {
                    const cfg = f === 'all' ? { label: 'All', color: '#1e293b', bg: '#f1f5f9' } : STATUS_CONFIG[f as ShipmentStatus];
                    const active = filter === f;
                    return (
                        <button key={f} onClick={() => setFilter(f)}
                            style={{ padding: '0.4rem 0.85rem', borderRadius: 99, fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: active ? cfg.bg : '#fff', color: active ? cfg.color : '#94a3b8', boxShadow: active ? `0 0 0 1.5px ${cfg.color}40` : 'none', transition: 'all 0.15s' }}>
                            {cfg.label} ({counts[f] ?? 0})
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="loader" /></div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 8 }}>📭</div>
                    <p>No orders found</p>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                    <div className="overflow-x-auto">
                        <div style={{ minWidth: 800 }}>
                            {/* Table header */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1.5fr 1fr 0.5fr', gap: 0, background: '#f8fafc', padding: '0.75rem 1.25rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>
                                <span>Customer</span><span>Items</span><span>Amount</span><span>Status</span><span>Date</span><span></span>
                            </div>
                            {filtered.map(order => {
                                const statusCfg = STATUS_CONFIG[order.shipmentStatus ?? 'placed'];
                                const date = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN') : '—';
                                return (
                                    <div key={order.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1.5fr 1fr 0.5fr', gap: 0, padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9', alignItems: 'center', fontSize: '0.85rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{order.shippingAddress?.name ?? '—'}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{order.shippingAddress?.city ?? '—'}</div>
                                        </div>
                                        <div style={{ color: '#475569', fontSize: '0.8rem' }}>
                                            {order.items?.map(i => i.label).join(', ') ?? '—'}
                                        </div>
                                        <div style={{ fontWeight: 700, color: '#10b981' }}>₹{order.amount?.toLocaleString()}</div>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusCfg.color, background: statusCfg.bg, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                                                {statusCfg.label}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{date}</div>
                                        <div>
                                            <Link href={`/admin/orders/${order.id}?uid=${order.userId}`}
                                                style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                                                View →
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminOrdersPage() {
    return <AdminGuard><OrdersContent /></AdminGuard>;
}
