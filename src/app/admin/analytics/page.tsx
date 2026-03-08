'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { getAllUsers, UserProfile, getAllOrders, Order } from '@/lib/firestore';
import { getAllSuits, Suit } from '@/lib/suits';
import { getAllAuditEvents, AuditEvent } from '@/lib/userAudit';
import { getAllReviews } from '@/lib/reviews';

function AnalyticsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [suits, setSuits] = useState<Suit[]>([]);
    const [audits, setAudits] = useState<(AuditEvent & { userId?: string })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getAllOrders(), getAllUsers(), getAllSuits(), getAllAuditEvents(200)])
            .then(([o, u, s, a]) => {
                setOrders(o);
                setUsers(u.filter(u => u.email !== 'admin@admin.com'));
                setSuits(s);
                setAudits(a);
            })
            .finally(() => setLoading(false));
    }, []);

    // ── Revenue by day (last 30 days) ──
    const revenueByDay = useMemo(() => {
        const paid = orders.filter(o => o.status === 'paid');
        const dayMap: Record<string, number> = {};
        const now = Date.now();
        // Initialize last 14 days
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now - i * 86400000);
            const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            dayMap[key] = 0;
        }
        paid.forEach(o => {
            const ts = o.createdAt?.toMillis?.() ?? 0;
            if (ts === 0 || now - ts > 14 * 86400000) return;
            const key = new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            dayMap[key] = (dayMap[key] ?? 0) + o.amount;
        });
        return Object.entries(dayMap);
    }, [orders]);

    const maxRevenue = Math.max(...revenueByDay.map(([, v]) => v), 1);

    // ── Top products ──
    const topProducts = useMemo(() => {
        const countMap: Record<string, { count: number; revenue: number; name: string }> = {};
        orders.filter(o => o.status === 'paid').forEach(o => {
            o.items?.forEach(item => {
                if (!countMap[item.suitId]) countMap[item.suitId] = { count: 0, revenue: 0, name: item.label };
                countMap[item.suitId].count++;
                countMap[item.suitId].revenue += item.price;
            });
        });
        return Object.entries(countMap)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [orders]);

    // ── Gender distribution ──
    const genderStats = useMemo(() => ({
        male: users.filter(u => u.gender === 'male').length,
        female: users.filter(u => u.gender === 'female').length,
        unset: users.filter(u => !u.gender).length,
    }), [users]);
    const genderTotal = Math.max(genderStats.male + genderStats.female + genderStats.unset, 1);

    // ── Search trends ──
    const searchTrends = useMemo(() => {
        const queries = audits.filter(a => a.type === 'search').map(a => String(a.data?.query ?? '').toLowerCase());
        const countMap: Record<string, number> = {};
        queries.forEach(q => { if (q) countMap[q] = (countMap[q] ?? 0) + 1; });
        return Object.entries(countMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
    }, [audits]);

    // ── Chat intent distribution ──
    const chatIntents = useMemo(() => {
        const intents = audits.filter(a => a.type === 'chat_intent').map(a => String(a.data?.intent ?? ''));
        const countMap: Record<string, number> = {};
        intents.forEach(i => { if (i) countMap[i] = (countMap[i] ?? 0) + 1; });
        return Object.entries(countMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8);
    }, [audits]);
    const maxIntent = Math.max(...chatIntents.map(([, v]) => v), 1);

    // ── Recent activity feed ──
    const recentActivity = audits.slice(0, 30);

    // ── Summary stats ──
    const totalRevenue = orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.amount, 0);
    const avgOrderValue = orders.filter(o => o.status === 'paid').length > 0
        ? Math.round(totalRevenue / orders.filter(o => o.status === 'paid').length) : 0;

    const INTENT_COLORS: Record<string, string> = {
        greet: '#10b981', outfit_suggest: '#6366f1', size_recommend: '#f59e0b',
        budget_filter: '#ec4899', trending: '#ef4444', avatar_help: '#3b82f6',
        product_search: '#14b8a6', general_faq: '#8b5cf6', farewell: '#64748b', unknown: '#cbd5e1',
    };

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
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Analytics</h1>
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Insights into your store performance</p>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: '💰', color: '#10b981', bg: '#d1fae5' },
                    { label: 'Avg Order Value', value: `₹${avgOrderValue.toLocaleString()}`, icon: '📊', color: '#6366f1', bg: '#ede9fe' },
                    { label: 'Total Products', value: suits.filter(s => !s.isDeleted).length, icon: '🧥', color: '#f59e0b', bg: '#fef3c7' },
                    { label: 'Audit Events', value: audits.length, icon: '📋', color: '#ec4899', bg: '#fce7f3' },
                ].map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '1rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Revenue Chart */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                    <h2 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', marginBottom: '1rem' }}>Revenue (Last 14 Days)</h2>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
                        {revenueByDay.map(([day, amount]) => (
                            <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{
                                    width: '100%', borderRadius: '4px 4px 0 0',
                                    background: amount > 0 ? 'linear-gradient(180deg, #6366f1, #8b5cf6)' : '#f1f5f9',
                                    height: `${Math.max((amount / maxRevenue) * 120, 4)}px`,
                                    transition: 'height 0.3s ease',
                                }} />
                                <span style={{ fontSize: '0.55rem', color: '#94a3b8', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Products */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', marginBottom: '1rem' }}>Top Products</h2>
                    {topProducts.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No orders yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {topProducts.map((p, i) => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0', borderBottom: i < topProducts.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <span style={{ width: 20, fontSize: '0.75rem', fontWeight: 700, color: i < 3 ? '#6366f1' : '#94a3b8' }}>{i + 1}.</span>
                                    <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1' }}>{p.count} sold</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>₹{p.revenue.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Gender Distribution */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', marginBottom: '1rem' }}>Gender Distribution</h2>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: 100, height: 100, borderRadius: '50%', position: 'relative', background: `conic-gradient(#3b82f6 0% ${(genderStats.male / genderTotal) * 100}%, #ec4899 ${(genderStats.male / genderTotal) * 100}% ${((genderStats.male + genderStats.female) / genderTotal) * 100}%, #cbd5e1 ${((genderStats.male + genderStats.female) / genderTotal) * 100}% 100%)`, flexShrink: 0 }}>
                            <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', color: '#1e293b' }}>{users.length}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
                                <span style={{ color: '#475569' }}>Male: <strong>{genderStats.male}</strong> ({Math.round((genderStats.male / genderTotal) * 100)}%)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ec4899' }} />
                                <span style={{ color: '#475569' }}>Female: <strong>{genderStats.female}</strong> ({Math.round((genderStats.female / genderTotal) * 100)}%)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#cbd5e1' }} />
                                <span style={{ color: '#475569' }}>Not Set: <strong>{genderStats.unset}</strong> ({Math.round((genderStats.unset / genderTotal) * 100)}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Search Trends */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', marginBottom: '1rem' }}>🔍 Search Trends</h2>
                    {searchTrends.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No search data yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {searchTrends.map(([query, count], i) => (
                                <div key={query} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', width: 20 }}>{i + 1}.</span>
                                    <span style={{ flex: 1, fontSize: '0.82rem', color: '#475569' }}>"{query}"</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ede9fe', color: '#6366f1', padding: '2px 8px', borderRadius: 99 }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chat Intent Distribution */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', marginBottom: '1rem' }}>💬 Chat Intent Distribution</h2>
                    {chatIntents.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No chat data yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {chatIntents.map(([intent, count]) => (
                                <div key={intent}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>{intent.replace('_', ' ')}</span>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{count}</span>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', borderRadius: 99, background: INTENT_COLORS[intent] ?? '#94a3b8', width: `${(count / maxIntent) * 100}%`, transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity Feed */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', marginBottom: '1rem' }}>📋 Recent Activity Feed</h2>
                {recentActivity.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No activity recorded yet</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {recentActivity.map((a, i) => {
                            const userEmail = users.find(u => u.uid === a.userId)?.email ?? a.userId?.substring(0, 8) ?? '—';
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.65rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.78rem' }}>
                                    <span style={{ flexShrink: 0, fontSize: '0.9rem' }}>
                                        {a.type === 'search' ? '🔍' : a.type === 'product_view' ? '👁️' : a.type === 'chat_intent' ? '💬' : '📄'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ fontWeight: 600, color: '#475569' }}>{a.type.replace('_', ' ')}</span>
                                        {a.data?.query && <span style={{ color: '#94a3b8' }}> — "{a.data.query}"</span>}
                                        {a.data?.suitName && <span style={{ color: '#94a3b8' }}> — {a.data.suitName}</span>}
                                        {a.data?.intent && <span style={{ color: '#94a3b8' }}> — {a.data.intent}</span>}
                                    </div>
                                    <span style={{ fontSize: '0.65rem', color: '#cbd5e1', flexShrink: 0 }}>{userEmail}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AdminAnalyticsPage() {
    return <AdminGuard><AnalyticsPage /></AdminGuard>;
}
