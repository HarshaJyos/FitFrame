'use client';

import { useState } from 'react';
import { Address } from '@/lib/firestore';

const STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (address: Omit<Address, 'id' | 'createdAt'>) => Promise<void>;
    initial?: Partial<Address>;
}

const EMPTY: Omit<Address, 'id' | 'createdAt'> = {
    name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false,
};

export default function AddressModal({ isOpen, onClose, onSave, initial }: Props) {
    const [form, setForm] = useState<Omit<Address, 'id' | 'createdAt'>>({ ...EMPTY, ...initial });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});

    const set = (f: keyof typeof form, v: string | boolean) =>
        setForm(p => ({ ...p, [f]: v }));

    const validate = () => {
        const e: typeof errors = {};
        if (!form.name.trim()) e.name = 'Full name required';
        if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Valid 10-digit mobile required';
        if (!form.line1.trim()) e.line1 = 'Address line 1 required';
        if (!form.city.trim()) e.city = 'City required';
        if (!form.state) e.state = 'State required';
        if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Valid 6-digit pincode required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await onSave(form);
            setForm({ ...EMPTY });
            setErrors({});
            onClose();
        } catch {
            // keep modal open
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
        <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>
                {label} {key !== 'line2' && <span style={{ color: '#dc2626' }}>*</span>}
            </label>
            <input
                type={type}
                placeholder={placeholder}
                value={(form[key] as string) || ''}
                onChange={e => set(key, e.target.value)}
                className="input"
                style={errors[key] ? { borderColor: '#dc2626' } : {}}
            />
            {errors[key] && <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 2 }}>{errors[key]}</p>}
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={onClose}>
            <div className="card" style={{ maxWidth: 480, width: '100%', padding: '2rem', borderRadius: 20, maxHeight: '90vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>
                        {initial?.line1 ? 'Edit Address' : 'Add New Address'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {field('Full Name', 'name', 'text', 'Recipient name')}
                    {field('Mobile Number', 'phone', 'tel', '10-digit mobile')}
                    {field('Address Line 1', 'line1', 'text', 'House no., Street, Area')}
                    {field('Address Line 2 (optional)', 'line2', 'text', 'Landmark, Locality')}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {field('City / District', 'city', 'text', 'City')}
                        {field('Pincode', 'pincode', 'text', '6-digit code')}
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>
                            State <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <select
                            value={form.state}
                            onChange={e => set('state', e.target.value)}
                            className="input"
                            style={errors.state ? { borderColor: '#dc2626' } : {}}>
                            <option value="">Select state</option>
                            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {errors.state && <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 2 }}>{errors.state}</p>}
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!form.isDefault} onChange={e => set('isDefault', e.target.checked)}
                            style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Set as default address</span>
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-2)', cursor: 'pointer', fontWeight: 600 }}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ flex: 2, padding: '0.75rem', textAlign: 'center' }}>
                        {saving ? 'Saving…' : initial?.line1 ? 'Update Address' : 'Save Address'}
                    </button>
                </div>
            </div>
        </div>
    );
}
