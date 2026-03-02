'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, loading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user || !isAdmin) {
            router.replace('/admin/login');
        }
    }, [user, loading, isAdmin, router]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
                <div className="loader" style={{ borderTopColor: '#6366f1' }} />
            </div>
        );
    }

    if (!user || !isAdmin) return null;
    return <>{children}</>;
}
