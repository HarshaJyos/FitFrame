'use client';

import Link from 'next/link';
import { SUIT_TEXTURES } from '@/utils/modelSelector';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const featured = SUIT_TEXTURES.filter(s => s.badge);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      <Navbar />

      {/* ── Hero ── */}
      <section style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fdf8f3 60%, #fef3e8 100%)', padding: '5rem 1.25rem 4rem' }}>
        <div className="max-w-4xl mx-auto text-center">
          <span className="badge mb-5 inline-block">✨ Virtual Try-On Technology</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 800, lineHeight: 1.15, color: 'var(--text)', marginBottom: '1.25rem' }}>
            Wear it before<br />
            <span style={{ color: 'var(--accent)' }}>you buy it.</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-2)', maxWidth: 520, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Enter your measurements. See how our premium suits look on your exact body shape in real-time 3D. Zero guesswork, perfect fit.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {user ? (
              <>
                <Link href="/shop" className="btn-primary text-base px-7 py-3.5">Browse & Try On →</Link>
                <Link href="/onboarding" className="btn-ghost text-base px-7 py-3.5">Update Measurements</Link>
              </>
            ) : (
              <>
                <Link href="/register" className="btn-primary text-base px-7 py-3.5">Get Started Free →</Link>
                <Link href="/shop" className="btn-ghost text-base px-7 py-3.5">Browse Suits</Link>
              </>
            )}
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-3)' }}>Free to join · Set up in 30 seconds</p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: '📐', title: 'Avatar from Your Measurements', desc: 'Input height, weight, chest, waist and hip. We select the closest 3D body model instantly.' },
            { icon: '🎽', title: '9 Exclusive Suits', desc: 'From formal wool blends to casual linens — see all 9 styles on your exact body shape.' },
            { icon: '🛍️', title: 'Confident Sizing', desc: 'We recommend your shirt and trouser size with 92% confidence based on your real measurements.' },
          ].map((f, i) => (
            <div key={i} className="card p-6" style={{ animationDelay: `${i * 0.1}s` }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text)' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Suits ── */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="section-title">Featured Suits</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Our most-loved styles this season</p>
          </div>
          <Link href="/shop" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem' }}>View all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {featured.map(suit => (
            <Link key={suit.id} href={`/shop/${suit.id}`} className="product-card card overflow-hidden block">
              {/* Colour swatch thumbnail */}
              <div style={{ height: 160, background: `linear-gradient(160deg, ${suit.color}99, ${suit.color})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: '2.5rem' }}>🧥</span>
                {suit.badge && <span className="badge" style={{ fontSize: '10px' }}>{suit.badge}</span>}
              </div>
              <div style={{ padding: '0.9rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 2 }}>{suit.label}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 6 }}>{suit.category}</p>
                <div className="flex items-center gap-2">
                  <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.95rem' }}>₹{suit.price.toLocaleString()}</span>
                  <span style={{ textDecoration: 'line-through', fontSize: '0.78rem', color: 'var(--text-3)' }}>₹{suit.originalPrice.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ background: 'var(--accent)', padding: '3.5rem 1.25rem', marginBottom: 0 }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>Ready to find your perfect fit?</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', fontSize: '1rem' }}>30 seconds to set up. Instant 3D preview.</p>
          <Link href={user ? '/shop' : '/register'} style={{ background: '#fff', color: 'var(--accent)', fontWeight: 700, padding: '0.85rem 2rem', borderRadius: 10, display: 'inline-block', fontSize: '1rem' }}>
            {user ? 'Start Shopping →' : 'Create Free Account →'}
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>© 2025 FitFrame — Virtual Try-On Platform</p>
      </footer>
    </div>
  );
}
