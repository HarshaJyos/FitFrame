import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
    try {
        const { amount, currency = 'INR', suitId, userId } = await req.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // in paise
            currency,
            receipt: `rcpt_${Date.now().toString(36)}_${suitId}`,
            notes: {
                suitId: String(suitId),
                userId: String(userId),
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (err) {
        console.error('Razorpay create-order error:', err);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
