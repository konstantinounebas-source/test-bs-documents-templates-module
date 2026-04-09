/**
 * Labour Persistence Mapping Layer
 * Converts between UI data shapes and database schemas
 * Ensures all labour fields persist correctly across save/load/clone cycles
 */

// ─────────────────────────────────────────────────────────────────────────────
// LABOUR PERSONNEL MAPPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UI shape → DB schema
 * Extracts only the fields the DB schema recognizes
 */
export const mapLabourPersonToDb = (person = {}) => ({
  id: person.id || '',
  person_name: person.person_name || '',
  role_type: person.role_type || 'technician',
  department_id: person.department_id || '',
  daily_rate: parseFloat(person.daily_rate) || 0,
  hours_per_day: parseFloat(person.hour_factor ?? person.hours_per_day) || 8,
  calculated_hourly_cost: parseFloat(person.calculated_hourly_cost) || 0,
  // Additional UI-only fields preserved if they exist on the person object
  // (for rich UI functionality without breaking persistence)
  ...(person.position && { position: person.position }),
  ...(person.employment_type && { employment_type: person.employment_type }),
  ...(person.monthly_salary !== undefined && { monthly_salary: parseFloat(person.monthly_salary) || 0 }),
  ...(person.day_factor !== undefined && { day_factor: parseFloat(person.day_factor) || 22 }),
  ...(person.is_active !== undefined && { is_active: person.is_active }),
  ...(person.calculated_daily_cost !== undefined && { calculated_daily_cost: parseFloat(person.calculated_daily_cost) || 0 }),
});

/**
 * DB schema → UI shape
 * Reconstructs full UI object from minimal DB schema
 */
export const mapLabourPersonFromDb = (person = {}) => ({
  id: person.id || '',
  person_name: person.person_name || '',
  role_type: person.role_type || 'technician',
  department_id: person.department_id || '',
  daily_rate: parseFloat(person.daily_rate) || 0,
  hour_factor: parseFloat(person.hours_per_day ?? person.hour_factor) || 8,
  calculated_hourly_cost: parseFloat(person.calculated_hourly_cost) || 0,
  // UI-specific fields with sensible defaults
  position: person.position || '',
  employment_type: person.employment_type || 'monthly',
  monthly_salary: parseFloat(person.monthly_salary) || 0,
  day_factor: parseFloat(person.day_factor) || 22,
  is_active: person.is_active !== false,
  calculated_daily_cost: parseFloat(person.calculated_daily_cost) || 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPERVISOR DAILY ALLOCATIONS MAPPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UI shape → DB schema
 * Maps allocation_factor to a compatible format
 */
export const mapSupervisorAllocationToDb = (allocation = {}) => ({
  personnel_id: allocation.personnel_id || '',
  allocation_factor: parseFloat(allocation.allocation_factor) || 1,
  ...(allocation.comments && { comments: allocation.comments }),
});

/**
 * DB schema → UI shape
 */
export const mapSupervisorAllocationFromDb = (allocation = {}) => ({
  personnel_id: allocation.personnel_id || '',
  allocation_factor: parseFloat(allocation.allocation_factor) || 1,
  comments: allocation.comments || '',
});

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT TECHNICIAN ASSIGNMENTS MAPPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Technician row UI shape → DB schema
 */
export const mapTechnicianRowToDb = (row = {}) => ({
  personnel_id: row.personnel_id || '',
  ...(row.comments && { comments: row.comments }),
});

/**
 * Technician row DB schema → UI shape
 */
export const mapTechnicianRowFromDb = (row = {}) => ({
  personnel_id: row.personnel_id || '',
  comments: row.comments || '',
});

/**
 * Department assignment UI shape → DB schema
 */
export const mapDepartmentAssignmentToDb = (assignment = {}) => ({
  department_id: assignment.department_id || '',
  technician_rows: (assignment.technician_rows || []).map(mapTechnicianRowToDb),
});

/**
 * Department assignment DB schema → UI shape
 */
export const mapDepartmentAssignmentFromDb = (assignment = {}) => ({
  department_id: assignment.department_id || '',
  technician_rows: (assignment.technician_rows || []).map(mapTechnicianRowFromDb),
});

// ─────────────────────────────────────────────────────────────────────────────
// BULK MAPPING FOR SAVE/LOAD/CLONE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps entire labour module from UI → DB before saving
 */
export const mapLabourDataToDb = ({
  labourPersonnel = [],
  supervisorDailyAllocations = [],
  departmentTechnicianAssignments = [],
}) => ({
  labour_personnel: labourPersonnel.map(mapLabourPersonToDb),
  supervisor_daily_allocations: supervisorDailyAllocations.map(mapSupervisorAllocationToDb),
  department_technician_assignments: departmentTechnicianAssignments.map(mapDepartmentAssignmentToDb),
});

/**
 * Maps entire labour module from DB → UI after loading
 */
export const mapLabourDataFromDb = ({
  labour_personnel = [],
  supervisor_daily_allocations = [],
  department_technician_assignments = [],
}) => ({
  labourPersonnel: labour_personnel.map(mapLabourPersonFromDb),
  supervisorDailyAllocations: supervisor_daily_allocations.map(mapSupervisorAllocationFromDb),
  departmentTechnicianAssignments: department_technician_assignments.map(mapDepartmentAssignmentFromDb),
});

/**
 * Debug logging for persistence
 */
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