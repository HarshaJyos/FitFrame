'use client';

import Link from 'next/link';

interface ProductCardProps {
    id: string;
    name: string;
    price: number;
    originalPrice: number;
    bannerUrl?: string;
    category: string;
    color: string;
}

export default function ProductCard({ id, name, price, originalPrice, bannerUrl, category, color }: ProductCardProps) {
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    return (
        <Link href={`/shop/${id}`} style={{
            display: 'flex',
            gap: 10,
            padding: 8,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            textDecoration: 'none',
            color: 'inherit',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            overflow: 'hidden',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(234,88,12,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            {/* Banner (left) */}
            <div style={{
                width: 64, height: 64, borderRadius: 8,
                overflow: 'hidden', flexShrink: 0,
            }}>
                {bannerUrl ? (
                    <img src={bannerUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        background: color || 'var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, borderRadius: 8,
                    }}>
                        🧥
                    </div>
                )}
            </div>

            {/* Info (right) */}
            <div style={{
                flex: 1, minWidth: 0,
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', gap: 2,
            }}>
                <span style={{
                    fontSize: '0.65rem', color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    fontWeight: 600,
                }}>{category}</span>
                <div style={{
                    fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    margin: 0,
                }}>{name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>
                        ₹{price.toLocaleString('en-IN')}
                    </span>
                    {discount > 0 && (
                        <>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', textDecoration: 'line-through' }}>
                                ₹{originalPrice.toLocaleString('en-IN')}
                            </span>
                            <span style={{
                                fontSize: '0.62rem', fontWeight: 700, color: '#16a34a',
                                background: '#f0fdf4', padding: '1px 4px', borderRadius: 4,
                            }}>
                                {discount}% off
                            </span>
                        </>
                    )}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>View →</span>
            </div>
        </Link>
    );
}
