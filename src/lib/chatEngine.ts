import { Suit } from './suits';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
    id: string;
    role: 'user' | 'bot';
    text: string;
    products?: ProductSuggestion[];
    action?: ChatAction;
    timestamp: number;
}

export interface ProductSuggestion {
    id: string;
    name: string;
    price: number;
    originalPrice: number;
    bannerUrl?: string;
    category: string;
    color: string;
}

export interface ChatAction {
    type: 'signin' | 'navigate' | 'measurements';
    label: string;
    url?: string;
}

export type Intent =
    | 'greet'
    | 'outfit_suggest'
    | 'size_recommend'
    | 'budget_filter'
    | 'trending'
    | 'avatar_help'
    | 'product_search'
    | 'signin_prompt'
    | 'general_faq'
    | 'farewell'
    | 'unknown';

interface UserContext {
    isLoggedIn: boolean;
    displayName?: string;
    gender?: 'male' | 'female';
    measurements?: {
        height: number;
        weight: number;
        chest: number;
        waist: number;
        hip: number;
    };
    sizes?: { shirt: string; pants: string; confidence: number };
    recentOrders?: string[];      // suitIds
    wishlistIds?: string[];       // suitIds
    browsedIds?: string[];        // suitIds
}

interface EngineResponse {
    text: string;
    products?: ProductSuggestion[];
    action?: ChatAction;
}

// ── Intent Detection ──────────────────────────────────────────────────────────

