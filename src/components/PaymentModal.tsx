'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createOrder, getAddresses, addAddress, Address } from '@/lib/firestore';
import type { OrderItem } from '@/lib/firestore';
import AddressModal from './AddressModal';

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

type Step = 'address' | 'confirm' | 'processing' | 'success' | 'error';

const SHIPMENT_STEPS = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

export default function PaymentModal({ isOpen, onClose, onSuccess, items, totalAmount, shirtSize, pantsSize }: PaymentModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<Step>('address');
    const [errorMsg, setErrorMsg] = useState('');

    // Address state
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [addrLoading, setAddrLoading] = useState(true);

    // Load addresses when modal opens
    useEffect(() => {
        if (!isOpen || !user) return;
        setStep('address');
        setAddrLoading(true);
        getAddresses(user.uid).then(list => {
            setAddresses(list);
            const def = list.find(a => a.isDefault) ?? list[0];
            if (def?.id) setSelectedAddressId(def.id);
            setAddrLoading(false);
        });
    }, [isOpen, user]);

    const handleAddNewAddress = async (addr: Omit<Address, 'id' | 'createdAt'>) => {
        if (!user) return;
        const id = await addAddress(user.uid, addr);
        const refreshed = await getAddresses(user.uid);
        setAddresses(refreshed);
        setSelectedAddressId(id);
    };

    const selectedAddress = addresses.find(a => a.id === selectedAddressId);

    const handlePay = useCallback(async () => {
        if (!user || !selectedAddress) return;
        setStep('processing');
        setErrorMsg('');

        try {
            const loaded = await loadRazorpayScript();
            if (!loaded) throw new Error('Failed to load payment gateway');

            const res = await fetch('/api/razorpay/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: totalAmount, suitId: items[0]?.suitId, userId: user.uid }),
            });
            const orderData = await res.json();
            if (!res.ok) throw new Error(orderData.error ?? 'Order creation failed');

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
                        name: selectedAddress.name || user.displayName || '',
                        email: user.email || '',
                        contact: selectedAddress.phone,
                    },
                    theme: { color: '#ea580c' },
                    modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
                    handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                        try {
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

                            await createOrder(user.uid, {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                items,
                                amount: totalAmount,
                                status: 'paid',
                                shippingAddress: selectedAddress,
                                shipmentStatus: 'placed',
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
            setTimeout(() => { onSuccess(); onClose(); setStep('address'); }, 2500);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Payment failed';
            if (msg === 'Payment cancelled') { setStep('confirm'); }
            else { setErrorMsg(msg); setStep('error'); }
        }
    }, [user, totalAmount, items, onSuccess, onClose, selectedAddress]);

    const handleClose = () => {
        if (step === 'processing') return;
        setStep('address');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                onClick={step !== 'processing' ? handleClose : undefined}>
                <div className="card" style={{ maxWidth: 460, width: '100%', padding: '2rem', borderRadius: 20, maxHeight: '90vh', overflowY: 'auto' }}
                    onClick={e => e.stopPropagation()}>

                    {/* ── Step 1: Address Selection ── */}
                    {step === 'address' && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>📦 Delivery Address</h2>
                                <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
                            </div>

                            {/* Progress bar */}
                            <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem' }}>
                                {['Address', 'Review', 'Pay'].map((s, i) => (
                                    <div key={s} style={{ flex: 1, height: 3, borderRadius: 9, background: i === 0 ? 'var(--accent)' : 'var(--border)' }} />
                                ))}
                            </div>

                            {addrLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem 0' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
                            ) : (
                                <>
                                    {addresses.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-2)', fontSize: '0.9rem' }}>
                                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📍</div>
                                            No saved addresses yet. Add one below.
                                        </div>
                                    )}

                                    {addresses.map(addr => (
                                        <div key={addr.id}
                                            onClick={() => setSelectedAddressId(addr.id!)}
                                            style={{ border: `2px solid ${selectedAddressId === addr.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: '1rem', marginBottom: '0.75rem', cursor: 'pointer', background: selectedAddressId === addr.id ? 'var(--accent-lt)' : '#fff', transition: 'all 0.15s' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                <div style={{ marginTop: 2, width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selectedAddressId === addr.id ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {selectedAddressId === addr.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.92rem' }}>{addr.name}</span>
                                                        {addr.isDefault && <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: '#fff', padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>DEFAULT</span>}
                                                    </div>
                                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                                                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} – {addr.pincode}
                                                    </p>
                                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>📱 {addr.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button onClick={() => setShowAddAddress(true)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 12, border: '1.5px dashed var(--accent)', background: 'var(--accent-lt)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        + Add New Address
                                    </button>

                                    <button onClick={() => setStep('confirm')} disabled={!selectedAddressId}
                                        className="btn-primary w-full" style={{ width: '100%', padding: '1rem', fontSize: '1rem', textAlign: 'center', opacity: selectedAddressId ? 1 : 0.5 }}>
                                        Deliver Here →
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {/* ── Step 2: Order Review ── */}
                    {step === 'confirm' && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                                <button onClick={() => setStep('address')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-3)' }}>←</button>
                                <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>🧾 Order Summary</h2>
                            </div>

                            {/* Progress bar */}
                            <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem' }}>
                                {['Address', 'Review', 'Pay'].map((s, i) => (
                                    <div key={s} style={{ flex: 1, height: 3, borderRadius: 9, background: i <= 1 ? 'var(--accent)' : 'var(--border)' }} />
                                ))}
                            </div>

                            {/* Delivery address summary */}
                            {selectedAddress && (
                                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '0.85rem', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Delivering to</div>
                                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 2 }}>{selectedAddress.name}</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{selectedAddress.line1}{selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{selectedAddress.city}, {selectedAddress.state} – {selectedAddress.pincode}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>📱 {selectedAddress.phone}</div>
                                    <button onClick={() => setStep('address')} style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}>Change</button>
                                </div>
                            )}

                            {/* Items */}
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
                                {['🔒 Razorpay Secured', '✅ 30-day returns', '🚚 Free shipping'].map(b => (
                                    <span key={b} style={{ fontSize: '0.72rem', color: 'var(--text-2)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}>{b}</span>
                                ))}
                            </div>

                            <button onClick={handlePay} className="btn-primary w-full" style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: 12, textAlign: 'center' }}>
                                Pay ₹{totalAmount.toLocaleString()} →
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
                            <h3 style={{ fontWeight: 800, color: '#15803d', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Order Placed Successfully!</h3>
                            <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: '1rem' }}>Your order has been placed. We'll send updates as it ships.</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                                {SHIPMENT_STEPS.map((s, i) => (
                                    <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                        <div style={{ width: i === 0 ? 32 : 24, height: i === 0 ? 32 : 24, borderRadius: '50%', background: i === 0 ? '#15803d' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === 0 ? 14 : 10, color: i === 0 ? '#fff' : 'var(--text-3)' }}>
                                            {i === 0 ? '✓' : i + 1}
                                        </div>
                                        <span style={{ fontSize: '0.6rem', color: i === 0 ? '#15803d' : 'var(--text-3)', textAlign: 'center', maxWidth: 48 }}>{s}</span>
                                    </div>
                                ))}
                            </div>
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

            {/* Address add/edit modal */}
            <AddressModal
                isOpen={showAddAddress}
                onClose={() => setShowAddAddress(false)}
                onSave={handleAddNewAddress}
            />
        </>
    );
}
