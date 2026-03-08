import { NextRequest, NextResponse } from 'next/server';
import { getActiveSuits } from '@/lib/suits';

export async function GET(req: NextRequest) {
    try {
        const q = req.nextUrl.searchParams.get('q');
        if (!q || q.trim().length === 0) {
            return NextResponse.json({ results: [] });
        }

        const searchTerm = q.trim().toLowerCase();
        const suits = await getActiveSuits();

        const results = suits
            .filter(s => {
                const searchable = `${s.name} ${s.category} ${s.fabric} ${(s.tags ?? []).join(' ')} ${s.description} ${s.color}`.toLowerCase();
                const words = searchTerm.split(/\s+/);
                return words.some(w => searchable.includes(w));
            })
            .slice(0, 10)
            .map(s => ({
                id: s.id,
                name: s.name,
                price: s.price,
                originalPrice: s.originalPrice,
                bannerUrl: s.bannerUrl,
                category: s.category,
                color: s.color,
            }));

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json({ results: [] }, { status: 500 });
    }
}
