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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export default function ProductCard({ id, name, price, originalPrice, bannerUrl, category, color }: ProductCardProps) {
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    const productUrl = `${SITE_URL}/shop/${id}`;

    return (
        <Link href={productUrl} className="chatbot-product-card" style={{ textDecoration: 'none' }}>
            {/* Banner (left) */}
            <div className="chatbot-product-banner">
                {bannerUrl ? (
                    <img src={bannerUrl} alt={name} />
                ) : (
                    <div className="chatbot-product-placeholder" style={{ background: color || 'var(--border)' }}>
                        <span>🧥</span>
                    </div>
                )}
            </div>

            {/* Info (right) */}
            <div className="chatbot-product-info">
                <span className="chatbot-product-category">{category}</span>
                <h4 className="chatbot-product-name">{name}</h4>
                <div className="chatbot-product-price">
                    <span className="chatbot-product-current">₹{price.toLocaleString('en-IN')}</span>
                    {discount > 0 && (
                        <>
                            <span className="chatbot-product-original">₹{originalPrice.toLocaleString('en-IN')}</span>
                            <span className="chatbot-product-discount">{discount}% off</span>
                        </>
                    )}
                </div>
                <span className="chatbot-product-view">View →</span>
            </div>
        </Link>
    );
}
