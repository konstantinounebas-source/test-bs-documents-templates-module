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
    });

    const [projectBudgetCorrection, setProjectBudgetCorrection] = useState({
        pm: 2040395.22,
        pm_allocation: 255500.00,
        labour: 5085624.96,
        labour_allocation: 384750.00,
        assets: 823336.20,
        materials: 2192176.37,
        other: 2413172.73,
        road_marking: 594000.00,
        sealour: 1050000.00,
        maintenance: 2650980.00,
    });

    const [fabricationBudget, setFabricationBudget] = useState({
        pm: 424800.00,
        labour: 1857332.00,
        setup_cost_asset: 354000.00,
        materials: 539840.00,
        other: 293112.00,
    });

    const [tenderJVProfit, setTenderJVProfit] = useState({
        total_jv: 1399753.13,
        ac_share_70: 979627.19,
        amco_share_30: 419925.94,
    });

    const [totalTenderProfit, setTotalTenderProfit] = useState({
        income: 16849685.48,
        cost: 13885923.55,
        ac_share: 2070627.19,
        expected: 3943589.12,
    });

    const [projectTotalProfit, setProjectTotalProfit] = useState({
        income: 20294790.46,
        cost: 16842007.55,
        ac_share: 1769133.57,
        expected: 5421916.50,
    });

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        // TODO: Save to database
        setTimeout(() => setSaving(false), 500);
    };

    return (
        <div className="space-y-6">
            {/* 1. Tender Budget */}
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
                                <CalcCell value={1691870.00} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={tenderBudget.labour} onChange={v => setTenderBudget({...tenderBudget, labour: v})} />
                                <CalcCell value={4218936.12} />
                            </tr>
                            <tr>
                                <TD>Assets</TD>
                                <InputCell value={tenderBudget.assets} onChange={v => setTenderBudget({...tenderBudget, assets: v})} />
                                <CalcCell value={682700.00} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={tenderBudget.materials} onChange={v => setTenderBudget({...tenderBudget, materials: v})} />
                                <CalcCell value={1817725.02} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={tenderBudget.other} onChange={v => setTenderBudget({...tenderBudget, other: v})} />
                                <CalcCell value={2000972.41} />
                            </tr>
                            <tr>
                                <TD>Road Marking</TD>
                                <InputCell value={tenderBudget.road_marking} onChange={v => setTenderBudget({...tenderBudget, road_marking: v})} />
                                <CalcCell value={540000.00} />
                            </tr>
                            <tr>
                                <TD>Options</TD>
                                <InputCell value={tenderBudget.options} onChange={v => setTenderBudget({...tenderBudget, options: v})} />
                                <CalcCell value={900000.00} />
                            </tr>
                            <tr>
                                <TD>Maintenance</TD>
                                <InputCell value={tenderBudget.maintenance} onChange={v => setTenderBudget({...tenderBudget, maintenance: v})} />
                                <CalcCell value={2035720.00} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Total Tender Budget</TD>
                                <CalcCell value={16849685.48} className="font-bold" />
                                <CalcCell value={13885923.55} className="font-bold" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. Project Budget with Correction to Fabrication */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Project Budget with Correction to Fabrication</h2>
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
                                <InputCell value={projectBudgetCorrection.pm} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, pm: v})} />
                                <CalcCell value={1691870.00} />
                            </tr>
                            <tr>
                                <TD>PM - Allocation Fabrication</TD>
                                <InputCell value={projectBudgetCorrection.pm_allocation} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, pm_allocation: v})} />
                                <CalcCell value={205200.00} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={projectBudgetCorrection.labour} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, labour: v})} />
                                <CalcCell value={4216936.12} />
                            </tr>
                            <tr>
                                <TD>Labour - Allocation Fabrication</TD>
                                <InputCell value={projectBudgetCorrection.labour_allocation} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, labour_allocation: v})} />
                                <CalcCell value={307800.00} />
                            </tr>
                            <tr>
                                <TD>Assets</TD>
                                <InputCell value={projectBudgetCorrection.assets} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, assets: v})} />
                                <CalcCell value={682700.00} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={projectBudgetCorrection.materials} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, materials: v})} />
                                <CalcCell value={1817725.02} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={projectBudgetCorrection.other} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, other: v})} />
                                <CalcCell value={2000972.41} />
                            </tr>
                            <tr>
                                <TD>Road Marking</TD>
                                <InputCell value={projectBudgetCorrection.road_marking} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, road_marking: v})} />
                                <CalcCell value={540000.00} />
                            </tr>
                            <tr>
                                <TD>Sealour</TD>
                                <InputCell value={projectBudgetCorrection.sealour} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, sealour: v})} />
                                <CalcCell value={540000.00} />
                            </tr>
                            <tr>
                                <TD>Maintenance</TD>
                                <InputCell value={projectBudgetCorrection.maintenance} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, maintenance: v})} />
                                <CalcCell value={2035720.00} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Total Contract Budget</TD>
                                <CalcCell value={16206435.48} className="font-bold" />
                                <CalcCell value={13372007.55} className="font-bold" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. Fabrication Project Budget */}
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
                                <CalcCell value={424800.00} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={fabricationBudget.labour} onChange={v => setFabricationBudget({...fabricationBudget, labour: v})} />
                                <CalcCell value={1857332.00} />
                            </tr>
                            <tr>
                                <TD>Set Up Cost - Asset</TD>
                                <InputCell value={fabricationBudget.setup_cost_asset} onChange={v => setFabricationBudget({...fabricationBudget, setup_cost_asset: v})} />
                                <CalcCell value={354000.00} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={fabricationBudget.materials} onChange={v => setFabricationBudget({...fabricationBudget, materials: v})} />
                                <CalcCell value={339940.00} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={fabricationBudget.other} onChange={v => setFabricationBudget({...fabricationBudget, other: v})} />
                                <CalcCell value={293112.00} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Total Fabrication Analysis</TD>
                                <CalcCell value={4066350.00} className="font-bold" />
                                <CalcCell value={3269084.00} className="font-bold" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. Tender JV Budget Profit */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Tender JV Budget Profit</h2>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <TH className="text-left">Description</TH>
                                <TH>Value</TH>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <TD>Total Tender JV</TD>
                                <CalcCell value={tenderJVProfit.total_jv} />
                            </tr>
                            <tr>
                                <TD>JV-Aircontrol Share Tender 70%</TD>
                                <CalcCell value={tenderJVProfit.ac_share_70} />
                            </tr>
                            <tr>
                                <TD>JV-Amco Share Tender 30%</TD>
                                <CalcCell value={tenderJVProfit.amco_share_30} />
                            </tr>
                            <tr className="bg-slate-50">
                                <TD colSpan={2} className="text-xs text-slate-500">*Note Refer Budget Analysis Sheet</TD>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 5. Total Tender Expected Profit */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Total Tender Expected Profit</h2>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <TH className="text-left">Description</TH>
                                <TH>Value</TH>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <TD>Total TenderBudget Income</TD>
                                <CalcCell value={totalTenderProfit.income} />
                            </tr>
                            <tr>
                                <TD>Total Tender Budget Cost</TD>
                                <CalcCell value={totalTenderProfit.cost} />
                            </tr>
                            <tr>
                                <TD>JV-Aircontrol Share Tender 75%</TD>
                                <CalcCell value={totalTenderProfit.ac_share} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Expected Tender Profit</TD>
                                <CalcCell value={totalTenderProfit.expected} className="font-bold" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 6. Total Project Profit */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Total Project Profit</h2>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <TH className="text-left">Description</TH>
                                <TH>Value</TH>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <TD>Total Project Income</TD>
                                <CalcCell value={projectTotalProfit.income} />
                            </tr>
                            <tr>
                                <TD>Total Project Cost</TD>
                                <CalcCell value={projectTotalProfit.cost} />
                            </tr>
                            <tr>
                                <TD>JV-Aircontrol Share Tender 75%</TD>
                                <CalcCell value={projectTotalProfit.ac_share} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Expected Project Profit</TD>
                                <CalcCell value={projectTotalProfit.expected} className="font-bold" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}