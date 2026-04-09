import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FlaskConical } from 'lucide-react';

/**
 * SimulationWhatIfPanel
 *
 * Ανεξάρτητο "What If" panel. Ο χρήστης επιλέγει:
 *  - Τύπο στάσης + ποσότητα → υπολογίζεται έσοδα (qty × unit_revenue)
 *  - Multiplier κόστους λειτουργίας (× ημερήσιο σταθερό+λειτουργικό)
 *  - Multiplier κόστους επιστάρχη
 *  - Ώρες ανά τμήμα (× μέσο ωριαίο κόστος τμήματος)
 *  - Πρόσθετο κόστος εργατικών (manual)
 */

// Helper: get avg hourly cost for a department from departmentAssignments + labourPersonnel
function getDeptHourlyCost(deptId, departmentAssignments, labourPersonnel, departments) {
    const block = (departmentAssignments || []).find(b => b.department_id === deptId);
    if (block && block.technician_rows && block.technician_rows.length > 0) {
        const rates = block.technician_rows.map(row => {
            const person = (labourPersonnel || []).find(p => p.id === row.personnel_id);
            if (person) {
                if (person.calculated_hourly_cost) return parseFloat(person.calculated_hourly_cost);
                if (person.daily_rate) return parseFloat(person.daily_rate) / (parseFloat(person.hours_per_day) || 8);
            }
            return null;
        }).filter(r => r !== null);
        if (rates.length > 0) return rates.reduce((s, r) => s + r, 0) / rates.length;
    }
    const dept = (departments || []).find(d => d.id === deptId);
    return dept ? (parseFloat(dept.avg_hourly_cost) || 0) : 0;
}

