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
            step="0.01"
            className="h-7 text-right text-xs border-0 focus-visible:ring-1 w-full"
            value={parseNum(value)}
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
        road_marking: 594000.00,
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

    const saving = false;

    const handleSave = async () => {
        // TODO: Save to database
    };

    // Tender Budget totals
    const tenderIncomeTotal = parseNum(tenderBudget.pm) + parseNum(tenderBudget.labour) + parseNum(tenderBudget.assets) + parseNum(tenderBudget.materials) + parseNum(tenderBudget.other) + parseNum(tenderBudget.road_marking) + parseNum(tenderBudget.options) + parseNum(tenderBudget.maintenance);
    const tenderCostTotal = 1691870.00 + 4218936.12 + 682700.00 + 1817725.02 + 2000972.41 + 540000.00 + 900000.00 + 2035720.00;

    // Project Budget Correction totals
    const projectIncomeTotal = parseNum(projectBudgetCorrection.pm) + parseNum(projectBudgetCorrection.pm_allocation) + parseNum(projectBudgetCorrection.labour) + parseNum(projectBudgetCorrection.labour_allocation) + parseNum(projectBudgetCorrection.assets) + parseNum(projectBudgetCorrection.materials) + parseNum(projectBudgetCorrection.other) + parseNum(projectBudgetCorrection.road_marking) + parseNum(projectBudgetCorrection.sealour) + parseNum(projectBudgetCorrection.maintenance);
    const projectCostTotal = 1691870.00 + 205200.00 + 4216936.12 + 307800.00 + 682700.00 + 1817725.02 + 2000972.41 + 540000.00 + 540000.00 + 2035720.00;

    // Fabrication Budget totals
    const fabricationIncomeTotal = parseNum(fabricationBudget.pm) + parseNum(fabricationBudget.labour) + parseNum(fabricationBudget.setup_cost_asset) + parseNum(fabricationBudget.materials) + parseNum(fabricationBudget.other);
    const fabricationCostTotal = 424800.00 + 1857332.00 + 354000.00 + 339940.00 + 293112.00;

    // Total Tender Expected Profit calculations
    const tenderTotalProfitAmount = tenderIncomeTotal - tenderCostTotal;
    const tenderACShare75 = tenderTotalProfitAmount * 0.75;
    const tenderExpectedProfit = tenderTotalProfitAmount;

    // Total Project Expected Profit calculations
    const projectTotalProfitAmount = projectIncomeTotal - projectCostTotal;
    const projectACShare75 = projectTotalProfitAmount * 0.75;
    const projectExpectedProfitAmount = projectTotalProfitAmount;

    return (
        <div className="space-y-6">
            {/* Save Button at Top */}
            <div className="flex justify-end">
                <Button onClick={handleSave}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Save All Changes
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-6">
            {/* LEFT COLUMN: TENDER TABLES */}
            <div className="space-y-6">
            {/* 1. Tender Budget */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Tender Budget</h2>
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
                                <InputCell value={fmt(tenderBudget.pm)} onChange={v => setTenderBudget({...tenderBudget, pm: parseNum(v)})} />
                                <InputCell value={fmt(1691870.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={fmt(tenderBudget.labour)} onChange={v => setTenderBudget({...tenderBudget, labour: parseNum(v)})} />
                                <InputCell value={fmt(4218936.12)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Assets</TD>
                                <InputCell value={fmt(tenderBudget.assets)} onChange={v => setTenderBudget({...tenderBudget, assets: parseNum(v)})} />
                                <InputCell value={fmt(682700.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={fmt(tenderBudget.materials)} onChange={v => setTenderBudget({...tenderBudget, materials: parseNum(v)})} />
                                <InputCell value={fmt(1817725.02)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={fmt(tenderBudget.other)} onChange={v => setTenderBudget({...tenderBudget, other: parseNum(v)})} />
                                <InputCell value={fmt(2000972.41)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Road Marking</TD>
                                <InputCell value={fmt(tenderBudget.road_marking)} onChange={v => setTenderBudget({...tenderBudget, road_marking: parseNum(v)})} />
                                <InputCell value={fmt(540000.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Options</TD>
                                <InputCell value={fmt(tenderBudget.options)} onChange={v => setTenderBudget({...tenderBudget, options: parseNum(v)})} />
                                <InputCell value={fmt(900000.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Maintenance</TD>
                                <InputCell value={fmt(tenderBudget.maintenance)} onChange={v => setTenderBudget({...tenderBudget, maintenance: parseNum(v)})} />
                                <InputCell value={fmt(2035720.00)} onChange={() => {}} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Total Tender Budget</TD>
                                <CalcCell value={tenderIncomeTotal} className="font-bold" />
                                <CalcCell value={tenderCostTotal} className="font-bold" />
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
                                <TD>JV-Aircontrol Share Tender 75%</TD>
                                <CalcCell value={tenderJVProfit.ac_share_70} />
                            </tr>
                            <tr>
                                <TD>JV-Amco Share Tender 25%</TD>
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
                                <CalcCell value={tenderIncomeTotal} />
                            </tr>
                            <tr>
                                <TD>Total Tender Budget Cost</TD>
                                <CalcCell value={tenderCostTotal} />
                            </tr>
                            <tr>
                                <TD>JV-Aircontrol Share Tender 75%</TD>
                                <CalcCell value={tenderACShare75} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Expected Tender Profit</TD>
                                <CalcCell value={tenderTotalProfitAmount} className="font-bold" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            </div>

            {/* RIGHT COLUMN: PROJECT TABLES */}
            <div className="space-y-6">
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
                                <InputCell value={fmt(projectBudgetCorrection.pm)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, pm: parseNum(v)})} />
                                <InputCell value={fmt(1691870.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>PM - Allocation Fabrication</TD>
                                <InputCell value={fmt(projectBudgetCorrection.pm_allocation)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, pm_allocation: parseNum(v)})} />
                                <InputCell value={fmt(205200.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={fmt(projectBudgetCorrection.labour)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, labour: parseNum(v)})} />
                                <InputCell value={fmt(4216936.12)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Labour - Allocation Fabrication</TD>
                                <InputCell value={fmt(projectBudgetCorrection.labour_allocation)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, labour_allocation: parseNum(v)})} />
                                <InputCell value={fmt(307800.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Assets</TD>
                                <InputCell value={fmt(projectBudgetCorrection.assets)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, assets: parseNum(v)})} />
                                <InputCell value={fmt(682700.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={fmt(projectBudgetCorrection.materials)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, materials: parseNum(v)})} />
                                <InputCell value={fmt(1817725.02)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={fmt(projectBudgetCorrection.other)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, other: parseNum(v)})} />
                                <InputCell value={fmt(2000972.41)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Road Marking</TD>
                                <InputCell value={fmt(projectBudgetCorrection.road_marking)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, road_marking: parseNum(v)})} />
                                <InputCell value={fmt(540000.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Sealour</TD>
                                <InputCell value={fmt(projectBudgetCorrection.sealour)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, sealour: parseNum(v)})} />
                                <InputCell value={fmt(540000.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Maintenance</TD>
                                <InputCell value={fmt(projectBudgetCorrection.maintenance)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, maintenance: parseNum(v)})} />
                                <InputCell value={fmt(2035720.00)} onChange={() => {}} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Total Contract Budget</TD>
                                <CalcCell value={projectIncomeTotal} className="font-bold" />
                                <CalcCell value={projectCostTotal} className="font-bold" />
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
                                <InputCell value={fmt(fabricationBudget.pm)} onChange={v => setFabricationBudget({...fabricationBudget, pm: parseNum(v)})} />
                                <InputCell value={fmt(424800.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={fmt(fabricationBudget.labour)} onChange={v => setFabricationBudget({...fabricationBudget, labour: parseNum(v)})} />
                                <InputCell value={fmt(1857332.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Set Up Cost - Asset</TD>
                                <InputCell value={fmt(fabricationBudget.setup_cost_asset)} onChange={v => setFabricationBudget({...fabricationBudget, setup_cost_asset: parseNum(v)})} />
                                <InputCell value={fmt(354000.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={fmt(fabricationBudget.materials)} onChange={v => setFabricationBudget({...fabricationBudget, materials: parseNum(v)})} />
                                <InputCell value={fmt(339940.00)} onChange={() => {}} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={fmt(fabricationBudget.other)} onChange={v => setFabricationBudget({...fabricationBudget, other: parseNum(v)})} />
                                <InputCell value={fmt(293112.00)} onChange={() => {}} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Total Fabrication Analysis</TD>
                                <CalcCell value={fabricationIncomeTotal} className="font-bold" />
                                <CalcCell value={fabricationCostTotal} className="font-bold" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. Project JV Budget Profit */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Project JV Budget Profit</h2>
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
                                <TD>JV-Aircontrol Share Tender 75%</TD>
                                <CalcCell value={tenderJVProfit.ac_share_70} />
                            </tr>
                            <tr>
                                <TD>JV-Amco Share Tender 25%</TD>
                                <CalcCell value={tenderJVProfit.amco_share_30} />
                            </tr>
                            <tr className="bg-slate-50">
                                <TD colSpan={2} className="text-xs text-slate-500">*Note Refer Budget Analysis Sheet</TD>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 5. Total Project Expected Profit */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Total Project Expected Profit</h2>
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
                                <CalcCell value={projectIncomeTotal} />
                            </tr>
                            <tr>
                                <TD>Total Project Cost</TD>
                                <CalcCell value={projectCostTotal} />
                            </tr>
                            <tr>
                                <TD>JV-Aircontrol Share Project 75%</TD>
                                <CalcCell value={projectACShare75} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Expected Project Profit</TD>
                                <CalcCell value={projectExpectedProfitAmount} className="font-bold" />
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
            </div>
        </div>
    );
}