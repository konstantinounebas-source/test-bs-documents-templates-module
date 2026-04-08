/**
 * Generic array and state mutation helpers for factory financial calculations.
 * These are pure functions that accept arrays and return new modified arrays.
 * They do not depend on component state.
 */

export const updateArrayItem = (array, index, field, value) => {
    const safeArray = Array.isArray(array) ? array : [];
    const updated = [...safeArray];
    if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
    }
    return updated;
};

export const addArrayItem = (array, newItem) => {
    const safeArray = Array.isArray(array) ? array : [];
    return [...safeArray, newItem];
};

export const removeArrayItem = (array, index) => {
    const safeArray = Array.isArray(array) ? array : [];
    return safeArray.filter((_, i) => i !== index);
};

export const addDeptAllocation = (array, itemIdx) => {
    const safeArray = Array.isArray(array) ? array : [];
    const updated = [...safeArray];
    if (updated[itemIdx]) {
        updated[itemIdx].department_allocations = [...(updated[itemIdx].department_allocations || []), 
            { department_id: '', allocation_percent: 0 }];
    }
    return updated;
};

export const updateDeptAllocation = (array, itemIdx, allocIdx, field, value) => {
    const safeArray = Array.isArray(array) ? array : [];
    const updated = [...safeArray];
    if (updated[itemIdx] && updated[itemIdx].department_allocations && updated[itemIdx].department_allocations[allocIdx]) {
        updated[itemIdx].department_allocations[allocIdx][field] = value;
    }
    return updated;
};

export const removeDeptAllocation = (array, itemIdx, allocIdx) => {
    const safeArray = Array.isArray(array) ? array : [];
    const updated = [...safeArray];
    if (updated[itemIdx] && Array.isArray(updated[itemIdx].department_allocations)) {
        updated[itemIdx].department_allocations = updated[itemIdx].department_allocations
            .filter((_, i) => i !== allocIdx);
    }
    return updated;
};