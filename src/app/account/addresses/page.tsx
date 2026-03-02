'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getAddresses, addAddress, updateAddress, deleteAddress, Address } from '@/lib/firestore';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import AddressModal from '@/components/AddressModal';

function AddressesContent() {
    const { user } = useAuth();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editAddr, setEditAddr] = useState<Address | null>(null);

    const load = useCallback(async () => {
        if (!user) return;
        const list = await getAddresses(user.uid);
        setAddresses(list);
        setLoading(false);
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async (data: Omit<Address, 'id' | 'createdAt'>) => {
        if (!user) return;
        await addAddress(user.uid, data);
        await load();
    };

    const handleUpdate = async (data: Omit<Address, 'id' | 'createdAt'>) => {
        if (!user || !editAddr?.id) return;
        await updateAddress(user.uid, editAddr.id, data);
        setEditAddr(null);
        await load();
    };

    const handleDelete = async (id: string) => {
        if (!user || !confirm('Remove this address?')) return;
        await deleteAddress(user.uid, id);
        await load();
    };

    const handleSetDefault = async (addr: Address) => {
        if (!user || !addr.id) return;
        await updateAddress(user.uid, addr.id, { isDefault: true });
        await load();
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <div className="max-w-3xl mx-auto px-5 py-8">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 4 }}>
                            <Link href="/account" style={{ color: 'var(--text-3)' }}>My Account</Link> / Addresses
                        </p>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>📍 Saved Addresses</h1>
                    </div>
                    <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem' }}>
                        + Add New
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
                ) : addresses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📭</div>
                        <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No addresses saved</h2>
                        <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>Add a delivery address to speed up checkout</p>
                        <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>+ Add Address</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {addresses.map(addr => (
                            <div key={addr.id} className="card" style={{ padding: '1.25rem', position: 'relative' }}>
                                {addr.isDefault && (
                                    <span style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.7rem', background: 'var(--accent)', color: '#fff', padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>DEFAULT</span>
                                )}
                                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontSize: '0.95rem' }}>{addr.name}</div>
                                <div style={{ color: 'var(--text-2)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                                    {addr.city}, {addr.state} – {addr.pincode}
                                </div>
                                <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 4 }}>📱 {addr.phone}</div>
                                <div style={{ display: 'flex', gap: 8, marginTop: '0.85rem' }}>
                                    <button onClick={() => setEditAddr(addr)} style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                                    {!addr.isDefault && (
                                        <button onClick={() => handleSetDefault(addr)} style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Set Default</button>
                                    )}
                                    <button onClick={() => handleDelete(addr.id!)} style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer' }}>Remove</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AddressModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
            <AddressModal isOpen={!!editAddr} onClose={() => setEditAddr(null)} onSave={handleUpdate} initial={editAddr ?? undefined} />
        </div>
    );
}

export default function AddressesPage() {
    return <AuthGuard><AddressesContent /></AuthGuard>;
}
