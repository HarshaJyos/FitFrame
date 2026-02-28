'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createOrder } from '@/lib/firestore';
import type { OrderItem } from '@/lib/firestore';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    items: OrderItem[];
    totalAmount: number;
    shirtSize: string;
    pantsSize: string;
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Razorpay: any;
    }
}

function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (document.getElementById('razorpay-script')) { resolve(true); return; }
        const script = document.createElement('script');
        script.id = 'razorpay-script';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export default function PaymentModal({ isOpen, onClose, onSuccess, items, totalAmount, shirtSize, pantsSize }: PaymentModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<'confirm' | 'processing' | 'success' | 'error'>('confirm');
    const [errorMsg, setErrorMsg] = useState('');

    const handlePay = useCallback(async () => {
        if (!user) return;
        setStep('processing');
        setErrorMsg('');

        try {
            // 1. Load Razorpay SDK
            const loaded = await loadRazorpayScript();
            if (!loaded) throw new Error('Failed to load payment gateway');

            // 2. Create order on server
            const res = await fetch('/api/razorpay/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: totalAmount, suitId: items[0]?.suitId, userId: user.uid }),
            });
            const orderData = await res.json();
            if (!res.ok) throw new Error(orderData.error ?? 'Order creation failed');

            // 3. Open Razorpay checkout
            await new Promise<void>((resolve, reject) => {
                const rzp = new window.Razorpay({
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    order_id: orderData.orderId,
                    name: 'FitFrame',
                    description: items.map(i => i.label).join(', '),
                    image: '/favicon.ico',
                    prefill: {
                        name: user.displayName ?? '',
                        email: user.email ?? '',
                    },
                    theme: { color: '#ea580c' },
                    modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
                    handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                        try {
                            // 4. Verify signature server-side
                            const verifyRes = await fetch('/api/razorpay/verify-payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                }),
                            });
                            const verifyData = await verifyRes.json();
                            if (!verifyRes.ok) throw new Error(verifyData.error ?? 'Payment verification failed');

                            // 5. Save order to Firestore
                            await createOrder(user.uid, {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                items,
                                amount: totalAmount,
                                status: 'paid',
                            });

                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    },
                });
                rzp.open();
            });

            setStep('success');
            setTimeout(() => { onSuccess(); onClose(); setStep('confirm'); }, 2000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Payment failed';
            if (msg === 'Payment cancelled') { setStep('confirm'); }
            else { setErrorMsg(msg); setStep('error'); }
        }
    }, [user, totalAmount, items, onSuccess, onClose]);

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={step === 'confirm' ? onClose : undefined}>
            <div className="card" style={{ maxWidth: 400, width: '100%', padding: '2rem', borderRadius: 20 }}
                onClick={e => e.stopPropagation()}>

                {step === 'confirm' && (
                    <>
                        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>🛍️</div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.25rem' }}>Order Summary</h2>
                        <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>Review before paying</p>

                        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
                            {items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: i % 2 === 0 ? 'var(--bg)' : '#fff', fontSize: '0.875rem', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <div>
                                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
                                        <span style={{ color: 'var(--text-3)', marginLeft: 6, fontSize: '0.78rem' }}>Size {item.shirtSize}</span>
                                    </div>
                                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{item.price.toLocaleString()}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0.9rem', background: 'var(--accent-lt)', fontSize: '0.95rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text)' }}>Total</span>
                                <span style={{ fontWeight: 900, color: 'var(--accent)', fontSize: '1.05rem' }}>₹{totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                            {['🔒 Secured by Razorpay', '✅ 30-day returns', '🚚 Free shipping'].map(b => (
                                <span key={b} style={{ fontSize: '0.72rem', color: 'var(--text-2)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}>{b}</span>
                            ))}
                        </div>

                        <button onClick={handlePay} className="btn-primary w-full" style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: 12, textAlign: 'center' }}>
                            Pay ₹{totalAmount.toLocaleString()} →
                        </button>
                        <button onClick={onClose} style={{ width: '100%', padding: '0.7rem', marginTop: '0.5rem', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.875rem' }}>
                            Cancel
                        </button>
                    </>
                )}

                {step === 'processing' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div className="loader" style={{ margin: '0 auto 1.25rem' }} />
                        <h3 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Processing Payment</h3>
                        <p style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>Please complete payment in the Razorpay window…</p>
                    </div>
                )}

                {step === 'success' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
                        <h3 style={{ fontWeight: 800, color: '#15803d', fontSize: '1.2rem', marginBottom: '0.25rem' }}>Payment Successful!</h3>
                        <p style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>Your order has been placed. Check My Account for details.</p>
                    </div>
                )}

                {step === 'error' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h3 style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.5rem' }}>Payment Failed</h3>
                        <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{errorMsg}</p>
                        <button onClick={() => setStep('confirm')} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Try Again</button>
                    </div>
                )}
            </div>
        </div>
    );
}
