import React from 'react';

// Blue = manual input, white = formula (read-only)
export default function CellInput({ value, onChange, readOnly = false, className = '', align = 'right' }) {
    const base = `border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 w-full h-full px-2 py-1 text-xs ${align === 'right' ? 'text-right' : 'text-left'}`;
    if (readOnly) {
        return (
            <div className={`text-xs px-2 py-1 ${align === 'right' ? 'text-right' : 'text-left'} font-semibold text-slate-800 ${className}`}>
                {value}
            </div>
        );
    }
    return (
        <input
            type="number"
            className={`${base} bg-blue-50 ${className}`}
            value={value ?? ''}
            onChange={e => onChange && onChange(e.target.value)}
        />
    );
}