import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp } from 'lucide-react';
import LabourResourceSetupSection from './LabourResourceSetupSection';
import DepartmentLabourHoursSection from './DepartmentLabourHoursSection';
import DepartmentLabourCostSummarySection from './DepartmentLabourCostSummarySection';
import { calculateTotalLabourCost } from '../utils/labourCostCalculations';

export default function LabourCostTab({
    labourResources,
    departmentLabourHours,
    departments,
    formatCurrency,
    onLabourResources,
    onDepartmentLabourHours,
}) {
    const totalLabourCost = calculateTotalLabourCost(labourResources, departmentLabourHours);
    const activeResources = (labourResources || []).filter(r => r.is_active !== false).length;
    const totalHours = (departmentLabourHours || []).reduce((s, e) => s + (parseFloat(e.total_hours) || 0), 0);

    return (
        <div className="space-y-6">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Ενεργοί Πόροι</span>
                    <span className="text-2xl font-bold text-blue-800">{activeResources}</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Σύνολο Ωρών</span>
                    <span className="text-2xl font-bold text-indigo-800">{totalHours.toLocaleString('el-GR')}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Συνολικό Κόστος Εργασίας</span>
                    <span className="text-2xl font-bold text-emerald-800">{formatCurrency(totalLabourCost)}</span>
                </div>
            </div>

            {/* A. Resource Setup */}
            <LabourResourceSetupSection
                labourResources={labourResources}
                departments={departments}
                formatCurrency={formatCurrency}
                onResources={onLabourResources}
            />

            {/* B. Department Hours */}
            <DepartmentLabourHoursSection
                departmentLabourHours={departmentLabourHours}
                departments={departments}
                onHours={onDepartmentLabourHours}
            />

            {/* C. Results */}
            <DepartmentLabourCostSummarySection
                labourResources={labourResources}
                departmentLabourHours={departmentLabourHours}
                departments={departments}
                formatCurrency={formatCurrency}
            />
        </div>
    );
}