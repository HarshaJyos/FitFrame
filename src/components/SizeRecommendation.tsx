'use client';

import type { SizeRecommendation as SizeRec } from '@/types';

interface SizeRecommendationProps {
    recommendation: SizeRec;
}

function ConfidenceBar({ value }: { value: number }) {
    const color = value >= 90 ? 'from-emerald-500 to-green-400' : value >= 80 ? 'from-blue-500 to-cyan-400' : 'from-amber-500 to-yellow-400';
    return (
        <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Match confidence</span>
                <span className="text-xs font-semibold text-slate-300">{value}%</span>
            </div>
            <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

export function SizeRecommendation({ recommendation }: SizeRecommendationProps) {
    const { shirtSize, pantsSize, shirtConfidence, pantsConfidence } = recommendation;

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span className="text-base">📦</span>
                Size Recommendation
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {/* Shirt */}
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 hover:border-blue-500/40 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">👕</span>
                        <span className="text-xs text-slate-400 font-medium">Shirt</span>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight">{shirtSize}</div>
                    <ConfidenceBar value={shirtConfidence} />
                </div>

                {/* Pants */}
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 hover:border-blue-500/40 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">👖</span>
                        <span className="text-xs text-slate-400 font-medium">Waist Size</span>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight">{pantsSize}</div>
                    <ConfidenceBar value={pantsConfidence} />
                </div>
            </div>

            {/* Size guide hint */}
            <p className="text-xs text-slate-600 text-center">
                Sizes based on your chest ({shirtSize}) & waist ({pantsSize}&quot;) measurements
            </p>
        </div>
    );
}
