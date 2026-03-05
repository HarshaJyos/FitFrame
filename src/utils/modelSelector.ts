// ─── 3D Model paths (local GLTF files — only models stay local) ──────────────
export const MODEL_BASE = '/models';

// ─── Available model bodies (Single SMPL model per gender now) ──────────────────
export const MODEL_NUMBERS = [1]; // Kept for backwards compatibility if used elsewhere

export function getModelPath(gender: 'male' | 'female'): string {
    return gender === 'female' ? `${MODEL_BASE}/Female_2.gltf` : `${MODEL_BASE}/male.gltf`;
}

// ─── BMI helpers ─────────────────────────────────────────────────────────────
export function calculateBMI(heightCm: number, weightKg: number): number {
    const h = heightCm / 100;
    return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
}

export type BodyType = 'slim' | 'average' | 'muscular' | 'heavy';

export function selectModel(bmi: number, bodyType: BodyType, gender: 'male' | 'female' = 'male'): string {
    return getModelPath(gender);
}

export function selectModelNumber(bmi: number, bodyType: BodyType): number {
    return 1;
}

export interface SizeResult {
    shirt: string; pants: string; confidence: number;
}

export function recommendSize(m: { chest: number; waist: number; hip: number }): SizeResult {
    const { chest, waist, hip } = m;
    let shirt = 'M';
    if (chest < 84) shirt = 'XS';
    else if (chest < 90) shirt = 'S';
    else if (chest < 96) shirt = 'M';
    else if (chest < 104) shirt = 'L';
    else if (chest < 112) shirt = 'XL';
    else shirt = 'XXL';

    // Use the larger of waist or hip-equivalent to determine pant size
    const effectiveWaist = Math.max(waist, hip - 12);
    let pants = '32"';
    if (effectiveWaist < 68) pants = '28"';
    else if (effectiveWaist < 74) pants = '30"';
    else if (effectiveWaist < 80) pants = '32"';
    else if (effectiveWaist < 86) pants = '34"';
    else if (effectiveWaist < 94) pants = '36"';
    else pants = '38"+';

    return { shirt, pants, confidence: chest > 0 && waist > 0 && hip > 0 ? 92 : 70 };
}
