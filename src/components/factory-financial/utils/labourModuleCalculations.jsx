/**
 * Labour Module Calculation Helpers
 * Handles personnel cost calculations and labour assignments
 */

export const calculatePersonnelDailyCost = (person) => {
  if (!person) return 0;
  
  const { employment_type, monthly_salary, daily_rate, day_factor } = person;
  
  if (employment_type === 'monthly') {
    const salary = parseFloat(monthly_salary) || 0;
    const factor = parseFloat(day_factor) || 0;
    if (factor <= 0) return 0;
    return salary / factor;
  } else {
    return parseFloat(daily_rate) || 0;
  }
};

export const calculatePersonnelHourlyCost = (person) => {
  if (!person) return 0;
  
  const dailyCost = calculatePersonnelDailyCost(person);
  const hourFactor = parseFloat(person.hour_factor) || 0;
  
  if (hourFactor <= 0) return 0;
  return dailyCost / hourFactor;
};

export const calculateSupervisorAllocatedDailyCost = (row, labourPersonnel) => {
  if (!row || !row.personnel_id) return 0;
  
  const person = labourPersonnel.find(p => p.id === row.personnel_id);
  if (!person) return 0;
  
  const dailyCost = calculatePersonnelDailyCost(person);
  const factor = parseFloat(row.allocation_factor) || 0;
  
  return dailyCost * factor;
};

export const calculateTotalSupervisorDailyCost = (supervisorAllocations, labourPersonnel) => {
  if (!supervisorAllocations || supervisorAllocations.length === 0) return 0;
  
  return supervisorAllocations.reduce((sum, row) => {
    return sum + calculateSupervisorAllocatedDailyCost(row, labourPersonnel);
  }, 0);
};

export const calculateDepartmentAverageHourlyCost = (departmentBlock, labourPersonnel) => {
  if (!departmentBlock || !departmentBlock.technician_rows || departmentBlock.technician_rows.length === 0) {
    return 0;
  }
  
  const validRows = departmentBlock.technician_rows.filter(row => row.personnel_id);
  if (validRows.length === 0) return 0;
  
  const totalCost = validRows.reduce((sum, row) => {
    const person = labourPersonnel.find(p => p.id === row.personnel_id);
    if (person) {
      return sum + calculatePersonnelHourlyCost(person);
    }
    return sum;
  }, 0);
  
  return totalCost / validRows.length;
};

// Selectors
export const getActiveSupervisors = (labourPersonnel) => {
  return (labourPersonnel || []).filter(p => p.is_active && p.role_type === 'supervisor');
};

export const getActiveTechnicians = (labourPersonnel) => {
  return (labourPersonnel || []).filter(p => p.is_active && p.role_type === 'technician');
};

export const getPersonById = (labourPersonnel, id) => {
  return (labourPersonnel || []).find(p => p.id === id);
};

// Create new person object
export const createNewPerson = () => ({
  id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  person_name: '',
  position: '',
  role_type: 'technician',
  employment_type: 'monthly',
  monthly_salary: 0,
  daily_rate: 0,
  day_factor: 22,
  hour_factor: 8,
  calculated_daily_cost: 0,
  calculated_hourly_cost: 0,
  is_active: true,
});

export const createNewSupervisorAllocation = () => ({
  personnel_id: '',
  allocation_factor: 1,
  allocated_daily_cost: 0,
  comments: '',
});

export const createNewDepartmentBlock = () => ({
  department_id: '',
  technician_rows: [],
  average_hourly_cost: 0,
});

export const createNewTechnicianRow = () => ({
  personnel_id: '',
  hourly_cost: 0,
  comments: '',
});