'use client';

import { useState, Suspense, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Stage, Environment } from '@react-three/drei';
import * as THREE from 'three';
import Navbar from '@/components/Navbar';
import { calculateSMPLBlendshapes, BasicMeasurements } from '@/utils/smplCalculator';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';

// ─── Constants ────────────────────────────────────────────────────────────────
const MALE_DEFAULT: BasicMeasurements = { height: 176, weight: 75, chest: 100, waist: 85, hip: 98, age: 30 };
const FEMALE_DEFAULT: BasicMeasurements = { height: 162, weight: 63, chest: 90, waist: 75, hip: 100, age: 30 };

// ─── Types ────────────────────────────────────────────────────────────────────
interface MorphInfo {
    meshName: string;
    morphIndex: number;
    morphName: string;
    vertexCount: number;
    totalMorphs: number;
}

// ─── 3D Model component (used in both modes) ─────────────────────────────────
function SMPLModel({
    gender,
    influences,           // full array: index → influence value
    onMorphsDiscovered,   // callback fired once when morph targets are found
}: {
    gender: 'male' | 'female';
    influences: number[];
    onMorphsDiscovered?: (info: MorphInfo[]) => void;
}) {
    const url = gender === 'male' ? '/models/male.gltf' : '/models/Female_2.gltf';
    const { scene } = useGLTF(url);
    const discoveredRef = useRef(false);

    // Discover morph targets on first load
    useEffect(() => {
        if (!scene || discoveredRef.current) return;
        discoveredRef.current = true;
        const found: MorphInfo[] = [];
        scene.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
            const dict = mesh.morphTargetDictionary;
            Object.entries(dict).forEach(([name, idx]) => {
                found.push({
                    meshName: mesh.name || '(unnamed)',
                    morphIndex: idx as number,
                    morphName: name,
                    vertexCount: mesh.geometry?.attributes?.position?.count ?? 0,
                    totalMorphs: mesh.morphTargetInfluences!.length,
                });
            });
        });
        onMorphsDiscovered?.(found);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene]);

    // Reset discovered flag when gender changes
    useEffect(() => { discoveredRef.current = false; }, [gender]);

    // Apply influences every render
    useEffect(() => {
        if (!scene) return;
        scene.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh || !mesh.morphTargetInfluences) return;
            for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
                mesh.morphTargetInfluences[i] = influences[i] ?? 0;
            }
        });
    }, [scene, influences]);

    return (
        <group dispose={null}>
            <primitive object={scene} />
        </group>
    );
}

// Preload both models
useGLTF.preload('/models/male.gltf');
useGLTF.preload('/models/Female_2.gltf');

// ─── Shared Canvas wrapper ────────────────────────────────────────────────────
function ModelCanvas({
    gender,
    influences,
    onMorphsDiscovered,
    label,
}: {
    gender: 'male' | 'female';
    influences: number[];
    onMorphsDiscovered?: (info: MorphInfo[]) => void;
    label?: string;
}) {
    return (
        <div style={{ flex: 1, position: 'relative', background: '#1a1a2e', borderRadius: '12px', overflow: 'hidden' }}>
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.5, 4], fov: 45 }}>
                <Suspense fallback={null}>
                    <Stage environment="city" intensity={0.5} adjustCamera={false}>
                        <SMPLModel gender={gender} influences={influences} onMorphsDiscovered={onMorphsDiscovered} />
                    </Stage>
                </Suspense>
                <OrbitControls makeDefault minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} enablePan enableZoom />
                <Environment preset="city" />
            </Canvas>
            {label && (
                <div style={{
                    position: 'absolute', bottom: '0.75rem', left: '0.75rem',
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                    color: '#fff', padding: '0.3rem 0.7rem',
                    borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em',
                }}>
                    {label}
                </div>
            )}
        </div>
    );
}

// ─── Reusable bar visualizer ──────────────────────────────────────────────────
function InfluenceBar({ value, min = -2, max = 2 }: { value: number; min?: number; max?: number }) {
    const pct = ((value - min) / (max - min)) * 100;
    const center = ((0 - min) / (max - min)) * 100;
    const isPos = value >= 0;
    const left = isPos ? center : pct;
    const width = Math.abs(pct - center);
    return (
        <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginTop: 3 }}>
            {/* zero line */}
            <div style={{ position: 'absolute', left: `${center}%`, top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.25)' }} />
            {/* fill */}
            <div style={{
                position: 'absolute', top: 0, height: '100%', borderRadius: 3,
                left: `${left}%`, width: `${width}%`,
                background: isPos ? '#6c63ff' : '#ff6584',
            }} />
        </div>
    );
}

