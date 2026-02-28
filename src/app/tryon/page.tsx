'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SUIT_TEXTURES, DEFAULT_SUIT_ID, MODEL_BASE, recommendSize, getBMICategory } from '@/utils/modelSelector';
import type { AvatarViewer3DHandle } from '@/components/AvatarViewer3D';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, updateUserProfile } from '@/lib/firestore';
import PaymentModal from '@/components/PaymentModal';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';

const AvatarViewer3D = dynamic(() => import('@/components/AvatarViewer3D'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
            <div className="loader mb-3" />
            <p className="text-slate-400 text-sm">Preparing 3D viewer…</p>
        </div>
    ),
});

interface StoredUser {
    measurements: { height: number; weight: number; chest: number; waist: number; hip: number; bodyType: string };
    selectedModel: string;
    sizes: { shirt: string; pants: string; confidence: number };
    bmi: number;
    suitId: number;
}

const DEFAULT_USER: StoredUser = {
    measurements: { height: 175, weight: 72, chest: 95, waist: 82, hip: 96, bodyType: 'average' },
    selectedModel: `${MODEL_BASE}/male_m05.gltf`,
    sizes: { shirt: 'M', pants: '32"', confidence: 70 },
    bmi: 23.5,
    suitId: DEFAULT_SUIT_ID,
};

