'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MODEL_BASE, recommendSize } from '@/utils/modelSelector';
import type { AvatarViewer3DHandle } from '@/components/AvatarViewer3D';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, addToCart, toggleWishlist } from '@/lib/firestore';
import { getSuit, Suit } from '@/lib/suits';
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
    measurements: { height: number; weight: number; chest: number; waist: number; hip: number; bodyType: string };
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

    const [userData, setUserData] = useState<StoredUser | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loadPct, setLoadPct] = useState(0);
    const [showPayment, setShowPayment] = useState(false);
    const [wishlisted, setWishlisted] = useState(false);
    const [cartAdded, setCartAdded] = useState(false);
    const [cartLoading, setCartLoading] = useState(false);
    const viewerRef = useRef<AvatarViewer3DHandle | null>(null);

    // Load suit from Firestore
    useEffect(() => {
        if (!suitId) return;
        getSuit(suitId)
            .then(data => {
                if (!data) { setSuitError('This suit is no longer available.'); return; }
                setSuit(data);
            })
            .catch(() => setSuitError('Failed to load suit. Please try again.'))
            .finally(() => setSuitLoading(false));
    }, [suitId]);

    // Load user data: Firestore first, then localStorage fallback
    useEffect(() => {
        const loadUser = async () => {
            if (user) {
                try {
                    const profile = await getUserProfile(user.uid);
                    if (profile?.measurements && profile?.selectedModel) {
                        setUserData({
                            measurements: profile.measurements,
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
    }, [user]);

    // Check wishlist
    useEffect(() => {
        if (!user || !suit?.id) return;
        import('@/lib/firestore').then(({ getWishlist }) =>
            getWishlist(user.uid).then(items => {
                setWishlisted(items.some(i => i.suitId === suit.id));
            })
        );
    }, [user, suit]);

    const handleWishlist = useCallback(async () => {
        if (!user) { router.push('/login'); return; }
        if (!suit?.id) return;
        const added = await toggleWishlist(user.uid, { suitId: suit.id, label: suit.name, price: suit.price, color: suit.color });
        setWishlisted(added);
    }, [user, suit, router]);

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
        : `${MODEL_BASE}/male_m05.gltf`;

    const sizes = userData?.sizes
        ?? (userData?.measurements ? recommendSize(userData.measurements) : { shirt: 'M', pants: '32"', confidence: 70 });

    const disc = suit && suit.originalPrice > suit.price
        ? Math.round((1 - suit.price / suit.originalPrice) * 100) : 0;

    // ── Loading / Error states ──────────────────────────────────────────────────

    if (suitLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
                <Navbar />
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
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

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.25rem 3rem', display: 'grid', gridTemplateColumns: 'minmax(300px,1fr) 1fr', gap: '2rem', alignItems: 'start' }}>

                {/* ── Left: 3D viewer ─────────────────────────────────── */}
                <div>
                    <div style={{ height: 480, borderRadius: 20, overflow: 'hidden', background: '#f5f0eb', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                        {!modelLoaded && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
