'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { calculateBMI, getBMICategory, selectModel, recommendSize } from '@/utils/modelSelector';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile } from '@/lib/firestore';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import { BodyType } from '@/utils/modelSelector';

interface MeasData {
    gender: 'male' | 'female';
    age: number;
    height: number; weight: number;
    chest: number; waist: number; hip: number;
}

const DEFAULTS: MeasData = { gender: 'male', age: 30, height: 175, weight: 72, chest: 95, waist: 82, hip: 96 };
const STEPS = ['Measurements', 'Ready'];

function OnboardingContent() {
    const router = useRouter();
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [data, setData] = useState<MeasData>(DEFAULTS);
    const [saving, setSaving] = useState(false);
    const [, saveUser] = useLocalStorage<object>('fitframe_user', {});

    const bmi = data.height && data.weight ? calculateBMI(data.height, data.weight) : null;

    const set = useCallback((f: keyof MeasData, v: string | number) => {
        setData(p => {
            if (typeof v === 'number') return { ...p, [f]: v };
            const num = parseFloat(v);
            return { ...p, [f]: isNaN(num) ? v : num };
        });
    }, []);

    const finish = async () => {
        if (!user) return;
        setSaving(true);
        const bmiFinal = bmi ?? 22;
        const sizes = recommendSize(data);

        // Map to standard FitFrame profile format for SMPL
        const profileData = {
            gender: data.gender,
            measurements: {
                height: data.height,
                weight: data.weight,
                chest: data.chest,
                waist: data.waist,
                hip: data.hip,
                age: data.age
            },
            sizes,
            bmi: bmiFinal,
            // Provide a fallback model path just in case, but components will use SMPL
            selectedModel: data.gender === 'male' ? '/models/male.gltf' : '/models/Female_2.gltf',
            selectedModelNumber: 1
        };

        // Save to localStorage (for guest compat)
        saveUser({ ...profileData, timestamp: Date.now() });

        // Save to Firestore
        await updateUserProfile(user.uid, profileData);

        setSaving(false);
        router.push('/shop');
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.25rem' }}>

                {/* Step indicators */}
                <div className="flex items-center gap-2 mb-8" style={{ marginTop: '2rem' }}>
                    {STEPS.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: i <= step ? 'var(--accent)' : 'var(--border)', color: i <= step ? '#fff' : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, transition: 'all 0.2s' }}>
                                {i < step ? '✓' : i + 1}
                            </div>
                            <span style={{ fontSize: '0.78rem', color: i === step ? 'var(--accent)' : 'var(--text-3)', fontWeight: i === step ? 600 : 400 }}>{s}</span>
                            {i < STEPS.length - 1 && <div style={{ width: 24, height: 1, background: i < step ? 'var(--accent)' : 'var(--border)', marginLeft: 4 }} />}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="card w-full" style={{ maxWidth: 440, padding: '2rem' }}>

                    {/* ── Step 0: Measurements */}
                    {step === 0 && (
                        <div className="anim-up">
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Your Measurements</h2>
                            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Used to select the best-matching 3D body model for you.</p>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="col-span-2">
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Biological Sex</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {(['male', 'female'] as const).map(g => (
                                            <button key={g} onClick={() => set('gender', g)}
                                                style={{
                                                    flex: 1, padding: '0.6rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                                    background: data.gender === g ? 'var(--accent)' : 'var(--bg)',
                                                    color: data.gender === g ? '#fff' : 'var(--text-2)',
                                                    border: `1px solid ${data.gender === g ? 'var(--accent)' : 'var(--border)'}`,
                                                    transition: 'all 0.15s'
                                                }}>
                                                {g.charAt(0).toUpperCase() + g.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {([
                                    ['age', 'Age (yrs)', 10, 100],
                                    ['height', 'Height (cm)', 140, 220],
                                    ['weight', 'Weight (kg)', 40, 200],
                                    ['chest', 'Chest (cm)', 60, 150],
                                    ['waist', 'Waist (cm)', 50, 140],
                                    ['hip', 'Hip (cm)', 60, 150],
                                ] as [keyof MeasData, string, number, number][]).map(([field, label, min, max]) => (
                                    <div key={field} className={(field === 'height' || field === 'weight' || field === 'age') ? 'col-span-2' : ''}>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>{label}</label>
                                        <input type="number" min={min} max={max} value={(data[field] as number) || ''}
                                            onChange={e => set(field, e.target.value)} className="input" />
                                    </div>
                                ))}
                            </div>

                            {bmi && (
                                <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: 'var(--accent-lt)', borderRadius: 10, border: '1px solid rgba(234,88,12,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>Body Mass Index</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>{bmi}</span>
                                        <span style={{ marginLeft: 6, fontSize: '0.78rem', color: 'var(--text-3)' }}>{getBMICategory(bmi)}</span>
                                    </div>
                                </div>
                            )}

                            <button onClick={() => setStep(1)} disabled={!data.height || !data.weight}
                                className="btn-primary w-full mt-5" style={{ width: '100%', textAlign: 'center' }}>Continue →</button>
                        </div>
                    )}

                    {/* ── Step 1: Summary */}
                    {step === 1 && (() => {
                        const sizes = recommendSize(data);
                        return (
                            <div className="anim-up">
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Your Profile</h2>
                                <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>We&apos;ve built your avatar. Here are your details.</p>

                                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
                                    {[
                                        ['Biological Sex', data.gender.charAt(0).toUpperCase() + data.gender.slice(1)],
                                        ['Age', `${data.age} yrs`],
                                        ['Height / Weight', `${data.height} cm · ${data.weight} kg`],
                                        bmi ? ['BMI', `${bmi} (${getBMICategory(bmi)})`] : null,
                                        ['Jacket / Shirt', sizes.shirt],
                                        ['Trousers', sizes.pants],
                                        ['Fit Accuracy', `${sizes.confidence}%`],
                                    ].filter((x): x is string[] => x !== null).map(([label, val], i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.7rem 1rem', background: i % 2 === 0 ? 'var(--bg)' : '#fff', fontSize: '0.875rem' }}>
                                            <span style={{ color: 'var(--text-2)' }}>{label}</span>
                                            <span style={{ fontWeight: 600, color: label === 'Jacket / Shirt' || label === 'Trousers' ? 'var(--accent)' : 'var(--text)' }}>{val}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setStep(0)} className="btn-ghost" style={{ flex: '0 0 auto', padding: '0.75rem 1.25rem' }}>← Back</button>
                                    <button onClick={finish} disabled={saving} className="btn-primary flex-1" style={{ textAlign: 'center' }}>
                                        {saving ? 'Saving…' : '🛍️ Start Shopping'}
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <AuthGuard>
            <OnboardingContent />
        </AuthGuard>
    );
}
