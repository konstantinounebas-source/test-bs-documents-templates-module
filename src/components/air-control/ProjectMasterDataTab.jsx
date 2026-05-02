import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

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

const InputCell = ({ value, onChange }) => {
    const numValue = parseNum(value);
    return (
        <td className="border border-slate-300 px-1 py-1">
            <Input
                type="text"
                className="h-7 text-right text-xs border-0 focus-visible:ring-1 w-full"
                value={fmt(numValue)}
                onChange={e => onChange(e.target.value)}
            />
        </td>
    );
};

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
        pm_cost: 1691870.00,
        labour_cost: 4218936.12,
        assets_cost: 682700.00,
        materials_cost: 1817725.02,
        other_cost: 2000972.41,
        road_marking_cost: 540000.00,
        options_cost: 900000.00,
        maintenance_cost: 2035720.00,
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
        pm_cost: 1691870.00,
        pm_allocation_cost: 205200.00,
        labour_cost: 4216936.12,
        labour_allocation_cost: 307800.00,
        assets_cost: 682700.00,
        materials_cost: 1817725.02,
        other_cost: 2000972.41,
        road_marking_cost: 540000.00,
        sealour_cost: 540000.00,
        maintenance_cost: 2035720.00,
    });

    const [fabricationBudget, setFabricationBudget] = useState({
        pm: 424800.00,
        labour: 1857332.00,
        setup_cost_asset: 354000.00,
        materials: 539840.00,
        other: 293112.00,
        pm_cost: 424800.00,
        labour_cost: 1857332.00,
        setup_cost_cost: 354000.00,
        materials_cost: 339940.00,
        other_cost: 293112.00,
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
    const [recordId, setRecordId] = useState(null);

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const records = await base44.entities.ProjectMasterData.list();
            if (records.length > 0) {
                const record = records[0];
                setRecordId(record.id);
                if (record.tender_budget) setTenderBudget(record.tender_budget);
                if (record.project_budget_correction) setProjectBudgetCorrection(record.project_budget_correction);
                if (record.fabrication_budget) setFabricationBudget(record.fabrication_budget);
                if (record.tender_jv_profit) setTenderJVProfit(record.tender_jv_profit);
                if (record.total_tender_profit) setTotalTenderProfit(record.total_tender_profit);
                if (record.project_total_profit) setProjectTotalProfit(record.project_total_profit);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = {
                tender_budget: tenderBudget,
                project_budget_correction: projectBudgetCorrection,
                fabrication_budget: fabricationBudget,
                tender_jv_profit: tenderJVProfit,
                total_tender_profit: totalTenderProfit,
                project_total_profit: projectTotalProfit,
            };
            
            if (recordId) {
                await base44.entities.ProjectMasterData.update(recordId, data);
            } else {
                const newRecord = await base44.entities.ProjectMasterData.create(data);
                setRecordId(newRecord.id);
            }
            
            alert('Changes saved successfully');
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    // Tender Budget totals
    const tenderIncomeTotal = parseNum(tenderBudget.pm) + parseNum(tenderBudget.labour) + parseNum(tenderBudget.assets) + parseNum(tenderBudget.materials) + parseNum(tenderBudget.other) + parseNum(tenderBudget.road_marking) + parseNum(tenderBudget.options) + parseNum(tenderBudget.maintenance);
    const tenderCostTotal = parseNum(tenderBudget.pm_cost) + parseNum(tenderBudget.labour_cost) + parseNum(tenderBudget.assets_cost) + parseNum(tenderBudget.materials_cost) + parseNum(tenderBudget.other_cost) + parseNum(tenderBudget.road_marking_cost) + parseNum(tenderBudget.options_cost) + parseNum(tenderBudget.maintenance_cost);

    // Project Budget Correction totals
    const projectIncomeTotal = parseNum(projectBudgetCorrection.pm) + parseNum(projectBudgetCorrection.pm_allocation) + parseNum(projectBudgetCorrection.labour) + parseNum(projectBudgetCorrection.labour_allocation) + parseNum(projectBudgetCorrection.assets) + parseNum(projectBudgetCorrection.materials) + parseNum(projectBudgetCorrection.other) + parseNum(projectBudgetCorrection.road_marking) + parseNum(projectBudgetCorrection.sealour) + parseNum(projectBudgetCorrection.maintenance);
    const projectCostTotal = parseNum(projectBudgetCorrection.pm_cost) + parseNum(projectBudgetCorrection.pm_allocation_cost) + parseNum(projectBudgetCorrection.labour_cost) + parseNum(projectBudgetCorrection.labour_allocation_cost) + parseNum(projectBudgetCorrection.assets_cost) + parseNum(projectBudgetCorrection.materials_cost) + parseNum(projectBudgetCorrection.other_cost) + parseNum(projectBudgetCorrection.road_marking_cost) + parseNum(projectBudgetCorrection.sealour_cost) + parseNum(projectBudgetCorrection.maintenance_cost);

    // Fabrication Budget totals
    const fabricationIncomeTotal = parseNum(fabricationBudget.pm) + parseNum(fabricationBudget.labour) + parseNum(fabricationBudget.setup_cost_asset) + parseNum(fabricationBudget.materials) + parseNum(fabricationBudget.other);
    const fabricationCostTotal = parseNum(fabricationBudget.pm_cost) + parseNum(fabricationBudget.labour_cost) + parseNum(fabricationBudget.setup_cost_cost) + parseNum(fabricationBudget.materials_cost) + parseNum(fabricationBudget.other_cost);

    // Total Tender Expected Profit calculations
    const tenderTotalProfitAmount = tenderIncomeTotal - tenderCostTotal;
    const tenderACShare75 = parseNum(tenderJVProfit.ac_share_70);
    const tenderExpectedProfit = tenderTotalProfitAmount + tenderACShare75;

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
                                <InputCell value={fmt(tenderBudget.pm_cost)} onChange={v => setTenderBudget({...tenderBudget, pm_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={fmt(tenderBudget.labour)} onChange={v => setTenderBudget({...tenderBudget, labour: parseNum(v)})} />
                                <InputCell value={fmt(tenderBudget.labour_cost)} onChange={v => setTenderBudget({...tenderBudget, labour_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Assets</TD>
                                <InputCell value={fmt(tenderBudget.assets)} onChange={v => setTenderBudget({...tenderBudget, assets: parseNum(v)})} />
                                <InputCell value={fmt(tenderBudget.assets_cost)} onChange={v => setTenderBudget({...tenderBudget, assets_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={fmt(tenderBudget.materials)} onChange={v => setTenderBudget({...tenderBudget, materials: parseNum(v)})} />
                                <InputCell value={fmt(tenderBudget.materials_cost)} onChange={v => setTenderBudget({...tenderBudget, materials_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={fmt(tenderBudget.other)} onChange={v => setTenderBudget({...tenderBudget, other: parseNum(v)})} />
                                <InputCell value={fmt(tenderBudget.other_cost)} onChange={v => setTenderBudget({...tenderBudget, other_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Road Marking</TD>
                                <InputCell value={fmt(tenderBudget.road_marking)} onChange={v => setTenderBudget({...tenderBudget, road_marking: parseNum(v)})} />
                                <InputCell value={fmt(tenderBudget.road_marking_cost)} onChange={v => setTenderBudget({...tenderBudget, road_marking_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Options</TD>
                                <InputCell value={fmt(tenderBudget.options)} onChange={v => setTenderBudget({...tenderBudget, options: parseNum(v)})} />
                                <InputCell value={fmt(tenderBudget.options_cost)} onChange={v => setTenderBudget({...tenderBudget, options_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Maintenance</TD>
                                <InputCell value={fmt(tenderBudget.maintenance)} onChange={v => setTenderBudget({...tenderBudget, maintenance: parseNum(v)})} />
                                <InputCell value={fmt(tenderBudget.maintenance_cost)} onChange={v => setTenderBudget({...tenderBudget, maintenance_cost: parseNum(v)})} />
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
                                <CalcCell value={parseNum(totalTenderProfit.expected)} className="font-bold" />
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
                                <InputCell value={fmt(projectBudgetCorrection.pm_cost)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, pm_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>PM - Allocation Fabrication</TD>
                                <InputCell value={fmt(projectBudgetCorrection.pm_allocation)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, pm_allocation: parseNum(v)})} />
                                <InputCell value={fmt(projectBudgetCorrection.pm_allocation_cost)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, pm_allocation_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={fmt(projectBudgetCorrection.labour)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, labour: parseNum(v)})} />
                                <InputCell value={fmt(projectBudgetCorrection.labour_cost)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, labour_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Labour - Allocation Fabrication</TD>
                                <InputCell value={fmt(projectBudgetCorrection.labour_allocation)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, labour_allocation: parseNum(v)})} />
                                <InputCell value={fmt(projectBudgetCorrection.labour_allocation_cost)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, labour_allocation_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Assets</TD>
                                <InputCell value={fmt(projectBudgetCorrection.assets)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, assets: parseNum(v)})} />
                                <InputCell value={fmt(projectBudgetCorrection.assets_cost)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, assets_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={fmt(projectBudgetCorrection.materials)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, materials: parseNum(v)})} />
                                <InputCell value={fmt(projectBudgetCorrection.materials_cost)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, materials_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={fmt(projectBudgetCorrection.other)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, other: parseNum(v)})} />
                                <InputCell value={fmt(projectBudgetCorrection.other_cost)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, other_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Road Marking</TD>
                                <InputCell value={fmt(projectBudgetCorrection.road_marking)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, road_marking: parseNum(v)})} />
                                <InputCell value={fmt(projectBudgetCorrection.road_marking_cost)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, road_marking_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Options</TD>
                                <InputCell value={fmt(projectBudgetCorrection.sealour)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, sealour: parseNum(v)})} />
                                <InputCell value={fmt(projectBudgetCorrection.sealour_cost)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, sealour_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Maintenance</TD>
                                <InputCell value={fmt(projectBudgetCorrection.maintenance)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, maintenance: parseNum(v)})} />
                                <InputCell value={fmt(projectBudgetCorrection.maintenance_cost)} onChange={v => setProjectBudgetCorrection({...projectBudgetCorrection, maintenance_cost: parseNum(v)})} />
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
                                <InputCell value={fmt(fabricationBudget.pm_cost)} onChange={v => setFabricationBudget({...fabricationBudget, pm_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Labour</TD>
                                <InputCell value={fmt(fabricationBudget.labour)} onChange={v => setFabricationBudget({...fabricationBudget, labour: parseNum(v)})} />
                                <InputCell value={fmt(fabricationBudget.labour_cost)} onChange={v => setFabricationBudget({...fabricationBudget, labour_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Set Up Cost - Asset</TD>
                                <InputCell value={fmt(fabricationBudget.setup_cost_asset)} onChange={v => setFabricationBudget({...fabricationBudget, setup_cost_asset: parseNum(v)})} />
                                <InputCell value={fmt(fabricationBudget.setup_cost_cost)} onChange={v => setFabricationBudget({...fabricationBudget, setup_cost_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Materials</TD>
                                <InputCell value={fmt(fabricationBudget.materials)} onChange={v => setFabricationBudget({...fabricationBudget, materials: parseNum(v)})} />
                                <InputCell value={fmt(fabricationBudget.materials_cost)} onChange={v => setFabricationBudget({...fabricationBudget, materials_cost: parseNum(v)})} />
                            </tr>
                            <tr>
                                <TD>Other</TD>
                                <InputCell value={fmt(fabricationBudget.other)} onChange={v => setFabricationBudget({...fabricationBudget, other: parseNum(v)})} />
                                <InputCell value={fmt(fabricationBudget.other_cost)} onChange={v => setFabricationBudget({...fabricationBudget, other_cost: parseNum(v)})} />
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