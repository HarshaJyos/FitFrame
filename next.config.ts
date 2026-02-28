import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  experimental: {
    // Disable react compiler for now since Three.js fiber hooks can conflict
  },
};

export default nextConfig;
