'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { processFacePhoto } from '@/utils/faceProcessor';

interface CameraCaptureProps {
    onCapture: (photoDataUrl: string) => void;
    onClose: () => void;
}

type CameraState = 'requesting' | 'active' | 'preview' | 'error';

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [cameraState, setCameraState] = useState<CameraState>('requesting');
    const [errorMsg, setErrorMsg] = useState('');
    const streamRef = useRef<MediaStream | null>(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setStream(null);
    }, []);

    const startCamera = useCallback(async (mode: 'user' | 'environment') => {
        stopStream();
        setCameraState('requesting');
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            streamRef.current = mediaStream;
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setCameraState('active');
        } catch (err) {
            console.error('Camera error:', err);
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setErrorMsg(
                msg.includes('Permission') || msg.includes('NotAllowed')
                    ? 'Camera permission denied. Please allow camera access in your browser settings.'
                    : 'Could not access camera. Please check your device.'
            );
            setCameraState('error');
        }
    }, [stopStream]);

    useEffect(() => {
        startCamera(facingMode);
        return () => stopStream();
    }, [facingMode, startCamera, stopStream]);

    // Attach stream to video element when both are ready
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Mirror if front camera
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedPhoto(dataUrl);
        setCameraState('preview');
        stopStream();
    };

    const retake = () => {
        setCapturedPhoto(null);
        startCamera(facingMode);
    };

    const usePhoto = async () => {
        if (!capturedPhoto) return;
        const processed = await processFacePhoto(capturedPhoto);
        onCapture(processed);
        onClose();
    };

    const switchCamera = () => {
        setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <span>📸</span> Capture Face Photo
                    </h2>
                    <button
                        onClick={() => { stopStream(); onClose(); }}
                        className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                    >
                        ✕
                    </button>
                </div>

                {/* Camera / Preview area */}
                <div className="relative aspect-video bg-black overflow-hidden">
                    {cameraState === 'requesting' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm">Starting camera...</p>
                        </div>
                    )}

                    {cameraState === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                            <span className="text-4xl">📷</span>
                            <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
                            <button
                                onClick={() => startCamera(facingMode)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {(cameraState === 'active') && (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                        />
                    )}

                    {cameraState === 'preview' && capturedPhoto && (
                        <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                    )}

                    {/* Face guide overlay */}
                    {cameraState === 'active' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-48 h-56 border-2 border-blue-400/60 rounded-full" style={{
                                boxShadow: 'inset 0 0 0 1px rgba(96,165,250,0.2)'
                            }} />
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="px-5 py-4 space-y-3">
                    {cameraState === 'active' && (
                        <div className="flex items-center gap-3 justify-center">
                            <button
                                onClick={switchCamera}
                                className="w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition-all text-lg"
                                title="Switch Camera"
                            >
                                🔄
                            </button>
                            <button
                                onClick={capturePhoto}
                                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg shadow-white/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                <div className="w-12 h-12 rounded-full bg-white border-4 border-slate-200" />
                            </button>
                            <div className="w-10 h-10" /> {/* spacer */}
                        </div>
                    )}

                    {cameraState === 'preview' && (
                        <div className="flex gap-3">
                            <button
                                onClick={retake}
                                className="flex-1 py-2.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-all"
                            >
                                🔁 Retake
                            </button>
                            <button
                                onClick={usePhoto}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20"
                            >
                                ✅ Use Photo
                            </button>
                        </div>
                    )}

                    <p className="text-center text-xs text-slate-600">
                        {cameraState === 'active' ? 'Align your face within the oval guide' : cameraState === 'preview' ? 'Looking good! Use this photo or retake.' : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}
