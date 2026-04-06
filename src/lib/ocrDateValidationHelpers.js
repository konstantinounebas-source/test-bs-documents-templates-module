/**
 * Shared OCR date validation and comparison helpers
 * Used by both OCRVerificationModal and OCRTeamsTimeVerificationModal
 */

// Helper: Parse dd/mm/yyyy → canonical yyyy-mm-dd
export function toCanonicalDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  // Try dd/mm/yyyy format
  const ddmmMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmMatch) {
    const [, day, month, year] = ddmmMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try yyyy-mm-dd format (already canonical)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  return null;
}

// Helper: Compare two date strings (in any supported format) for equality
export function compareDates(dateStr1, dateStr2) {
  const canonical1 = toCanonicalDateFormat(dateStr1);
  const canonical2 = toCanonicalDateFormat(dateStr2);
  
  if (!canonical1 || !canonical2) return null; // Cannot compare
  return canonical1 === canonical2;
}

// Helper: Check if OCR date mismatches filename date (returns false if they match)
export function datesMismatch(ocrDate, fileDate) {
  if (!ocrDate || !fileDate) return false;
  const match = compareDates(ocrDate, fileDate);
  return match === false; // True if they differ, false if they match or cannot compare
}

// Helper: Normalize both date inputs for visual display in comparisons
export function formatDateForDisplay(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  
  // dd/mm/yyyy → keep as is
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  // yyyy-mm-dd → convert to dd/mm/yyyy for display
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  
  return dateStr;
}

// Helper: Sanitize and normalize a date string (remove extra spaces, validate format)
export function sanitizeDate(dateStr) {
  if (!dateStr) return "";
  return String(dateStr).trim();
}