"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three-stdlib";

interface GltfViewerProps {
    modelPath: string;
    /** Dark background by default, pass overriding hex e.g. "#ffffff" for white */
    background?: string;
}

export default function GltfViewer({ modelPath, background = "#0a111f" }: GltfViewerProps) {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        // ─── Scene ────────────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(background);

        // ─── Camera ───────────────────────────────────────────────────────────────
        // Use container dimensions — but guard against 0-height before layout paints
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;

        const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 1000);
        camera.position.set(0, 1.5, 4); // sensible default; will be overridden after load

        // ─── Renderer ─────────────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.appendChild(renderer.domElement);

        // ─── Controls ─────────────────────────────────────────────────────────────
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = true;

        // ─── Lights (strong rig so model is always visible) ──────────────────────
        scene.add(new THREE.AmbientLight(0xffffff, 2.5));

        const key = new THREE.DirectionalLight(0xffffff, 3.5);
        key.position.set(3, 6, 4);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        scene.add(key);

        const fill = new THREE.DirectionalLight(0xffffff, 1.5);
        fill.position.set(-4, 3, 2);
        scene.add(fill);

        const rim = new THREE.DirectionalLight(0xffffff, 1.0);
        rim.position.set(0, 2, -5);
        scene.add(rim);

        scene.add(new THREE.HemisphereLight(0xc5d8ff, "#0a0f1e", 1.2));

        // ─── Ground plane ─────────────────────────────────────────────────────────
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: "#060d1f", roughness: 1 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // ─── Load GLTF / GLB ──────────────────────────────────────────────────────
        // GLTFLoader already handles KHR_materials_specular and KHR_materials_ior internally
        const loader = new GLTFLoader();
        let model: THREE.Group | null = null;

        loader.load(
            modelPath,
            (gltf) => {
                model = gltf.scene;

                // Fix materials: double-sided + opaque skin
                model.traverse((child) => {
                    if (!(child as THREE.Mesh).isMesh) return;
                    const mesh = child as THREE.Mesh;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;

                    const fixMat = (m: THREE.Material) => {
                        const mat = m as THREE.MeshStandardMaterial;

                        // ─── CRITICAL FIX: This GLTF has baseColorFactor alpha=0 on all materials.
                        // That makes every mesh 100% transparent (invisible).
                        // Force full opacity here so the model is visible.
                        mat.opacity = 1;
                        mat.transparent = false;
                        mat.depthWrite = true;
                        mat.alphaTest = 0;

                        // Only eyebrows/lashes need transparency for their alpha texture
                        const n = (mesh.name + " " + mat.name).toLowerCase();
                        const needsAlpha = n.includes("eyebrow") || n.includes("lash") || n.includes("hair");
                        if (needsAlpha) {
                            mat.transparent = true;
                            mat.alphaTest = 0.1; // clip fully transparent pixels
                        }

                        mat.side = THREE.DoubleSide;
                        mat.needsUpdate = true;
                    };

                    if (Array.isArray(mesh.material)) mesh.material.forEach(fixMat);
                    else fixMat(mesh.material);
                });

                scene.add(model);

                // Auto-center and fit camera to the model
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Place feet on the ground (y = 0), center X/Z
                model.position.set(-center.x, -box.min.y, -center.z);

                const maxDim = Math.max(size.x, size.y, size.z);
                const fovRad = camera.fov * (Math.PI / 180);
                // Distance to fit the model vertically in view
                const camDist = (maxDim / 2) / Math.tan(fovRad / 2) * 1.6;

                camera.position.set(0, size.y * 0.45, camDist);
                camera.near = maxDim * 0.001;
                camera.far = maxDim * 20;
                camera.lookAt(0, size.y * 0.45, 0);
                camera.updateProjectionMatrix();

                controls.target.set(0, size.y * 0.45, 0);
                controls.minDistance = maxDim * 0.3;
                controls.maxDistance = maxDim * 10;
                controls.update();

                console.log(`[GltfViewer] Loaded "${modelPath}" | size: ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`);
                console.log("[GltfViewer] Meshes:");
                model.traverse((c) => {
                    if ((c as THREE.Mesh).isMesh) {
                        const mat = (c as THREE.Mesh).material;
                        const matName = Array.isArray(mat) ? mat.map(m => m.name).join(",") : (mat as THREE.Material).name;
                        console.log(`  mesh="${c.name}" mat="${matName}"`);
                    }
                });
            },
            (xhr) => {
                if (xhr.total) {
                    console.log(`[GltfViewer] Loading… ${Math.round(xhr.loaded / xhr.total * 100)}%`);
                }
            },
            (error) => {
                console.error("[GltfViewer] Failed to load:", modelPath, error);
            }
        );

        // ─── Resize observer (more reliable than window resize event) ─────────────
        const ro = new ResizeObserver(() => {
            const W = container.clientWidth;
            const H = container.clientHeight;
            camera.aspect = W / H;
            camera.updateProjectionMatrix();
            renderer.setSize(W, H);
        });
        ro.observe(container);

        // ─── Render loop ──────────────────────────────────────────────────────────
        let rafId: number;
        const animate = () => {
            rafId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // ─── Cleanup ──────────────────────────────────────────────────────────────
        return () => {
            cancelAnimationFrame(rafId);
            ro.disconnect();
            controls.dispose();
            renderer.dispose();
            if (model) {
                scene.remove(model);
                model.traverse((c) => {
                    if ((c as THREE.Mesh).isMesh) {
                        (c as THREE.Mesh).geometry?.dispose();
                        const mats = Array.isArray((c as THREE.Mesh).material)
                            ? (c as THREE.Mesh).material as THREE.Material[]
                            : [(c as THREE.Mesh).material as THREE.Material];
                        mats.forEach(m => m?.dispose());
                    }
                });
            }
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
        // Re-run if modelPath changes (new model to test)
    }, [modelPath, background]);

    return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}