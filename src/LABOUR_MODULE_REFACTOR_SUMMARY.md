# Labour Module Refactor - Complete Implementation

## Overview
The Labour / Department Allocations module has been completely refactored to support a new business model with two clear outputs:
1. **Total daily supervisor cost**
2. **Average labour-hour cost per department for technicians**

The old 100% allocation model has been removed entirely.

## New Architecture

### 1. Personnel Master Data
**Location**: `components/factory-financial/labour/PersonnelMasterSection.jsx`

A personnel master list containing all employees with:
- `person_name`: Employee name
- `position`: Job title
- `role_type`: "supervisor" or "technician"
- `employment_type`: "monthly" or "daily"
- `monthly_salary`: For monthly employees
- `daily_rate`: For daily employees
- `day_factor`: Conversion factor (typically 22 working days/month)
- `hour_factor`: Hours per day (typically 8)
- `calculated_daily_cost`: Auto-calculated from employment type & factors
- `calculated_hourly_cost`: Auto-calculated (daily_cost / hour_factor)
- `is_active`: Boolean flag

**Key Behavior**:
- Monthly employees: calculated_daily_cost = monthly_salary / day_factor
- Daily employees: calculated_daily_cost = daily_rate
- If factors ≤ 0, calculated values default to 0 (safe division)
- All calculated fields are read-only and update automatically

### 2. Supervisor Daily Cost Section
**Location**: `components/factory-financial/labour/SupervisorDailyCostSection.jsx`

Calculates the **total daily supervisor cost** by:
1. Selecting from active supervisors only (role_type = "supervisor")
2. For each supervisor allocation:
   - Person: Select from available supervisors
   - Position: Auto-display from personnel master
   - Daily Cost: Auto-display from calculated_daily_cost
   - Allocation Factor: Editable numeric input (multiplier)
   - Allocated Daily Cost: Auto-calculate (daily_cost × factor)
   - Comments: Optional notes

**Formula**:
```
allocated_daily_cost = selected_person.calculated_daily_cost × allocation_factor
total_supervisor_daily_cost = SUM(all allocated_daily_cost)
```

### 3. Department Technician Hourly Cost Section
**Location**: `components/factory-financial/labour/DepartmentTechnicianHourlyCostSection.jsx`

Calculates **average hourly labour cost per department** by:
1. Creating blocks per department
2. Within each block, listing technicians assigned to that department

**Per Department Block**:
- Department: Select from available departments
- Technician Rows:
  - Technician: Select from active technicians (role_type = "technician")
  - Position: Auto-display
  - Hourly Cost: Auto-display from calculated_hourly_cost
  - Comments: Optional notes

**Formula**:
```
department.average_hourly_cost = AVERAGE(all technician hourly_cost in that department)
```
- Uses simple arithmetic mean (not weighted)
- Ignores empty rows
- Returns 0 if no valid technicians

### 4. Calculation Helpers
**Location**: `components/factory-financial/utils/labourModuleCalculations.js`

Core calculation functions:
- `calculatePersonnelDailyCost(person)` - Handles both monthly and daily types
- `calculatePersonnelHourlyCost(person)` - daily_cost / hour_factor
- `calculateSupervisorAllocatedDailyCost(row, labourPersonnel)` - daily_cost × factor
- `calculateTotalSupervisorDailyCost(allocations, labourPersonnel)` - Sum of all allocations
- `calculateDepartmentAverageHourlyCost(block, labourPersonnel)` - Simple average

Selector functions:
- `getActiveSupervisors(labourPersonnel)` - Filter supervisors only
- `getActiveTechnicians(labourPersonnel)` - Filter technicians only
- `getPersonById(labourPersonnel, id)` - Lookup helper

Factory functions for creating new objects:
- `createNewPerson()` - Initialize personnel with defaults
- `createNewSupervisorAllocation()` - Initialize allocation with factor=1
- `createNewDepartmentBlock()` - Initialize department block
- `createNewTechnicianRow()` - Initialize technician row

