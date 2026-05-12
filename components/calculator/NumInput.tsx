"use client";

interface NumInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function NumInput({ label, value, onChange, min, max, step = 1000, suffix }: NumInputProps) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => {
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) onChange(n);
          }}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-green-500"
        />
        {suffix && <span className="text-xs text-zinc-500 whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}
