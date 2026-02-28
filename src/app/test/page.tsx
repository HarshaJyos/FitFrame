"use client";

import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues with Three.js
const GltfViewer = dynamic(() => import("@/components/GltfViewer"), { ssr: false });

/**
 * Test page — visit http://localhost:3000/test
 * Change MODEL_PATH to test different GLB files.
 */
const MODEL_PATH = "/gltf/male_m05.glb";

export default function TestPage() {
    return (
        <main style={{ width: "100vw", height: "100vh", background: "#0a111f" }}>
            <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, color: "#94a3b8", fontFamily: "monospace", fontSize: 12 }}>
                🧪 GLB Viewer Test &nbsp;|&nbsp; <code>{MODEL_PATH}</code>
                <br />
                <span style={{ color: "#475569" }}>Drag to rotate · Scroll to zoom · Right-click to pan</span>
            </div>
            <GltfViewer modelPath="/glbbb/male_m05.gltf" />
        </main>
    );
}