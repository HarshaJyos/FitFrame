// ─── Model paths ─────────────────────────────────────────────────────────────
export const MODEL_BASE = '/models';

// ─── Suit catalogue ──────────────────────────────────────────────────────────
export interface SuitInfo {
    id: number;
    label: string;
    file: string;          // texture filename in /models/
    color: string;         // hex for UI swatch
    price: number;         // INR
    originalPrice: number; // strike-through
    badge?: string;        // e.g. "Best Seller"
    description: string;
    fabric: string;
    features: string[];
    category: string;
}

export const SUIT_TEXTURES: SuitInfo[] = [
    {
        id: 1, label: 'Navy Formal', file: 'male_casualsuit01_diffuse.png', color: '#1e3a5f',
        price: 5499, originalPrice: 7999, badge: 'New Arrival',
        category: 'Formal',
        fabric: '60% Wool, 40% Polyester',
        description: 'A sharp navy formal suit perfect for boardroom meetings, weddings, and upscale events. Tailored silhouette with a smooth finish that commands attention.',
        features: ['Single-breasted 2-button', 'Notch lapel', 'Side vents', 'Full canvas construction', 'Dry clean only'],
    },
    {
        id: 2, label: 'Steel Grey', file: 'male_casualsuit02_diffuse.png', color: '#4a5568',
        price: 4999, originalPrice: 6999, badge: 'Best Seller',
        category: 'Business',
        fabric: '55% Wool, 45% Viscose',
        description: 'Versatile steel grey suit that transitions seamlessly from office to evening. The refined charcoal tone pairs with any shirt color for endless styling options.',
        features: ['Slim fit', 'Peak lapel option', 'Double-button cuffs', 'Interior pockets', 'Wrinkle-resistant'],
    },
    {
        id: 3, label: 'Forest Green', file: 'male_casualsuit03_diffuse.png', color: '#2d4a35',
        price: 5999, originalPrice: 8499,
        category: 'Casual',
        fabric: '70% Cotton, 30% Linen',
        description: 'A bold forest green statement piece for the modern gentleman. Natural linen blend keeps you cool and comfortable at outdoor events and summer occasions.',
        features: ['Relaxed fit', 'Unstructured shoulders', 'Linen-blend breathable', 'Patch pockets', 'Machine washable'],
    },
    {
        id: 4, label: 'Deep Maroon', file: 'male_casualsuit04_diffuse.png', color: '#6b1f1f',
        price: 6499, originalPrice: 9499, badge: 'Premium',
        category: 'Formal',
        fabric: '80% Wool, 20% Silk',
        description: 'A rich maroon wool-silk blend for the most distinguished occasions. The silk content gives an effortless drape and subtle sheen that looks stunning in low light.',
        features: ['Bespoke tailoring', 'Silk-blend sheen', 'Hand-stitched lapels', 'Satin lining', 'Dry clean recommended'],
    },
    {
        id: 5, label: 'Charcoal', file: 'male_casualsuit05_diffuse.png', color: '#2d3748',
        price: 4499, originalPrice: 5999,
        category: 'Business',
        fabric: '65% Polyester, 35% Rayon',
        description: 'The dependable charcoal suit — every man\'s wardrobe staple. Classic cut that flatters all body types and works for interviews, presentations, and everyday professional wear.',
        features: ['Regular fit', 'Two-button closure', 'Flat front trousers', 'Machine washable', 'No-iron finish'],
    },
    {
        id: 6, label: 'Classic Brown', file: 'male_casualsuit06_diffuse.png', color: '#7c5c3e',
        price: 5299, originalPrice: 7299, badge: 'Popular',
        category: 'Casual',
        fabric: '60% Cotton, 40% Polyester',
        description: 'Earthy brown casual suit for brunches, garden parties, and smart-casual events. The warm tone works beautifully with white shirts and tan leather accessories.',
        features: ['Modern fit', 'Open lapel', 'Patch pockets', 'Trouser turn-ups', 'Easy care fabric'],
    },
    {
        id: 7, label: 'Midnight Blue', file: 'male_casualsuit07_diffuse.png', color: '#1a2a5c',
        price: 6999, originalPrice: 9999, badge: 'Luxury',
        category: 'Formal',
        fabric: '75% Wool, 25% Mohair',
        description: 'Midnight blue with a subtle mohair lustre — the suit worn at black-tie events and cocktail parties. Elevates any occasion with its deep, sophisticated hue.',
        features: ['Italian fit', 'Mohair blend shine', 'Ticket pocket', 'Double-vented', 'Hand-finished'],
    },
    {
        id: 8, label: 'Slate', file: 'male_casualsuit08_diffuse.png', color: '#5a6a7a',
        price: 4799, originalPrice: 6499,
        category: 'Business',
        fabric: '50% Wool, 50% Polyester',
        description: 'A cool slate blue-grey that brings a contemporary edge to business dressing. The tonal variation catches light beautifully for a dynamic, professional look.',
        features: ['Slim fit', 'Contrast buttons', 'Pick-stitch detail', 'Interior media pocket', 'Stretch waistband'],
    },
    {
        id: 9, label: 'Espresso', file: 'male_casualsuit09_diffuse.png', color: '#4a2c1a',
        price: 7499, originalPrice: 10999, badge: 'Limited',
        category: 'Formal',
        fabric: '85% Wool, 15% Cashmere',
        description: 'The ultimate espresso-brown cashmere blend — a rare investment piece. Extraordinarily soft against the skin with unmatched warmth and natural drape.',
        features: ['Cashmere blend', 'Hand-tailored', 'Mother-of-pearl buttons', 'Full Bemberg lining', 'Bespoke alter service'],
    },
];

export const DEFAULT_SUIT_ID = 6;

export function getSuit(id: number): SuitInfo {
    return SUIT_TEXTURES.find(s => s.id === id) ?? SUIT_TEXTURES[5];
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

export function selectModel(bmi: number, bodyType: 'slim' | 'average' | 'muscular'): string {
    let idx: number;
    if (bmi < 17.5) idx = 1;
    else if (bmi < 18.5) idx = bodyType === 'slim' ? 1 : 2;
    else if (bmi < 21) idx = bodyType === 'muscular' ? 4 : (bodyType === 'slim' ? 2 : 3);
    else if (bmi < 23) idx = bodyType === 'muscular' ? 5 : (bodyType === 'slim' ? 3 : 4);
    else if (bmi < 25) idx = bodyType === 'muscular' ? 6 : (bodyType === 'slim' ? 4 : 5);
    else if (bmi < 27.5) idx = 6;
    else if (bmi < 30) idx = 7;
    else if (bmi < 35) idx = 8;
    else idx = 9;
    return `${MODEL_BASE}/male_m0${idx}.gltf`;
}

export interface SizeResult {
    shirt: string; pants: string; confidence: number;
}

export function recommendSize(m: { chest: number; waist: number }): SizeResult {
    const { chest, waist } = m;
    let shirt = 'M';
    if (chest < 84) shirt = 'XS';
    else if (chest < 90) shirt = 'S';
    else if (chest < 96) shirt = 'M';
    else if (chest < 104) shirt = 'L';
    else if (chest < 112) shirt = 'XL';
    else shirt = 'XXL';

    let pants = '32"';
    if (waist < 68) pants = '28"';
    else if (waist < 74) pants = '30"';
    else if (waist < 80) pants = '32"';
    else if (waist < 86) pants = '34"';
    else if (waist < 94) pants = '36"';
    else pants = '38"+';

    return { shirt, pants, confidence: chest > 0 && waist > 0 ? 92 : 70 };
}
