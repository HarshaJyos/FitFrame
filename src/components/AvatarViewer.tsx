'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, ContactShadows } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

// ─── Pre-load all 9 public/gltf/ models so cache is warm ─────────────────────
const ALL_MODELS = [
    '/gltf/male_m01.glb', '/gltf/male_m02.glb', '/gltf/male_m03.glb',
    '/gltf/male_m04.glb', '/gltf/male_m051.glb', '/gltf/male_m06.glb',
    '/gltf/male_m07.glb', '/gltf/male_m08.glb', '/gltf/male_m09.glb',
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface AvatarViewerProps {
    modelPath: string;
    facePhoto: string | null;
    shirtColor: string;
    pantsColor: string;
    height: number;
    modelKey?: string;
}

// ─── Loading spinner shown inside Suspense ────────────────────────────────────
function Spinner() {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((_, dt) => { if (ref.current) ref.current.rotation.z -= dt * 2; });
    return (
        <mesh ref={ref} position={[0, 1, 0]}>
            <torusGeometry args={[0.25, 0.05, 16, 48]} />
            <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={1} />
        </mesh>
    );
}

// ─── Avatar model ─────────────────────────────────────────────────────────────
interface ModelProps {
    modelPath: string;
    facePhoto: string | null;
    shirtColor: string;
    pantsColor: string;
    heightScale: number;
    onReady: () => void;
}

function Model({ modelPath, facePhoto, shirtColor, pantsColor, heightScale, onReady }: ModelProps) {
    const { scene: gltfScene } = useGLTF(modelPath);
    const { scene: threeScene } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;

    // ── Stores refs to face/skin materials so we can update texture reactively ──
    const faceMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
    // Shared texture object — update its image data in-place when photo changes
    const faceTexRef = useRef<THREE.CanvasTexture | null>(null);
    const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Clone the scene properly (handles skinned meshes / bones)
    const cloned = useRef<THREE.Group | null>(null);
    if (!cloned.current) {
        cloned.current = SkeletonUtils.clone(gltfScene) as THREE.Group;
    }

    // ─── Model setup (runs once on mount) ────────────────────────────────────────
    useEffect(() => {
        const group = groupRef.current;
        const model = cloned.current;
        if (!group || !model) return;

        // Force matrix update so Box3 gives correct results for skinned meshes
        threeScene.add(model);
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        threeScene.remove(model);

        // Normalize height to 1.75 scene units, then apply user height ratio
        const scaleY = size.y > 0 ? (1.75 / size.y) * heightScale : heightScale;

        // Position: feet on y=0, center x/z
        group.position.set(-center.x * scaleY, -box.min.y * scaleY, -center.z * scaleY);
        group.scale.setScalar(scaleY);

        // Reset face material refs for this model
        faceMatsRef.current = [];

        // ── Traverse all meshes, fix materials, collect face/skin mesh refs ──
        model.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return;
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const meshName = mesh.name.toLowerCase();

            // Log mesh names in dev mode so user can inspect model structure
            if (process.env.NODE_ENV === 'development') {
                const matName = Array.isArray(mesh.material)
                    ? mesh.material.map(m => m.name).join(',')
                    : (mesh.material as THREE.Material).name;
                console.log(`[Avatar Mesh] "${mesh.name}" | mat: "${matName}"`);
            }

            // ── Decide if this mesh is a face/skin candidate ──
            // MakeHuman names vary — we match broadly and also check material name
            const matName = Array.isArray(mesh.material)
                ? (mesh.material[0] as THREE.Material).name.toLowerCase()
                : (mesh.material as THREE.Material).name.toLowerCase();

            const isFaceMesh =
                meshName.includes('head') || meshName.includes('face') ||
                meshName.includes('skin') || meshName.includes('body') ||
                matName.includes('head') || matName.includes('face') ||
                matName.includes('skin') || matName.includes('body');

            const processMat = (m: THREE.Material): THREE.Material => {
                const mat = (m as THREE.MeshStandardMaterial).clone() as THREE.MeshStandardMaterial;

                // Render both sides — fixes see-through interior issue
                mat.side = THREE.DoubleSide;

                // Force opaque for skin/clothing (hair/lashes keep their transparency)
                const isHairOrLash = meshName.includes('hair') || meshName.includes('lash') ||
                    meshName.includes('brow');
                if (!isHairOrLash) {
                    mat.transparent = false;
                    mat.depthWrite = true;
                    mat.alphaTest = 0;
                }
                mat.needsUpdate = true;

                // Shirt / upper body colors
                const isShirt = meshName.includes('tshirt') || meshName.includes('shirt') ||
                    meshName.includes('top') || meshName.includes('jersey') || meshName.includes('torso');
                if (isShirt) { mat.color.set(shirtColor); mat.needsUpdate = true; }

                // Pants / lower body colors
                const isPants = meshName.includes('jeans') || meshName.includes('pant') ||
                    meshName.includes('trouser') || meshName.includes('bottom') || meshName.includes('leg');
                if (isPants) { mat.color.set(pantsColor); mat.needsUpdate = true; }

                // Collect face material refs so they can be updated reactively
                if (isFaceMesh) {
                    faceMatsRef.current.push(mat);
                }

                return mat;
            };

            if (Array.isArray(mesh.material)) {
                mesh.material = mesh.material.map(processMat);
            } else {
                mesh.material = processMat(mesh.material);
            }
        });

        // Attach model to our group in the scene
        group.add(model);
        onReadyRef.current();

        return () => { group.remove(model); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Reactive face texture application ────────────────────────────────────────
    // Runs whenever facePhoto changes (e.g., user takes a new photo after model loads)
    useEffect(() => {
        if (!facePhoto) {
            // Remove face texture if photo is cleared
            faceMatsRef.current.forEach(mat => {
                mat.map = null;
                mat.needsUpdate = true;
            });
            return;
        }

        const img = new Image();
        img.onload = () => {
            // Reuse existing canvas / texture objects to avoid GPU leaks
            if (!faceCanvasRef.current) {
                faceCanvasRef.current = document.createElement('canvas');
                faceCanvasRef.current.width = 512;
                faceCanvasRef.current.height = 512;
            }

            const canvas = faceCanvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear with a neutral skin-tone background so edges blend
            ctx.clearRect(0, 0, 512, 512);
            ctx.fillStyle = '#c8956c'; // approximate skin tone
            ctx.fillRect(0, 0, 512, 512);

            // ── Face crop: take center-top square of the photo (face region) ──
            const srcSize = Math.min(img.width, img.height);
            const srcX = (img.width - srcSize) / 2;
            // Shift source window up by 10% to bias toward face (not neck)
            const srcY = Math.max(0, (img.height - srcSize) / 2 - img.height * 0.1);

            // ── Oval clip: gives natural face shape blending into the head mesh ──
            ctx.save();
            ctx.beginPath();
            // Ellipse: slightly taller than wide, centered at upper 55% of canvas
            ctx.ellipse(
                256,          // cx
                240,          // cy — slightly above center (face is in upper area)
                220,          // rx
                260,          // ry — taller for forehead + chin
                0, 0, Math.PI * 2
            );
            ctx.clip();
            ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 16, 8, 480, 480);
            ctx.restore();

            // Create or reuse the Three.js CanvasTexture
            if (!faceTexRef.current) {
                const tex = new THREE.CanvasTexture(canvas);
                tex.flipY = false; // GLB UV origin is top-left, not bottom-left
                tex.colorSpace = THREE.SRGBColorSpace;
                faceTexRef.current = tex;
            } else {
                // Just mark existing texture as dirty — no new GPU object
                faceTexRef.current.needsUpdate = true;
            }

            // Apply texture to all collected face/skin materials
            const tex = faceTexRef.current;
            faceMatsRef.current.forEach(mat => {
                mat.map = tex;
                mat.needsUpdate = true;
            });
        };
        img.src = facePhoto;
    }, [facePhoto]);

    // ─── Reactive clothing colour updates (no model reload needed) ─────────────
    useEffect(() => {
        if (!groupRef.current) return;
        groupRef.current.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return;
            const mesh = child as THREE.Mesh;
            const name = mesh.name.toLowerCase();
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
                const mat = m as THREE.MeshStandardMaterial;
                const isShirt = name.includes('tshirt') || name.includes('shirt') ||
                    name.includes('top') || name.includes('jersey') || name.includes('torso');
                const isPants = name.includes('jeans') || name.includes('pant') ||
                    name.includes('trouser') || name.includes('bottom') || name.includes('leg');
                if (isShirt) { mat.color.set(shirtColor); mat.needsUpdate = true; }
                if (isPants) { mat.color.set(pantsColor); mat.needsUpdate = true; }
            });
        });
    }, [shirtColor, pantsColor]);

    return <group ref={groupRef} />;
}

