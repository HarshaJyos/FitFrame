'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three-stdlib';
import { MODEL_BASE } from '@/utils/modelSelector';

// ─── Shared texture cache (persists across component mounts) ─────────────────
const textureCache = new Map<string, THREE.Texture>();

function getCachedTexture(url: string, loader: THREE.TextureLoader): THREE.Texture {
    if (textureCache.has(url)) return textureCache.get(url)!;
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    textureCache.set(url, tex);
    return tex;
}

// ─── Pre-warm suit texture cache ─────────────────────────────────────────────
let preloadDone = false;
export function preloadSuitTextures() {
    if (preloadDone) return;
    preloadDone = true;
    const loader = new THREE.TextureLoader();
    for (let i = 1; i <= 9; i++) {
        const n = String(i).padStart(2, '0');
        const url = `${MODEL_BASE}/male_casualsuit${n}_diffuse.png`;
        getCachedTexture(url, loader);
    }
}

// ─── Fix GLTF material issues ─────────────────────────────────────────────────
// All materials exported with alphaMode=BLEND and baseColorFactor alpha=0
// → Force opacity=1 and transparent=false for opaque meshes
function fixMeshMaterial(mesh: THREE.Mesh) {
    const fix = (m: THREE.Material) => {
        const mat = m as THREE.MeshStandardMaterial;
        mat.opacity = 1;
        mat.transparent = false;
        mat.depthWrite = true;
        mat.alphaTest = 0;
        mat.side = THREE.DoubleSide;

        // Eyebrows need alpha-clip for their texture transparency
        const combined = (mesh.name + ' ' + mat.name).toLowerCase();
        if (combined.includes('eyebrow') || combined.includes('lash')) {
            mat.transparent = true;
            mat.alphaTest = 0.05;
            mat.depthWrite = false;
        }
        mat.needsUpdate = true;
    };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (Array.isArray(mesh.material)) mesh.material.forEach(fix);
    else fix(mesh.material as THREE.Material);
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AvatarViewer3DHandle {
    swapSuitTexture: (textureUrl: string) => void;
}

interface AvatarViewer3DProps {
    modelPath: string;
    suitTextureUrl: string;
    onReady?: () => void;
    onLoadProgress?: (pct: number) => void;
    viewerRef?: React.MutableRefObject<AvatarViewer3DHandle | null>;
}

export default function AvatarViewer3D({
    modelPath,
    suitTextureUrl,
    onReady,
    onLoadProgress,
    viewerRef,
}: AvatarViewer3DProps) {
    const mountRef = useRef<HTMLDivElement>(null);

    // Keep live mutable refs so closures inside useEffect don't go stale
    const suitMatRefs = useRef<THREE.MeshStandardMaterial[]>([]);
    const texLoader = useRef(new THREE.TextureLoader());
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const onProgressRef = useRef(onLoadProgress);
    onProgressRef.current = onLoadProgress;

    // Expose texture swap via forwarded handle ref
    const swapSuitTexture = useCallback((url: string) => {
        const tex = getCachedTexture(url, texLoader.current);
        suitMatRefs.current.forEach(mat => {
            mat.map = tex;
            mat.needsUpdate = true;
        });
    }, []);

    if (viewerRef) viewerRef.current = { swapSuitTexture };

    // ─── Effect: build scene, load model ────────────────────────────────────────
    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        // Scene — warm off-white background matching light-mode design
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#f5f0eb');

        // Camera
        const W = container.clientWidth || window.innerWidth;
        const H = container.clientHeight || window.innerHeight;
        const camera = new THREE.PerspectiveCamera(48, W / H, 0.01, 1000);
        camera.position.set(0, 1.5, 4.5);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.enablePan = false;
        controls.minDistance = 1.5;
        controls.maxDistance = 7;
        controls.maxPolarAngle = Math.PI / 1.9;
        controls.target.set(0, 1, 0);

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 2.2));

        const key = new THREE.DirectionalLight(0xfff8f0, 3.2);
        key.position.set(2, 5, 3);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 30;
        key.shadow.camera.left = -4;
        key.shadow.camera.right = 4;
        key.shadow.camera.top = 6;
        key.shadow.camera.bottom = -1;
        scene.add(key);

        const fill = new THREE.DirectionalLight(0xe8f4ff, 1.6);
        fill.position.set(-3, 3, 2);
        scene.add(fill);

        const rim = new THREE.DirectionalLight(0xffffff, 1.0);
        rim.position.set(0, 3, -5);
        scene.add(rim);

        scene.add(new THREE.HemisphereLight(0xc8d9ff, '#050a14', 1.4));

        // Ground — light neutral tone
        const ground = new THREE.Mesh(
            new THREE.CircleGeometry(12, 64),
            new THREE.MeshStandardMaterial({ color: '#e8dfd4', roughness: 0.9, metalness: 0 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Subtle grid on ground
        const grid = new THREE.GridHelper(24, 32, '#d4c9bc', '#e0d6cc');
        (grid.material as THREE.Material).opacity = 0.5;
        (grid.material as THREE.Material).transparent = true;
        scene.add(grid);

        // ─── Load model ──────────────────────────────────────────────────────────
        const loader = new GLTFLoader();
        let model: THREE.Group | null = null;

        // Capture current suitTextureUrl at load time
        const initialSuitUrl = suitTextureUrl;

        loader.load(
            modelPath,
            (gltf) => {
                model = gltf.scene;
                suitMatRefs.current = [];

                model.traverse((child) => {
                    if (!(child as THREE.Mesh).isMesh) return;
                    const mesh = child as THREE.Mesh;
                    fixMeshMaterial(mesh);

                    // Find the casualsuit material(s) — this is the swappable jacket
                    const mats = Array.isArray(mesh.material)
                        ? mesh.material as THREE.MeshStandardMaterial[]
                        : [mesh.material as THREE.MeshStandardMaterial];

                    mats.forEach((mat) => {
                        if (mat.name.toLowerCase().includes('casualsuit')) {
                            suitMatRefs.current.push(mat);
                            // Apply initial texture (may differ from the baked one)
                            const tex = getCachedTexture(initialSuitUrl, texLoader.current);
                            mat.map = tex;
                            mat.needsUpdate = true;
                        }
                    });
                });

                scene.add(model);

                // IMPORTANT: force matrix update so Box3 sees correct world positions
                // (skinned meshes / nodes with rotation quaternions need this)
                model.updateMatrixWorld(true);

                // Auto-fit camera from bounding box
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                console.log('[AvatarViewer3D] bbox size:', size, 'center:', center);

                // Place feet on ground (y=0), centre x/z on origin
                model.position.set(-center.x, -box.min.y, -center.z);

                const height = size.y > 0 ? size.y : 10; // fallback if bbox empty
                const fovRad = camera.fov * (Math.PI / 180);
                // Distance that fits the full model height vertically
                const camDist = (height * 0.7) / Math.tan(fovRad / 2);

                camera.position.set(0, height * 0.45, camDist);
                camera.near = height * 0.001;
                camera.far = height * 50;
                camera.lookAt(0, height * 0.45, 0);
                camera.updateProjectionMatrix();

                controls.target.set(0, height * 0.45, 0);
                controls.minDistance = height * 0.2;
                controls.maxDistance = height * 3;
                controls.update();

                onReadyRef.current?.();
            },
            (xhr) => {
                if (xhr.total) onProgressRef.current?.(Math.round((xhr.loaded / xhr.total) * 100));
            },
            (err) => console.error('[AvatarViewer3D] Load error:', err)
        );

        // Resize
        const ro = new ResizeObserver(() => {
            const W = container.clientWidth;
            const H = container.clientHeight;
            camera.aspect = W / H;
            camera.updateProjectionMatrix();
            renderer.setSize(W, H);
        });
        ro.observe(container);

        // Render loop
        let rafId: number;
        const animate = () => {
            rafId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
            cancelAnimationFrame(rafId);
            ro.disconnect();
            controls.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
            if (model) {
                scene.remove(model);
                model.traverse((c) => {
                    if ((c as THREE.Mesh).isMesh) {
                        (c as THREE.Mesh).geometry?.dispose();
                    }
                });
            }
        };
        // Re-run only when model changes (suit texture swap is imperative via ref, no re-mount needed)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelPath]);

    // Sync texture when suitTextureUrl prop changes after mount
    useEffect(() => {
        if (suitMatRefs.current.length === 0) return;
        swapSuitTexture(suitTextureUrl);
    }, [suitTextureUrl, swapSuitTexture]);

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
