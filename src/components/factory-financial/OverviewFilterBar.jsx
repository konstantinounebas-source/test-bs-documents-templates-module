import React from 'react';
import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { MONTH_NAMES_EL, getPeriodLabel } from './utils/overviewPeriodCalculations';

const MODE_OPTIONS = [
    { value: 'daily', label: 'Ημερήσιο', icon: Calendar },
    { value: 'weekly', label: 'Εβδομαδιαίο', icon: CalendarDays },
    { value: 'monthly', label: 'Μηνιαίο', icon: CalendarRange },
];

// Generate weeks 1-53
const WEEKS = Array.from({ length: 53 }, (_, i) => i + 1);
const MONTHS = MONTH_NAMES_EL.slice(1).map((name, i) => ({ value: i + 1, label: name }));

export default function OverviewFilterBar({ filterParams, onFilterChange, availableYears }) {
    const { mode, selectedDate, selectedWeek, selectedMonth, selectedYear } = filterParams;
    const periodLabel = getPeriodLabel(filterParams);
    const years = availableYears && availableYears.length > 0 ? availableYears : [new Date().getFullYear()];

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                {/* Mode Selector */}
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    {MODE_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const active = mode === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => onFilterChange({ ...filterParams, mode: opt.value })}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                                    active
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {opt.label}
                            </button>
                        );
                    })}
                </div>

                {/* Daily: date picker */}
                {mode === 'daily' && (
                    <input
                        type="date"
                        value={selectedDate || ''}
                        onChange={e => onFilterChange({ ...filterParams, selectedDate: e.target.value })}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                )}

                {/* Weekly: year + week */}
                {mode === 'weekly' && (
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedYear || ''}
                            onChange={e => onFilterChange({ ...filterParams, selectedYear: parseInt(e.target.value) })}
                            className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select
                            value={selectedWeek || ''}
                            onChange={e => onFilterChange({ ...filterParams, selectedWeek: parseInt(e.target.value) })}
                            className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                            <option value="">Εβδομάδα...</option>
                            {WEEKS.map(w => <option key={w} value={w}>Εβδ. {w}</option>)}
                        </select>
                    </div>
                )}

                {/* Monthly: year + month */}
                {mode === 'monthly' && (
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedYear || ''}
                            onChange={e => onFilterChange({ ...filterParams, selectedYear: parseInt(e.target.value) })}
                            className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select
                            value={selectedMonth || ''}
                            onChange={e => onFilterChange({ ...filterParams, selectedMonth: parseInt(e.target.value) })}
                            className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                            <option value="">Μήνας...</option>
                            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                )}

                {/* Active period label */}
                <div className="ml-auto flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-blue-500 font-medium">Περίοδος:</span>
                    <span className="text-xs font-bold text-blue-800">{periodLabel}</span>
                </div>
            </div>
        </div>
    );
}