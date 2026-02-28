'use client';

import { useState, useCallback } from 'react';
import type { Measurements, BodyType } from '@/types';
import { calculateBMI, getBMICategory } from '@/utils/modelSelector';

interface MeasurementFormProps {
    onSubmit: (measurements: Measurements) => void;
    initialValues?: Measurements | null;
}

const defaultMeasurements: Measurements = {
    height: 175,
    weight: 70,
    chest: 95,
    waist: 80,
    hip: 95,
    bodyType: 'average',
};

export function MeasurementForm({ onSubmit, initialValues }: MeasurementFormProps) {
    const [values, setValues] = useState<Measurements>(initialValues ?? defaultMeasurements);
    const [errors, setErrors] = useState<Partial<Record<keyof Measurements, string>>>({});

    const bmi = values.height > 0 && values.weight > 0
        ? calculateBMI(values.height, values.weight)
        : null;
    const bmiCategory = bmi ? getBMICategory(bmi) : null;

    const getBMIColor = (bmi: number) => {
        if (bmi < 18.5) return 'text-blue-400';
        if (bmi < 25) return 'text-emerald-400';
        if (bmi < 30) return 'text-amber-400';
        return 'text-red-400';
    };

    const validate = useCallback((data: Measurements): boolean => {
        const errs: Partial<Record<keyof Measurements, string>> = {};
        if (!data.height || data.height < 140 || data.height > 220)
            errs.height = 'Height must be between 140–220 cm';
        if (!data.weight || data.weight < 40 || data.weight > 150)
            errs.weight = 'Weight must be between 40–150 kg';
        if (!data.chest || data.chest < 70 || data.chest > 140)
            errs.chest = 'Chest must be between 70–140 cm';
        if (!data.waist || data.waist < 60 || data.waist > 130)
            errs.waist = 'Waist must be between 60–130 cm';
        if (!data.hip || data.hip < 70 || data.hip > 130)
            errs.hip = 'Hip must be between 70–130 cm';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }, []);

    const handleChange = (field: keyof Measurements, raw: string) => {
        const parsed = field === 'bodyType' ? raw : parseFloat(raw);
        setValues((prev) => ({ ...prev, [field]: parsed }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate(values)) onSubmit(values);
    };

    type FieldConfig = {
        key: keyof Measurements;
        label: string;
        icon: string;
        min: number;
        max: number;
        unit: string;
    };

    const fields: FieldConfig[] = [
        { key: 'height', label: 'Height', icon: '📏', min: 140, max: 220, unit: 'cm' },
        { key: 'weight', label: 'Weight', icon: '⚖️', min: 40, max: 150, unit: 'kg' },
        { key: 'chest', label: 'Chest', icon: '👕', min: 70, max: 140, unit: 'cm' },
        { key: 'waist', label: 'Waist', icon: '📐', min: 60, max: 130, unit: 'cm' },
        { key: 'hip', label: 'Hip', icon: '🩳', min: 70, max: 130, unit: 'cm' },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
                {fields.map(({ key, label, icon, min, max, unit }) => (
                    <div key={key} className="space-y-1">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                            <span>{icon}</span>
                            <span>{label}</span>
                            <span className="text-slate-500 text-xs">({unit})</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min={min}
                                max={max}
                                step="0.1"
                                value={Number.isNaN(values[key] as number) ? '' : (values[key] as number)}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className={`w-full bg-slate-800/60 border rounded-xl px-4 py-2.5 text-white text-sm
                  placeholder-slate-500 focus:outline-none focus:ring-2 transition-all pr-12
                  ${errors[key]
                                        ? 'border-red-500/60 focus:ring-red-500/40'
                                        : 'border-slate-600/50 focus:ring-blue-500/40 focus:border-blue-500/60'
                                    }`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">
                                {unit}
                            </span>
                        </div>
                        {errors[key] && (
                            <p className="text-red-400 text-xs">{errors[key]}</p>
                        )}
                    </div>
                ))}

                {/* Body Type */}
                <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                        <span>💪</span>
                        <span>Body Composition</span>
                        <span className="text-slate-500 text-xs">(optional)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['slim', 'average', 'muscular'] as BodyType[]).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setValues((prev) => ({ ...prev, bodyType: type }))}
                                className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all border
                  ${values.bodyType === type
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-slate-800/60 border-slate-600/50 text-slate-400 hover:border-slate-500'
                                    }`}
                            >
                                {type === 'slim' ? '🌿 Slim' : type === 'average' ? '🧍 Average' : '💪 Muscular'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* BMI Display */}
            {bmi && (
                <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center text-sm">📊</div>
                        <div>
                            <p className="text-xs text-slate-400">Your BMI</p>
                            <p className="text-xs text-slate-500">{bmiCategory}</p>
                        </div>
                    </div>
                    <div className={`text-2xl font-bold ${getBMIColor(bmi)}`}>
                        {bmi}
                    </div>
                </div>
            )}

            <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold text-sm text-white
          bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
          transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40
          active:scale-95"
            >
                ✨ Generate Avatar
            </button>
        </form>
    );
}
