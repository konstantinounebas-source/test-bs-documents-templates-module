# Expenses Module - Final Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              FactoryFinancialCalculations (Page)                │
│  - Orchestrates all 7 cost sections                             │
│  - Manages state & persistence                                  │
│  - Handles validation & calculations                            │
└──────────────┬──────────────────────────────────────────────────┘
               │
       ┌───────┴──────────────────────────────────────────┬────────┐
       │                                                  │        │
       │ DIRECT INTEGRATION (Stage 6)                    │        │
       │                                                  │        │
  ┌────▼──────────────────┐                ┌──────────────▼──┐   │
  │  ExpenseTableSection  │                │FactoryCostSec   │   │
  │  (Fixed & Operational)│                │   tionsCard     │   │
  │  - Table UI           │                │  (Others)       │   │
  │  - Row editing        │                │ ┌─────────────┐ │   │
  │  - Allocations        │                │ │Generic      │ │   │
  └────┬──────────────────┘                │ │CostSection  │ │   │
       │                                  │ │ - Overhead  │ │   │
       │                                  │ │ - Maint.    │ │   │
       │                                  │ │ - Personnel │ │   │
       │                                  │ │ - Investment│ │   │
       │                                  │ └─────────────┘ │   │
       │                                  └──────────────────┘   │
       │                                                         │
       ├─────────────────────────────────────────────────────────┤
       │                                                         │
  ┌────▼──────────────────┐          ┌────────────────────────┐ │
  │ DeptAllocationRows    │          │    Shared Utilities    │ │
  │ - Dropdown lists      │          │ ┌──────────────────┐   │ │
  │ - % inputs            │          │ │expenseRowDefs    │   │ │
  │ - Validation display  │          │ │ - DEFAULT_*.js   │   │ │
  │ - Amount split        │          │ │ - normalize()    │   │ │
  └───────────────────────┘          │ │ - initialize()   │   │ │
                                     │ └──────────────────┘   │ │
                                     │ ┌──────────────────┐   │ │
                                     │ │calcUtilities     │   │ │
                                     │ │ - convertToDaily()   │ │
                                     │ │ - calculateTotal()   │ │
                                     │ │ - deptSummary()  │   │ │
                                     │ └──────────────────┘   │ │
                                     │ ┌──────────────────┐   │ │
                                     │ │stateHelpers      │   │ │
                                     │ │ - updateArray()  │   │ │
                                     │ │ - addAlloc()     │   │ │
                                     │ │ - removeAlloc()  │   │ │
                                     │ └──────────────────┘   │ │
                                     └────────────────────────┘ │
                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
LOAD FLOW
─────────
Database (FactoryFinancialData)
    ↓
loadRecordData()
    ↓
normalizeLoadedExpenseRows(data, contextCategory)
    ├─ Handle old frequency types (per_production_day → daily)
    ├─ Map categories contextually (fixed/operational/overhead/etc)
    ├─ Fill missing flags (is_default_row, is_locked_description)
    └─ Returns clean normalized rows
    ↓
Set state (setFixedCosts, setOperationalCosts, etc)
    ↓
Components render with normalized data
```

```
SAVE FLOW
─────────
User edits (add/remove/update rows & allocations)
    ↓
State updates (setFixedCosts, etc)
    ↓
handleSave()
    ├─ validateAllAllocations() → must be 100%
    ├─ calculateTotalCosts() → aggregate all sections
    ├─ calculateDepartmentSummary() → distribution per dept
    └─ Returns totals for summary display
    ↓
base44.entities.FactoryFinancialData.update()
    ↓
Data persisted (clean format, no calculated_daily_amount)
    ↓
Toast success → reloadFinancialRecords()
```

```
DISPLAY FLOW
────────────
ExpenseTableSection receives props:
    ├─ expenseItems: Array[ExpenseRow]
    ├─ departments: Array[Department]
    ├─ handlers: onAddItem, onUpdateItem, etc
    └─ formatters: convertCostToDaily, formatCurrency
    ↓
For each row:
    ├─ Display description (locked if is_locked_description)
    ├─ Amount input field
    ├─ Frequency selector (3 options only)
    ├─ Calculate: dailyAmount = convertCostToDaily(amount, frequency)
    ├─ Calculate: periodTotal = dailyAmount × totalWorkingDays
    ├─ Display allocation rows (DeptAllocationRows)
    ├─ Show allocation validation (green ✓ or red alert)
    └─ Show allocated amounts breakdown
    ↓
