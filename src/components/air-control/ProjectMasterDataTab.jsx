import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const fmt = (val) => {
    if (val === null || val === undefined || val === '') return '';
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseNum = (val) => {
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
};

// Helper components
const TH = ({ children, className = '' }) => (
    <th className={`border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs ${className}`}>
        {children}
    </th>
);

const TD = ({ children, bold = false, className = '' }) => (
    <td className={`border border-slate-300 px-3 py-1 ${bold ? 'font-bold' : ''} ${className}`}>
        {children}
    </td>
);

const InputCell = ({ value, onChange }) => (
    <td className="border border-slate-300 px-1 py-1">
        <Input
            type="number"
            className="h-7 text-right text-xs border-0 focus-visible:ring-1 w-full"
            value={value}
            onChange={e => onChange(e.target.value)}
        />
    </td>
);

const CalcCell = ({ value, className = '' }) => (
    <td className={`border border-slate-300 px-3 py-1 text-right text-slate-800 bg-slate-50 ${className}`}>
        {fmt(value)}
    </td>
);

export default function ProjectMasterDataTab() {
    const [tenderBudget, setTenderBudget] = useState({
        pm: 2040395.22,
        labour: 5085624.96,
        assets: 823336.20,
        materials: 2192176.37,
        other: 2413172.73,
        road_marking: 504000.00,
        options: 1050000.00,
        maintenance: 2650980.00,
        tender_cost: 13681670.48,
    });

    const [fabricationBudget, setFabricationBudget] = useState({
        pm: 424800.00,
        labour: 1857332.00,
        setup_cost_asset: 354000.00,
        materials: 539840.00,
        other: 293112.00,
        labour_fabrication: 384750.00,
        pm_fabrication: 255500.00,
        fabrication_cost: 4069334.00,
    });

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        // TODO: Save to database
        setTimeout(() => setSaving(false), 500);
    };

    return (
        <div className="space-y-6">
            {/* Left: Tender Budget */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Tender Budget</h2>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Save
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <TH className="text-left">Category</TH>
                                <TH>Income</TH>
                                <TH>Cost</TH>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <TD>PM</TD>
                                <InputCell value={tenderBudget.pm} onChange={v => setTenderBudget({...tenderBudget, pm: v})} />
                                <InputCell value={parseNum(tenderBudget.pm) * 0.83} onChange={v => {}} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={tenderBudget.labour} onChange={v => setTenderBudget({...tenderBudget, labour: v})} />
                                <InputCell value={parseNum(tenderBudget.labour) * 0.83} onChange={v => {}} />
                            </tr>
                            <tr>
                                <TD>Assets</TD>
                                <InputCell value={tenderBudget.assets} onChange={v => setTenderBudget({...tenderBudget, assets: v})} />
                                <InputCell value={parseNum(tenderBudget.assets) * 0.83} onChange={v => {}} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={tenderBudget.materials} onChange={v => setTenderBudget({...tenderBudget, materials: v})} />
                                <InputCell value={parseNum(tenderBudget.materials) * 0.83} onChange={v => {}} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={tenderBudget.other} onChange={v => setTenderBudget({...tenderBudget, other: v})} />
                                <InputCell value={parseNum(tenderBudget.other) * 0.83} onChange={v => {}} />
                            </tr>
                            <tr>
                                <TD>Road Marking</TD>
                                <InputCell value={tenderBudget.road_marking} onChange={v => setTenderBudget({...tenderBudget, road_marking: v})} />
                                <InputCell value={parseNum(tenderBudget.road_marking) * 1} onChange={v => {}} />
                            </tr>
                            <tr>
                                <TD>Options</TD>
                                <InputCell value={tenderBudget.options} onChange={v => setTenderBudget({...tenderBudget, options: v})} />
                                <InputCell value={parseNum(tenderBudget.options) * 0.83} onChange={v => {}} />
                            </tr>
                            <tr>
                                <TD>Maintenance</TD>
                                <InputCell value={tenderBudget.maintenance} onChange={v => setTenderBudget({...tenderBudget, maintenance: v})} />
                                <InputCell value={parseNum(tenderBudget.maintenance) * 0.76} onChange={v => {}} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Total Tender Budget</TD>
                                <CalcCell value={Object.values(tenderBudget).slice(0, -1).reduce((s, v) => s + parseNum(v), 0)} />
                                <CalcCell value={13885923.55} />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right: Fabrication Budget */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Fabrication Project Budget</h2>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <TH className="text-left">Category</TH>
                                <TH>Income</TH>
                                <TH>Cost</TH>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <TD>PM</TD>
                                <InputCell value={fabricationBudget.pm} onChange={v => setFabricationBudget({...fabricationBudget, pm: v})} />
                                <CalcCell value={parseNum(fabricationBudget.pm)} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={fabricationBudget.labour} onChange={v => setFabricationBudget({...fabricationBudget, labour: v})} />
                                <CalcCell value={parseNum(fabricationBudget.labour)} />
                            </tr>
                            <tr>
                                <TD>Set Up Cost - Asset</TD>
                                <InputCell value={fabricationBudget.setup_cost_asset} onChange={v => setFabricationBudget({...fabricationBudget, setup_cost_asset: v})} />
                                <CalcCell value={parseNum(fabricationBudget.setup_cost_asset)} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={fabricationBudget.materials} onChange={v => setFabricationBudget({...fabricationBudget, materials: v})} />
                                <CalcCell value={parseNum(fabricationBudget.materials)} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={fabricationBudget.other} onChange={v => setFabricationBudget({...fabricationBudget, other: v})} />
                                <CalcCell value={parseNum(fabricationBudget.other)} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Total Fabrication Analysis</TD>
                                <CalcCell value={Object.values(fabricationBudget).slice(0, 5).reduce((s, v) => s + parseNum(v), 0)} />
                                <CalcCell value={3269084.00} />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}