export default function SimulationWhatIfPanel({
    panelIndex = 0,
    shelterInstances = [],
    shelterRevenueItems = [],
    getShelterRevenueTotal,
    departmentAssignments = [],
    labourPersonnel = [],
    departments = [],
    fixedDailyTotal = 0,
    operationalDailyTotal = 0,
    supervisorDailyCost = 0,
    depreciationFactor = 0,
    formatCurrency = (v) => `€${parseFloat(v || 0).toFixed(2)}`,
}) {
    // ── Inputs ────────────────────────────────────────────────────────────────
    const [selectedShelterInstanceId, setSelectedShelterInstanceId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [fixedMultiplier, setFixedMultiplier] = useState('1');
    const [supervisorMultiplier, setSupervisorMultiplier] = useState('1');
    const [deptHoursRows, setDeptHoursRows] = useState([]);
    const [extraLabourCost, setExtraLabourCost] = useState('');

    // ── Derived: unit revenue from shelter revenue items ──────────────────────
    const unitRevenue = useMemo(() => {
        if (!selectedShelterInstanceId) return 0;
        // Find the shelterRevenueItem for this instance
        const item = (shelterRevenueItems || []).find(
            r => r.shelter_instance_id === selectedShelterInstanceId
        );
        if (!item) return 0;
        const total = getShelterRevenueTotal ? getShelterRevenueTotal(item) : (parseFloat(item.total_revenue) || 0);
        const qty = parseFloat(item.pending_quantity) || 0;
        return qty > 0 ? total / qty : (parseFloat(item.unit_revenue) || 0);
    }, [selectedShelterInstanceId, shelterRevenueItems, getShelterRevenueTotal]);

    // ── Calculations ──────────────────────────────────────────────────────────
    const results = useMemo(() => {
        const qty = parseFloat(quantity) || 0;
        const revenue = qty * unitRevenue;

        const fixedMult = parseFloat(fixedMultiplier) || 0;
        const supMult = parseFloat(supervisorMultiplier) || 0;

        const opCost = (parseFloat(fixedDailyTotal) + parseFloat(operationalDailyTotal)) * fixedMult;
        const supCost = parseFloat(supervisorDailyCost) * supMult;

        const deptLabourCost = deptHoursRows.reduce((sum, row) => {
            const hrs = parseFloat(row.hours) || 0;
            const rate = getDeptHourlyCost(row.department_id, departmentAssignments, labourPersonnel, departments);
            return sum + hrs * rate;
        }, 0);

        const extra = parseFloat(extraLabourCost) || 0;
        const totalLabour = supCost + deptLabourCost + extra;
        const resultBeforeDepreciation = revenue - opCost - totalLabour;
        const depreciationCharge = revenue * (parseFloat(depreciationFactor) || 0);
        const finalResult = resultBeforeDepreciation - depreciationCharge;

        return { revenue, opCost, supCost, deptLabourCost, extra, totalLabour, resultBeforeDepreciation, depreciationCharge, finalResult };
    }, [quantity, unitRevenue, fixedMultiplier, supervisorMultiplier, fixedDailyTotal, operationalDailyTotal, supervisorDailyCost, deptHoursRows, extraLabourCost, depreciationFactor, departmentAssignments, labourPersonnel, departments]);

    // ── Dept hours rows helpers ───────────────────────────────────────────────
    const addDeptRow = () => setDeptHoursRows(prev => [...prev, { department_id: '', hours: '' }]);
    const removeDeptRow = (i) => setDeptHoursRows(prev => prev.filter((_, idx) => idx !== i));
    const updateDeptRow = (i, field, value) =>
        setDeptHoursRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

    const panelColors = ['blue', 'violet', 'emerald', 'orange'];
    const color = panelColors[panelIndex % panelColors.length];
    const borderClass = {
        blue: 'border-blue-300',
        violet: 'border-violet-300',
        emerald: 'border-emerald-300',
        orange: 'border-orange-300',
    }[color];
    const headerClass = {
        blue: 'bg-blue-50 border-blue-200',
        violet: 'bg-violet-50 border-violet-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        orange: 'bg-orange-50 border-orange-200',
    }[color];
    const iconClass = {
        blue: 'text-blue-600',
        violet: 'text-violet-600',
        emerald: 'text-emerald-600',
        orange: 'text-orange-600',
    }[color];

    return (
        <Card className={`border-2 ${borderClass} h-full flex flex-col`}>
            {/* Header */}
            <CardHeader className={`border-b ${headerClass} py-3 px-4`}>
                <div className="flex items-center gap-2">
                    <FlaskConical className={`w-4 h-4 ${iconClass}`} />
                    <CardTitle className="text-sm font-bold text-slate-800">
                        Προσομοίωση {panelIndex + 1}
                    </CardTitle>
                </div>
            </CardHeader>

            <CardContent className="pt-4 px-4 pb-4 flex-1 flex flex-col gap-4">
                {/* ── Inputs ── */}
                <div className="space-y-3">
                    {/* Τύπος στάσης + ποσότητα */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs text-slate-600">Τύπος Στάσης</Label>
                            <Select value={selectedShelterInstanceId} onValueChange={setSelectedShelterInstanceId}>
                                <SelectTrigger className="h-8 text-xs mt-1">
                                    <SelectValue placeholder="Επιλογή..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {shelterInstances.map(si => (
                                        <SelectItem key={si.id} value={si.id}>
                                            {si.name || si.instance_name || si.id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs text-slate-600">Ποσότητα</Label>
                            <Input
                                type="number"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                placeholder="π.χ. 10"
                                className="h-8 text-xs mt-1"
                            />
                        </div>
                    </div>

                    {/* Unit revenue preview */}
                    {unitRevenue > 0 && (
                        <div className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">
                            Τιμή μονάδας: {formatCurrency(unitRevenue)} →
                            <span className="font-semibold text-blue-600 ml-1">
                                Έσοδα: {formatCurrency(results.revenue)}
                            </span>
                        </div>
                    )}

                    {/* Multipliers */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs text-slate-600">× Κόστος Λειτουργίας</Label>
                            <Input
                                type="number"
                                value={fixedMultiplier}
                                onChange={e => setFixedMultiplier(e.target.value)}
                                placeholder="1"
                                className="h-8 text-xs mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-slate-600">× Κόστος Επιστάρχη</Label>
                            <Input
                                type="number"
                                value={supervisorMultiplier}
                                onChange={e => setSupervisorMultiplier(e.target.value)}
                                placeholder="1"
                                className="h-8 text-xs mt-1"
                            />
                        </div>
                    </div>

                    {/* Department hours */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-600">Ώρες ανά Τμήμα</Label>
                            <Button size="sm" variant="outline" onClick={addDeptRow} className="h-6 text-xs px-2 gap-1">
                                <Plus className="w-3 h-3" />
                                Τμήμα
                            </Button>
                        </div>
                        {deptHoursRows.map((row, i) => {
                            const rate = getDeptHourlyCost(row.department_id, departmentAssignments, labourPersonnel, departments);
                            const hrs = parseFloat(row.hours) || 0;
                            return (
                                <div key={i} className="flex items-center gap-2">
                                    <Select value={row.department_id} onValueChange={v => updateDeptRow(i, 'department_id', v)}>
                                        <SelectTrigger className="h-7 text-xs flex-1">
                                            <SelectValue placeholder="Τμήμα..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map(d => (
                                                <SelectItem key={d.id} value={d.id}>
                                                    {d.department_name || d.name || d.id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={row.hours}
                                        onChange={e => updateDeptRow(i, 'hours', e.target.value)}
                                        placeholder="ώρες"
                                        className="h-7 text-xs w-16"
                                    />
                                    {row.department_id && rate > 0 && (
                                        <span className="text-xs text-slate-400 whitespace-nowrap">
                                            = {formatCurrency(hrs * rate)}
                                        </span>
                                    )}
                                    <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => removeDeptRow(i)}>
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Extra labour cost */}
                    <div>
                        <Label className="text-xs text-slate-600">Πρόσθετο Κόστος Εργατικών (€)</Label>
                        <Input
                            type="number"
                            value={extraLabourCost}
                            onChange={e => setExtraLabourCost(e.target.value)}
                            placeholder="0"
                            className="h-8 text-xs mt-1"
                        />
                    </div>
                </div>

                {/* ── Results ── */}
                <div className="border-t border-slate-200 pt-3 space-y-1 mt-auto">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-700">Έσοδα</span>
                        <span className="text-xs font-semibold text-blue-600">{formatCurrency(results.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-700">Κόστος Λειτουργίας</span>
                        <span className="text-xs font-semibold text-red-500">– {formatCurrency(results.opCost)}</span>
                    </div>
                    <div className="py-1 border-b border-slate-100 space-y-0.5">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-slate-700">Κόστος Εργατικών</span>
                            <span className="text-xs font-semibold text-red-500">– {formatCurrency(results.totalLabour)}</span>
                        </div>
                        <div className="flex justify-between items-center pl-3">
                            <span className="text-xs text-slate-400">→ Επιστάρχη</span>
                            <span className="text-xs text-slate-400">– {formatCurrency(results.supCost)}</span>
                        </div>
                        <div className="flex justify-between items-center pl-3">
                            <span className="text-xs text-slate-400">→ Ώρες Τμημάτων</span>
                            <span className="text-xs text-slate-400">– {formatCurrency(results.deptLabourCost)}</span>
                        </div>
                        {results.extra > 0 && (
                            <div className="flex justify-between items-center pl-3">
                                <span className="text-xs text-slate-400">→ Πρόσθετο</span>
                                <span className="text-xs text-slate-400">– {formatCurrency(results.extra)}</span>
                            </div>
                        )}
                    </div>
                    <div className={`flex justify-between items-center py-1.5 px-2 rounded ${results.resultBeforeDepreciation >= 0 ? 'bg-green-50' : 'bg-red-50'} border-b border-slate-100`}>
                        <span className="text-xs font-semibold text-slate-700">Αποτέλεσμα προ Απόσβεσης</span>
                        <span className={`text-xs font-bold ${results.resultBeforeDepreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {results.resultBeforeDepreciation >= 0 ? '' : '– '}{formatCurrency(Math.abs(results.resultBeforeDepreciation))}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-700">Επιβάρυνση Απόσβεσης</span>
                        <span className="text-xs font-semibold text-red-500">– {formatCurrency(results.depreciationCharge)}</span>
                    </div>
                    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${results.finalResult >= 0 ? 'bg-blue-50' : 'bg-red-50'} mt-1`}>
                        <span className="text-xs font-bold text-slate-900">Τελικό Αποτέλεσμα</span>
                        <span className={`text-sm font-bold ${results.finalResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {results.finalResult >= 0 ? '' : '– '}{formatCurrency(Math.abs(results.finalResult))}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}