import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = await req.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
        }

        // HMAC-SHA256 verification
        const secret = process.env.RAZORPAY_KEY_SECRET!;
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return NextResponse.json({ error: 'Payment signature mismatch — possible fraud' }, { status: 400 });
        }

        return NextResponse.json({ success: true, paymentId: razorpay_payment_id });
    } catch (err) {
        console.error('Razorpay verify-payment error:', err);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