function TryOnContent() {
    const router = useRouter();
    const { user } = useAuth();
    const [userData, setUserData] = useLocalStorage<StoredUser>('fitframe_user', DEFAULT_USER);
    const [selectedSuitId, setSelectedSuitId] = useState(userData?.suitId ?? DEFAULT_SUIT_ID);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [loadPct, setLoadPct] = useState(0);
    const [showPayment, setShowPayment] = useState(false);
    const viewerRef = useRef<AvatarViewer3DHandle | null>(null);

    // Hydrate from Firestore if logged in
    useEffect(() => {
        if (!user) return;
        getUserProfile(user.uid).then(profile => {
            if (!profile?.selectedModel) { router.push('/onboarding'); return; }
            const hydrated: StoredUser = {
                measurements: profile.measurements ?? DEFAULT_USER.measurements,
                selectedModel: profile.selectedModel,
                sizes: profile.sizes ?? DEFAULT_USER.sizes,
                bmi: profile.bmi ?? DEFAULT_USER.bmi,
                suitId: profile.suitId ?? DEFAULT_SUIT_ID,
            };
            setUserData(hydrated);
            setSelectedSuitId(profile.suitId ?? DEFAULT_SUIT_ID);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Redirect if no model
    useEffect(() => {
        if (!userData?.selectedModel) router.push('/onboarding');
    }, [userData, router]);

    const currentSuit = SUIT_TEXTURES.find(s => s.id === selectedSuitId) ?? SUIT_TEXTURES[5];
    const suitTextureUrl = `${MODEL_BASE}/${currentSuit.file}`;
    const sizes = userData?.sizes ?? recommendSize(userData?.measurements ?? DEFAULT_USER.measurements);

    const handleSuitSelect = useCallback(async (suitId: number) => {
        setSelectedSuitId(suitId);
        setUserData(prev => ({ ...(prev ?? DEFAULT_USER), suitId }));
        const suit = SUIT_TEXTURES.find(s => s.id === suitId);
        if (suit && viewerRef.current) viewerRef.current.swapSuitTexture(`${MODEL_BASE}/${suit.file}`);
        // Also persist to Firestore
        if (user) await updateUserProfile(user.uid, { suitId });
    }, [setUserData, user]);

    const handleBuySuccess = useCallback(() => {
        setShowPayment(false);
        router.push('/account');
    }, [router]);

    if (!userData?.selectedModel) return null;

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#050d1a' }}>
            <Navbar />

            {/* Main layout */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

                {/* 3D Viewer */}
                <div className="relative flex-1 min-h-[55vw] md:min-h-0" style={{ height: 'clamp(350px, 60vh, 900px)' }}>
                    <AvatarViewer3D
                        modelPath={userData.selectedModel}
                        suitTextureUrl={suitTextureUrl}
                        viewerRef={viewerRef}
                        onReady={() => setIsModelLoaded(true)}
                        onLoadProgress={setLoadPct}
                    />
                    {!isModelLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-10 pointer-events-none">
                            <div className="loader mb-4" />
                            <p className="text-sm font-semibold text-slate-300">Loading your avatar…</p>
                            <div className="mt-3 w-36 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${loadPct}%` }} />
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{loadPct}%</p>
                        </div>
                    )}
                    {isModelLoaded && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full glass text-xs text-slate-500 pointer-events-none">
                            🖱 Drag to rotate · Scroll to zoom
                        </div>
                    )}
                    {isModelLoaded && (
                        <div className="absolute top-3 left-3 glass px-3 py-1.5 rounded-xl text-xs text-slate-300 pointer-events-none">
                            <span className="font-medium">{currentSuit.label}</span>
                        </div>
                    )}
                </div>

                {/* Right Panel */}
                <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col gap-0 overflow-y-auto" style={{ background: '#07101f', borderLeft: '1px solid rgba(30,60,100,0.4)' }}>

                    {/* BMI chips */}
                    <div className="p-4 border-b border-slate-800/60 flex gap-2 flex-wrap">
                        <span className="glass px-2.5 py-1 rounded-full text-xs text-blue-300 font-medium">BMI {userData.bmi} · {getBMICategory(userData.bmi)}</span>
                        <span className="glass px-2.5 py-1 rounded-full text-xs text-slate-400 capitalize">{userData.measurements.bodyType}</span>
                    </div>

                    {/* Size recommendation */}
                    <div className="p-5 border-b border-slate-800/60">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Your Recommended Size</h3>
                        <div className="flex gap-3">
                            <div className="flex-1 glass rounded-xl p-3 text-center">
                                <div className="text-xs text-slate-500 mb-1">Shirt / Jacket</div>
                                <div className="text-2xl font-extrabold text-blue-400">{sizes.shirt}</div>
                            </div>
                            <div className="flex-1 glass rounded-xl p-3 text-center">
                                <div className="text-xs text-slate-500 mb-1">Pants</div>
                                <div className="text-2xl font-extrabold text-blue-400">{sizes.pants}</div>
                            </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                            <div className="flex-1 h-1 bg-slate-800 rounded-full">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sizes.confidence}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{sizes.confidence}% confident</span>
                        </div>
                    </div>

                    {/* Suit Selector */}
                    <div className="p-5 flex-1">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Choose Your Style</h3>
                        <div className="grid grid-cols-3 gap-2.5">
                            {SUIT_TEXTURES.map(suit => (
                                <button key={suit.id} onClick={() => handleSuitSelect(suit.id)}
                                    className={`suit-thumb rounded-xl overflow-hidden border-2 transition-all relative group ${selectedSuitId === suit.id ? 'active border-blue-500' : 'border-transparent hover:border-slate-600'}`}>
                                    <div className="aspect-[3/4] flex flex-col items-center justify-center gap-1.5"
                                        style={{ background: `linear-gradient(160deg, ${suit.color}cc 0%, ${suit.color} 100%)` }}>
                                        <div className="text-lg">🧥</div>
                                        <div className="text-[10px] font-semibold text-white/80 text-center px-1 leading-tight">{suit.label}</div>
                                    </div>
                                    {selectedSuitId === suit.id && (
                                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px]">✓</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Buy Now */}
                    <div className="p-5 border-t border-slate-800/60 space-y-3">
                        <div className="text-center mb-1">
                            <div className="text-xs text-slate-500">Selected</div>
                            <div className="font-bold text-white">{currentSuit.label}</div>
                            <div className="text-xs text-slate-500">Size: {sizes.shirt} · {sizes.pants}</div>
                            <div className="text-lg font-black text-blue-400 mt-1">₹{currentSuit.price.toLocaleString()}</div>
                        </div>
                        <button onClick={() => setShowPayment(true)}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-base transition-all shadow-xl shadow-blue-500/30 active:scale-95 animate-glow">
                            🛍️ Buy Now
                        </button>
                        <p className="text-center text-xs text-slate-600">Free shipping · 30-day returns</p>
                    </div>
                </div>
            </div>

            {/* PaymentModal */}
            <PaymentModal
                isOpen={showPayment}
                onClose={() => setShowPayment(false)}
                onSuccess={handleBuySuccess}
                items={[{ suitId: currentSuit.id, label: currentSuit.label, price: currentSuit.price, shirtSize: sizes.shirt, pantsSize: sizes.pants }]}
                totalAmount={currentSuit.price}
                shirtSize={sizes.shirt}
                pantsSize={sizes.pants}
            />
        </div>
    );
}

export default function TryOnPage() {
    return (
        <AuthGuard>
            <TryOnContent />
        </AuthGuard>
    );
}
