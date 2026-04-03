'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
    const { signUp, signInWithGoogle } = useAuth();
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogle = async () => {
        setError(''); setLoading(true);
        try { await signInWithGoogle(); router.push('/onboarding'); }
        catch (e: unknown) { setError(e instanceof Error ? e.message : 'Google sign-in failed'); }
        finally { setLoading(false); }
    };

    const handleRegister = async (ev: React.FormEvent) => {
        ev.preventDefault(); setError('');
        if (password !== confirm) { setError('Passwords do not match'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
        setLoading(true);
        try {
            await signUp(email, password, name);
            router.push('/onboarding');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '';
            if (msg.includes('email-already-in-use')) setError('This email is already registered. Please sign in.');
            else setError('Registration failed. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
            <Link href="/" className="flex items-center gap-2 mb-8">
                <div style={{ width: 42, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>TOM</div>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>TryOnME</span>
            </Link>

            <div className="card w-full" style={{ maxWidth: 420, padding: '2.5rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.25rem' }}>Create account</h1>
                <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: '2rem' }}>Join TryOnME for virtual try-ons & shopping</p>

                <button onClick={handleGoogle} disabled={loading}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0.85rem', borderRadius: 12, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '1.25rem' }}>
                    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                        <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                    </svg>
                    Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>or register with email</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="John Doe" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="you@example.com" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input" placeholder="Minimum 6 characters" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Confirm Password</label>
                        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="input" placeholder="Re-enter password" />
                    </div>

                    {error && <p style={{ fontSize: '0.82rem', color: '#dc2626', background: '#fef2f2', padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #fecaca' }}>{error}</p>}

                    <button type="submit" disabled={loading} className="btn-primary w-full" style={{ padding: '0.9rem', fontSize: '0.95rem', textAlign: 'center', width: '100%' }}>
                        {loading ? 'Creating account…' : 'Create Account →'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-3)' }}>
                    Already have an account?{' '}
                    <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in →</Link>
                </p>
            </div>
        </div>
    );
}
