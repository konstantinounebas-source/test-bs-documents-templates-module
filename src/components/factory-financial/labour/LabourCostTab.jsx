import React from 'react';
import { AlertTriangle } from 'lucide-react';
import LabourResourceSetupSection from './LabourResourceSetupSection';
import DepartmentLabourHoursSection from './DepartmentLabourHoursSection';
import DepartmentLabourCostSummarySection from './DepartmentLabourCostSummarySection';
import { calculateTotalLabourCost, validateAllLabourAllocations } from '../utils/labourCostCalculations';

export default function LabourCostTab({
    labourResources,
    departmentLabourHours,
    departments,
    formatCurrency,
    onLabourResources,
    onDepartmentLabourHours,
}) {
    const safeResources = labourResources || [];
    const safeHours = departmentLabourHours || [];

    const totalLabourCost = calculateTotalLabourCost(safeResources, safeHours);
    const activeResources = safeResources.filter(r => r.is_active !== false).length;
    const totalHours = safeHours.reduce((s, e) => s + (parseFloat(e.total_hours) || 0), 0);

    // Allocation validation issues
    const allocationIssues = validateAllLabourAllocations(safeResources);

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

            {/* Allocation validation warnings */}
            {allocationIssues.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                    <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        Προβλήματα κατανομής τμημάτων σε πόρους εργασίας:
                    </div>
                    {allocationIssues.map((issue, i) => (
                        <div key={i} className="text-xs text-amber-700 pl-6">
                            {issue.hasAllocations
                                ? `• "${issue.resource_name}": κατανομή ${issue.total}% (απαιτείται 100%)`
                                : `• "${issue.resource_name}": δεν έχει οριστεί κατανομή τμημάτων`
                            }
                        </div>
                    ))}
                </div>
            )}

            {/* A. Resource Setup */}
            <LabourResourceSetupSection
                labourResources={safeResources}
                departments={departments}
                formatCurrency={formatCurrency}
                onResources={onLabourResources}
            />

            {/* B. Department Hours */}
            <DepartmentLabourHoursSection
                departmentLabourHours={safeHours}
                departments={departments}
                onHours={onDepartmentLabourHours}
                labourResources={safeResources}
            />

            {/* C. Results */}
            <DepartmentLabourCostSummarySection
                labourResources={safeResources}
                departmentLabourHours={safeHours}
                departments={departments}
                formatCurrency={formatCurrency}
            />
        </div>
    );
}