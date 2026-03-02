import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const folder = (formData.get('folder') as string) || 'fitframe/textures';
        const publicId = formData.get('publicId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
            const uploadOptions: Record<string, unknown> = {
                folder,
                resource_type: 'image',
                ...(publicId ? { public_id: publicId, overwrite: true } : {}),
            };
            cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
                if (error || !result) reject(error);
                else resolve({ secure_url: result.secure_url, public_id: result.public_id });
            }).end(buffer);
        });

        return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
    } catch (err) {
        console.error('Cloudinary upload error:', err);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