const INTENT_PATTERNS: { intent: Intent; patterns: RegExp[] }[] = [
    {
        intent: 'greet',
        patterns: [
            /^(hi|hello|hey|hola|namaste|howdy|sup|yo|good\s*(morning|afternoon|evening))/i,
            /^(what'?s up|how are you)/i,
        ],
    },
    {
        intent: 'farewell',
        patterns: [
            /^(bye|goodbye|see ya|later|thanks|thank you|that'?s all|done|cya)/i,
        ],
    },
    {
        intent: 'outfit_suggest',
        patterns: [
            /suggest.*(outfit|look|clothes|what.*wear)/i,
            /outfit.*(for|suggestion|idea|recommend)/i,
            /what.*(should|can|would).*(wear|dress|put on)/i,
            /(casual|formal|party|wedding|office|date|meeting|business|interview).*(outfit|wear|dress|look|suit)/i,
            /(outfit|wear|dress|look|suit).*(casual|formal|party|wedding|office|date|meeting|business|interview)/i,
            /recommend.*(outfit|cloth|suit|look)/i,
            /style.*(tip|suggestion|advice|recommend)/i,
        ],
    },
    {
        intent: 'size_recommend',
        patterns: [
            /what.*size/i,
            /(my|recommend|suggest|find).*(size|fit)/i,
            /size.*(chart|guide|recommend|suggest|help)/i,
            /(shirt|pant|trouser|jacket).*(size|fit)/i,
            /will.*(fit|suit)/i,
            /sizing/i,
        ],
    },
    {
        intent: 'budget_filter',
        patterns: [
            /(under|below|less than|within|budget|cheap|affordable|₹|rs|inr)\s*\d+/i,
            /\d+\s*(under|below|budget|rs|₹|rupee)/i,
            /budget/i,
            /cheap|affordable|inexpensive|value for money/i,
        ],
    },
    {
        intent: 'trending',
        patterns: [
            /trend(ing|s|y)/i,
            /popular|best\s*sell|hot|new\s*arrival|latest|most\s*(bought|purchased|liked)/i,
            /what'?s.*new/i,
            /top\s*(pick|rated|selling)/i,
        ],
    },
    {
        intent: 'avatar_help',
        patterns: [
            /avatar/i,
            /3d.*(try|model|view|feature|virtual)/i,
            /(try|virtual).*(on|fitting|feature)/i,
            /how.*(try|use|create|upload|work).*(avatar|3d|model|virtual|cloth)/i,
            /measurement.*(upload|enter|give|provide)/i,
            /create.*(avatar|model|profile)/i,
        ],
    },
    {
        intent: 'product_search',
        patterns: [
            /show.*(suit|product|cloth|collection|catalog)/i,
            /search.*/i,
            /find.*(suit|product|cloth)/i,
            /do you have/i,
            /(linen|wool|cotton|silk|polyester|formal|business|casual)/i,
            /browse/i,
        ],
    },
    {
        intent: 'general_faq',
        patterns: [
            /shipping|deliver|return|refund|exchange|payment|pay|cod|cash/i,
            /contact|support|help|customer\s*service/i,
            /cancel.*(order)/i,
            /track.*(order)/i,
        ],
    },
];

function detectIntent(message: string): Intent {
    const trimmed = message.trim();
    for (const { intent, patterns } of INTENT_PATTERNS) {
        for (const pat of patterns) {
            if (pat.test(trimmed)) return intent;
        }
    }
    return 'unknown';
}

function extractBudget(message: string): number | null {
    const m = message.match(/(?:under|below|less than|within|budget|₹|rs\.?\s*|inr\s*)(\d[\d,]*)/i);
    if (m) return parseInt(m[1].replace(/,/g, ''), 10);
    const m2 = message.match(/(\d[\d,]*)\s*(?:under|below|budget|rs|₹|rupee)/i);
    if (m2) return parseInt(m2[1].replace(/,/g, ''), 10);
    return null;
}

function extractOccasion(message: string): string | null {
    const occasions = ['casual', 'formal', 'wedding', 'party', 'office', 'business', 'date', 'meeting', 'interview'];
    const lower = message.toLowerCase();
    for (const o of occasions) {
        if (lower.includes(o)) return o;
    }
    return null;
}

// ── Size Logic ────────────────────────────────────────────────────────────────

function getShirtSize(chest: number): string {
    if (chest < 86) return 'XS';
    if (chest < 92) return 'S';
    if (chest < 98) return 'M';
    if (chest < 104) return 'L';
    if (chest < 112) return 'XL';
    if (chest < 120) return 'XXL';
    return '3XL';
}

function getPantsSize(waist: number): string {
    if (waist < 72) return '28"';
    if (waist < 76) return '30"';
    if (waist < 80) return '32"';
    if (waist < 86) return '34"';
    if (waist < 92) return '36"';
    if (waist < 98) return '38"';
    if (waist < 104) return '40"';
    return '42"';
}

// ── Response Generators ───────────────────────────────────────────────────────

function suitToSuggestion(s: Suit): ProductSuggestion {
    return {
        id: s.id ?? '',
        name: s.name,
        price: s.price,
        originalPrice: s.originalPrice,
        bannerUrl: s.bannerUrl,
        category: s.category,
        color: s.color,
    };
}

function greetResponse(ctx: UserContext): EngineResponse {
    const name = ctx.displayName ? ` ${ctx.displayName}` : '';
    const greetings = [
        `Hey${name}! 👋 I'm your FitFrame fashion stylist. How can I help you look amazing today?`,
        `Hello${name}! ✨ Welcome to FitFrame. I can help you find the perfect outfit, check your size, or guide you through our 3D try-on. What would you like?`,
        `Hi${name}! 🎨 Ready to find your perfect look? Ask me about outfits, sizing, trending styles, or our virtual try-on feature!`,
    ];
    return { text: greetings[Math.floor(Math.random() * greetings.length)] };
}

function farewellResponse(): EngineResponse {
    const farewells = [
        "Thanks for chatting! 👋 Happy styling — you're going to look great!",
        "See you soon! 🌟 Remember, a confident outfit starts with the right fit.",
        "Bye for now! 💫 Come back anytime you need style advice.",
    ];
    return { text: farewells[Math.floor(Math.random() * farewells.length)] };
}

function outfitSuggestResponse(ctx: UserContext, suits: Suit[], message: string): EngineResponse {
    if (!ctx.isLoggedIn) {
        return {
            text: "I'd love to suggest personalized outfits for you! 🎨 To give you the best recommendations based on your body type and style, please sign in first.",
            action: { type: 'signin', label: 'Sign In to Get Recommendations', url: '/login' },
        };
    }

    const occasion = extractOccasion(message);
    const budget = extractBudget(message);
    let filtered = suits.filter(s => s.isActive && !s.isDeleted);

    // Filter by gender
    if (ctx.gender) {
        filtered = filtered.filter(s => s.gender === ctx.gender || s.gender === 'unisex');
    }

    // Filter by occasion/category mapping
    if (occasion) {
        const categoryMap: Record<string, string[]> = {
            casual: ['Casual'],
            formal: ['Formal', 'Business'],
            wedding: ['Formal'],
            party: ['Formal', 'Casual'],
            office: ['Business', 'Formal'],
            business: ['Business', 'Formal'],
            date: ['Casual', 'Formal'],
            meeting: ['Business', 'Formal'],
            interview: ['Business', 'Formal'],
        };
        const cats = categoryMap[occasion] ?? [];
        if (cats.length > 0) {
            const match = filtered.filter(s => cats.includes(s.category));
            if (match.length > 0) filtered = match;
        }
    }

    // Filter by budget
    if (budget) {
        const budgetMatch = filtered.filter(s => s.price <= budget);
        if (budgetMatch.length > 0) filtered = budgetMatch;
    }

    // Take top picks
    const picks = filtered.slice(0, 3);

    if (picks.length === 0) {
        return { text: "I couldn't find suits matching those criteria right now. Try adjusting your preferences or browse our full catalog!" };
    }

    const occasionText = occasion ? ` for a ${occasion} occasion` : '';
    const budgetText = budget ? ` within ₹${budget.toLocaleString('en-IN')}` : '';

    let text = `Here are my top picks${occasionText}${budgetText} ✨\n\n`;
    picks.forEach((p, i) => {
        text += `${i + 1}. **${p.name}** — ₹${p.price.toLocaleString('en-IN')}`;
        if (p.fabric) text += ` (${p.fabric})`;
        text += '\n';
    });

    if (ctx.sizes) {
        text += `\nBased on your measurements, you'd need a **${ctx.sizes.shirt}** shirt and **${ctx.sizes.pants}** trousers. 📐`;
    }

    return { text, products: picks.map(suitToSuggestion) };
}

function sizeRecommendResponse(ctx: UserContext): EngineResponse {
    if (!ctx.isLoggedIn) {
        return {
            text: "To recommend your perfect size, I need your body measurements. Please sign in and complete your profile first! 📐",
            action: { type: 'signin', label: 'Sign In for Size Recommendation', url: '/login' },
        };
    }

    if (!ctx.measurements) {
        return {
            text: "I don't have your measurements yet! Please update your profile with your chest, waist, and other measurements so I can recommend the perfect size. 📏",
            action: { type: 'measurements', label: 'Update Measurements', url: '/onboarding' },
        };
    }

    const { chest, waist, height, weight } = ctx.measurements;
    const shirt = getShirtSize(chest);
    const pants = getPantsSize(waist);

    let text = `Based on your measurements, here's your size recommendation 📦\n\n`;
    text += `👕 **Shirt/Jacket**: ${shirt} (chest: ${chest}cm)\n`;
    text += `👖 **Trousers**: ${pants} (waist: ${waist}cm)\n`;
    text += `📏 Height: ${height}cm · Weight: ${weight}kg\n\n`;
    text += `These sizes have a high confidence match! If you're between sizes, I'd suggest going one size up for comfort.`;

    return { text };
}

function budgetResponse(ctx: UserContext, suits: Suit[], message: string): EngineResponse {
    const budget = extractBudget(message);
    if (!budget) {
        return { text: "What's your budget range? For example, you can say 'Suggest outfits under ₹2000' and I'll find the best options for you! 💰" };
    }

    let filtered = suits.filter(s => s.isActive && !s.isDeleted && s.price <= budget);
    if (ctx.gender) {
        filtered = filtered.filter(s => s.gender === ctx.gender || s.gender === 'unisex');
    }

    // Sort by value (biggest discount first)
    filtered.sort((a, b) => (b.originalPrice - b.price) - (a.originalPrice - a.price));
    const picks = filtered.slice(0, 4);

    if (picks.length === 0) {
        return { text: `I couldn't find any suits under ₹${budget.toLocaleString('en-IN')} right now. Would you like me to show you our best-value options instead?` };
    }

    let text = `Great finds under ₹${budget.toLocaleString('en-IN')}! 🏷️\n\n`;
    picks.forEach((p, i) => {
        const discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
        text += `${i + 1}. **${p.name}** — ₹${p.price.toLocaleString('en-IN')}`;
        if (discount > 0) text += ` (${discount}% off!)`;
        text += '\n';
    });

    return { text, products: picks.map(suitToSuggestion) };
}

function trendingResponse(suits: Suit[]): EngineResponse {
    // Trending = newest + those with badges
    const active = suits.filter(s => s.isActive && !s.isDeleted);
    const badged = active.filter(s => s.badge);
    const sorted = [
        ...badged,
        ...active.filter(s => !s.badge),
    ].slice(0, 4);

    if (sorted.length === 0) {
        return { text: "Our trending collection is being updated! Check back soon for the latest styles. 🔄" };
    }

    let text = "🔥 **Trending Right Now**\n\n";
    sorted.forEach((p, i) => {
        text += `${i + 1}. **${p.name}**`;
        if (p.badge) text += ` — ${p.badge}`;
        text += ` — ₹${p.price.toLocaleString('en-IN')}\n`;
    });
    text += "\nThese are our hottest picks right now! Want me to suggest something specific?";

    return { text, products: sorted.map(suitToSuggestion) };
}

function avatarHelpResponse(ctx: UserContext): EngineResponse {
    if (!ctx.isLoggedIn) {
        return {
            text: "Our 3D virtual try-on lets you see exactly how clothes look on your body! 🎭\n\nTo use it, you'll need to:\n1. **Sign in** to your account\n2. **Enter your measurements** (height, weight, chest, waist, hip)\n3. **Browse any product** and click 'Try On'\n\nYour personalised 3D avatar is generated from your exact measurements using SMPL body modeling!",
            action: { type: 'signin', label: 'Sign In to Try On', url: '/login' },
        };
    }

    if (!ctx.measurements) {
        return {
            text: "You're signed in! 🎉 Now let's set up your avatar:\n\n1. ✅ Account created\n2. 📏 **Enter your measurements** — height, weight, chest, waist, hip\n3. Browse any suit and click 'Try On'\n\nLet me take you to the measurements page!",
            action: { type: 'measurements', label: 'Enter Measurements', url: '/onboarding' },
        };
    }

    return {
        text: "Your 3D avatar is ready! 🎭 Here's how to try on clothes:\n\n1. ✅ Account created\n2. ✅ Measurements saved\n3. 🛍️ **Browse any product** in the shop\n4. Click on a suit to open its page\n5. You'll see your personalised 3D avatar wearing the suit!\n\nThe avatar uses your exact body measurements for a realistic fit preview. Want me to show you some suits to try?",
    };
}

function productSearchResponse(suits: Suit[], message: string): EngineResponse {
    const lower = message.toLowerCase();
    const active = suits.filter(s => s.isActive && !s.isDeleted);

    // Search by keywords in name, category, fabric, tags
    const scored = active.map(s => {
        let score = 0;
        const searchable = `${s.name} ${s.category} ${s.fabric} ${(s.tags ?? []).join(' ')} ${s.color}`.toLowerCase();
        const words = lower.split(/\s+/).filter(w => w.length > 2);
        for (const w of words) {
            if (searchable.includes(w)) score++;
        }
        return { suit: s, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    const picks = scored.slice(0, 4).map(x => x.suit);

    if (picks.length === 0) {
        return { text: "I couldn't find an exact match, but let me show you our latest collection! 🛍️", products: active.slice(0, 3).map(suitToSuggestion) };
    }

    let text = `Here's what I found 🔍\n\n`;
    picks.forEach((p, i) => {
        text += `${i + 1}. **${p.name}** — ₹${p.price.toLocaleString('en-IN')} (${p.category})\n`;
    });

    return { text, products: picks.map(suitToSuggestion) };
}

function faqResponse(message: string): EngineResponse {
    const lower = message.toLowerCase();

    if (/shipping|deliver/i.test(lower)) {
        return { text: "🚚 We deliver across India! Standard delivery takes 5-7 business days. Premium delivery (2-3 days) is available for select locations. You can track your order from your account page." };
    }
    if (/return|refund|exchange/i.test(lower)) {
        return { text: "↩️ We have a hassle-free 7-day return policy! If the fit isn't right, you can request a return or exchange from your account. Refunds are processed within 5-7 business days." };
    }
    if (/payment|pay|cod|cash/i.test(lower)) {
        return { text: "💳 We accept all major payment methods through Razorpay — UPI, credit/debit cards, net banking, and wallets. All payments are secure and encrypted." };
    }
    if (/cancel/i.test(lower)) {
        return { text: "You can cancel an order before it's shipped from your account's order history. Once shipped, you'll need to request a return instead." };
    }
    if (/track/i.test(lower)) {
        return { text: "📦 Go to your Account → Orders to see real-time tracking updates for all your orders." };
    }
    if (/contact|support|help/i.test(lower)) {
        return { text: "📧 You can reach our support team anytime! We're here to help you with any questions about orders, sizing, or the 3D try-on feature." };
    }

    return { text: "I'm here to help! You can ask me about outfit suggestions, sizing, our 3D try-on feature, or anything about your shopping experience. 😊" };
}

function personalizedResponse(ctx: UserContext, suits: Suit[]): EngineResponse {
    if (!ctx.isLoggedIn) {
        return {
            text: "Sign in to get personalized suggestions based on your style history! 🎯",
            action: { type: 'signin', label: 'Sign In', url: '/login' },
        };
    }

    const active = suits.filter(s => s.isActive && !s.isDeleted);

    // Find items related to past purchases/wishlist
    const interactedIds = new Set([...(ctx.recentOrders ?? []), ...(ctx.wishlistIds ?? []), ...(ctx.browsedIds ?? [])]);

    if (interactedIds.size === 0) {
        return outfitSuggestResponse(ctx, suits, 'suggest outfit');
    }

    // Get tags from interacted items
    const interactedSuits = active.filter(s => interactedIds.has(s.id ?? ''));
    const tags = new Set<string>();
    interactedSuits.forEach(s => (s.tags ?? []).forEach(t => tags.add(t)));

    // Find new items matching those tags
    const recommendations = active
        .filter(s => !interactedIds.has(s.id ?? ''))
        .filter(s => (s.tags ?? []).some(t => tags.has(t)))
        .slice(0, 3);

    if (recommendations.length === 0) {
        return outfitSuggestResponse(ctx, suits, 'suggest outfit');
    }

    const lastItem = interactedSuits[0];
    let text = '';
    if (lastItem) {
        text += `Since you liked **${lastItem.name}**, I think you'll love these:\n\n`;
    } else {
        text += "Based on your style preferences, check these out:\n\n";
    }

    recommendations.forEach((p, i) => {
        text += `${i + 1}. **${p.name}** — ₹${p.price.toLocaleString('en-IN')}\n`;
    });
    text += "\nThese match your style profile perfectly! 🎯";

    return { text, products: recommendations.map(suitToSuggestion) };
}

function unknownResponse(): EngineResponse {
    const responses = [
        "I'm not sure I understood that. 🤔 I can help with:\n• Outfit suggestions\n• Size recommendations\n• Budget-friendly finds\n• Trending styles\n• 3D try-on guidance\n\nWhat would you like to know?",
        "Hmm, could you rephrase that? I'm best at helping with outfit suggestions, sizing, and our virtual try-on feature! 😊",
        "I didn't quite catch that! Try asking me something like:\n• 'Suggest a formal outfit'\n• 'What's my size?'\n• 'Show trending suits'\n• 'How does the 3D try-on work?'",
    ];
    return { text: responses[Math.floor(Math.random() * responses.length)] };
}

// ── Main Engine ───────────────────────────────────────────────────────────────

export function processMessage(
    message: string,
    ctx: UserContext,
    suits: Suit[],
): EngineResponse {
    const intent = detectIntent(message);

    switch (intent) {
        case 'greet':
            return greetResponse(ctx);
        case 'farewell':
            return farewellResponse();
        case 'outfit_suggest':
            return outfitSuggestResponse(ctx, suits, message);
        case 'size_recommend':
            return sizeRecommendResponse(ctx);
        case 'budget_filter':
            return budgetResponse(ctx, suits, message);
        case 'trending':
            return trendingResponse(suits);
        case 'avatar_help':
            return avatarHelpResponse(ctx);
        case 'product_search':
            return productSearchResponse(suits, message);
        case 'general_faq':
            return faqResponse(message);
        case 'unknown':
        default:
            // Try personalized if logged in, else unknown
            if (ctx.isLoggedIn && (ctx.recentOrders?.length || ctx.wishlistIds?.length)) {
                return personalizedResponse(ctx, suits);
            }
            return unknownResponse();
    }
}

export { detectIntent, extractBudget };
