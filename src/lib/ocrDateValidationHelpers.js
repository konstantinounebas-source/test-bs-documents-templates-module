/**
 * Centralized OCR date & department parsing/validation helpers
 * Single source of truth for all modal date/department handling
 */

// ────────────────────────────────────────────────────────────────────────────
// DATE PARSING & VALIDATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Parse filename for embedded date token (e.g., "10-3-26_FA_Prepaint.pdf" → "2026-03-10")
 * Format: d-m-yy or dd-mm-yy at the start of filename
 * Interpretation: day-month-year (not month-day-year)
 * Returns: canonical yyyy-MM-dd
 */
export function parseFilenameDate(fileName) {
  if (!fileName || typeof fileName !== 'string') return null;
  
  // Match d-m-yy or dd-mm-yy at the start
  const match = fileName.match(/^(\d{1,2})-(\d{1,2})-(\d{2})/);
  if (!match) return null;
  
  const [, dayStr, monthStr, yyStr] = match;
  const day = dayStr.padStart(2, '0');
  const month = monthStr.padStart(2, '0');
  const year = `20${yyStr}`;
  
  return `${year}-${month}-${day}`;
}

/**
 * Parse OCR/form date string to canonical format (yyyy-MM-dd)
 * Supports: dd/MM/yyyy, d/M/yyyy, dd-MM-yyyy, yyyy-MM-dd
 * Returns: canonical yyyy-MM-dd or null if unparseable
 */
export function parseOcrDate(value) {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  // Already canonical
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  
  // dd/MM/yyyy or d/M/yyyy
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // dd-MM-yyyy or d-M-yyyy
  const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Format canonical date (yyyy-MM-dd) for display (dd-MM-yyyy)
 * Returns: display string or null if invalid input
 */
export function formatDateForDisplay(value) {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  
  // Expect canonical yyyy-MM-dd
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

/**
 * Check if two dates mismatch (after normalizing both to canonical format)
 * Returns: false if they match or both are empty/unparseable, true if genuinely different
 */
export function datesMismatch(dateA, dateB) {
  if (!dateA && !dateB) return false; // Both empty = same
  
  // Try to normalize both to canonical format
  const canonA = parseOcrDate(dateA) || dateA;
  const canonB = parseOcrDate(dateB) || dateB;
  
  // If either couldn't be parsed safely, assume no mismatch
  if (!canonA || !canonB) return false;
  
  return canonA !== canonB;
}

// ────────────────────────────────────────────────────────────────────────────
// DEPARTMENT PARSING & VALIDATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Canonical department mappings
 */
const CANONICAL_DEPTS = {
  'pre-paint': 'Pre-paint',
  'paint': 'Paint',
  'assembly': 'Assembly',
  'sub-assembly': 'Sub-assembly',
  'refurbishment': 'Refurbishment',
  'delivery': 'Delivery'
};

/**
 * Normalize department string to canonical form
 * Input: "Prepaint", "pre-paint", "prepaint", "PRE_PAINT", "Pre-Paint", etc.
 * Output: "Pre-paint" (canonical) or null if not recognized
 */
export function normalizeDepartment(value) {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  // Normalize: replace underscores/spaces with hyphens, lowercase for lookup
  const normalized = trimmed
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
  
  return CANONICAL_DEPTS[normalized] || null;
}

/**
 * Extract and normalize department from filename (e.g., "...Prepaint..." → "Pre-paint")
 * Returns: normalized canonical department or null if not found
 */
export function parseFilenameDepartment(fileName) {
  if (!fileName || typeof fileName !== 'string') return null;
  
  const lc = fileName.toLowerCase();
  
  // Check in order of specificity
  if (lc.includes('prepaint') || lc.includes('pre-paint') || lc.includes('pre_paint')) {
    return normalizeDepartment('Pre-paint');
  }
  if (lc.includes('sub-assembly') || lc.includes('sub-ass') || lc.includes('subass')) {
    return normalizeDepartment('Sub-assembly');
  }
  if (lc.includes('assembly') && !lc.includes('sub')) {
    return normalizeDepartment('Assembly');
  }
  if (lc.includes('refurb') || lc.includes('ref')) {
    return normalizeDepartment('Refurbishment');
  }
  if (lc.includes('paint') && !lc.includes('prepaint') && !lc.includes('pre-paint')) {
    return normalizeDepartment('Paint');
  }
  if (lc.includes('delivery')) {
    return normalizeDepartment('Delivery');
  }
  
  return null;
}

/**
 * Check if two departments mismatch (after normalizing both)
 * Returns: false if they match or both are empty/unrecognized, true if genuinely different
 */
export function departmentsMismatch(deptA, deptB) {
  if (!deptA && !deptB) return false; // Both empty = same
  
  // Normalize both
  const normA = normalizeDepartment(deptA);
  const normB = normalizeDepartment(deptB);
  
  // If either couldn't be normalized, assume no mismatch (safe default)
  if (!normA || !normB) return false;
  
  return normA !== normB;
}