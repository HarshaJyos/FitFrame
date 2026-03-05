'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { Review, getAllReviews, updateReviewStatus, deleteReview } from '@/lib/reviews';
import { Suit, getAllSuits } from '@/lib/suits';

function AdminReviewsContent() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [suitMap, setSuitMap] = useState<Record<string, Suit>>({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [revs, suits] = await Promise.all([
                    getAllReviews(),
                    getAllSuits()
                ]);
                const map: Record<string, Suit> = {};
                suits.forEach(s => { if (s.id) map[s.id] = s; });
                setSuitMap(map);
                setReviews(revs);
            } catch (err) {
                console.error("Failed to load reviews", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleToggleStatus = async (review: Review) => {
        if (!review.id) return;
        setActionLoading(review.id);
        const newStatus = !review.isApproved;
        try {
            await updateReviewStatus(review.id, newStatus);
            setReviews(p => p.map(r => r.id === review.id ? { ...r, isApproved: newStatus } : r));
        } catch (err) {
            console.error("Failed to update status", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to completely delete this review?")) return;
        setActionLoading(id);
        try {
            await deleteReview(id);
            setReviews(p => p.filter(r => r.id !== id));
        } catch (err) {
            console.error("Failed to delete review", err);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="loader" /></div>;
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>
                Reviews Management ({reviews.length})
            </h1>

            {reviews.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
                    <p style={{ color: '#64748b', fontWeight: 500 }}>No reviews yet.</p>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</th>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating</th>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comment</th>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviews.map(r => {
                                    const suit = suitMap[r.suitId];
                                    const dateStr = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : 'Just now';
                                    const isPending = actionLoading === r.id;

                                    return (
                                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {r.userPhoto ? (
                                                        <img src={r.userPhoto} alt={r.userName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                                                            {r.userName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{r.userName}</div>
                                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{r.userId.slice(0, 8)}…</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>
                                                {suit ? (
                                                    <Link href={`/admin/inventory/${suit.id}`} style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>
                                                        {suit.name}
                                                    </Link>
                                                ) : <span style={{ color: '#94a3b8' }}>Deleted Suit</span>}
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ display: 'flex', gap: 2 }}>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <span key={star} style={{ color: star <= r.rating ? '#fbbf24' : '#e2e8f0', fontSize: '1rem' }}>★</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', maxWidth: 250 }}>
                                                <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                    {r.comment || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No comment</span>}
                                                </p>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                                                {dateStr}
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                                    <button onClick={() => handleToggleStatus(r)} disabled={isPending}
                                                        style={{ padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: r.isApproved ? '#dcfce7' : '#fee2e2', color: r.isApproved ? '#166534' : '#991b1b' }}>
                                                        {r.isApproved ? 'Approved' : 'Hidden'}
                                                    </button>
                                                    <button onClick={() => r.id && handleDelete(r.id)} disabled={isPending}
                                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.6, padding: '0.25rem' }}>
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminReviewsPage() {
    return (
        <AdminGuard>
            <AdminReviewsContent />
        </AdminGuard>
    );
}
