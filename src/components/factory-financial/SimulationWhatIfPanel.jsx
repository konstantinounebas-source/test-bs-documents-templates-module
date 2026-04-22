import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';

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

const COLORS = ['blue', 'violet', 'emerald', 'orange', 'rose', 'cyan', 'amber', 'teal'];
const STYLE = {
    blue:    { border: 'border-blue-300',   header: 'bg-blue-50 border-blue-200',    icon: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700' },
    violet:  { border: 'border-violet-300', header: 'bg-violet-50 border-violet-200', icon: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
    emerald: { border: 'border-emerald-300',header: 'bg-emerald-50 border-emerald-200',icon:'text-emerald-600',badge: 'bg-emerald-100 text-emerald-700' },
    orange:  { border: 'border-orange-300', header: 'bg-orange-50 border-orange-200', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
    rose:    { border: 'border-rose-300',   header: 'bg-rose-50 border-rose-200',    icon: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700' },
    cyan:    { border: 'border-cyan-300',   header: 'bg-cyan-50 border-cyan-200',    icon: 'text-cyan-600',    badge: 'bg-cyan-100 text-cyan-700' },
    amber:   { border: 'border-amber-300',  header: 'bg-amber-50 border-amber-200',  icon: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
    teal:    { border: 'border-teal-300',   header: 'bg-teal-50 border-teal-200',    icon: 'text-teal-600',    badge: 'bg-teal-100 text-teal-700' },
};

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
    // New props for parent state management
    panelData = null,
    onPanelDataChange = null,
}) {
    const color = COLORS[panelIndex % COLORS.length];
    const s = STYLE[color];

    // Use parent state if provided, otherwise fall back to local state
    const hasParentState = panelData && onPanelDataChange;
    const [title, setTitle] = useState(panelData?.title || '');
    const [inputsExpanded, setInputsExpanded] = useState(false);
    const [shelterRows, setShelterRows] = useState(panelData?.shelterRows || [
        { shelter_instance_id_a: '', quantity_a: '', shelter_instance_id_b: '', quantity_b: '' }
    ]);
    const [fixedMultiplier, setFixedMultiplier] = useState(panelData?.fixedMultiplier || '0');
    const [supervisorMultiplier, setSupervisorMultiplier] = useState(panelData?.supervisorMultiplier || '0');
    const [deptHoursRows, setDeptHoursRows] = useState(panelData?.deptHoursRows || []);
    const [extraLabourCost, setExtraLabourCost] = useState(panelData?.extraLabourCost || '');
    const [extraLabourNote, setExtraLabourNote] = useState(panelData?.extraLabourNote || '');

    // ── Shelter rows helpers ─────────────────────────────────────────────────
    const addShelterRow = () => {
        const updated = [...shelterRows, { shelter_instance_id_a: '', quantity_a: '', shelter_instance_id_b: '', quantity_b: '' }];
        setShelterRows(updated);
        if (hasParentState) onPanelDataChange({ ...panelData, shelterRows: updated });
    };
    const removeShelterRow = (i) => {
        const updated = shelterRows.filter((_, idx) => idx !== i);
        setShelterRows(updated);
        if (hasParentState) onPanelDataChange({ ...panelData, shelterRows: updated });
    };
    const updateShelterRow = (i, field, value) => {
        const updated = shelterRows.map((r, idx) => idx === i ? { ...r, [field]: value } : r);
        setShelterRows(updated);
        if (hasParentState) onPanelDataChange({ ...panelData, shelterRows: updated });
    };

    const getUnitRevenue = (shelterInstanceId) => {
        if (!shelterInstanceId) return 0;
        const item = (shelterRevenueItems || []).find(r => r.shelter_instance_id === shelterInstanceId);
        if (!item) {
            // Fallback: if no revenue item, try to get from shelterInstances directly
            const si = (shelterInstances || []).find(s => s.id === shelterInstanceId);
            if (si && si.unit_revenue) return parseFloat(si.unit_revenue);
            return 0;
        }
        // Try to get unit revenue: use total_revenue / pending_quantity, else use unit_revenue field directly
        const total = getShelterRevenueTotal ? getShelterRevenueTotal(item) : (parseFloat(item.total_revenue) || 0);
        const qty = parseFloat(item.pending_quantity) || 0;
        
        // If qty exists and total exists, divide to get unit revenue
        if (qty > 0 && total > 0) return total / qty;
        
        // Fallback to unit_revenue field if available
        if (parseFloat(item.unit_revenue) > 0) return parseFloat(item.unit_revenue);
        
        // Last resort: use total_revenue directly as unit revenue (for 1 unit)
        return total > 0 ? total : 0;
    };

    // ── Dept hours helpers ───────────────────────────────────────────────────
    const addDeptRow = () => {
        const updated = [...deptHoursRows, { department_id: '', hours: '' }];
        setDeptHoursRows(updated);
        if (hasParentState) onPanelDataChange({ ...panelData, deptHoursRows: updated });
    };
    const removeDeptRow = (i) => {
        const updated = deptHoursRows.filter((_, idx) => idx !== i);
        setDeptHoursRows(updated);
        if (hasParentState) onPanelDataChange({ ...panelData, deptHoursRows: updated });
    };
    const updateDeptRow = (i, field, value) => {
        const updated = deptHoursRows.map((r, idx) => idx === i ? { ...r, [field]: value } : r);
        setDeptHoursRows(updated);
        if (hasParentState) onPanelDataChange({ ...panelData, deptHoursRows: updated });
    };

    // ── Calculations ─────────────────────────────────────────────────────────
    const results = useMemo(() => {
        const calcUnitRevenue = (shelterInstanceId) => {
            if (!shelterInstanceId) return 0;
            const item = (shelterRevenueItems || []).find(r => r.shelter_instance_id === shelterInstanceId);
            if (!item) {
                const si = (shelterInstances || []).find(s => s.id === shelterInstanceId);
                if (si && si.unit_revenue) return parseFloat(si.unit_revenue);
                return 0;
            }
            const total = getShelterRevenueTotal ? getShelterRevenueTotal(item) : (parseFloat(item.total_revenue) || 0);
            const qty = parseFloat(item.pending_quantity) || 0;
            
            // If qty exists and total exists, divide to get unit revenue
            if (qty > 0 && total > 0) return total / qty;
            
            // Fallback to unit_revenue field if available
            if (parseFloat(item.unit_revenue) > 0) return parseFloat(item.unit_revenue);
            
            // Last resort: use total_revenue directly as unit revenue (for 1 unit)
            return total > 0 ? total : 0;
        };

        const revenue = shelterRows.reduce((sum, row) => {
            const qtyA = parseFloat(row.quantity_a) || 0;
            const qtyB = parseFloat(row.quantity_b) || 0;
            return sum + qtyA * calcUnitRevenue(row.shelter_instance_id_a) + qtyB * calcUnitRevenue(row.shelter_instance_id_b);
        }, 0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shelterRows, fixedMultiplier, supervisorMultiplier, fixedDailyTotal, operationalDailyTotal, supervisorDailyCost, deptHoursRows, extraLabourCost, depreciationFactor, departmentAssignments, labourPersonnel, departments, shelterRevenueItems, getShelterRevenueTotal]);

    return (
        <Card className={`border-2 ${s.border}`}>
            {/* ── Header ── */}
            <CardHeader className={`border-b ${s.header} py-2 px-3`}>
                <div className="flex items-center gap-2">
                    <FlaskConical className={`w-4 h-4 flex-shrink-0 ${s.icon}`} />
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Προσομοίωση {panelIndex + 1}</span>
                    <Input
                        value={title}
                        onChange={e => {
                            setTitle(e.target.value);
                            if (hasParentState) onPanelDataChange({ ...panelData, title: e.target.value });
                        }}
                        placeholder="Τίτλος..."
                        className="h-6 text-xs px-2 py-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-slate-400 font-semibold text-slate-800 placeholder:text-slate-400"
                    />
                    <button
                        onClick={() => setInputsExpanded(p => !p)}
                        className="ml-auto text-slate-400 hover:text-slate-600 flex-shrink-0"
                    >
                        {inputsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </CardHeader>

            <CardContent className="px-3 pb-3 pt-0 space-y-3">
                    {/* ── Expandable Inputs ── */}
                    {inputsExpanded && <div className="pt-2 space-y-2 border-b border-slate-200 pb-2">
                    {/* ── Είδη Στάσεων ── */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Είδη Στάσεων</span>
                            <button onClick={addShelterRow} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
                                <Plus className="w-3 h-3" />Προσθήκη
                            </button>
                        </div>
                        {shelterRows.map((row, i) => {
                            const uRevA = getUnitRevenue(row.shelter_instance_id_a);
                            const uRevB = getUnitRevenue(row.shelter_instance_id_b);
                            const qtyA = parseFloat(row.quantity_a) || 0;
                            const qtyB = parseFloat(row.quantity_b) || 0;
                            const rowRevenue = qtyA * uRevA + qtyB * uRevB;
                            // Options come from shelterRevenueItems (Revenue tab entries) — value = shelter_instance_id
                            const revenueOptions = (shelterRevenueItems || []).filter(r => r.shelter_instance_id);
                            const getLabel = (siId) => {
                                const si = shelterInstances.find(s => s.id === siId);
                                return si ? (si.name || si.instance_name || siId) : siId;
                            };
                            return (
                                <div key={i} className="flex items-center gap-1">
                                    <Select value={row.shelter_instance_id_a || ''} onValueChange={v => updateShelterRow(i, 'shelter_instance_id_a', v)}>
                                        <SelectTrigger className="h-6 text-[11px] flex-1 px-2">
                                            <SelectValue placeholder="Στάση 1..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {revenueOptions.map((r, idx) => (
                                                <SelectItem key={r.shelter_instance_id + idx} value={r.shelter_instance_id}>
                                                    {getLabel(r.shelter_instance_id)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" value={row.quantity_a} onChange={e => updateShelterRow(i, 'quantity_a', e.target.value)} placeholder="Qty" className="h-6 text-[11px] w-10 px-1" />
                                    <Select value={row.shelter_instance_id_b || ''} onValueChange={v => updateShelterRow(i, 'shelter_instance_id_b', v)}>
                                        <SelectTrigger className="h-6 text-[11px] flex-1 px-2">
                                            <SelectValue placeholder="Στάση 2..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {revenueOptions.map((r, idx) => (
                                                <SelectItem key={r.shelter_instance_id + idx} value={r.shelter_instance_id}>
                                                    {getLabel(r.shelter_instance_id)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" value={row.quantity_b} onChange={e => updateShelterRow(i, 'quantity_b', e.target.value)} placeholder="Qty" className="h-6 text-[11px] w-10 px-1" />
                                    {rowRevenue > 0 && (
                                        <span className="text-[10px] text-blue-600 font-semibold whitespace-nowrap">{formatCurrency(rowRevenue)}</span>
                                    )}
                                    {shelterRows.length > 1 && (
                                        <button onClick={() => removeShelterRow(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        {results.revenue > 0 && (
                            <div className="flex justify-between text-[10px] font-semibold text-blue-700 bg-blue-50 rounded px-2 py-0.5">
                                <span>Σύνολο Εσόδων</span>
                                <span>{formatCurrency(results.revenue)}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Multipliers ── */}
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1 flex-1">
                            <label className="text-[10px] text-slate-400 whitespace-nowrap">× Λειτουργίας</label>
                            <Input type="number" value={fixedMultiplier} onChange={e => {
                                setFixedMultiplier(e.target.value);
                                if (hasParentState) onPanelDataChange({ ...panelData, fixedMultiplier: e.target.value });
                            }} placeholder="0" className="h-6 text-[11px] flex-1 px-1" />
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                            <label className="text-[10px] text-slate-400 whitespace-nowrap">× Επιστάρχη</label>
                            <Input type="number" value={supervisorMultiplier} onChange={e => {
                                setSupervisorMultiplier(e.target.value);
                                if (hasParentState) onPanelDataChange({ ...panelData, supervisorMultiplier: e.target.value });
                            }} placeholder="0" className="h-6 text-[11px] flex-1 px-1" />
                        </div>
                    </div>

                    {/* ── Ώρες ανά Τμήμα ── */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Ώρες ανά Τμήμα</span>
                            <button onClick={addDeptRow} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
                                <Plus className="w-3 h-3" />Τμήμα
                            </button>
                        </div>
                        {deptHoursRows.map((row, i) => {
                            const rate = getDeptHourlyCost(row.department_id, departmentAssignments, labourPersonnel, departments);
                            const hrs = parseFloat(row.hours) || 0;
                            return (
                                <div key={i} className="flex items-center gap-1">
                                    <Select value={row.department_id} onValueChange={v => updateDeptRow(i, 'department_id', v)}>
                                        <SelectTrigger className="h-6 text-[11px] w-28 px-2">
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
                                    <Input type="number" value={row.hours} onChange={e => updateDeptRow(i, 'hours', e.target.value)} placeholder="ώρες" className="h-6 text-[11px] w-12 px-1" />
                                    <Input value={row.note || ''} onChange={e => updateDeptRow(i, 'note', e.target.value)} placeholder="Σχόλιο..." className="h-6 text-[11px] flex-1 px-2 text-slate-500 placeholder:text-slate-300" />
                                    {row.department_id && rate > 0 && hrs > 0 && (
                                        <span className="text-[10px] text-slate-500 whitespace-nowrap">{formatCurrency(hrs * rate)}</span>
                                    )}
                                    <button onClick={() => removeDeptRow(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Extra Labour ── */}
                    <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-400 whitespace-nowrap">Πρόσθετο Κόστος (€)</label>
                        <Input type="number" value={extraLabourCost} onChange={e => {
                            setExtraLabourCost(e.target.value);
                            if (hasParentState) onPanelDataChange({ ...panelData, extraLabourCost: e.target.value });
                        }} placeholder="0" className="h-6 text-[11px] w-16 px-1" />
                        <Input value={extraLabourNote} onChange={e => {
                            setExtraLabourNote(e.target.value);
                            if (hasParentState) onPanelDataChange({ ...panelData, extraLabourNote: e.target.value });
                        }} placeholder="Σχόλιο..." className="h-6 text-[11px] flex-1 px-2 text-slate-500 placeholder:text-slate-300" />
                    </div>
                    </div>}

                    {/* ── Results ── */}
                    <div className="pt-2 space-y-0.5 text-xs">
                        <Row label="Έσοδα" value={formatCurrency(results.revenue)} valueClass="text-blue-600 font-semibold" />
                        <Row label="Κόστος Λειτουργίας" value={`– ${formatCurrency(results.opCost)}`} valueClass="text-red-500" />
                        <Row label="Κόστος Εργατικών" value={`– ${formatCurrency(results.totalLabour)}`} valueClass="text-red-500" sub={[
                            { label: 'Επιστάρχη', value: `– ${formatCurrency(results.supCost)}` },
                            { label: 'Ώρες Τμημάτων', value: `– ${formatCurrency(results.deptLabourCost)}` },
                            ...(results.extra > 0 ? [{ label: 'Πρόσθετο', value: `– ${formatCurrency(results.extra)}` }] : []),
                        ]} />
                        <div className={`flex justify-between items-center px-2 py-1 rounded mt-1 ${results.resultBeforeDepreciation >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                            <span className="font-semibold text-slate-700">Αποτέλεσμα προ Απόσβεσης</span>
                            <span className={`font-bold ${results.resultBeforeDepreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {results.resultBeforeDepreciation >= 0 ? '' : '– '}{formatCurrency(Math.abs(results.resultBeforeDepreciation))}
                            </span>
                        </div>
                        <Row label="Επιβάρυνση Απόσβεσης" value={`– ${formatCurrency(results.depreciationCharge)}`} valueClass="text-red-500" />
                        <div className={`flex justify-between items-center px-2 py-1.5 rounded-lg mt-1 ${results.finalResult >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                            <span className="font-bold text-slate-900">Τελικό Αποτέλεσμα</span>
                            <span className={`font-bold text-sm ${results.finalResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {results.finalResult >= 0 ? '' : '– '}{formatCurrency(Math.abs(results.finalResult))}
                            </span>
                        </div>
                    </div>
                </CardContent>
        </Card>
    );
}

function Row({ label, value, valueClass = 'text-slate-700', sub = [] }) {
    return (
        <div className="border-b border-slate-100 pb-0.5">
            <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600">{label}</span>
                <span className={valueClass}>{value}</span>
            </div>
            {sub.map((s, i) => (
                <div key={i} className="flex justify-between items-center py-0.5 pl-3">
                    <span className="text-slate-400 text-[11px]">→ {s.label}</span>
                    <span className="text-slate-400 text-[11px]">{s.value}</span>
                </div>
            ))}
        </div>
    );
}