import React from 'react';
import { FlaskConical, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SimulationCard({ simState, onSimChange, onToggle, isActive }) {
    return (
        <Card className={`border-2 transition-colors ${isActive ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <FlaskConical className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                        Προσομοίωση (What-if)
                        {isActive && (
                            <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                                ΕΝΕΡΓΗ
                            </span>
                        )}
                    </CardTitle>
                    <button
                        onClick={onToggle}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                            isActive
                                ? 'bg-amber-200 text-amber-800 hover:bg-amber-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {isActive ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    Προσωρινές τιμές για what-if ανάλυση. Δεν αποθηκεύονται.
                </p>
            </CardHeader>

            {isActive && (
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Simulated Revenue */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                Έσοδα Περιόδου (€)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={simState.revenue ?? ''}
                                onChange={e => onSimChange('revenue', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="w-full border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <p className="text-xs text-slate-400">Εναλλακτικά έσοδα περιόδου</p>
                        </div>

                        {/* Simulated Production Qty */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                Ποσότητα Παραγωγής (τεμ.)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={simState.productionQty ?? ''}
                                onChange={e => onSimChange('productionQty', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <p className="text-xs text-slate-400">Εναλλακτική παραγόμενη ποσότητα</p>
                        </div>

                        {/* Simulated Hours */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                Ώρες Εργασίας (σύνολο)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={simState.totalHours ?? ''}
                                onChange={e => onSimChange('totalHours', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <p className="text-xs text-slate-400">Εναλλακτικές ώρες εργασίας</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2">
                        <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                            Τα παρακάτω operational KPIs βασίζονται στις προσομοιωμένες τιμές σας. Τα static planning costs δεν αλλάζουν.
                        </span>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}