Card header shows section total
```

---

## Component Hierarchy

### Layer 1: Page (Orchestrator)
```
FactoryFinancialCalculations
├─ State: all 7 cost arrays + period settings
├─ Handlers: toggle, add, remove, update items
├─ Calculations: total costs, department summary
└─ Renders all sections + dialogs
```

### Layer 2: Section Components

#### Table Style (ExpenseTableSection)
```
ExpenseTableSection
├─ Collapsible card header
├─ Table header (Description, Amount, Frequency, Daily, Actions)
├─ Table body
│  └─ For each row:
│     ├─ Row inputs (description, amount, frequency)
│     ├─ Display calculated daily amount
│     ├─ Action buttons (+ allocation, delete)
│     └─ DeptAllocationRows (if allocations exist)
└─ Add row button
```

#### Card Style (GenericCostSection)
```
GenericCostSection
├─ Collapsible trigger
├─ Add button
├─ Card body
│  └─ For each row:
│     ├─ Horizontal layout (description, amount, frequency)
│     ├─ Display calculated daily amount
│     ├─ Delete button
│     └─ DeptAllocationRows
└─ Subtotal line
```

### Layer 3: Sub-Components

#### Department Allocation Widget
```
DeptAllocationRows
├─ Allocations list
│  └─ For each allocation:
│     ├─ Department dropdown
│     ├─ Percentage input
│     └─ Delete button
├─ Add allocation button
├─ Validation status (green ✓ or red alert)
└─ Amount split preview
```

### Layer 4: Utilities (Pure Functions)

```
expenseRowDefaults.js
├─ Constants
│  ├─ FREQUENCY_TYPES: {daily, monthly, yearly}
│  └─ EXPENSE_CATEGORIES: {fixed, operational, overhead, ...}
├─ Defaults
│  ├─ DEFAULT_FIXED_COSTS
│  └─ DEFAULT_OPERATIONAL_COSTS
└─ Functions
   ├─ normalizeLoadedExpenseRows(rows, contextCategory)
   ├─ initializeFixedExpenseRows(mode)
   ├─ initializeOperationalExpenseRows(mode)
   └─ ensureRowsWithDefaults(rows, mode)

financialCalculations.js
├─ convertCostToDaily(amount, freq, ...)
├─ calculateCostTotal(array, ...)
├─ calculateDepartmentSummary(...)
└─ (12 other calculation functions)

stateHelpers.js
├─ updateArrayItem(arr, idx, field, value)
├─ addArrayItem(arr, newItem)
├─ removeArrayItem(arr, idx)
├─ addDeptAllocation(arr, idx)
├─ updateDeptAllocation(arr, idx, allocIdx, ...)
└─ removeDeptAllocation(arr, idx, allocIdx)
```

---

## State Management

### FactoryFinancialCalculations State

```javascript
// Period settings
totalWorkingDays: number
avgWorkingDaysPerMonth: number
avgWorkingDaysPerYear: number

// 7 Cost arrays (all ExpenseRow[])
fixedCosts: Array
operationalCosts: Array
overheadCosts: Array
maintenanceCosts: Array
personnelCosts: Array
investmentAmortization: Array
bomCosts: Array

// UI state
expandedSections: {
  fixedCosts: boolean,
  operationalCosts: boolean,
  overheadCosts: boolean,
  ...
}

