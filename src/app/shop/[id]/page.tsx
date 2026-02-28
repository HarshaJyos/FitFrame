'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SUIT_TEXTURES, getSuit, MODEL_BASE, recommendSize } from '@/utils/modelSelector';
import type { AvatarViewer3DHandle } from '@/components/AvatarViewer3D';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, addToCart, toggleWishlist, getWishlist } from '@/lib/firestore';
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
    const suitId = parseInt(params.id as string, 10);
    const suit = getSuit(suitId);
    const { user } = useAuth();

    const [userData, setUserData] = useState<StoredUser | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loadPct, setLoadPct] = useState(0);
    const [showPayment, setShowPayment] = useState(false);
    const [selectedSwatch, setSelectedSwatch] = useState(suitId);
    const [wishlisted, setWishlisted] = useState(false);
    const [cartAdded, setCartAdded] = useState(false);
    const viewerRef = useRef<AvatarViewer3DHandle | null>(null);

    // Load user data: Firestore first, then localStorage fallback
    useEffect(() => {
        const loadUser = async () => {
            if (user) {
                const profile = await getUserProfile(user.uid);
                if (profile?.selectedModel) {
                    setUserData({
                        measurements: profile.measurements ?? { height: 175, weight: 72, chest: 95, waist: 82, hip: 96, bodyType: 'average' },
                        selectedModel: profile.selectedModel,
                        sizes: profile.sizes ?? { shirt: 'M', pants: '32"', confidence: 70 },
                        bmi: profile.bmi ?? 22,
                    });
                }
                // Check wishlist
                const wl = await getWishlist(user.uid);
                setWishlisted(wl.some(i => i.suitId === suitId));
            } else {
                // Fallback to localStorage
                try {
                    const raw = localStorage.getItem('fitframe_user');
                    if (raw) setUserData(JSON.parse(raw) as StoredUser);
                } catch { /* empty */ }
            }
        };
        loadUser();
    }, [user, suitId]);

    const suitTextureUrl = `${MODEL_BASE}/${suit.file}`;
    const sizes = userData?.sizes ?? recommendSize(userData?.measurements ?? { chest: 0, waist: 0 });
    const disc = Math.round((1 - suit.price / suit.originalPrice) * 100);

    const goToSuit = (id: number) => {
        setSelectedSwatch(id);
        router.push(`/shop/${id}`);
    };

    const handleWishlist = useCallback(async () => {
        if (!user) { router.push('/login?next=/shop/' + suitId); return; }
        const added = await toggleWishlist(user.uid, { suitId: suit.id, label: suit.label, price: suit.price, color: suit.color });
        setWishlisted(added);
    }, [user, suit, suitId, router]);

    const handleAddCart = useCallback(async () => {
        if (!user) { router.push('/login?next=/shop/' + suitId); return; }
        await addToCart(user.uid, { suitId: suit.id, label: suit.label, price: suit.price, originalPrice: suit.originalPrice, quantity: 1, textureFile: suit.file, color: suit.color });
        setCartAdded(true);
        setTimeout(() => setCartAdded(false), 2000);
    }, [user, suit, suitId, router]);

    const handleBuySuccess = useCallback(() => {
        setShowPayment(false);
        router.push('/account');
    }, [router]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />

            {/* ── No-avatar Banner */}
            {!userData && (
                <div style={{ background: '#fff7ed', borderBottom: '1px solid rgba(234,88,12,0.2)', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: '#9a3412' }}>
                        👤 <strong>Set up your measurements</strong> to try this suit on your personal 3D avatar.{' '}
                        <Link href="/onboarding" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>Start now →</Link>
                    </p>
                </div>
            )}

            {/* ── Main Layout */}
            <div className="max-w-6xl mx-auto px-5 py-6">
                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* LEFT: 3D Viewer */}
                    <div className="w-full lg:flex-1 min-w-0">
                        <div className="card overflow-hidden relative" style={{ height: 'min(52vh, 480px)', background: '#f5f0eb' }}>
                            {userData ? (
                                <>
                                    <AvatarViewer3D
                                        modelPath={userData.selectedModel}
                                        suitTextureUrl={suitTextureUrl}
                                        viewerRef={viewerRef}
                                        onReady={() => setModelLoaded(true)}
                                        onLoadProgress={setLoadPct}
                                    />
                                    {!modelLoaded && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f0eb', zIndex: 5 }}>
                                            <div className="loader" />
                                            <p style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--text-3)' }}>Loading avatar…</p>
                                            <div style={{ marginTop: 10, width: 120, height: 4, background: 'var(--border)', borderRadius: 9 }}>
                                                <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 9, width: `${loadPct}%`, transition: 'width 0.3s' }} />
                                            </div>
                                        </div>
                                    )}
                                    {modelLoaded && (
                                        <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(28,25,23,0.55)', color: '#fff', borderRadius: 99, padding: '4px 14px', fontSize: '0.72rem', whiteSpace: 'nowrap', pointerEvents: 'none', backdropFilter: 'blur(4px)' }}>
                                            🖱 Drag to rotate · Scroll to zoom
                                        </div>
                                    )}
                                    {modelLoaded && (
                                        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', backdropFilter: 'blur(4px)' }}>
                                            {suit.label}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                                    <div style={{ fontSize: '4rem' }}>🧥</div>
                                    <p style={{ color: 'var(--text-2)', fontWeight: 600, textAlign: 'center', maxWidth: 220, lineHeight: 1.5 }}>Set up your measurements to see this suit on your avatar</p>
                                    <Link href="/onboarding" className="btn-primary" style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}>Create My Avatar</Link>
                                </div>
                            )}
                        </div>

                        {/* Style Switcher */}
                        <div style={{ marginTop: '1rem' }}>
                            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Switch Style</p>
                            <div className="flex gap-2 flex-wrap">
                                {SUIT_TEXTURES.map(s => (
                                    <button key={s.id} onClick={() => goToSuit(s.id)}
                                        style={{ width: 40, height: 40, borderRadius: 8, background: s.color, border: selectedSwatch === s.id ? '2.5px solid var(--accent)' : '2.5px solid transparent', cursor: 'pointer', boxShadow: selectedSwatch === s.id ? '0 0 0 3px rgba(234,88,12,0.2)' : 'none', transition: 'all 0.15s', flexShrink: 0 }}
                                        title={s.label} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Product Info */}
                    <div className="w-full lg:w-96 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{suit.category}</span>
                            {suit.badge && <span className="badge">{suit.badge}</span>}
                        </div>

                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.4rem', lineHeight: 1.2 }}>{suit.label} Suit</h1>

                        <div className="flex items-center gap-2 mb-4">
                            <div style={{ color: '#f59e0b', fontSize: '0.85rem', letterSpacing: '-1px' }}>★★★★★</div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>4.8 (128 reviews)</span>
                        </div>

                        <div className="flex items-baseline gap-3 mb-5">
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent)' }}>₹{suit.price.toLocaleString()}</span>
                            <span style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--text-3)' }}>₹{suit.originalPrice.toLocaleString()}</span>
                            <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.78rem', padding: '2px 8px', borderRadius: 6 }}>{disc}% OFF</span>
                        </div>

                        <p style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: '0.9rem', marginBottom: '1.25rem' }}>{suit.description}</p>

                        <div style={{ padding: '0.6rem 0.9rem', background: 'var(--accent-lt)', borderRadius: 8, fontSize: '0.82rem', marginBottom: '1.25rem', border: '1px solid rgba(234,88,12,0.15)' }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>Fabric: </span>
                            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{suit.fabric}</span>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.5rem' }}>Highlights</p>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {suit.features.map((f, i) => (
                                    <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                        <span style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>✓</span> {f}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Size recommendation */}
                        {userData && (
                            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: '1.25rem' }}>
                                <div style={{ padding: '0.6rem 0.9rem', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Recommended Size</div>
                                <div style={{ display: 'flex' }}>
                                    <div style={{ flex: 1, padding: '0.85rem', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 2 }}>Jacket</p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)' }}>{sizes.shirt}</p>
                                    </div>
                                    <div style={{ flex: 1, padding: '0.85rem', textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 2 }}>Trousers</p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)' }}>{sizes.pants}</p>
                                    </div>
                                </div>
                                <div style={{ height: 4, background: 'var(--border)' }}>
                                    <div style={{ height: '100%', width: `${sizes.confidence}%`, background: 'var(--accent)', borderRadius: 9 }} />
                                </div>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', padding: '0.4rem 0.9rem', textAlign: 'right' }}>{sizes.confidence}% fit confidence</p>
                            </div>
                        )}

                        <div className="flex gap-3 mb-3 flex-wrap">
                            {['🚚 Free delivery', '↩️ 30-day returns', '✅ Authentic'].map(b => (
                                <span key={b} style={{ fontSize: '0.75rem', color: 'var(--text-2)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>{b}</span>
                            ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button onClick={() => setShowPayment(true)} className="btn-primary w-full" style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: 12, textAlign: 'center' }}>
                                🛍️ Buy Now — ₹{suit.price.toLocaleString()}
                            </button>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={handleAddCart}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: '1.5px solid var(--border)', background: cartAdded ? '#dcfce7' : '#fff', color: cartAdded ? '#15803d' : 'var(--text)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    {cartAdded ? '✓ Added to Cart' : '🛒 Add to Cart'}
                                </button>
                                <button onClick={handleWishlist}
                                    style={{ width: 48, padding: '0.75rem', borderRadius: 12, border: '1.5px solid var(--border)', background: wishlisted ? '#fef2f2' : '#fff', fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    {wishlisted ? '❤️' : '🤍'}
                                </button>
                            </div>
                            {!userData && (
                                <Link href="/onboarding" className="btn-ghost" style={{ width: '100%', padding: '0.85rem', fontSize: '0.9rem', borderRadius: 12, textAlign: 'center', display: 'block' }}>
                                    👤 Try on my avatar first
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Other suits */}
                <div style={{ marginTop: '3.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text)' }}>You May Also Like</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {SUIT_TEXTURES.filter(s => s.id !== suitId).slice(0, 4).map(s => (
                            <Link key={s.id} href={`/shop/${s.id}`} className="product-card card overflow-hidden block">
                                <div style={{ height: 120, background: `linear-gradient(160deg, ${s.color}77, ${s.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🧥</div>
                                <div style={{ padding: '0.7rem' }}>
                                    <p style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)' }}>{s.label}</p>
                                    <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.88rem', marginTop: 2 }}>₹{s.price.toLocaleString()}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <footer style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', marginTop: '3rem' }}>
                <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>© 2025 FitFrame — Virtual Try-On Platform</p>
            </footer>

            {/* PaymentModal */}
            <PaymentModal
                isOpen={showPayment}
                onClose={() => setShowPayment(false)}
                onSuccess={handleBuySuccess}
                items={[{ suitId: suit.id, label: suit.label, price: suit.price, shirtSize: sizes.shirt, pantsSize: sizes.pants }]}
                totalAmount={suit.price}
                shirtSize={sizes.shirt}
                pantsSize={sizes.pants}
            />
        </div>
    );
}
