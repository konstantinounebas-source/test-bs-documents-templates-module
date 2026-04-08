/**
 * Expense Row Data Structure & Default Initializers
 * Unified model for all expense rows across Fixed Costs, Operational Costs, etc.
 */

// ============================================================
// UNIFIED EXPENSE ROW SHAPE
// ============================================================
/**
 * Standard expense row object used across all cost categories
 * @typedef {Object} ExpenseRow
 * @property {string} description - Cost description
 * @property {number} amount - Raw monetary amount
 * @property {string} frequency_type - "daily" | "monthly" | "yearly"
 * @property {string} category - "fixed"|"operational"|"overhead"|"maintenance"|"personnel"|"bom"|"investment"|"other"
 * @property {number} conversion_factor - Custom factor for daily cost conversion (e.g., 22 days/month, 25 days/month)
 * @property {string} notes - Optional notes/comments about this expense
 * @property {boolean} is_default_row - System/default row flag
 * @property {boolean} is_locked_description - Prevents editing description (system rows)
 * @property {Array} department_allocations - Department allocation list
 * 
 * NOTE: calculated_daily_amount is DISPLAY-ONLY (derived from amount + frequency_type)
 * It is NOT persisted in the database and should never be stored.
 */

// ============================================================
// FREQUENCY TYPE CONSTANTS
// ============================================================
export const FREQUENCY_TYPES = {
  DAILY: 'daily',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

export const FREQUENCY_LABELS = {
  daily: 'Ημερήσιο',
  monthly: 'Μηνιαίο',
  yearly: 'Ετήσιο'
};

export const DEFAULT_FREQUENCY = FREQUENCY_TYPES.MONTHLY;

// ============================================================
// EXPENSE CATEGORY CONSTANTS
// ============================================================
/**
 * All supported expense categories
 * Used for context-aware normalization and section identification
 */
export const EXPENSE_CATEGORIES = {
  FIXED: 'fixed',
  OPERATIONAL: 'operational',
  OVERHEAD: 'overhead',
  MAINTENANCE: 'maintenance',
  PERSONNEL: 'personnel',
  BOM: 'bom',
  INVESTMENT: 'investment',
  OTHER: 'other'
};

// ============================================================
// DEFAULT FIXED COSTS ROWS
// ============================================================
export const DEFAULT_FIXED_COSTS = [
  {
    description: 'Ενοίκιο',
    amount: 0,
    frequency_type: DEFAULT_FREQUENCY,
    calculated_daily_amount: 0,
    conversion_factor: null,
    notes: '',
    category: EXPENSE_CATEGORIES.FIXED,
    is_default_row: true,
    is_locked_description: true,
    department_allocations: []
  },
  {
    description: 'Άλλα Σταθερά Κόστη',
    amount: 0,
    frequency_type: DEFAULT_FREQUENCY,
    calculated_daily_amount: 0,
    conversion_factor: null,
    notes: '',
    category: EXPENSE_CATEGORIES.FIXED,
    is_default_row: true,
    is_locked_description: true,
    department_allocations: []
  }
];

// ============================================================
// DEFAULT OPERATIONAL COSTS ROWS
// ============================================================
export const DEFAULT_OPERATIONAL_COSTS = [
  {
    description: 'Λειτουργικά Κόστη',
    amount: 0,
    frequency_type: DEFAULT_FREQUENCY,
    calculated_daily_amount: 0,
    conversion_factor: null,
    notes: '',
    category: EXPENSE_CATEGORIES.OPERATIONAL,
    is_default_row: true,
    is_locked_description: true,
    department_allocations: []
  },
  {
    description: 'Κόστη Αναλωσίμων',
    amount: 0,
    frequency_type: DEFAULT_FREQUENCY,
    calculated_daily_amount: 0,
    conversion_factor: null,
    notes: '',
    category: EXPENSE_CATEGORIES.OPERATIONAL,
    is_default_row: true,
    is_locked_description: true,
    department_allocations: []
  },
  {
    description: 'Κόστη Υλικών',
    amount: 0,
    frequency_type: DEFAULT_FREQUENCY,
    calculated_daily_amount: 0,
    conversion_factor: null,
    notes: '',
    category: EXPENSE_CATEGORIES.OPERATIONAL,
    is_default_row: true,
    is_locked_description: true,
    department_allocations: []
  },
  {
    description: 'Κόστη Συντήρησης',
    amount: 0,
    frequency_type: DEFAULT_FREQUENCY,
    calculated_daily_amount: 0,
    conversion_factor: null,
    notes: '',
    category: EXPENSE_CATEGORIES.OPERATIONAL,
    is_default_row: true,
    is_locked_description: true,
    department_allocations: []
  }
];

// ============================================================
// FACTORY FUNCTIONS
// ============================================================

/**
 * Create a blank expense row with default structure
 * @param {string} description - Optional description
 * @param {string} category - Optional category (defaults to "other")
 * @param {boolean} isDefault - Whether this is a system default row
 * @returns {ExpenseRow} Blank expense row
 */
export function createBlankExpenseRow(description = '', category = EXPENSE_CATEGORIES.OTHER, isDefault = false) {
  return {
    description,
    amount: 0,
    frequency_type: DEFAULT_FREQUENCY,
    calculated_daily_amount: 0,
    conversion_factor: null,
    notes: '',
    category,
    is_default_row: isDefault,
    is_locked_description: isDefault,
    department_allocations: []
  };
}

/**
 * Get all default rows combined
 * @returns {Array} All default expense rows (fixed + operational)
 */
export function getAllDefaultExpenseRows() {
  return [...DEFAULT_FIXED_COSTS, ...DEFAULT_OPERATIONAL_COSTS];
}

/**
 * Initialize fixed expense rows for a new record
 * @param {string} mode - "with_defaults" | "empty"
 * @returns {Array} Initialized fixed expense rows
 */
export function initializeFixedExpenseRows(mode = 'with_defaults') {
  if (mode === 'with_defaults') {
    return [...DEFAULT_FIXED_COSTS];
  }
  return [];
}

/**
 * Initialize operational expense rows for a new record
 * @param {string} mode - "with_defaults" | "empty"
 * @returns {Array} Initialized operational expense rows
 */
export function initializeOperationalExpenseRows(mode = 'with_defaults') {
  if (mode === 'with_defaults') {
    return [...DEFAULT_OPERATIONAL_COSTS];
  }
  return [];
}

/**
 * Initialize expense rows for a new record
 * Returns full set of defaults or empty array based on mode
 * @param {string} mode - "with_defaults" | "empty"
 * @returns {Array} Initialized expense rows
 */
export function initializeExpenseRows(mode = 'with_defaults') {
  if (mode === 'with_defaults') {
    return getAllDefaultExpenseRows();
  }
  return [];
}

/**
 * Ensure loaded data has all required fields with defaults
 * Backward compatibility layer for existing saved data
 * @param {Array} loadedRows - Rows loaded from database
 * @returns {Array} Rows with all fields properly initialized
 */
/**
 * Normalize loaded expense rows with context-aware category mapping
 * Handles backward compatibility with old frequency types
 * 
 * @param {Array} loadedRows - Rows to normalize
 * @param {string} contextCategory - Context category (fixed/operational/overhead/etc) for smart mapping
 */
export function normalizeLoadedExpenseRows(loadedRows, contextCategory = null) {
  if (!Array.isArray(loadedRows)) {
    return [];
  }

  return loadedRows.map(row => {
    // Map old frequency types to new standardized ones
    let frequencyType = row.frequency_type || DEFAULT_FREQUENCY;
    if (frequencyType === 'per_production_day') {
      frequencyType = 'daily'; // Legacy: treat per_production_day as daily
    } else if (frequencyType === 'one_time') {
      frequencyType = 'yearly'; // Legacy: treat one_time as yearly
    }

    // Smart category mapping based on context
    let category = row.category || contextCategory || EXPENSE_CATEGORIES.OTHER;
    if (!Object.values(EXPENSE_CATEGORIES).includes(category)) {
      category = contextCategory || EXPENSE_CATEGORIES.OTHER;
    }

    return {
      description: row.description || '',
      amount: typeof row.amount === 'number' ? row.amount : 0,
      frequency_type: frequencyType,
      // Note: calculated_daily_amount is DISPLAY-ONLY, never persisted
      conversion_factor: row.conversion_factor || null,
      notes: row.notes || '',
      category,
      is_default_row: row.is_default_row === true,
      is_locked_description: row.is_locked_description === true,
      department_allocations: Array.isArray(row.department_allocations) ? row.department_allocations : []
    };
  });
}

/**
 * Ensure rows exist with defaults if empty
 * @param {Array} rows - Current rows
 * @param {string} defaultsMode - "with_defaults" | "empty"
 * @returns {Array} Rows or defaults if empty
 */
export function ensureRowsWithDefaults(rows, defaultsMode = 'with_defaults') {
  if (!Array.isArray(rows) || rows.length === 0) {
    return initializeExpenseRows(defaultsMode);
  }
  return normalizeLoadedExpenseRows(rows);
}