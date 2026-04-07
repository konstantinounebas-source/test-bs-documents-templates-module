import ExpenseTableSection from './ExpenseTableSection';

/**
 * Operational Costs Table Section
 * Wrapper for ExpenseTableSection configured for operational costs
 * Uses predefined default rows
 */
export default function OperationalCostsTableSection({
    operationalCosts,
    departments,
    expandedSections,
    totalWorkingDays,
    formatCurrency,
    convertCostToDaily,
    calculateCostTotal,
    onToggleSection,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    onAddDeptAlloc,
    onUpdateDeptAlloc,
    onRemoveDeptAlloc
}) {
    return (
        <ExpenseTableSection
            title="Λειτουργικά Κόστη (Operational Costs)"
            sectionKey="operational"
            expenseItems={operationalCosts}
            departments={departments}
            expandedSections={expandedSections}
            totalWorkingDays={totalWorkingDays}
            formatCurrency={formatCurrency}
            convertCostToDaily={convertCostToDaily}
            calculateCostTotal={calculateCostTotal}
            onToggleSection={onToggleSection}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
            onUpdateItem={onUpdateItem}
            onAddDeptAlloc={onAddDeptAlloc}
            onUpdateDeptAlloc={onUpdateDeptAlloc}
            onRemoveDeptAlloc={onRemoveDeptAlloc}
            hideAddButton={false}
        />
    );
}