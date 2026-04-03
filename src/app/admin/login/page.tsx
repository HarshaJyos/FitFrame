'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage() {
    const { signInWithEmail, user, isAdmin } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('admin@admin.com');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (email !== 'admin@admin.com') {
            setError('Only admin@admin.com can access the admin panel.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await signInWithEmail(email, password);
            router.replace('/admin');
        } catch {
            setError('Invalid credentials. Check your password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div style={{ width: '100%', maxWidth: 400 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.4rem', margin: '0 auto 0.75rem' }}>⚙️</div>
                    <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', marginBottom: 4 }}>TryOnME Admin</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Restricted access. Admin only.</p>
                </div>

                {/* Card */}
                <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '2rem' }}>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Admin Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter admin password"
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }} />
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: '#fca5a5' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            style={{ padding: '0.9rem', borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}>
                            {loading ? 'Signing in…' : '🔐 Sign in to Admin'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.78rem', marginTop: '1.5rem' }}>
                    Not an admin? <a href="/" style={{ color: '#6366f1' }}>Go to shop →</a>
                </p>
            </div>
        </div>
    );
}