### 5. New Labour Tab
**Location**: `components/factory-financial/labour/NewLabourTab.jsx`

Unified component that renders all three sections:
1. PersonnelMasterSection
2. SupervisorDailyCostSection
3. DepartmentTechnicianHourlyCostSection

## Integration with FactoryFinancialCalculations

### State Management
Three new state variables in FactoryFinancialCalculations:
```javascript
const [labourPersonnel, setLabourPersonnel] = useState([]);
const [supervisorDailyAllocations, setSupervisorDailyAllocations] = useState([]);
const [departmentTechnicianAssignments, setDepartmentTechnicianAssignments] = useState([]);
```

### Data Persistence
Saved in FactoryFinancialData entity:
- `labour_personnel`: Array of personnel objects
- `supervisor_daily_allocations`: Array of supervisor allocations
- `department_technician_assignments`: Array of department blocks

All fields normalized on load with default empty arrays.

### Load Logic
```javascript
setLabourPersonnel((record.labour_personnel || []).map((p, idx) => ({
  id: p.id || idx.toString(),
  ...p
})));
setSupervisorDailyAllocations(record.supervisor_daily_allocations || []);
setDepartmentTechnicianAssignments(record.department_technician_assignments || []);
```

### Save Logic
Persists all three arrays alongside existing financial data in update/clone/create flows.

## Removed / Changed

### Removed Old Logic
- Old `labourResources` with 100% department allocation percentages
- Old `departmentLabourHours` structure
- Department allocation validation requiring 100% totals
- `LabourResourceSetupSection` and `LabourCostTab` components
- `DeptAllocationRows` from labour module context

### Kept for Backward Compatibility
- Old `labourResources` and `departmentLabourHours` fields still persist in database
- No deletion of existing data; purely additive refactor
- Old legal module state still receives load/save operations

## UX Features

### Safe Numeric Handling
- All factor/rate inputs default to safe values (22, 8, 0)
- Division by zero protected (if factor ≤ 0, result = 0)
- parseFloat with fallbacks throughout

### Auto-Calculation
- Daily cost auto-updates when employment type, salary, rate, or factors change
- Hourly cost auto-updates based on daily cost and hour factor
- Allocated daily cost auto-updates based on selection and factor
- Department average auto-calculates from technician assignments

### Responsive Design
- Mobile-friendly grid layouts
- Collapsible department blocks
- Cards with consistent styling
- Form elements use consistent height (h-8 for inputs)

### Data Integrity
- Inactive personnel excluded from dropdowns (but saved records don't crash)
- Empty rows filtered from calculations
- Type-safe ID comparisons (always strings)
- Select values update correctly on reload

## Testing Checklist

- [ ] Create new financial record with no labour data
- [ ] Add personnel: test monthly and daily types
- [ ] Verify daily/hourly costs calculate correctly
- [ ] Add supervisor allocations, verify total
- [ ] Add departments and assign technicians
- [ ] Verify department average hourly cost
- [ ] Save and reload, check data persists
- [ ] Clone record, verify new data carries over
- [ ] Change person from supervisor to technician (role_type)
- [ ] Remove active person, verify dependent rows don't crash
- [ ] Test with 0 factors (should handle gracefully)

## Files Created/Modified

**Created**:
- `components/factory-financial/utils/labourModuleCalculations.js`
- `components/factory-financial/labour/PersonnelMasterSection.jsx`
- `components/factory-financial/labour/SupervisorDailyCostSection.jsx`
- `components/factory-financial/labour/DepartmentTechnicianHourlyCostSection.jsx`
- `components/factory-financial/labour/NewLabourTab.jsx`

**Modified**:
- `pages/FactoryFinancialCalculations.jsx` - Added new state, load/save logic, replaced tab

## Next Steps

1. Verify app compiles without errors
2. Test labour module functionality in preview
3. Test save/reload persistence
4. Update FactoryFinancialData entity schema if needed to include new fields
5. Consider migration helper for old labour data if backward compat needed