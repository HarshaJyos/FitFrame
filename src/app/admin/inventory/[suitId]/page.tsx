'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { getSuit, updateSuit, softDeleteSuit, Suit } from '@/lib/suits';

const CATEGORIES = ['Formal', 'Business', 'Casual', 'Premium', 'Party', 'Ethnic'];
const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28"', '30"', '32"', '34"', '36"', '38"'];

const EMPTY: Omit<Suit, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '', description: '', price: 0, originalPrice: 0,
    highlights: ['', '', ''], tags: [], fabric: '', category: 'Formal',
    gender: 'unisex',
    badge: '', color: '#1e3a5f', textureUrl: '', cloudinaryPublicId: '',
    sizes: [], stock: 50, isActive: true, isDeleted: false,
};

function EditSuitContent() {
    const params = useParams();
    const router = useRouter();
    const suitId = params.suitId as string;
    const isNew = suitId === 'new';

    const [form, setForm] = useState<Omit<Suit, 'id' | 'createdAt' | 'updatedAt'>>(EMPTY);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    // Texture upload state
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Banner upload state
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadMsgBanner, setUploadMsgBanner] = useState('');
    const [previewBanner, setPreviewBanner] = useState<string | null>(null);
    const bannerRef = useRef<HTMLInputElement>(null);

    const set = <K extends keyof typeof form>(key: K, val: typeof form[K]) =>
        setForm(p => ({ ...p, [key]: val }));

    // Load existing suit
    useEffect(() => {
        if (isNew) return;
        getSuit(suitId).then(suit => {
            if (!suit) { setError('Suit not found'); setLoading(false); return; }
            const { id, createdAt, updatedAt, ...rest } = suit;
            // Ensure highlights is always an array of at least 3
            const hl = Array.isArray(rest.highlights) ? [...rest.highlights] : [];
            while (hl.length < 3) hl.push('');
            setForm({ ...rest, highlights: hl });
            setLoading(false);
        });
    }, [suitId, isNew]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPreview(URL.createObjectURL(file));
        setUploadMsg('');
    };

    const handleUpload = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadMsg('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'fitframe/textures');
            if (!isNew && suitId) formData.append('publicId', `suit_${suitId}_texture`);

            const res = await fetch('/api/cloudinary/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Upload failed');

            set('textureUrl', data.url);
            set('cloudinaryPublicId', data.publicId);
            setUploadMsg('✅ Uploaded! Save the form to apply.');
        } catch (err: unknown) {
            setUploadMsg(`❌ ${err instanceof Error ? err.message : 'Upload failed'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPreviewBanner(URL.createObjectURL(file));
        setUploadMsgBanner('');
    };

    const handleUploadBanner = async () => {
        const file = bannerRef.current?.files?.[0];
        if (!file) return;
        setUploadingBanner(true);
        setUploadMsgBanner('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'fitframe/banners');
            if (!isNew && suitId) formData.append('publicId', `suit_${suitId}_banner`);

            const res = await fetch('/api/cloudinary/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Upload failed');

            set('bannerUrl', data.url);
            set('cloudinaryBannerPublicId', data.publicId);
            setUploadMsgBanner('✅ Uploaded! Save the form to apply.');
        } catch (err: unknown) {
            setUploadMsgBanner(`❌ ${err instanceof Error ? err.message : 'Upload failed'}`);
        } finally {
            setUploadingBanner(false);
        }
    };

    const validate = (): string => {
        if (!form.name.trim()) return 'Name is required';
        if (!form.description.trim()) return 'Description is required';
        if (form.price <= 0) return 'Price must be > 0';
        if (form.originalPrice < form.price) return 'Original price must be ≥ selling price';
        if (!form.textureUrl) return 'Please upload a texture image first';
        if (!form.bannerUrl) return 'Please upload a banner image first';
        if (!form.fabric.trim()) return 'Fabric is required';
        if (form.stock < 0) return 'Stock cannot be negative';
        return '';
    };

    const handleSave = async () => {
        const err = validate();
        if (err) { setError(err); return; }
        setSaving(true);
        setError('');
        try {
            const payload = {
                ...form,
                price: Number(form.price),
                originalPrice: Number(form.originalPrice),
                stock: Number(form.stock),
                highlights: form.highlights.filter(h => h.trim()),
                sizes: form.sizes || [],
            };
            if (isNew) {
                const { createSuit } = await import('@/lib/suits');
                const id = await createSuit(payload);
                router.push(`/admin/inventory/${id}`);
            } else {
                await updateSuit(suitId, payload);
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            setError('Save failed. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${form.name}"? It will be hidden from the shop.`)) return;
        setDeleting(true);
        await softDeleteSuit(suitId);
        router.push('/admin/inventory');
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="loader" /></div>;

    return (
        <div style={{ padding: '2rem', maxWidth: 900 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem', flexWrap: 'wrap' }}>
                <Link href="/admin/inventory" style={{ color: '#94a3b8', fontSize: '0.9rem', textDecoration: 'none' }}>← Inventory</Link>
                <span style={{ color: '#e2e8f0' }}>/</span>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>
                    {isNew ? '+ Add New Suit' : `Edit: ${form.name || 'Suit'}`}
                </h1>
                {!isNew && (
                    <button onClick={handleDelete} disabled={deleting}
                        style={{ marginLeft: 'auto', padding: '0.4rem 0.85rem', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                        {deleting ? 'Deleting…' : '🗑 Delete Suit'}
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                {/* ── Left column ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Basic info */}
                    <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '1rem', fontSize: '0.95rem' }}>Basic Information</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {[
                                { label: 'Suit Name *', key: 'name', placeholder: 'e.g. Navy Formal Suit' },
                                { label: 'Fabric *', key: 'fabric', placeholder: 'e.g. 60% Wool, 40% Polyester' },
                                { label: 'Badge (optional)', key: 'badge', placeholder: 'e.g. Best Seller, New, Limited' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{f.label}</label>
                                    <input type="text" value={(form[f.key as keyof typeof form] as string) || ''} placeholder={f.placeholder}
                                        onChange={e => set(f.key as keyof typeof form, e.target.value as never)}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            ))}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Description *</label>
                                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                                    rows={3} placeholder="Describe the suit, occasion, feel…"
                                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Tags (comma-separated for recommendations)</label>
                                <input type="text" value={(form.tags || []).join(', ')} onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                                    placeholder="e.g. formal, premium, blue"
                                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                    </div>

                    {/* Highlights */}
                    <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                            <h3 style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Highlights / Features</h3>
                            <button onClick={() => set('highlights', [...(form.highlights ?? []), ''])}
                                style={{ padding: '0.3rem 0.7rem', borderRadius: 7, border: '1px dashed #6366f1', color: '#6366f1', background: '#f5f3ff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                + Add
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(form.highlights ?? []).map((h, i) => (
                                <div key={i} style={{ display: 'flex', gap: 6 }}>
                                    <input type="text" value={h} placeholder={`Feature ${i + 1}`}
                                        onChange={e => {
                                            const arr = [...(form.highlights ?? [])];
                                            arr[i] = e.target.value;
                                            set('highlights', arr);
                                        }}
                                        style={{ flex: 1, padding: '0.5rem 0.7rem', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }} />
                                    <button onClick={() => set('highlights', (form.highlights ?? []).filter((_, j) => j !== i))}
                                        style={{ padding: '0.4rem 0.6rem', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer' }}>✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Right column ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Texture upload */}
                    <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.85rem', fontSize: '0.95rem' }}>Suit Texture (Cloudinary) *</h3>
                        <div onClick={() => fileRef.current?.click()}
                            style={{ height: 140, border: '2px dashed #c7d2fe', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: preview || form.textureUrl ? '#f5f3ff' : '#fafafa', overflow: 'hidden', position: 'relative', marginBottom: '0.75rem' }}>
                            {(preview || form.textureUrl) ? (
                                <img src={preview ?? form.textureUrl} alt="Texture" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <>
                                    <div style={{ fontSize: '2rem', marginBottom: 4 }}>🖼️</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Click to upload texture image</div>
                                    <div style={{ fontSize: '0.72rem', color: '#c4c9d4', marginTop: 2 }}>PNG/JPG/WebP · 1024×1024 recommended</div>
                                </>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={handleUpload} disabled={uploading || !fileRef.current?.files?.length}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: 8, background: fileRef.current?.files?.length ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : '#f1f5f9', color: fileRef.current?.files?.length ? '#fff' : '#94a3b8', border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: uploading ? 'wait' : 'pointer' }}>
                                {uploading ? 'Uploading…' : '☁️ Upload to Cloudinary'}
                            </button>
                        </div>
                        {uploadMsg && <div style={{ marginTop: 6, padding: '0.5rem 0.7rem', borderRadius: 8, background: uploadMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${uploadMsg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, fontSize: '0.75rem', color: uploadMsg.startsWith('✅') ? '#15803d' : '#dc2626' }}>{uploadMsg}</div>}
                        {form.textureUrl && !preview && <div style={{ marginTop: 4, fontSize: '0.68rem', color: '#94a3b8', wordBreak: 'break-all' }}>Current: {form.textureUrl.slice(0, 60)}…</div>}
                    </div>

                    {/* Banner upload */}
                    <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                        <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.85rem', fontSize: '0.95rem' }}>Suit Banner (Cloudinary) *</h3>
                        <div onClick={() => bannerRef.current?.click()}
                            style={{ height: 140, border: '2px dashed #c7d2fe', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: previewBanner || form.bannerUrl ? '#f5f3ff' : '#fafafa', overflow: 'hidden', position: 'relative', marginBottom: '0.75rem' }}>
                            {(previewBanner || form.bannerUrl) ? (
                                <img src={previewBanner ?? form.bannerUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <>
                                    <div style={{ fontSize: '2rem', marginBottom: 4 }}>🖼️</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Click to upload banner image</div>
                                    <div style={{ fontSize: '0.72rem', color: '#c4c9d4', marginTop: 2 }}>PNG/JPG/WebP · 800×1200 recommended</div>
                                </>
                            )}
                        </div>
                        <input ref={bannerRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBannerChange} style={{ display: 'none' }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={handleUploadBanner} disabled={uploadingBanner || !bannerRef.current?.files?.length}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: 8, background: bannerRef.current?.files?.length ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : '#f1f5f9', color: bannerRef.current?.files?.length ? '#fff' : '#94a3b8', border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: uploadingBanner ? 'wait' : 'pointer' }}>
                                {uploadingBanner ? 'Uploading…' : '☁️ Upload Banner'}
                            </button>
                        </div>
                        {uploadMsgBanner && <div style={{ marginTop: 6, padding: '0.5rem 0.7rem', borderRadius: 8, background: uploadMsgBanner.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${uploadMsgBanner.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, fontSize: '0.75rem', color: uploadMsgBanner.startsWith('✅') ? '#15803d' : '#dc2626' }}>{uploadMsgBanner}</div>}
                        {form.bannerUrl && !previewBanner && <div style={{ marginTop: 4, fontSize: '0.68rem', color: '#94a3b8', wordBreak: 'break-all' }}>Current: {form.bannerUrl.slice(0, 60)}…</div>}
                    </div>

                    {/* Pricing + Stock */}
                    <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.85rem', fontSize: '0.95rem' }}>Pricing & Stock</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {[
                                { label: 'Selling Price (₹) *', key: 'price', type: 'number' },
                                { label: 'Original Price (₹) *', key: 'originalPrice', type: 'number' },
                                { label: 'Stock Qty *', key: 'stock', type: 'number' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{f.label}</label>
                                    <input type="number" min={0} value={(form[f.key as keyof typeof form] as number) || 0}
                                        onChange={e => set(f.key as keyof typeof form, Number(e.target.value) as never)}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Category, Color, Model */}
                    <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.85rem', fontSize: '0.95rem' }}>Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Category *</label>
                                <select value={form.category} onChange={e => set('category', e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none' }}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Gender *</label>
                                <select value={form.gender || 'unisex'} onChange={e => set('gender', e.target.value as 'male' | 'female' | 'unisex')}
                                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none' }}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="unisex">Unisex</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Available Sizes *</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {AVAILABLE_SIZES.map(s => {
                                        const isSelected = form.sizes?.includes(s);
                                        return (
                                            <button key={s} type="button"
                                                onClick={() => {
                                                    const current = form.sizes || [];
                                                    set('sizes', isSelected ? current.filter(x => x !== s) : [...current, s]);
                                                }}
                                                style={{ padding: '0.3rem 0.6rem', borderRadius: 8, border: `1px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`, background: isSelected ? '#e0e7ff' : '#fff', color: isSelected ? '#4f46e5' : '#64748b', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Color Swatch (hex)</label>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                                        style={{ width: 48, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                                    <input type="text" value={form.color} onChange={e => set('color', e.target.value)} placeholder="#1e3a5f"
                                        style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }} />
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
                                    style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
                                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Active (visible in shop)</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save button */}
            {error && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
                    ⚠️ {error}
                </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem' }}>
                <Link href="/admin/inventory" style={{ padding: '0.85rem 1.5rem', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                    Cancel
                </Link>
                <button onClick={handleSave} disabled={saving}
                    style={{ flex: 1, padding: '0.9rem', borderRadius: 12, background: saved ? '#10b981' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: saving ? 'wait' : 'pointer', transition: 'background 0.3s' }}>
                    {saving ? 'Saving…' : saved ? '✓ Saved!' : isNew ? '+ Create Suit' : '💾 Save Changes'}
                </button>
            </div>
        </div>
    );
}

export default function EditSuitPage() {
    return <AdminGuard><EditSuitContent /></AdminGuard>;
}
