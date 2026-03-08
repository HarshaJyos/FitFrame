'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/orders', label: 'Orders', icon: '📦' },
    { href: '/admin/inventory', label: 'Inventory', icon: '🗃️' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
    { href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Allow login page without sidebar
    if (pathname === '/admin/login') return <>{children}</>;

    const handleSignOut = async () => {
        await signOut();
        router.push('/admin/login');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex' }}>
            {/* Sidebar */}
            <aside style={{ width: 240, background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 60, transition: 'transform 0.2s' }}>
                {/* Logo */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>⚙️</div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>FitFrame</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Admin Panel</div>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {NAV.map(item => {
                        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <Link key={item.href} href={item.href}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 0.85rem', borderRadius: 10, background: active ? 'rgba(99,102,241,0.2)' : 'transparent', color: active ? '#a5b4fc' : '#94a3b8', fontWeight: active ? 700 : 500, fontSize: '0.88rem', textDecoration: 'none', transition: 'all 0.15s' }}>
                                <span>{item.icon}</span> {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User info */}
                <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem', borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: '0.5rem' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>A</div>
                        <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>Admin</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{user?.email}</div>
                        </div>
                    </div>
                    <button onClick={handleSignOut}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: 8, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)', color: '#fca5a5', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                        🚪 Sign Out
                    </button>
                    <Link href="/" style={{ display: 'block', marginTop: 6, textAlign: 'center', fontSize: '0.72rem', color: '#475569', textDecoration: 'none' }}>
                        ← Back to store
                    </Link>
                </div>
            </aside>

            {/* Main content */}
            <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
                {children}
            </main>
        </div>
    );
}