// ─── Ground plane ─────────────────────────────────────────────────────────────
function Ground() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#060d1f" roughness={1} />
        </mesh>
    );
}

// ─── Full scene (lights + camera controls + model) ────────────────────────────
function Scene({ modelPath, facePhoto, shirtColor, pantsColor, heightScale, onModelReady }: {
    modelPath: string; facePhoto: string | null; shirtColor: string;
    pantsColor: string; heightScale: number; onModelReady: () => void;
}) {
    return (
        <>
            {/* ── Scene background color (fixes white canvas) ── */}
            <color attach="background" args={['#08101e']} />

            {/* ── Lighting rig for MakeHuman high-roughness PBR skin ── */}
            {/*
             * MakeHuman exports use roughness ~0.8, metalness ~0, so they need
             * strong ambient + a clear key light to avoid looking flat/dark.
             */}

            {/* Ambient — fills the whole scene so no face is completely black */}
            <ambientLight intensity={2.0} />

            {/* Key light — main illumination from front-top-right */}
            <directionalLight
                position={[2, 5, 3]}
                intensity={3}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-near={0.1}
                shadow-camera-far={20}
                shadow-camera-left={-3}
                shadow-camera-right={3}
                shadow-camera-top={4}
                shadow-camera-bottom={-1}
            />

            {/* Fill light — softer, from the left to fill shadows */}
            <directionalLight position={[-3, 3, 2]} intensity={1.5} />

            {/* Rim / back light — separates model from background */}
            <directionalLight position={[0, 2, -4]} intensity={1.2} />

            {/* Hemisphere — sky/ground gradient for natural look */}
            <hemisphereLight args={['#c8d8ff', '#0a0f1e', 1.2]} />

            {/* Point lights for face-level warmth */}
            <pointLight position={[0, 2, 3]} intensity={1.5} color="#fff5e6" />
            <pointLight position={[-2, 1.5, 1]} intensity={0.8} color="#e0ecff" />

            <Ground />
            <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={8} blur={2} far={4} />

            <OrbitControls
                enablePan={false}
                enableZoom={true}
                enableRotate={true}
                target={[0, 0.9, 0]}
                minDistance={1.5}
                maxDistance={5}
                maxPolarAngle={Math.PI / 1.85}
            />

            {/* The model — Suspense shows spinner while useGLTF fetches */}
            <Suspense fallback={<Spinner />}>
                <Model
                    modelPath={modelPath}
                    facePhoto={facePhoto}
                    shirtColor={shirtColor}
                    pantsColor={pantsColor}
                    heightScale={heightScale}
                    onReady={onModelReady}
                />
            </Suspense>
        </>
    );
}