// ─── Main page content ────────────────────────────────────────────────────────
function TestSMPLContent() {
    const router = useRouter();

    // ── Mode
    const [mode, setMode] = useState<'measure' | 'debug'>('measure');

    // ── Measurement mode state
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [measurements, setMeasurements] = useState<BasicMeasurements>(MALE_DEFAULT);
    const calcShapeKeys = calculateSMPLBlendshapes(measurements, gender);

    // ── Debug mode state
    const [morphInfos, setMorphInfos] = useState<MorphInfo[]>([]);
    const [debugInfluences, setDebugInfluences] = useState<number[]>(new Array(50).fill(0));
    const [isolateMode, setIsolateMode] = useState(false); // when on, only 1 morph active at a time
    const [activeMorph, setActiveMorph] = useState<number | null>(null);
    const [filterText, setFilterText] = useState('');
    const [copied, setCopied] = useState(false);
    const [debugGender, setDebugGender] = useState<'male' | 'female'>('male');
    const debugDiscoveredRef = useRef(false);

    // When debug morph info is discovered, expand influences array
    const handleMorphsDiscovered = useCallback((infos: MorphInfo[]) => {
        debugDiscoveredRef.current = true;
        setMorphInfos(infos);
        setDebugInfluences(new Array(Math.max(50, infos.length + 10)).fill(0));
    }, []);

    // When debug gender changes, reset morph discovery
    useEffect(() => {
        debugDiscoveredRef.current = false;
        setMorphInfos([]);
        setDebugInfluences(new Array(50).fill(0));
        setActiveMorph(null);
    }, [debugGender]);

    // Compute effective influences for debug mode
    const effectiveDebugInfluences = (() => {
        if (!isolateMode || activeMorph === null) return debugInfluences;
        // Only active morph has value, rest = 0
        const arr = new Array(debugInfluences.length).fill(0);
        arr[activeMorph] = debugInfluences[activeMorph];
        return arr;
    })();

    // Measurement mode: influences are shape keys padded to 50
    const measureInfluences = (() => {
        const arr = new Array(50).fill(0);
        calcShapeKeys.forEach((v, i) => { arr[i] = v; });
        return arr;
    })();

    const handleMorphSlider = (idx: number, val: number) => {
        setDebugInfluences(prev => {
            const next = [...prev];
            next[idx] = val;
            return next;
        });
    };

    const resetAllMorphs = () => setDebugInfluences(new Array(debugInfluences.length).fill(0));

    const copyDebugState = () => {
        const obj: Record<string, number> = {};
        morphInfos.forEach(m => {
            const v = debugInfluences[m.morphIndex];
            if (v !== 0) obj[`${m.morphIndex}_${m.morphName}`] = v;
        });
        navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Grouping by meshName for display
    const meshGroups = morphInfos.reduce((acc, info) => {
        if (!acc[info.meshName]) acc[info.meshName] = [];
        acc[info.meshName].push(info);
        return acc;
    }, {} as Record<string, MorphInfo[]>);

    const filteredGroups = Object.entries(meshGroups).reduce((acc, [mesh, infos]) => {
        const f = filterText.toLowerCase();
        const filtered = infos.filter(i =>
            i.morphName.toLowerCase().includes(f) ||
            mesh.toLowerCase().includes(f) ||
            String(i.morphIndex).includes(f)
        );
        if (filtered.length) acc[mesh] = filtered;
        return acc;
    }, {} as Record<string, MorphInfo[]>);

    const totalActiveCount = morphInfos.filter(m => debugInfluences[m.morphIndex] !== 0).length;

    const s = styles();

    return (
        <div style={{ minHeight: '100vh', background: '#0f0e17', display: 'flex', flexDirection: 'column', color: '#fffffe' }}>
            <Navbar />

            {/* ── Top bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                <h1 style={{ fontSize: '1rem', fontWeight: 700, flex: 1, margin: 0 }}>
                    SMPL Shape Key Lab
                </h1>

                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '0.2rem' }}>
                    {(['measure', 'debug'] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)} style={{
                            padding: '0.35rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                            background: mode === m ? (m === 'debug' ? '#ff6584' : '#6c63ff') : 'transparent',
                            color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.2s',
                        }}>
                            {m === 'measure' ? '📐 Measurement' : '🔬 Debug'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Body ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '1rem', gap: '1rem' }}>

                {/* LEFT: 3D viewport */}
                <ModelCanvas
                    gender={mode === 'debug' ? debugGender : gender}
                    influences={mode === 'debug' ? effectiveDebugInfluences : measureInfluences}
                    onMorphsDiscovered={mode === 'debug' ? handleMorphsDiscovered : undefined}
                    label={mode === 'debug'
                        ? `${debugGender.toUpperCase()} • ${morphInfos.length} morphs found`
                        : `${gender.toUpperCase()} • Measurement Mode`}
                />

                {/* RIGHT: Panel */}
                <div style={{ width: 420, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: 'calc(100vh - 130px)' }}>

                    {/* ════════ MEASUREMENT MODE ════════ */}
                    {mode === 'measure' && (
                        <>
                            <div style={s.card}>
                                <h2 style={s.heading}>Measurements</h2>
                                {/* Gender toggle */}
                                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                                    {(['male', 'female'] as const).map(g => (
                                        <button key={g} onClick={() => { setGender(g); setMeasurements(g === 'male' ? { ...MALE_DEFAULT } : { ...FEMALE_DEFAULT }); }}
                                            style={{
                                                flex: 1, padding: '0.4rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                                                background: gender === g ? '#6c63ff' : 'rgba(255,255,255,0.07)',
                                                color: gender === g ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s'
                                            }}>
                                            {g.charAt(0).toUpperCase() + g.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {([
                                        ['height', 'Height', 'cm', 120, 220],
                                        ['weight', 'Weight', 'kg', 40, 200],
                                        ['chest', 'Chest', 'cm', 60, 150],
                                        ['waist', 'Waist', 'cm', 50, 140],
                                        ['hip', 'Hips', 'cm', 60, 150],
                                        ['age', 'Age', 'yrs', 10, 100],
                                    ] as [keyof BasicMeasurements, string, string, number, number][]).map(([field, label, unit, min, max]) => (
                                        <div key={field}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{label}</label>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6c63ff' }}>{measurements[field]} {unit}</span>
                                            </div>
                                            <input type="range" min={min} max={max} step={field === 'age' ? 1 : 0.5}
                                                value={measurements[field]}
                                                onChange={e => setMeasurements(prev => ({ ...prev, [field]: parseFloat(e.target.value) }))}
                                                style={{ width: '100%', accentColor: '#6c63ff' }} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Beta output */}
                            <div style={s.card}>
                                <h3 style={s.subheading}>Computed Betas → Mesh Influences</h3>
                                {calcShapeKeys.map((val, idx) => (
                                    <div key={idx} style={{ marginBottom: '0.4rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>beta_{idx}</span>
                                            <span style={{ fontWeight: 700, color: Math.abs(val) > 1 ? '#ff6584' : val > 0 ? '#6c63ff' : 'rgba(255,255,255,0.7)' }}>
                                                {val > 0 ? '+' : ''}{val.toFixed(3)}
                                            </span>
                                        </div>
                                        <InfluenceBar value={val} min={-5} max={5} />
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => router.push('/shop')} style={{ ...s.primaryBtn, marginTop: 'auto' }}>
                                🛍️ Finish &amp; Start Shopping
                            </button>
                        </>
                    )}

                    {/* ════════ DEBUG MODE ════════ */}
                    {mode === 'debug' && (
                        <>
                            {/* Info card */}
                            <div style={s.card}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <h2 style={{ ...s.heading, margin: 0, flex: 1 }}>🔬 Debug Mode</h2>
                                    {/* Gender */}
                                    {(['male', 'female'] as const).map(g => (
                                        <button key={g} onClick={() => setDebugGender(g)} style={{
                                            padding: '0.25rem 0.7rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                                            fontSize: '0.72rem', fontWeight: 700,
                                            background: debugGender === g ? '#ff6584' : 'rgba(255,255,255,0.07)',
                                            color: debugGender === g ? '#fff' : 'rgba(255,255,255,0.5)',
                                        }}>{g}</button>
                                    ))}
                                </div>

                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', margin: '0 0 0.75rem' }}>
                                    Each slider drives one morph target independently.
                                    Enable <strong style={{ color: '#ff6584' }}>Isolate</strong> to zero all others while scrubbing.
                                </p>

                                {/* Stats row */}
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {[
                                        ['Morphs', morphInfos.length],
                                        ['Meshes', Object.keys(meshGroups).length],
                                        ['Active', totalActiveCount],
                                    ].map(([label, val]) => (
                                        <div key={label as string} style={{ flex: 1, minWidth: 70, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '0.5rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6c63ff' }}>{val}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Controls */}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {/* Isolate toggle */}
                                <button onClick={() => setIsolateMode(p => !p)} style={{
                                    flex: 1, padding: '0.45rem', borderRadius: 8, border: `1px solid ${isolateMode ? '#ff6584' : 'rgba(255,255,255,0.1)'}`,
                                    background: isolateMode ? 'rgba(255,101,132,0.15)' : 'rgba(255,255,255,0.04)',
                                    color: isolateMode ? '#ff6584' : 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                                }}>
                                    {isolateMode ? '🔴 Isolate ON' : '⚪ Isolate OFF'}
                                </button>
                                <button onClick={resetAllMorphs} style={{
                                    flex: 1, padding: '0.45rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                                }}>
                                    ↺ Reset All
                                </button>
                                <button onClick={copyDebugState} style={{
                                    flex: 1, padding: '0.45rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                                    background: copied ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
                                    color: copied ? '#6c63ff' : 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                                }}>
                                    {copied ? '✅ Copied!' : '📋 Copy JSON'}
                                </button>
                            </div>

                            {/* Filter */}
                            <input
                                placeholder="🔍  Filter by morph name, mesh, or index…"
                                value={filterText}
                                onChange={e => setFilterText(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8, color: '#fff', padding: '0.5rem 0.75rem',
                                    fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box',
                                }}
                            />

                            {/* Loading state */}
                            {morphInfos.length === 0 && (
                                <div style={{ ...s.card, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', padding: '2rem' }}>
                                    ⏳ Loading model and discovering morph targets…
                                    <br /><small style={{ display: 'block', marginTop: '0.5rem' }}>If this persists, check that the model path is correct in the browser console.</small>
                                </div>
                            )}

                            {/* Morph groups */}
                            {Object.entries(filteredGroups).map(([meshName, infos]) => (
                                <div key={meshName} style={s.card}>
                                    {/* Mesh header */}
                                    <div style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ff6584', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                            mesh
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', wordBreak: 'break-all' }}>{meshName}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                                            {infos[0].vertexCount.toLocaleString()} vertices · {infos[0].totalMorphs} total morph targets
                                        </div>
                                    </div>

                                    {/* Individual morph sliders */}
                                    {infos.map(info => {
                                        const val = debugInfluences[info.morphIndex] ?? 0;
                                        const isActive = activeMorph === info.morphIndex;
                                        return (
                                            <div key={`${meshName}-${info.morphIndex}`}
                                                onClick={() => setActiveMorph(isActive ? null : info.morphIndex)}
                                                style={{
                                                    marginBottom: '0.6rem', padding: '0.5rem 0.6rem', borderRadius: 8,
                                                    background: isActive ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${isActive ? 'rgba(108,99,255,0.4)' : 'rgba(255,255,255,0.04)'}`,
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                        <span style={{
                                                            fontSize: '0.65rem', fontWeight: 800, background: 'rgba(108,99,255,0.3)',
                                                            color: '#a29bff', borderRadius: 4, padding: '0.1rem 0.35rem',
                                                        }}>
                                                            #{info.morphIndex}
                                                        </span>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isActive ? '#c0b8ff' : 'rgba(255,255,255,0.75)', wordBreak: 'break-all' }}>
                                                            {info.morphName || `morph_${info.morphIndex}`}
                                                        </span>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.75rem', fontWeight: 800, minWidth: 44, textAlign: 'right',
                                                        color: val > 0 ? '#6c63ff' : val < 0 ? '#ff6584' : 'rgba(255,255,255,0.3)',
                                                    }}>
                                                        {val > 0 ? '+' : ''}{val.toFixed(2)}
                                                    </span>
                                                </div>

                                                {/* Slider — stop propagation so click on slider doesn't toggle active */}
                                                <div onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="range" min={-2} max={2} step={0.01}
                                                        value={val}
                                                        onChange={e => {
                                                            setActiveMorph(info.morphIndex);
                                                            handleMorphSlider(info.morphIndex, parseFloat(e.target.value));
                                                        }}
                                                        style={{ width: '100%', accentColor: val > 0 ? '#6c63ff' : '#ff6584', marginBottom: 2 }}
                                                    />
                                                </div>
                                                <InfluenceBar value={val} />
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Spacer */}
                            <div style={{ height: '1rem' }} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Styles helper (returns object so no CSS file needed) ─────────────────────
function styles() {
    return {
        card: {
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '1rem',
        } as React.CSSProperties,
        heading: {
            fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem',
            color: '#fff',
        } as React.CSSProperties,
        subheading: {
            fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.6rem',
            color: 'rgba(255,255,255,0.7)',
        } as React.CSSProperties,
        primaryBtn: {
            width: '100%', padding: '0.65rem', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #6c63ff, #a29bfe)',
            color: '#fff', fontWeight: 800, fontSize: '0.9rem',
            cursor: 'pointer', textAlign: 'center' as const,
        } as React.CSSProperties,
    };
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
export default function TestSMPLPage() {
    return (
        <AuthGuard>
            <TestSMPLContent />
        </AuthGuard>
    );
}
