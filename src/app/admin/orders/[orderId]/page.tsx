'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { adminUpdateOrder, Order, ShipmentStatus } from '@/lib/firestore';

const STEPS: { status: ShipmentStatus; label: string; icon: string }[] = [
    { status: 'placed', label: 'Order Placed', icon: '🛒' },
    { status: 'processing', label: 'Processing', icon: '⚙️' },
    { status: 'shipped', label: 'Shipped', icon: '📫' },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
    { status: 'delivered', label: 'Delivered', icon: '✓' },
];

const STATUS_COLOR: Record<ShipmentStatus, string> = {
    placed: '#6366f1', processing: '#f59e0b', shipped: '#0ea5e9', out_for_delivery: '#ea580c', delivered: '#10b981',
};

function OrderDetailContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const orderId = params.orderId as string;
    const uid = searchParams.get('uid') ?? '';

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        shipmentStatus: 'placed' as ShipmentStatus,
        trackingNumber: '',
        estimatedDelivery: '',
        shipmentNote: '',
    });
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        if (!uid || !orderId) return;
        // Fetch via getAllOrders and filter (simpler than per-user fetch since we have userId)
        const { getAllOrders } = await import('@/lib/firestore');
        const all = await getAllOrders();
        const found = all.find(o => o.id === orderId);
        if (found) {
            setOrder(found);
            setForm({
                shipmentStatus: found.shipmentStatus ?? 'placed',
                trackingNumber: found.trackingNumber ?? '',
                estimatedDelivery: found.estimatedDelivery ?? '',
                shipmentNote: found.shipmentNote ?? '',
            });
        }
        setLoading(false);
    }, [orderId, uid]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!order || !uid || !orderId) return;
        setSaving(true);
        await adminUpdateOrder(uid, orderId, { ...form });
        setSaving(false);
        setSaved(true);
        setOrder(prev => prev ? { ...prev, ...form } : prev);
        setTimeout(() => setSaved(false), 2500);
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="loader" /></div>;
    }
    if (!order) {
        return <div style={{ padding: '2rem', color: '#94a3b8' }}>Order not found.</div>;
    }

    const currentStepIdx = STEPS.findIndex(s => s.status === order.shipmentStatus);

    return (
        <div style={{ padding: '2rem', maxWidth: 860 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
                <Link href="/admin/orders" style={{ color: '#94a3b8', fontSize: '0.9rem', textDecoration: 'none' }}>← Orders</Link>
                <span style={{ color: '#e2e8f0' }}>/</span>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>Order Detail</h1>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{orderId}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Customer + Address */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '1rem', fontSize: '0.95rem' }}>📍 Shipping Details</h3>
                    {order.shippingAddress ? (
                        <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.8 }}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{order.shippingAddress.name}</div>
                            <div>{order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}</div>
                            <div>{order.shippingAddress.city}, {order.shippingAddress.state} – {order.shippingAddress.pincode}</div>
                            <div style={{ color: '#64748b' }}>📱 {order.shippingAddress.phone}</div>
                        </div>
                    ) : <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No address on record</p>}

                    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.6rem', fontSize: '0.95rem' }}>🛍️ Items Ordered</h3>
                        {order.items?.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc', fontSize: '0.85rem' }}>
                                <span style={{ color: '#475569' }}>{item.label} <span style={{ color: '#94a3b8' }}>({item.shirtSize})</span></span>
                                <span style={{ fontWeight: 700, color: '#10b981' }}>₹{item.price?.toLocaleString()}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontWeight: 800, color: '#1e293b' }}>
                            <span>Total Paid</span>
                            <span style={{ color: '#10b981' }}>₹{order.amount?.toLocaleString()}</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        <div>Order ID: {order.razorpayOrderId}</div>
                        <div>Payment: {order.razorpayPaymentId}</div>
                    </div>
                </div>

                {/* Shipment Update */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '1rem', fontSize: '0.95rem' }}>🚚 Shipment Update</h3>

                    {/* Progress visualization */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 15, left: '10%', right: '10%', height: 2, background: '#e2e8f0', zIndex: 0 }} />
                        {STEPS.map((step, i) => {
                            const done = i <= currentStepIdx;
                            return (
                                <div key={step.status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: done ? STATUS_COLOR[order.shipmentStatus ?? 'placed'] : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: done ? '#fff' : '#94a3b8', fontWeight: 700, transition: 'all 0.2s', marginBottom: 4 }}>
                                        {done && i === currentStepIdx ? step.icon : done ? '✓' : i + 1}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: done ? '#1e293b' : '#94a3b8', textAlign: 'center', maxWidth: 56, lineHeight: 1.2 }}>{step.label}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: 5 }}>Shipment Status</label>
                            <select value={form.shipmentStatus} onChange={e => setForm(p => ({ ...p, shipmentStatus: e.target.value as ShipmentStatus }))}
                                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none' }}>
                                {STEPS.map(s => <option key={s.status} value={s.status}>{s.icon} {s.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: 5 }}>Tracking Number</label>
                            <input type="text" placeholder="e.g. FTF1234567890" value={form.trackingNumber}
                                onChange={e => setForm(p => ({ ...p, trackingNumber: e.target.value }))}
                                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: 5 }}>Estimated Delivery</label>
                            <input type="date" value={form.estimatedDelivery}
                                onChange={e => setForm(p => ({ ...p, estimatedDelivery: e.target.value }))}
                                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: 5 }}>Internal Note (optional)</label>
                            <textarea value={form.shipmentNote} onChange={e => setForm(p => ({ ...p, shipmentNote: e.target.value }))}
                                rows={2} placeholder="e.g. Handed to courier partner"
                                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                        </div>

                        <button onClick={handleSave} disabled={saving}
                            style={{ padding: '0.85rem', borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: '0.92rem', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Saving…' : saved ? '✓ Saved!' : '💾 Update Shipment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OrderDetailPage() {
    return <AdminGuard><OrderDetailContent /></AdminGuard>;
}
