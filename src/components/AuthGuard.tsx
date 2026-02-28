'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?next=' + encodeURIComponent(window.location.pathname));
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loader" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Loading…</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return <>{children}</>;
}