// ─── AvatarViewer (exported) ──────────────────────────────────────────────────
export function AvatarViewer({ modelPath, facePhoto, shirtColor, pantsColor, height, modelKey }: AvatarViewerProps) {
    const heightScale = Math.max(0.8, Math.min(1.2, height / 175));
    const [isLoading, setIsLoading] = useState(true);
    // Force canvas remount when model changes (clears cached cloned scene ref)
    const canvasKey = modelKey ?? modelPath;

    return (
        /*
         * CRITICAL: The container MUST have an explicit height (not just h-full from a flex parent).
         * We use position:absolute to fill the parent — this breaks the R3F infinite resize loop
         * that happens when Canvas tries to match a flex container with no fixed height.
         */
        <div className="absolute inset-0 rounded-2xl overflow-hidden bg-slate-950">
            <Canvas
                key={canvasKey}
                shadows
                dpr={[1, 1.5]}
                camera={{ position: [0, 1.3, 3.8], fov: 48, near: 0.1, far: 50 }}
                gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
                style={{ width: '100%', height: '100%' }}
            >
                <Scene
                    modelPath={modelPath}
                    facePhoto={facePhoto}
                    shirtColor={shirtColor}
                    pantsColor={pantsColor}
                    heightScale={heightScale}
                    onModelReady={() => setIsLoading(false)}
                />
            </Canvas>

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm pointer-events-none z-10">
                    <div className="relative w-14 h-14 mb-4">
                        <div className="absolute inset-0 rounded-full border-[3px] border-blue-500/20 border-t-blue-500 animate-spin" />
                        <div className="absolute inset-2 rounded-full border-[2px] border-indigo-400/20 border-b-indigo-400 animate-spin"
                            style={{ animationDuration: '0.7s', animationDirection: 'reverse' }} />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">Loading 3D Model</p>
                    <p className="text-xs text-slate-600 mt-1">{modelPath.split('/').pop()}</p>
                </div>
            )}

            {/* Controls hint */}
            {!isLoading && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-slate-500 pointer-events-none whitespace-nowrap">
                    🖱 Drag to rotate · Scroll to zoom
                </div>
            )}

            {/* Face thumbnail */}
            {facePhoto && !isLoading && (
                <div className="absolute top-3 right-3 w-10 h-10 rounded-full border-2 border-blue-400 overflow-hidden shadow-lg">
                    <img src={facePhoto} alt="face" className="w-full h-full object-cover" />
                </div>
            )}

            {/* Model file badge */}
            {!isLoading && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-slate-400 pointer-events-none">
                    {modelPath.split('/').pop()}
                </div>
            )}
        </div>
    );
}

// Kick off pre-loading all 9 models in the background
ALL_MODELS.forEach((p) => useGLTF.preload(p));
