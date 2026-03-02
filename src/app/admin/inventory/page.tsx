'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { getAllSuits, Suit, softDeleteSuit, toggleSuitActive, updateSuitStock } from '@/lib/suits';

const CATEGORY_COLORS: Record<string, string> = {
    Formal: '#1e3a5f', Business: '#4a5568', Casual: '#2d4a35', Premium: '#4a2c1a',
};

function InventoryContent() {
    const [suits, setSuits] = useState<Suit[]>([]);
    const [loading, setLoading] = useState(true);
    const [editStock, setEditStock] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const load = useCallback(async () => {
        const list = await getAllSuits();
        setSuits(list);
        const stocks: Record<string, string> = {};
        list.forEach(s => { if (s.id) stocks[s.id] = String(s.stock); });
        setEditStock(stocks);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleStockSave = async (id: string) => {
        setSaving(id);
        const qty = Math.max(0, parseInt(editStock[id] ?? '0', 10));
        await updateSuitStock(id, isNaN(qty) ? 0 : qty);
        setSuits(prev => prev.map(s => s.id === id ? { ...s, stock: qty } : s));
        setSaving(null);
    };

    const handleToggleActive = async (suit: Suit) => {
        await toggleSuitActive(suit.id!, !suit.isActive);
        setSuits(prev => prev.map(s => s.id === suit.id ? { ...s, isActive: !s.isActive } : s));
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Permanently remove "${name}"? This hides it from the shop.`)) return;
        setDeleting(id);
        await softDeleteSuit(id);
        setSuits(prev => prev.filter(s => s.id !== id));
        setDeleting(null);
    };

    const filtered = suits
        .filter(s => filter === 'all' ? true : filter === 'active' ? s.isActive : !s.isActive)
        .filter(s => search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()));

    const totalStock = suits.reduce((a, s) => a + (s.stock ?? 0), 0);
    const lowStock = suits.filter(s => s.isActive && s.stock < 10).length;
    const activeCount = suits.filter(s => s.isActive).length;

    return (
        <div style={{ padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>🗃️ Suit Inventory</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 2 }}>{suits.length} suits · {activeCount} active · {totalStock} total stock</p>
                </div>
                <Link href="/admin/inventory/new"
                    style={{ padding: '0.65rem 1.25rem', borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                    + Add New Suit
                </Link>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Stock', value: totalStock, color: '#10b981', bg: '#d1fae5' },
                    { label: 'Active Listings', value: activeCount, color: '#6366f1', bg: '#ede9fe' },
                    { label: 'Low Stock (<10)', value: lowStock, color: lowStock > 0 ? '#dc2626' : '#94a3b8', bg: lowStock > 0 ? '#fef2f2' : '#f1f5f9' },
                ].map(c => (
                    <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: c.color }}>{c.value}</div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{c.label}</span>
                    </div>
                ))}
            </div>

            {/* Search + filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search suits…" value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 200, padding: '0.55rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none' }} />
                {(['all', 'active', 'inactive'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        style={{ padding: '0.5rem 0.9rem', borderRadius: 8, border: 'none', background: filter === f ? '#6366f1' : '#f1f5f9', color: filter === f ? '#fff' : '#64748b', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                        {f}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="loader" /></div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🧥</div>
                    <p style={{ fontWeight: 600 }}>No suits found</p>
                    <p style={{ fontSize: '0.85rem' }}>Add your first suit using the button above</p>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    {/* Table header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr 1fr 0.8fr', padding: '0.75rem 1.25rem', background: '#f8fafc', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>
                        <span>Suit</span><span>Price</span><span>Stock</span><span>Status</span><span>Actions</span><span></span>
                    </div>

                    {filtered.map((suit, idx) => {
                        const id = suit.id!;
                        const isSaving = saving === id;
                        const isDeleting = deleting === id;
                        const color = CATEGORY_COLORS[suit.category] ?? '#4a5568';

                        return (
                            <div key={id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr 1fr 0.8fr', padding: '0.9rem 1.25rem', borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', alignItems: 'center', opacity: isDeleting ? 0.4 : 1, transition: 'opacity 0.2s' }}>

                                {/* Suit name + color swatch */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', background: `linear-gradient(160deg, ${suit.color}66, ${suit.color})`, flexShrink: 0, position: 'relative' }}>
                                        {suit.textureUrl && <img src={suit.textureUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />}
                                        {!suit.textureUrl && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🧥</span>}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>{suit.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{suit.category} · {suit.sizes?.length || 0} Sizes</div>
                                    </div>
                                </div>

                                {/* Price */}
                                <div>
                                    <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>₹{suit.price.toLocaleString()}</div>
                                    {suit.originalPrice > suit.price && <div style={{ fontSize: '0.72rem', color: '#94a3b8', textDecoration: 'line-through' }}>₹{suit.originalPrice.toLocaleString()}</div>}
                                </div>

                                {/* Stock */}
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <input type="number" min={0} value={editStock[id] ?? suit.stock}
                                        onChange={e => setEditStock(p => ({ ...p, [id]: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handleStockSave(id)}
                                        style={{ width: 60, padding: '0.3rem 0.4rem', borderRadius: 6, border: `1px solid ${suit.stock < 10 ? '#fca5a5' : '#e2e8f0'}`, fontSize: '0.82rem', outline: 'none' }} />
                                    <button onClick={() => handleStockSave(id)} disabled={isSaving}
                                        style={{ padding: '0.3rem 0.5rem', borderRadius: 6, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                                        {isSaving ? '…' : '✓'}
                                    </button>
                                </div>

                                {/* Status badge */}
                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: suit.isActive ? '#15803d' : '#94a3b8', background: suit.isActive ? '#dcfce7' : '#f1f5f9', padding: '3px 10px', borderRadius: 99 }}>
                                        {suit.isActive ? '● Active' : '○ Inactive'}
                                    </span>
                                    {suit.stock < 10 && suit.isActive && (
                                        <div style={{ fontSize: '0.65rem', color: '#dc2626', marginTop: 2 }}>⚠ Low stock</div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    <Link href={`/admin/inventory/${id}`}
                                        style={{ padding: '0.35rem 0.7rem', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                                        Edit
                                    </Link>
                                    <button onClick={() => handleToggleActive(suit)}
                                        style={{ padding: '0.35rem 0.7rem', borderRadius: 7, border: `1px solid ${suit.isActive ? '#fca5a5' : '#bbf7d0'}`, background: suit.isActive ? '#fef2f2' : '#f0fdf4', color: suit.isActive ? '#dc2626' : '#15803d', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                        {suit.isActive ? 'Hide' : 'Show'}
                                    </button>
                                </div>

                                {/* Delete */}
                                <div>
                                    <button onClick={() => handleDelete(id, suit.name)} disabled={isDeleting}
                                        style={{ padding: '0.35rem 0.5rem', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}>
                                        🗑
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function AdminInventoryPage() {
    return <AdminGuard><InventoryContent /></AdminGuard>;
}
