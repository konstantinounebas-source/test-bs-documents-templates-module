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

const COLORS = ['blue', 'violet', 'emerald', 'orange'];
const STYLE = {
    blue:    { border: 'border-blue-300',   header: 'bg-blue-50 border-blue-200',    icon: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700' },
    violet:  { border: 'border-violet-300', header: 'bg-violet-50 border-violet-200', icon: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
    emerald: { border: 'border-emerald-300',header: 'bg-emerald-50 border-emerald-200',icon:'text-emerald-600',badge: 'bg-emerald-100 text-emerald-700' },
    orange:  { border: 'border-orange-300', header: 'bg-orange-50 border-orange-200', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
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
}) {
    const color = COLORS[panelIndex % COLORS.length];
    const s = STYLE[color];

    // ── State ────────────────────────────────────────────────────────────────
    const [title, setTitle] = useState('');
    const [inputsExpanded, setInputsExpanded] = useState(true);

    // Multiple shelter rows
    const [shelterRows, setShelterRows] = useState([{ shelter_instance_id: '', quantity: '' }]);

    const [fixedMultiplier, setFixedMultiplier] = useState('1');
    const [supervisorMultiplier, setSupervisorMultiplier] = useState('1');
    const [deptHoursRows, setDeptHoursRows] = useState([]);
    const [extraLabourCost, setExtraLabourCost] = useState('');
    const [extraLabourNote, setExtraLabourNote] = useState('');

    // ── Shelter rows helpers ─────────────────────────────────────────────────
    const addShelterRow = () => setShelterRows(prev => [...prev, { shelter_instance_id: '', quantity: '' }]);
    const removeShelterRow = (i) => setShelterRows(prev => prev.filter((_, idx) => idx !== i));
    const updateShelterRow = (i, field, value) =>
        setShelterRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

    const getUnitRevenue = (shelterInstanceId) => {
        if (!shelterInstanceId) return 0;
        const item = (shelterRevenueItems || []).find(r => r.shelter_instance_id === shelterInstanceId);
        if (!item) return 0;
        const total = getShelterRevenueTotal ? getShelterRevenueTotal(item) : (parseFloat(item.total_revenue) || 0);
        const qty = parseFloat(item.pending_quantity) || 0;
        return qty > 0 ? total / qty : (parseFloat(item.unit_revenue) || 0);
    };

    // ── Dept hours helpers ───────────────────────────────────────────────────
    const addDeptRow = () => setDeptHoursRows(prev => [...prev, { department_id: '', hours: '' }]);
    const removeDeptRow = (i) => setDeptHoursRows(prev => prev.filter((_, idx) => idx !== i));
    const updateDeptRow = (i, field, value) =>
        setDeptHoursRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

    // ── Calculations ─────────────────────────────────────────────────────────
    const results = useMemo(() => {
        const revenue = shelterRows.reduce((sum, row) => {
            const qty = parseFloat(row.quantity) || 0;
            return sum + qty * getUnitRevenue(row.shelter_instance_id);
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
    }, [shelterRows, fixedMultiplier, supervisorMultiplier, fixedDailyTotal, operationalDailyTotal, supervisorDailyCost, deptHoursRows, extraLabourCost, depreciationFactor, departmentAssignments, labourPersonnel, departments, shelterRevenueItems]);

    return (
        <Card className={`border-2 ${s.border}`}>
            {/* ── Header ── */}
            <CardHeader className={`border-b ${s.header} py-2 px-3`}>
                <div className="flex items-center gap-2">
                    <FlaskConical className={`w-4 h-4 flex-shrink-0 ${s.icon}`} />
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Προσομοίωση {panelIndex + 1}</span>
                    <Input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
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
                    {inputsExpanded && <div className="pt-3 space-y-3 border-b border-slate-200 pb-3">
                    {/* ── Είδη Στάσεων ── */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Είδη Στάσεων</span>
                            <Button size="sm" variant="outline" onClick={addShelterRow} className="h-5 text-[11px] px-2 gap-1 py-0">
                                <Plus className="w-3 h-3" />
                                Προσθήκη
                            </Button>
                        </div>
                        {shelterRows.map((row, i) => {
                            const uRev = getUnitRevenue(row.shelter_instance_id);
                            const qty = parseFloat(row.quantity) || 0;
                            return (
                                <div key={i} className="flex items-center gap-1.5">
                                    <Select value={row.shelter_instance_id} onValueChange={v => updateShelterRow(i, 'shelter_instance_id', v)}>
                                        <SelectTrigger className="h-7 text-xs flex-1">
                                            <SelectValue placeholder="Τύπος στάσης..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {shelterInstances.map(si => (
                                                <SelectItem key={si.id} value={si.id}>
                                                    {si.name || si.instance_name || si.id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={row.quantity}
                                        onChange={e => updateShelterRow(i, 'quantity', e.target.value)}
                                        placeholder="Qty"
                                        className="h-7 text-xs w-14"
                                    />
                                    {uRev > 0 && qty > 0 && (
                                        <span className="text-[11px] text-blue-600 font-semibold whitespace-nowrap w-20 text-right">
                                            {formatCurrency(qty * uRev)}
                                        </span>
                                    )}
                                    {shelterRows.length > 1 && (
                                        <button onClick={() => removeShelterRow(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        {results.revenue > 0 && (
                            <div className="flex justify-between text-[11px] font-semibold text-blue-700 bg-blue-50 rounded px-2 py-1">
                                <span>Σύνολο Εσόδων</span>
                                <span>{formatCurrency(results.revenue)}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Multipliers ── */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[11px] text-slate-500">× Κόστος Λειτουργίας</label>
                            <Input type="number" value={fixedMultiplier} onChange={e => setFixedMultiplier(e.target.value)} placeholder="1" className="h-7 text-xs mt-0.5" />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-500">× Κόστος Επιστάρχη</label>
                            <Input type="number" value={supervisorMultiplier} onChange={e => setSupervisorMultiplier(e.target.value)} placeholder="1" className="h-7 text-xs mt-0.5" />
                        </div>
                    </div>

                    {/* ── Ώρες ανά Τμήμα ── */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ώρες ανά Τμήμα</span>
                            <Button size="sm" variant="outline" onClick={addDeptRow} className="h-5 text-[11px] px-2 gap-1 py-0">
                                <Plus className="w-3 h-3" />
                                Τμήμα
                            </Button>
                        </div>
                        {deptHoursRows.map((row, i) => {
                            const rate = getDeptHourlyCost(row.department_id, departmentAssignments, labourPersonnel, departments);
                            const hrs = parseFloat(row.hours) || 0;
                            return (
                                <div key={i} className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
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
                                            className="h-7 text-xs w-14"
                                        />
                                        {row.department_id && rate > 0 && hrs > 0 && (
                                            <span className="text-[11px] text-slate-500 whitespace-nowrap w-20 text-right">
                                                {formatCurrency(hrs * rate)}
                                            </span>
                                        )}
                                        <button onClick={() => removeDeptRow(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <Input
                                        value={row.note || ''}
                                        onChange={e => updateDeptRow(i, 'note', e.target.value)}
                                        placeholder="Σχόλιο..."
                                        className="h-6 text-[11px] px-2 text-slate-500 placeholder:text-slate-300"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Extra Labour ── */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] text-slate-500 whitespace-nowrap">Πρόσθετο Κόστος (€)</label>
                            <Input
                                type="number"
                                value={extraLabourCost}
                                onChange={e => setExtraLabourCost(e.target.value)}
                                placeholder="0"
                                className="h-7 text-xs flex-1"
                            />
                        </div>
                        <Input
                            value={extraLabourNote}
                            onChange={e => setExtraLabourNote(e.target.value)}
                            placeholder="Σχόλιο..."
                            className="h-6 text-[11px] px-2 text-slate-500 placeholder:text-slate-300"
                        />
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