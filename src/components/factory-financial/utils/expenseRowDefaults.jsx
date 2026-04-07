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
 * @property {number} calculated_daily_amount - Computed daily cost (read-only)
 * @property {string} category - "fixed" | "operational" | "other"
 * @property {boolean} is_default_row - System/default row flag
 * @property {boolean} is_locked_description - Prevents editing description
 * @property {Array} department_allocations - Department allocation list
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
export const EXPENSE_CATEGORIES = {
  FIXED: 'fixed',
  OPERATIONAL: 'operational',
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
export function normalizeLoadedExpenseRows(loadedRows) {
  if (!Array.isArray(loadedRows)) {
    return [];
  }

  return loadedRows.map(row => ({
    description: row.description || '',
    amount: typeof row.amount === 'number' ? row.amount : 0,
    frequency_type: row.frequency_type || DEFAULT_FREQUENCY,
    calculated_daily_amount: typeof row.calculated_daily_amount === 'number' ? row.calculated_daily_amount : 0,
    category: row.category || EXPENSE_CATEGORIES.OTHER,
    is_default_row: row.is_default_row === true,
    is_locked_description: row.is_locked_description === true,
    department_allocations: Array.isArray(row.department_allocations) ? row.department_allocations : []
  }));
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