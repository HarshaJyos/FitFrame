import { NextRequest, NextResponse } from 'next/server';
import { processMessage, ChatMessage } from '@/lib/chatEngine';
import { getActiveSuits } from '@/lib/suits';
import { getUserProfile } from '@/lib/firestore';
import { getWishlist, getOrders } from '@/lib/firestore';

interface ChatRequest {
    message: string;
    userId?: string;
}

export async function POST(req: NextRequest) {
    try {
        const body: ChatRequest = await req.json();
        const { message, userId } = body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Fetch product catalog
        const suits = await getActiveSuits();

        // Build user context
        let userCtx: Parameters<typeof processMessage>[1] = {
            isLoggedIn: false,
        };

        if (userId) {
            const profile = await getUserProfile(userId);
            const wishlist = await getWishlist(userId).catch(() => []);
            const orders = await getOrders(userId).catch(() => []);

            userCtx = {
                isLoggedIn: true,
                displayName: profile?.displayName,
                gender: profile?.gender,
                measurements: profile?.measurements ? {
                    height: profile.measurements.height,
                    weight: profile.measurements.weight,
                    chest: profile.measurements.chest,
                    waist: profile.measurements.waist,
                    hip: profile.measurements.hip,
                } : undefined,
                sizes: profile?.sizes,
                recentOrders: orders.flatMap(o => o.items.map(i => i.suitId)),
                wishlistIds: wishlist.map(w => w.suitId),
                browsedIds: [],
            };
        }

        const response = processMessage(message.trim(), userCtx, suits);

        const botMessage: ChatMessage = {
            id: `bot_${Date.now()}`,
            role: 'bot',
            text: response.text,
            products: response.products,
            action: response.action,
            timestamp: Date.now(),
        };

        return NextResponse.json(botMessage);
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
