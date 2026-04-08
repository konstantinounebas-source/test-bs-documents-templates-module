import React from 'react';
import PersonnelMasterSection from './PersonnelMasterSection';
import SupervisorDailyCostSection from './SupervisorDailyCostSection';
import DepartmentTechnicianHourlyCostSection from './DepartmentTechnicianHourlyCostSection';

export default function NewLabourTab({
  labourPersonnel,
  supervisorDailyAllocations,
  departmentTechnicianAssignments,
  departments,
  formatCurrency,
  onPersonnelUpdate,
  onSupervisorAllocationsUpdate,
  onDepartmentAssignmentsUpdate,
}) {
  return (
    <div className="space-y-4">
      <PersonnelMasterSection
        personnel={labourPersonnel || []}
        formatCurrency={formatCurrency}
        onUpdate={onPersonnelUpdate}
      />

      <SupervisorDailyCostSection
        supervisorAllocations={supervisorDailyAllocations || []}
        labourPersonnel={labourPersonnel || []}
        formatCurrency={formatCurrency}
        onUpdate={onSupervisorAllocationsUpdate}
      />

      <DepartmentTechnicianHourlyCostSection
        departmentAssignments={departmentTechnicianAssignments || []}
        labourPersonnel={labourPersonnel || []}
        departments={departments || []}
        formatCurrency={formatCurrency}
        onUpdate={onDepartmentAssignmentsUpdate}
      />
    </div>
  );
}