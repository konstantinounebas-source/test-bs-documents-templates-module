import React from 'react';
import PersonnelCostSection from './PersonnelCostSection';
import BomCostSection from './BomCostSection';
import GenericCostSection from './GenericCostSection';
import InvestmentAmortizationSection from './InvestmentAmortizationSection';

export default function FactoryCostSectionsCard({
    // Personnel
    personnelCosts,
    dailyMetrics,
    // BOM
    bomCosts,
    busStopTypes,
    // Overhead
    overheadCosts,
    // Maintenance
    maintenanceCosts,
    // Investment
    investmentAmortization,
    // Common
    departments,
    expandedSections,
    totalWorkingDays,
    formatCurrency,
    convertCostToDaily,
    // Calculation functions
    calculatePersonnelCostTotal,
    calculateBomTotal,
    calculateCostTotal,
    calculateInvestmentTotal,
    // Event handlers
    toggleSection,
    // Personnel handlers
    onAddPersonnel,
    onRemovePersonnel,
    onUpdatePersonnel,
    onAddPersonnelDeptAlloc,
    onUpdatePersonnelDeptAlloc,
    onRemovePersonnelDeptAlloc,
    // BOM handlers
    onAddBom,
    onRemoveBom,
    onUpdateBom,
    onBusStopTypeChange,
    // Overhead handlers
    onAddOverhead,
    onRemoveOverhead,
    onUpdateOverhead,
    onAddOverheadDeptAlloc,
    onUpdateOverheadDeptAlloc,
    onRemoveOverheadDeptAlloc,
    // Maintenance handlers
    onAddMaintenance,
    onRemoveMaintenance,
    onUpdateMaintenance,
    onAddMaintenanceDeptAlloc,
    onUpdateMaintenanceDeptAlloc,
    onRemoveMaintenanceDeptAlloc,
    // Investment handlers
    onAddInvestment,
    onRemoveInvestment,
    onUpdateInvestment,
    onAddInvestmentDeptAlloc,
    onUpdateInvestmentDeptAlloc,
    onRemoveInvestmentDeptAlloc,
}) {
    return (
        <div className="space-y-6">
            <PersonnelCostSection
                personnelCosts={personnelCosts}
                dailyMetrics={dailyMetrics}
                departments={departments}
                expandedSections={expandedSections}
                totalWorkingDays={totalWorkingDays}
                formatCurrency={formatCurrency}
                convertCostToDaily={convertCostToDaily}
                calculatePersonnelCostTotal={calculatePersonnelCostTotal}
                onToggleSection={toggleSection}
                onAddItem={onAddPersonnel}
                onRemoveItem={onRemovePersonnel}
                onUpdateItem={onUpdatePersonnel}
                onAddDeptAlloc={onAddPersonnelDeptAlloc}
                onUpdateDeptAlloc={onUpdatePersonnelDeptAlloc}
                onRemoveDeptAlloc={onRemovePersonnelDeptAlloc}
            />
            
            <BomCostSection
                bomCosts={bomCosts}
                busStopTypes={busStopTypes}
                expandedSections={expandedSections}
                formatCurrency={formatCurrency}
                calculateBomTotal={calculateBomTotal}
                onToggleSection={toggleSection}
                onAddItem={onAddBom}
                onRemoveItem={onRemoveBom}
                onUpdateItem={onUpdateBom}
                onBusStopTypeChange={onBusStopTypeChange}
            />
            
            <GenericCostSection
                title="Γενικά Έξοδα (Overhead Costs)"
                sectionKey="overhead"
                costArray={overheadCosts}
                departments={departments}
                expandedSections={expandedSections}
                totalWorkingDays={totalWorkingDays}
                formatCurrency={formatCurrency}
                convertCostToDaily={convertCostToDaily}
                calculateCostTotal={calculateCostTotal}
                onToggleSection={toggleSection}
                onAddItem={onAddOverhead}
                onRemoveItem={onRemoveOverhead}
                onUpdateItem={onUpdateOverhead}
                onAddDeptAlloc={onAddOverheadDeptAlloc}
                onUpdateDeptAlloc={onUpdateOverheadDeptAlloc}
                onRemoveDeptAlloc={onRemoveOverheadDeptAlloc}
            />
            
            <GenericCostSection
                title="Κόστη Συντήρησης (Maintenance Costs)"
                sectionKey="maintenance"
                costArray={maintenanceCosts}
                departments={departments}
                expandedSections={expandedSections}
                totalWorkingDays={totalWorkingDays}
                formatCurrency={formatCurrency}
                convertCostToDaily={convertCostToDaily}
                calculateCostTotal={calculateCostTotal}
                onToggleSection={toggleSection}
                onAddItem={onAddMaintenance}
                onRemoveItem={onRemoveMaintenance}
                onUpdateItem={onUpdateMaintenance}
                onAddDeptAlloc={onAddMaintenanceDeptAlloc}
                onUpdateDeptAlloc={onUpdateMaintenanceDeptAlloc}
                onRemoveDeptAlloc={onRemoveMaintenanceDeptAlloc}
            />
            
            <InvestmentAmortizationSection
                investmentAmortization={investmentAmortization}
                departments={departments}
                expandedSections={expandedSections}
                totalWorkingDays={totalWorkingDays}
                formatCurrency={formatCurrency}
                calculateInvestmentTotal={calculateInvestmentTotal}
                onToggleSection={toggleSection}
                onAddItem={onAddInvestment}
                onRemoveItem={onRemoveInvestment}
                onUpdateItem={onUpdateInvestment}
                onAddDeptAlloc={onAddInvestmentDeptAlloc}
                onUpdateDeptAlloc={onUpdateInvestmentDeptAlloc}
                onRemoveDeptAlloc={onRemoveInvestmentDeptAlloc}
            />
        </div>
    );
}