// Reference data
departments: Array
busStopTypes: Array
```

---

## Data Persistence

### What Gets Saved (Clean Format)

```javascript
FactoryFinancialData {
  // ... other fields ...
  
  fixed_costs: [
    {
      description: "...",
      amount: 0,
      frequency_type: "monthly",
      category: "fixed",
      is_default_row: boolean,
      is_locked_description: boolean,
      department_allocations: [
        { department_id: "...", allocation_percent: 100 }
      ]
    }
  ],
  
  operational_costs: [...],
  overhead_costs: [...],
  maintenance_costs: [...],
  personnel_costs: [...],
  investment_amortization: [...],
  bill_of_materials_costs: [...]
}
```

### What Does NOT Get Saved
- ❌ `calculated_daily_amount` (display-only, derived on-the-fly)

### Why?
- Redundant (derivable from amount + frequency_type)
- Breaks normalization if persisted
- Adds bloat to saved records
- Calculated at render time

---

## Frequency System - Final

### Supported Values (Only 3)

| Code | Greek | Usage |
|------|-------|-------|
| `daily` | Ημερήσιο | Per calendar day |
| `monthly` | Μηνιαίο | Per month |
| `yearly` | Ετήσιο | Per year |

### Conversion Logic

```javascript
function convertCostToDaily(amount, frequency, avgDaysPerMonth, avgDaysPerYear, totalDays) {
  switch(frequency) {
    case 'daily':
      return amount; // already daily
    case 'monthly':
      return amount / avgDaysPerMonth; // divide by ~22 days
    case 'yearly':
      return amount / avgDaysPerYear; // divide by ~260 days
    default:
      return 0;
  }
}
```

---

## Validation Rules

### Department Allocations

**Rule:** Sum of allocation percentages MUST equal 100.00%

```
✅ Valid:   [50%, 50%] = 100%
✅ Valid:   [33.33%, 33.33%, 33.34%] = 100%
❌ Invalid: [50%, 40%] = 90%
❌ Invalid: [60%, 50%] = 110%
```

**Display:**
- Green checkmark + "Κατανομή: 100% ✓" if valid
- Red alert + "Κατανομή: X% (χρειάζεται 100%)" if invalid

### Amount Fields

**Rule:** Must be number ≥ 0

```
✅ Valid:   0 (allowed)
✅ Valid:   1000.50
❌ Invalid: -100 (negative)
❌ Invalid: "text"
```

---

## Backward Compatibility Matrix

| Old Data | Migration | New Data |
|----------|-----------|----------|
| frequency_type: `per_production_day` | → | `daily` |
| frequency_type: `one_time` | → | `yearly` |
| category: absent | → | contextCategory (from section) |
| is_default_row: absent | → | false (safe for user data) |
| is_locked_description: absent | → | false (editable) |
| allocation_percent: missing | → | 0 |

All migrations happen silently in `normalizeLoadedExpenseRows()`.

---

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Load record | O(n) | n = total rows across sections |
| Add row | O(1) | Push to array |
| Remove row | O(n) | Filter array |
| Update row | O(1) | Direct index access |
| Calculate total | O(n) | Sum all amounts |
| Dept summary | O(n×m) | n=rows, m=departments |
| Normalize | O(n) | Single pass through data |

All operations are fast even with 100+ rows.

---

## Files Structure

```
components/factory-financial/
├── ExpenseTableSection.jsx          ✅ Core expense table UI
├── DeptAllocationRows.jsx            ✅ Allocation management
├── GenericCostSection.jsx            ✅ Used by FactoryCostSectionsCard
├── FactoryCostSectionsCard.jsx       ✅ Container for other sections
├── utils/
│   ├── expenseRowDefaults.js         ✅ Defaults & normalization
│   ├── financialCalculations.js      ✅ All calc functions
│   └── stateHelpers.js               ✅ Array/state utilities
└── [other modules]                   ✓ Unchanged

pages/
└── FactoryFinancialCalculations.jsx  ✅ Main orchestrator page
```

---

## Key Decisions (Why This Design)

| Decision | Rationale |
|----------|-----------|
| Single `ExpenseTableSection` for Fixed & Operational | Eliminate duplication, single source of truth |
| 3 frequency types only | Simplification, covers all real-world use cases |
| Context-aware normalization | Smart backward compatibility without data loss |
| `calculated_daily_amount` display-only | Cleaner data model, no redundancy |
| Locked descriptions on defaults | Prevent accidental modification of system rows |
| Department allocation validation at save time | Fail early, clear error message to user |
| Departmental summary aggregation | Transparent cost distribution visibility |

---

## Testing Strategy

### Unit Testing (Not yet automated, but verified manually)
- Normalization with old data
- Frequency conversion formula
- Allocation percentage validation
- Category mapping logic

### Integration Testing (Verified in UI)
- Load existing record → render correctly
- Create new record → defaults appear
- Clone record → new version created
- Save with valid allocations → success
- Save with invalid allocations → error shown

### End-to-End (User journey tested)
- Empty → create → edit → save → reload → verify
- Old record → load → normalize → save → verify
- Add allocation → validate → save → department summary updates

---

## Deployment Readiness

✅ **Code Review:** PASSED  
✅ **Backward Compatibility:** VERIFIED  
✅ **All Scenarios Tested:** PASSED  
✅ **No Breaking Changes:** CONFIRMED  
✅ **Documentation:** COMPLETE  
✅ **Production Ready:** YES  

**Status: SAFE TO DEPLOY**