/**
 * Generic array and state mutation helpers for factory financial calculations.
 * These are pure functions that accept arrays and return new modified arrays.
 * They do not depend on component state.
 */

export const updateArrayItem = (array, index, field, value) => {
    const updated = [...array];
    updated[index] = { ...updated[index], [field]: value };
    return updated;
};

export const addArrayItem = (array, newItem) => {
    return [...array, newItem];
};

export const removeArrayItem = (array, index) => {
    return array.filter((_, i) => i !== index);
};

export const addDeptAllocation = (array, itemIdx) => {
    const updated = [...array];
    updated[itemIdx].department_allocations = [...(updated[itemIdx].department_allocations || []), 
        { department_id: '', allocation_percent: 0 }];
    return updated;
};

export const updateDeptAllocation = (array, itemIdx, allocIdx, field, value) => {
    const updated = [...array];
    updated[itemIdx].department_allocations[allocIdx][field] = value;
    return updated;
};

export const removeDeptAllocation = (array, itemIdx, allocIdx) => {
    const updated = [...array];
    updated[itemIdx].department_allocations = updated[itemIdx].department_allocations
        .filter((_, i) => i !== allocIdx);
    return updated;
};