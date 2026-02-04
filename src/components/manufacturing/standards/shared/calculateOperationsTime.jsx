/**
 * Shared calculation engine for operations time
 * Used by Daily Targets and Scheduled Data
 */

/**
 * Parse minutes from DATA - handle string/null/"–"
 */
export const parseMinutes = (value) => {
  if (value === null || value === undefined || value === '' || value === '–' || value === '-') {
    return 0;
  }
  const parsed = Number(value);
  if (isNaN(parsed)) {
    console.warn('⚠️ Invalid minutes value:', value, '- treating as 0');
    return 0;
  }
  return parsed;
};

/**
 * Build item-operation map from StdSetLines
 * Returns: { item_code: { operation_name: minutes } }
 */
export const buildItemOperationMap = (stdLines) => {
  const map = {};
  stdLines.forEach(line => {
    if (!line.item_code) return;
    if (!map[line.item_code]) map[line.item_code] = {};
    map[line.item_code][line.operation] = parseMinutes(line.std_min_per_pc);
  });
  return map;
};

/**
 * Get enabled operation names from profile
 * @param {object} profile - OperationProfileName record
 * @param {array} allOperations - Array of Operation records
 * @returns {string[]} Array of operation names
 */
export const getEnabledOperationNames = (profile, allOperations) => {
  if (!profile || !profile.operations_required) return [];
  
  // Return operation names from the operations_required array
  return profile.operations_required
    .map(opId => allOperations.find(o => o.id === opId))
    .filter(Boolean)
    .map(op => op.name);
};

/**
 * Calculate operations per-piece time for an item with profile filter
 * This is the CANONICAL calculation used by both Daily Targets and Scheduled Data
 * 
 * @param {string} itemCode - Item code
 * @param {object} profile - OperationProfileName record with operations_required[]
 * @param {array} allOperations - Array of Operation records
 * @param {object} itemOperationMap - Map from buildItemOperationMap()
 * @param {boolean} debug - Enable debug logging
 * @returns {number} Total minutes per piece
 */
export const computeOpsPerPiece = (itemCode, profile, allOperations, itemOperationMap, debug = false) => {
  if (!profile || !profile.operations_required || profile.operations_required.length === 0) {
    if (debug) {
      console.warn('⚠️ No profile or operations_required:', profile);
    }
    return 0;
  }

  const enabledOps = getEnabledOperationNames(profile, allOperations);
  const itemOps = itemOperationMap[itemCode] || {};
  
  if (debug) {
    console.log('🔍 computeOpsPerPiece DEBUG:');
    console.log('  itemCode:', itemCode);
    console.log('  profile:', profile.name);
    console.log('  operations_required (IDs):', profile.operations_required);
    console.log('  enabledOps (names):', enabledOps);
    console.log('  itemOps available:', Object.keys(itemOps));
  }

  let total = 0;
  const matched = [];
  enabledOps.forEach(opName => {
    const minutes = itemOps[opName] || 0;
    total += minutes;
    if (minutes > 0) {
      matched.push({ operation: opName, minutes });
    }
  });

  if (debug) {
    console.log('  matched operations:', matched);
    console.log('  total per-piece:', total);
    
    if (total === 0 && enabledOps.length > 0) {
      console.warn('⚠️ Mapping failed: no matched operations for this profile');
      console.log('  Available DATA operations for item:', Object.keys(itemOps));
      console.log('  Profile requires:', enabledOps);
      console.log('  Matched keys:', matched.map(m => m.operation));
    }
  }

  return total;
};

/**
 * Get operation breakdown for display
 */
export const getOperationBreakdown = (itemCode, profile, allOperations, itemOperationMap) => {
  const enabledOps = getEnabledOperationNames(profile, allOperations);
  const itemOps = itemOperationMap[itemCode] || {};
  
  return enabledOps.map(opName => ({
    operation: opName,
    minutes: itemOps[opName] || 0
  }));
};