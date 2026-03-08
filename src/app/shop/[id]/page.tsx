'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MODEL_BASE, recommendSize } from '@/utils/modelSelector';
import { calculateSMPLBlendshapes } from '@/utils/smplCalculator';
import type { AvatarViewer3DHandle } from '@/components/AvatarViewer3D';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, addToCart, toggleWishlist } from '@/lib/firestore';
import { getSuit, Suit, getRelatedSuits } from '@/lib/suits';
import { Review, getSuitReviews, addReview } from '@/lib/reviews';
import PaymentModal from '@/components/PaymentModal';
import Navbar from '@/components/Navbar';

const AvatarViewer3D = dynamic(() => import('@/components/AvatarViewer3D'), {
    ssr: false,
    loading: () => (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f0eb' }}>
            <div className="loader" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-3)' }}>Loading 3D viewer…</p>
        </div>
    ),
});

interface StoredUser {
    gender: 'male' | 'female';
    measurements: { age?: number; height: number; weight: number; chest: number; waist: number; hip: number; bodyType?: string };
    selectedModel: string;
    sizes: { shirt: string; pants: string; confidence: number };
    bmi: number;
}

export default function ProductPage() {
    const params = useParams();
    const router = useRouter();
    const suitId = params.id as string;
    const { user } = useAuth();

    const [suit, setSuit] = useState<Suit | null>(null);
    const [suitLoading, setSuitLoading] = useState(true);
    const [suitError, setSuitError] = useState('');

    const [reviews, setReviews] = useState<Review[]>([]);
    const [relatedSuits, setRelatedSuits] = useState<Suit[]>([]);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(5);
    const [submittingReview, setSubmittingReview] = useState(false);

    const [userData, setUserData] = useState<StoredUser | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loadPct, setLoadPct] = useState(0);
    const [showPayment, setShowPayment] = useState(false);
    const [cartAdded, setCartAdded] = useState(false);
    const [cartLoading, setCartLoading] = useState(false);
    const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
    const [cartFeedback, setCartFeedback] = useState<Record<string, boolean>>({});
    const [relatedRatings, setRelatedRatings] = useState<Record<string, number>>({});
    const viewerRef = useRef<AvatarViewer3DHandle | null>(null);
    const [isGenderMismatch, setIsGenderMismatch] = useState(false);
    const [tempMeasurements, setTempMeasurements] = useState<StoredUser | null>(null);
    const [showTempModal, setShowTempModal] = useState(false);

    // Load suit and related data from Firestore
    useEffect(() => {
        if (!suitId) return;

        const loadData = async () => {
            try {
                const data = await getSuit(suitId);
                if (!data) {
                    setSuitError('This suit is no longer available.');
                    return;
                }
                setSuit(data);

                const revs = await getSuitReviews(suitId);
                setReviews(revs);

                // Gender-aware related products
                const userGender = userData?.gender;
                if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
                    const related = await getRelatedSuits(data.tags, data.id!, 4, userGender);
                    setRelatedSuits(related);
                }
            } catch (err) {
                console.error("Error loading suit data:", err);
                setSuitError('Failed to load suit. Please try again.');
            } finally {
                setSuitLoading(false);
            }
        };

        loadData();
    }, [suitId, userData?.gender]);

    // Load user data: Firestore first, then localStorage fallback
    useEffect(() => {
        const loadUser = async () => {
            if (user) {
                try {
                    const profile = await getUserProfile(user.uid);
                    if (profile?.measurements && profile?.selectedModel) {
                        setUserData({
                            gender: profile.gender || 'male',
                            measurements: profile.measurements as any,
                            selectedModel: profile.selectedModel,
                            sizes: profile.sizes ?? recommendSize(profile.measurements),
                            bmi: profile.bmi ?? 22,
                        });
                        return;
                    }
                } catch { /* fall through */ }
            }
            // localStorage fallback
            try {
                const raw = localStorage.getItem('fitframe_user');
                if (raw) setUserData(JSON.parse(raw));
            } catch { /* ignore */ }
        };
        loadUser();

        // Load temp cross-gender measurements from localStorage
        try {
            const tempRaw = localStorage.getItem('fitframe_temp_measurements');
            if (tempRaw) setTempMeasurements(JSON.parse(tempRaw));
        } catch { /* ignore */ }
    }, [user]);

    // Detect gender mismatch between user and suit
    useEffect(() => {
        if (suit && userData && suit.gender !== 'unisex' && userData.gender !== suit.gender) {
            setIsGenderMismatch(true);
        } else {
            setIsGenderMismatch(false);
        }
    }, [suit, userData]);

    // Check wishlist
    useEffect(() => {
        if (!user) return;
        import('@/lib/firestore').then(({ getWishlist }) =>
            getWishlist(user.uid).then(items => {
                setWishlistedIds(new Set(items.map(i => i.suitId)));
            })
        );
    }, [user]);

    const wishlisted = suit ? wishlistedIds.has(suit.id!) : false;

    const handleWishlist = useCallback(async () => {
        if (!user) { router.push('/login'); return; }
        if (!suit?.id) return;
        const added = await toggleWishlist(user.uid, { suitId: suit.id, label: suit.name, price: suit.price, color: suit.color, originalPrice: suit.originalPrice, textureUrl: suit.textureUrl, bannerUrl: suit.bannerUrl });
        setWishlistedIds(prev => {
            const next = new Set(prev);
            if (added) next.add(suit.id!); else next.delete(suit.id!);
            return next;
        });
    }, [user, suit, router]);

    const handleRelatedWishlist = useCallback(async (relatedSuit: Suit, e: React.MouseEvent) => {
        e.preventDefault();
        if (!user || !relatedSuit.id) return;
        const added = await toggleWishlist(user.uid, { suitId: relatedSuit.id, label: relatedSuit.name, price: relatedSuit.price, originalPrice: relatedSuit.originalPrice, textureUrl: relatedSuit.textureUrl, color: relatedSuit.color });
        setWishlistedIds(prev => {
            const next = new Set(prev);
            if (added) next.add(relatedSuit.id!); else next.delete(relatedSuit.id!);
            return next;
        });
    }, [user]);

    const handleRelatedAddCart = useCallback(async (relatedSuit: Suit, e: React.MouseEvent) => {
        e.preventDefault();
        if (!user || !relatedSuit.id) return;
        await addToCart(user.uid, {
            suitId: relatedSuit.id,
            label: relatedSuit.name,
            price: relatedSuit.price,
            originalPrice: relatedSuit.originalPrice,
            quantity: 1,
            textureUrl: relatedSuit.textureUrl,
            color: relatedSuit.color,
        });
        setCartFeedback(p => ({ ...p, [relatedSuit.id!]: true }));
        setTimeout(() => setCartFeedback(p => ({ ...p, [relatedSuit.id!]: false })), 1800);
    }, [user]);

    // Fetch related ratings
    useEffect(() => {
        if (relatedSuits.length === 0) return;
        relatedSuits.forEach(async s => {
            if (s.id) {
                const r = await getSuitReviews(s.id);
                if (r.length > 0) {
                    const avg = r.reduce((acc, curr) => acc + curr.rating, 0) / r.length;
                    setRelatedRatings(p => ({ ...p, [s.id!]: avg }));
                }
            }
        });
    }, [relatedSuits]);

    const handleAddCart = useCallback(async () => {
        if (!user) { router.push('/login'); return; }
        if (!suit?.id) return;
        setCartLoading(true);
        await addToCart(user.uid, {
            suitId: suit.id,
            label: suit.name,
            price: suit.price,
            originalPrice: suit.originalPrice,
            quantity: 1,
            textureUrl: suit.textureUrl,
            bannerUrl: suit.bannerUrl,
            color: suit.color,
        });
        setCartLoading(false);
        setCartAdded(true);
        setTimeout(() => setCartAdded(false), 2000);
    }, [user, suit, router]);

    const handleBuyNow = () => {
        if (!user) { router.push('/login'); return; }
        setShowPayment(true);
    };

    // Compute model path
    const modelPath = userData?.selectedModel
        ? userData.selectedModel
        : `${MODEL_BASE}/male.gltf`;

    const blendshapes = userData ? calculateSMPLBlendshapes(userData.measurements as any, userData.gender) : undefined;

    const sizes = userData?.sizes
        ?? (userData?.measurements ? recommendSize(userData.measurements) : { shirt: 'M', pants: '32"', confidence: 70 });

    const disc = suit && suit.originalPrice > suit.price
        ? Math.round((1 - suit.price / suit.originalPrice) * 100) : 0;

    const renderStars = (rating: number, size: number = 14) => {
        return (
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                    const fill = Math.min(Math.max(rating - star + 1, 0), 1);
                    return (
                        <div key={star} style={{ position: 'relative', width: size, height: size }}>
                            <svg viewBox="0 0 24 24" fill="#e2e8f0" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
                                <svg viewBox="0 0 24 24" fill="#fbbf24" xmlns="http://www.w3.org/2000/svg" style={{ width: size, height: size }}>
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const avgRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        return reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;
    }, [reviews]);

    const handleSubmitReview = async () => {
        if (!user || !suit?.id || !reviewText.trim()) return;
        setSubmittingReview(true);
        try {
            await addReview({
                suitId: suit.id,
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'User',
                rating: reviewRating,
                comment: reviewText.trim(),
            });
            setReviewText('');
            setReviewRating(5);
            const updated = await getSuitReviews(suit.id);
            setReviews(updated);
        } catch (err) {
            console.error('Failed to post review', err);
        } finally {
            setSubmittingReview(false);
        }
    };

    // ── Loading / Error states ──────────────────────────────────────────────────

    if (suitLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
                <Navbar />
                <div className="max-w-[1100px] mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[0, 1].map(i => <div key={i} style={{ background: '#f1f5f9', borderRadius: 16, height: 480, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
                </div>
            </div>
        );
    }

    if (suitError || !suit) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
                <Navbar />
                <div style={{ textAlign: 'center', padding: '6rem 1.25rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧥</div>
                    <h1 style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.75rem' }}>
                        {suitError || 'Suit not found'}
                    </h1>
                    <Link href="/shop" className="btn-primary" style={{ padding: '0.75rem 2rem', display: 'inline-block' }}>
                        Browse All Suits
                    </Link>
                </div>
            </div>
        );
    }

    // Out of stock
    const outOfStock = suit.stock <= 0;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />

            {/* Breadcrumb */}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem 1.25rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    <Link href="/" style={{ color: 'var(--text-3)' }}>Home</Link> /{' '}
                    <Link href="/shop" style={{ color: 'var(--text-3)' }}>Suits</Link> /{' '}
                    <span style={{ color: 'var(--text-2)' }}>{suit.name}</span>
                </p>
            </div>

            <div className="max-w-[1100px] mx-auto px-5 pb-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                {/* ── Left: 3D viewer ─────────────────────────────────── */}
                <div>
                    <div style={{ height: 480, borderRadius: 20, overflow: 'hidden', background: '#f5f0eb', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                        {userData && !modelLoaded && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 10 }}>
                                <div style={{ width: 200, height: 6, borderRadius: 99, background: '#e2d9cf', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: 99, background: 'var(--accent)', width: `${loadPct}%`, transition: 'width 0.3s ease' }} />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                                    {loadPct < 100 ? `Loading model… ${loadPct}%` : 'Rendering…'}
                                </p>
                            </div>
                        )}
                        {userData ? (
                            <AvatarViewer3D
                                viewerRef={viewerRef}
                                modelPath={modelPath}
                                texturePath={suit.textureUrl}
                                blendshapes={blendshapes}
                                onLoaded={() => setModelLoaded(true)}
                                onProgress={setLoadPct}
                            />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                <span style={{ fontSize: '4rem' }}>🧥</span>
                                <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', textAlign: 'center', maxWidth: 220 }}>
                                    Complete your body profile to see this suit on your 3D avatar
                                </p>
                                <Link href="/onboarding" className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.88rem' }}>
                                    Set up profile →
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Texture preview */}
                    {suit.textureUrl && (
                        <div style={{ marginTop: '0.75rem', borderRadius: 12, overflow: 'hidden', height: 80, background: `linear-gradient(160deg, ${suit.color}44, ${suit.color}aa)`, position: 'relative' }}>
                            <img src={suit.textureUrl} alt="Fabric texture"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{suit.fabric}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right: Product info ─────────────────────────────── */}
                <div>
                    {/* Category + name */}
                    <div style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.72rem', background: 'var(--accent-lt)', color: 'var(--accent)', fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase' }}>{suit.category}</span>
                        {suit.badge && <span className="badge">{suit.badge}</span>}
                        {outOfStock && <span style={{ fontSize: '0.72rem', background: '#fef2f2', color: '#dc2626', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>Out of Stock</span>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                            {renderStars(avgRating, 14)}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>({avgRating.toFixed(1)})</span>
                        </div>
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', marginBottom: '0.75rem', lineHeight: 1.2 }}>{suit.name}</h1>

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent)' }}>₹{suit.price.toLocaleString()}</span>
                        {disc > 0 && <>
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-3)', fontSize: '1rem' }}>₹{suit.originalPrice.toLocaleString()}</span>
                            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.8rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{disc}% OFF</span>
                        </>}
                    </div>

                    <p style={{ color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>{suit.description}</p>

                    {/* Highlights */}
                    {suit.highlights?.length > 0 && (
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7, marginBottom: '1.25rem', padding: 0 }}>
                            {suit.highlights.map((h, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.88rem', color: 'var(--text-2)' }}>
                                    <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>✓</span>{h}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Available Sizes */}
                    {suit.sizes?.length > 0 && (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8, textTransform: 'uppercase' }}>Available Sizes</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {suit.sizes.map(s => (
                                    <span key={s} style={{ padding: '4px 12px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', fontWeight: 600 }}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Size recommendation */}
                    {userData && (
                        <div style={{ background: 'var(--accent-lt)', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem', border: '1px solid rgba(234,88,12,0.15)' }}>
                            <p style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Your Recommended Size
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <div style={{ flex: 1, textAlign: 'center', background: '#fff', borderRadius: 8, padding: '0.6rem' }}>
                                    <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 2 }}>Jacket / Shirt</p>
                                    <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent)' }}>{sizes.shirt}</p>
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', background: '#fff', borderRadius: 8, padding: '0.6rem' }}>
                                    <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 2 }}>Trousers</p>
                                    <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent)' }}>{sizes.pants}</p>
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', background: '#fff', borderRadius: 8, padding: '0.6rem' }}>
                                    <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 2 }}>Confidence</p>
                                    <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>{sizes.confidence}%</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cross-gender mismatch notice */}
                    {isGenderMismatch && userData && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '0.85rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>ℹ️</span>
                                <div>
                                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
                                        This is a {suit.gender === 'male' ? "men's" : "women's"} item
                                    </p>
                                    <p style={{ fontSize: '0.78rem', color: '#3b82f6', lineHeight: 1.4, marginBottom: 8 }}>
                                        Your avatar is set to {userData.gender}. For the best 3D preview, you can enter temporary measurements for {suit.gender === 'male' ? 'a male' : 'a female'} body.
                                    </p>
                                    {tempMeasurements && tempMeasurements.gender === suit.gender ? (
                                        <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                                            ✓ Using temporary {suit.gender} measurements
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowTempModal(true)}
                                            style={{
                                                padding: '0.45rem 0.85rem', borderRadius: 8,
                                                background: '#3b82f6', color: '#fff', border: 'none',
                                                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                            }}
                                        >
                                            Enter temp {suit.gender} measurements
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stock indicator */}
                    {suit.stock > 0 && suit.stock < 10 && (
                        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.5rem 0.85rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#9a3412', fontWeight: 600 }}>
                            ⚡ Only {suit.stock} left in stock — order soon!
                        </div>
                    )}

                    {/* CTAs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.25rem' }}>
                        <button onClick={handleBuyNow} disabled={outOfStock}
                            className="btn-primary" style={{ padding: '1.1rem', fontSize: '1.05rem', textAlign: 'center', borderRadius: 14, opacity: outOfStock ? 0.5 : 1, cursor: outOfStock ? 'not-allowed' : 'pointer' }}>
                            {outOfStock ? 'Out of Stock' : '⚡ Buy Now'}
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button onClick={handleAddCart} disabled={cartLoading || outOfStock}
                                style={{ padding: '0.85rem', borderRadius: 12, border: '1.5px solid var(--border)', background: cartAdded ? '#f0fdf4' : '#fff', color: cartAdded ? '#15803d' : 'var(--text)', fontWeight: 700, cursor: outOfStock ? 'not-allowed' : 'pointer', fontSize: '0.9rem', transition: 'all 0.2s', opacity: outOfStock ? 0.5 : 1 }}>
                                {cartAdded ? '✓ Added!' : cartLoading ? '…' : '🛒 Add to Cart'}
                            </button>
                            <button onClick={handleWishlist}
                                style={{ padding: '0.85rem', borderRadius: 12, border: `1.5px solid ${wishlisted ? '#fecaca' : 'var(--border)'}`, background: wishlisted ? '#fef2f2' : '#fff', color: wishlisted ? '#dc2626' : 'var(--text)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>
                                {wishlisted ? '❤️ Saved' : '🤍 Wishlist'}
                            </button>
                        </div>
                    </div>

                    {/* Trust badges */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['🔒 Secure Checkout', '🚚 Free Shipping', '↩️ 30-day Returns', '📏 Size Guarantee'].map(b => (
                            <span key={b} style={{ fontSize: '0.72rem', color: 'var(--text-2)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}>{b}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Related Products ────────────────────────────────────────── */}
            {relatedSuits.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '2.5rem 0' }}>
                    <div className="max-w-[1100px] mx-auto px-5">
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1.5rem' }}>People also viewed</h2>

                        {/* Horizontal Scroll Area */}
                        <div style={{ display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'none', msOverflowStyle: 'none', margin: '0 -1.25rem', padding: '0 1.25rem' }}>
                            <style>{`
                                div::-webkit-scrollbar { display: none; }
                            `}</style>

                            {relatedSuits.map(s => {
                                const disc = s.originalPrice > s.price
                                    ? Math.round((1 - s.price / s.originalPrice) * 100)
                                    : 0;
                                const isWishlisted = wishlistedIds.has(s.id!);
                                const cartAdded = cartFeedback[s.id!];
                                const isOutOfStock = s.stock <= 0;
                                const rRating = relatedRatings[s.id!] || 0;

                                return (
                                    <div key={s.id} style={{ position: 'relative', opacity: isOutOfStock ? 0.75 : 1, minWidth: 240, maxWidth: 280, flex: '0 0 auto' }}>
                                        <Link href={`/shop/${s.id}`} className="product-card card overflow-hidden block border border-[var(--border)] rounded-[14px]">
                                            <div style={{ height: 180, background: s.bannerUrl ? '#fff' : `linear-gradient(160deg, ${s.color}55, ${s.color}cc)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 0.75rem 0.75rem', position: 'relative', overflow: 'hidden' }}>
                                                {s.bannerUrl ? (
                                                    <img src={s.bannerUrl} alt={s.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                ) : s.textureUrl ? (
                                                    <img src={s.textureUrl} alt={s.name}
                                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }}
                                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                ) : null}
                                                {!s.bannerUrl && <span style={{ fontSize: '3rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-65%)', zIndex: 1 }}>🧥</span>}

                                                <div className="flex gap-1.5 flex-wrap justify-center" style={{ zIndex: 2, position: 'relative' }}>
                                                    {s.badge && <span className="badge" style={{ fontSize: '10px' }}>{s.badge}</span>}
                                                    {disc > 0 && <span style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: 99 }}>{disc}% off</span>}
                                                    {isOutOfStock && <span style={{ background: '#dc2626', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>Out of Stock</span>}
                                                </div>

                                                {user && !isOutOfStock && (
                                                    <button onClick={e => handleRelatedWishlist(s, e)}
                                                        style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, transition: 'all 0.15s', zIndex: 2 }}>
                                                        {isWishlisted ? '❤️' : '🤍'}
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ padding: '0.85rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.category}</p>
                                                    {rRating > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            {renderStars(rRating, 10)}
                                                        </div>
                                                    )}
                                                </div>
                                                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1rem' }}>₹{s.price.toLocaleString()}</span>
                                                    {disc > 0 && <span style={{ textDecoration: 'line-through', fontSize: '0.78rem', color: 'var(--text-3)' }}>₹{s.originalPrice.toLocaleString()}</span>}
                                                </div>

                                                <div className="flex gap-2">
                                                    <div style={{ flex: 1, padding: '0.45rem 0', textAlign: 'center', background: 'var(--accent-lt)', color: 'var(--accent)', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>
                                                        Try On →
                                                    </div>
                                                    {user && !isOutOfStock && (
                                                        <button onClick={e => handleRelatedAddCart(s, e)}
                                                            style={{ padding: '0.45rem 0.6rem', borderRadius: 8, background: cartAdded ? '#dcfce7' : 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: cartAdded ? '#15803d' : 'var(--text-2)', transition: 'all 0.2s' }}>
                                                            {cartAdded ? '✓' : '🛒'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Reviews Section ────────────────────────────────────────── */}
            <div className="max-w-[1100px] mx-auto px-5 py-8" style={{ borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Reviews</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {renderStars(avgRating, 16)}
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 600 }}>{avgRating.toFixed(1)} out of 5 ({reviews.length})</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {/* Review List */}
                    <div className="md:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {reviews.length === 0 ? (
                            <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>No reviews yet. Be the first to share your experience!</p>
                        ) : (
                            reviews.map(r => (
                                <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        {renderStars(r.rating, 12)}
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)' }}>{r.userName}</span>
                                        {r.createdAt && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
                                                {r.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                                        {r.comment}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Review Form */}
                    <div style={{ background: '#fdfdfc', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text)' }}>Write a Review</h3>
                        {!user ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
                                Please <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>log in</Link> to share your experience.
                            </p>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', cursor: 'pointer' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <svg key={star} onClick={() => setReviewRating(star)} viewBox="0 0 24 24" fill={star <= reviewRating ? '#fbbf24' : '#e2e8f0'} xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22, transition: 'fill 0.2s' }}>
                                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                        </svg>
                                    ))}
                                </div>
                                <textarea
                                    value={reviewText}
                                    onChange={e => setReviewText(e.target.value)}
                                    placeholder="How does it fit?"
                                    rows={3}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', resize: 'vertical', outline: 'none', marginBottom: '1rem', background: '#fff' }}
                                />
                                <button
                                    onClick={handleSubmitReview}
                                    disabled={submittingReview || !reviewText.trim()}
                                    className="btn-primary w-full" style={{ padding: '0.6rem', fontSize: '0.85rem', borderRadius: 8, textAlign: 'center', opacity: (!reviewText.trim() || submittingReview) ? 0.6 : 1 }}>
                                    {submittingReview ? 'Posting…' : 'Submit'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {showPayment && user && (
                <PaymentModal
                    isOpen={showPayment}
                    onClose={() => setShowPayment(false)}
                    onSuccess={() => { setShowPayment(false); router.push('/account'); }}
                    items={[{ suitId: suitId, label: suit.name, price: suit.price, shirtSize: sizes.shirt, pantsSize: sizes.pants }]}
                    totalAmount={suit.price}
                    shirtSize={sizes.shirt}
                    pantsSize={sizes.pants}
                />
            )}
        </div>
    );
}
