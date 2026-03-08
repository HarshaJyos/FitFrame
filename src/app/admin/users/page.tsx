'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { getAllUsers, UserProfile, getAllOrders, Order } from '@/lib/firestore';
import { getRecentActivity, AuditEvent } from '@/lib/userAudit';

function UsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [userActivity, setUserActivity] = useState<AuditEvent[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        Promise.all([getAllUsers(), getAllOrders()])
            .then(([u, o]) => {
                setUsers(u.filter(u => u.email !== 'admin@admin.com'));
                setOrders(o);
            })
            .finally(() => setLoading(false));
    }, []);

    const getOrderCount = (uid: string) => orders.filter(o => o.userId === uid).length;
    const getOrderTotal = (uid: string) =>
        orders.filter(o => o.userId === uid && o.status === 'paid').reduce((s, o) => s + o.amount, 0);

    const handleSelectUser = async (u: UserProfile) => {
        setSelectedUser(u);
        setActivityLoading(true);
        try {
            const activity = await getRecentActivity(u.uid);
            setUserActivity(activity);
        } catch { setUserActivity([]); }
        setActivityLoading(false);
    };

    const filtered = users.filter(u => {
        if (!search) return true;
        const lower = search.toLowerCase();
        return (u.displayName?.toLowerCase().includes(lower) || u.email?.toLowerCase().includes(lower));
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="loader" />
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Users</h1>
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>{users.length} registered users</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Users', value: users.length, icon: '👥', color: '#6366f1', bg: '#ede9fe' },
                    { label: 'Male', value: users.filter(u => u.gender === 'male').length, icon: '👨', color: '#3b82f6', bg: '#dbeafe' },
                    { label: 'Female', value: users.filter(u => u.gender === 'female').length, icon: '👩', color: '#ec4899', bg: '#fce7f3' },
                    { label: 'With Measurements', value: users.filter(u => u.measurements).length, icon: '📏', color: '#10b981', bg: '#d1fae5' },
                ].map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '1rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users by name or email..."
                style={{ width: '100%', maxWidth: 400, padding: '0.6rem 1rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem', outline: 'none' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 380px' : '1fr', gap: '1.5rem' }}>
                {/* Users Table */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>User</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Gender</th>
                                <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Measurements</th>
                                <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Orders</th>
                                <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 700, color: '#475569' }}>Spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => {
                                const oc = getOrderCount(u.uid);
                                const total = getOrderTotal(u.uid);
                                const isSelected = selectedUser?.uid === u.uid;
                                return (
                                    <tr key={u.uid}
                                        onClick={() => handleSelectUser(u)}
                                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isSelected ? '#eff6ff' : 'transparent', transition: 'background 0.15s' }}>
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                                                    {(u.displayName?.[0] || u.email?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{u.displayName || 'No Name'}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.7rem 0.5rem' }}>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                                                background: u.gender === 'male' ? '#dbeafe' : u.gender === 'female' ? '#fce7f3' : '#f1f5f9',
                                                color: u.gender === 'male' ? '#2563eb' : u.gender === 'female' ? '#db2777' : '#94a3b8',
                                            }}>
                                                {u.gender || 'N/A'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '0.7rem 0.5rem' }}>
                                            {u.measurements ? '✅' : '❌'}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '0.7rem 0.5rem', fontWeight: 600, color: '#475569' }}>{oc}</td>
                                        <td style={{ textAlign: 'right', padding: '0.7rem 1rem', fontWeight: 700, color: total > 0 ? '#10b981' : '#94a3b8' }}>
                                            {total > 0 ? `₹${total.toLocaleString()}` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>No users found</div>
                    )}
                </div>

                {/* User Detail Panel */}
                {selectedUser && (
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '1.25rem', position: 'sticky', top: 20, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>User Profile</h3>
                            <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}>×</button>
                        </div>

                        {/* User Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                                {(selectedUser.displayName?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{selectedUser.displayName || 'No Name'}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedUser.email}</div>
                            </div>
                        </div>

                        {/* Measurements */}
                        {selectedUser.measurements ? (
                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Body Measurements</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                                    {[
                                        { l: 'Height', v: `${selectedUser.measurements.height}cm` },
                                        { l: 'Weight', v: `${selectedUser.measurements.weight}kg` },
                                        { l: 'Chest', v: `${selectedUser.measurements.chest}cm` },
                                        { l: 'Waist', v: `${selectedUser.measurements.waist}cm` },
                                        { l: 'Hip', v: `${selectedUser.measurements.hip}cm` },
                                        { l: 'Gender', v: selectedUser.gender || 'N/A' },
                                    ].map(m => (
                                        <div key={m.l} style={{ background: '#f8fafc', borderRadius: 6, padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{m.l}</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{m.v}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: '#fefce8', borderRadius: 8, padding: '0.6rem', marginBottom: '1rem', fontSize: '0.78rem', color: '#a16207' }}>
                                ⚠️ No measurements saved
                            </div>
                        )}

                        {/* Sizes */}
                        {selectedUser.sizes && (
                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Recommended Sizes</h4>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ background: '#ede9fe', color: '#6366f1', padding: '3px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600 }}>Shirt: {selectedUser.sizes.shirt}</span>
                                    <span style={{ background: '#ede9fe', color: '#6366f1', padding: '3px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600 }}>Pants: {selectedUser.sizes.pants}</span>
                                </div>
                            </div>
                        )}

                        {/* Order Summary */}
                        <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Orders</h4>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 8, padding: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>{getOrderCount(selectedUser.uid)}</div>
                                    <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>Orders</div>
                                </div>
                                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 8, padding: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>₹{getOrderTotal(selectedUser.uid).toLocaleString()}</div>
                                    <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>Total Spent</div>
                                </div>
                            </div>
                        </div>

                        {/* Activity */}
                        <div>
                            <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Recent Activity</h4>
                            {activityLoading ? (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>Loading...</div>
                            ) : userActivity.length === 0 ? (
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No activity recorded</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {userActivity.slice(0, 10).map((a, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.5rem', background: '#f8fafc', borderRadius: 6, fontSize: '0.75rem' }}>
                                            <span style={{ flexShrink: 0 }}>
                                                {a.type === 'search' ? '🔍' : a.type === 'product_view' ? '👁️' : a.type === 'chat_intent' ? '💬' : '📄'}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ fontWeight: 600, color: '#475569' }}>{a.type.replace('_', ' ')}</span>
                                                {a.data?.query && <span style={{ color: '#94a3b8' }}> — "{a.data.query}"</span>}
                                                {a.data?.suitName && <span style={{ color: '#94a3b8' }}> — {a.data.suitName}</span>}
                                                {a.data?.intent && <span style={{ color: '#94a3b8' }}> — {a.data.intent}</span>}
                                            </div>
                                            {a.timestamp && (
                                                <span style={{ fontSize: '0.65rem', color: '#cbd5e1', flexShrink: 0 }}>
                                                    {new Date(a.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
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

export default function AdminUsersPage() {
    return <AdminGuard><UsersPage /></AdminGuard>;
}
