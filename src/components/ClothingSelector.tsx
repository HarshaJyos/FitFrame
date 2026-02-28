'use client';

interface ClothingSelectorProps {
    shirtColor: string;
    pantsColor: string;
    onShirtChange: (color: string) => void;
    onPantsChange: (color: string) => void;
}

const SHIRT_COLORS = [
    { value: '#ffffff', label: 'White', bg: 'bg-white' },
    { value: '#1e40af', label: 'Navy', bg: 'bg-blue-800' },
    { value: '#dc2626', label: 'Red', bg: 'bg-red-600' },
    { value: '#16a34a', label: 'Green', bg: 'bg-green-600' },
    { value: '#000000', label: 'Black', bg: 'bg-black' },
    { value: '#9333ea', label: 'Purple', bg: 'bg-purple-600' },
    { value: '#ea580c', label: 'Orange', bg: 'bg-orange-600' },
    { value: '#0891b2', label: 'Teal', bg: 'bg-cyan-600' },
];

const PANTS_COLORS = [
    { value: '#1e3a5f', label: 'Dark Blue', bg: 'bg-blue-900' },
    { value: '#374151', label: 'Charcoal', bg: 'bg-gray-700' },
    { value: '#1c1c1c', label: 'Black', bg: 'bg-black' },
    { value: '#78350f', label: 'Brown', bg: 'bg-amber-900' },
    { value: '#92400e', label: 'Khaki', bg: 'bg-amber-800' },
];

function ColorSwatch({
    colorValue,
    label,
    bg,
    selected,
    onClick,
}: {
    colorValue: string;
    label: string;
    bg: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={label}
            onClick={onClick}
            className={`w-8 h-8 rounded-full transition-all duration-200 ${bg}
        ${selected
                    ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }
        ${colorValue === '#ffffff' ? 'border border-slate-600' : ''}
      `}
        />
    );
}

export function ClothingSelector({ shirtColor, pantsColor, onShirtChange, onPantsChange }: ClothingSelectorProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span className="text-base">🎨</span>
                Clothing Colors
            </h3>

            {/* Shirt */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm">👕</span>
                    <span className="text-xs font-medium text-slate-400">Shirt Color</span>
                    <span className="ml-auto text-xs text-slate-600 capitalize">
                        {SHIRT_COLORS.find((c) => c.value === shirtColor)?.label ?? 'Custom'}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {SHIRT_COLORS.map((c) => (
                        <ColorSwatch
                            key={c.value}
                            colorValue={c.value}
                            label={c.label}
                            bg={c.bg}
                            selected={shirtColor === c.value}
                            onClick={() => onShirtChange(c.value)}
                        />
                    ))}
                </div>
            </div>

            {/* Pants */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm">👖</span>
                    <span className="text-xs font-medium text-slate-400">Pants Color</span>
                    <span className="ml-auto text-xs text-slate-600 capitalize">
                        {PANTS_COLORS.find((c) => c.value === pantsColor)?.label ?? 'Custom'}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {PANTS_COLORS.map((c) => (
                        <ColorSwatch
                            key={c.value}
                            colorValue={c.value}
                            label={c.label}
                            bg={c.bg}
                            selected={pantsColor === c.value}
                            onClick={() => onPantsChange(c.value)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
