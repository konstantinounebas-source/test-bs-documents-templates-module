/**
 * Labour Persistence Mapping Layer
 * Converts between UI data shapes and database schemas
 * Schema now matches UI fields exactly (FactoryFinancialData.json updated)
 */

// ─────────────────────────────────────────────────────────────────────────────
// LABOUR PERSONNEL MAPPING
// ─────────────────────────────────────────────────────────────────────────────

export const mapLabourPersonToDb = (person = {}) => ({
  id: person.id || '',
  person_name: person.person_name || '',
  position: person.position || '',
  role_type: person.role_type || 'technician',
  employment_type: person.employment_type || 'monthly',
  monthly_salary: parseFloat(person.monthly_salary) || 0,
  daily_rate: parseFloat(person.daily_rate) || 0,
  day_factor: parseFloat(person.day_factor) || 22,
  hour_factor: parseFloat(person.hour_factor) || 8,
  is_active: person.is_active !== false,
  calculated_daily_cost: parseFloat(person.calculated_daily_cost) || 0,
  calculated_hourly_cost: parseFloat(person.calculated_hourly_cost) || 0,
  department_id: person.department_id || '',
});

export const mapLabourPersonFromDb = (person = {}) => ({
  id: person.id || '',
  person_name: person.person_name || '',
  position: person.position || '',
  role_type: person.role_type || 'technician',
  employment_type: person.employment_type || 'monthly',
  monthly_salary: parseFloat(person.monthly_salary) || 0,
  daily_rate: parseFloat(person.daily_rate) || 0,
  day_factor: parseFloat(person.day_factor) || 22,
  hour_factor: parseFloat(person.hour_factor) || 8,
  is_active: person.is_active !== false,
  calculated_daily_cost: parseFloat(person.calculated_daily_cost) || 0,
  calculated_hourly_cost: parseFloat(person.calculated_hourly_cost) || 0,
  department_id: person.department_id || '',
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPERVISOR DAILY ALLOCATIONS MAPPING
// ─────────────────────────────────────────────────────────────────────────────

export const mapSupervisorAllocationToDb = (allocation = {}) => ({
  personnel_id: allocation.personnel_id || '',
  allocation_factor: parseFloat(allocation.allocation_factor) || 1,
  comments: allocation.comments || '',
});

export const mapSupervisorAllocationFromDb = (allocation = {}) => ({
  personnel_id: allocation.personnel_id || '',
  allocation_factor: parseFloat(allocation.allocation_factor) || 1,
  comments: allocation.comments || '',
});

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT TECHNICIAN ASSIGNMENTS MAPPING
// ─────────────────────────────────────────────────────────────────────────────

export const mapTechnicianRowToDb = (row = {}) => ({
  personnel_id: row.personnel_id || '',
  comments: row.comments || '',
});

export const mapTechnicianRowFromDb = (row = {}) => ({
  personnel_id: row.personnel_id || '',
  comments: row.comments || '',
});

export const mapDepartmentAssignmentToDb = (assignment = {}) => ({
  department_id: assignment.department_id || '',
  technician_rows: (assignment.technician_rows || []).map(mapTechnicianRowToDb),
});

export const mapDepartmentAssignmentFromDb = (assignment = {}) => ({
  department_id: assignment.department_id || '',
  technician_rows: (assignment.technician_rows || []).map(mapTechnicianRowFromDb),
});

// ─────────────────────────────────────────────────────────────────────────────
// BULK MAPPING FOR SAVE/LOAD/CLONE
// ─────────────────────────────────────────────────────────────────────────────

export const mapLabourDataToDb = ({
  labourPersonnel = [],
  supervisorDailyAllocations = [],
  departmentTechnicianAssignments = [],
}) => ({
  labour_personnel: labourPersonnel.map(mapLabourPersonToDb),
  supervisor_daily_allocations: supervisorDailyAllocations.map(mapSupervisorAllocationToDb),
  department_technician_assignments: departmentTechnicianAssignments.map(mapDepartmentAssignmentToDb),
});

export const mapLabourDataFromDb = ({
  labour_personnel = [],
  supervisor_daily_allocations = [],
  department_technician_assignments = [],
}) => ({
  labourPersonnel: labour_personnel.map(mapLabourPersonFromDb),
  supervisorDailyAllocations: supervisor_daily_allocations.map(mapSupervisorAllocationFromDb),
  departmentTechnicianAssignments: department_technician_assignments.map(mapDepartmentAssignmentFromDb),
});

export const logLabourPersistence = {
  beforeSave: (uiData, dbData) => {
    console.log('💾 LABOUR PERSISTENCE: Before Save');
    console.log('📤 UI labour_personnel:', uiData.labourPersonnel);
    console.log('📤 UI supervisor_daily_allocations:', uiData.supervisorDailyAllocations);
    console.log('📤 UI department_technician_assignments:', uiData.departmentTechnicianAssignments);
    console.log('📥 DB labour_personnel:', dbData.labour_personnel);
    console.log('📥 DB supervisor_daily_allocations:', dbData.supervisor_daily_allocations);
    console.log('📥 DB department_technician_assignments:', dbData.department_technician_assignments);
  },
  
  afterLoad: (dbData, uiData) => {
    console.log('💾 LABOUR PERSISTENCE: After Load');
    console.log('📥 DB labour_personnel:', dbData.labour_personnel);
    console.log('📥 DB supervisor_daily_allocations:', dbData.supervisor_daily_allocations);
    console.log('📥 DB department_technician_assignments:', dbData.department_technician_assignments);
    console.log('📤 UI labour_personnel:', uiData.labourPersonnel);
    console.log('📤 UI supervisor_daily_allocations:', uiData.supervisorDailyAllocations);
    console.log('📤 UI department_technician_assignments:', uiData.departmentTechnicianAssignments);
  },
};