/**
 * Process and crop a face photo for use as a 3D texture
 */
export function processFacePhoto(photoDataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = Math.min(img.width, img.height);
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Center crop
            const sx = (img.width - size) / 2;
            const sy = (img.height - size) / 3; // Shift up slightly to capture face better
            ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512);

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = photoDataUrl;
    });
}

/**
 * Create a canvas texture from a data URL
 * Used internally by AvatarViewer via Three.js CanvasTexture
 */
export function createFaceCanvas(photoDataUrl: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('No canvas context'));
                return;
            }

            const size = Math.min(img.width, img.height);
            const sx = (img.width - size) / 2;
            const sy = (img.height - size) / 3;

            // Draw face with circular clip for natural look
            ctx.save();
            ctx.beginPath();
            ctx.arc(256, 256, 240, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, sx, sy, size, size, 16, 16, 480, 480);
            ctx.restore();

            resolve(canvas);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = photoDataUrl;
    });
}
