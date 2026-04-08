/**
 * Labour State Helper Functions
 * Pure helpers for add/update/remove on labour resources and department hours.
 */

// ── Labour Resources ──────────────────────────────────────────

export function addLabourResource(resources) {
    return [
        ...resources,
        {
            resource_name: '',
            employment_type: 'monthly_fixed',
            monthly_salary: 0,
            daily_rate: 0,
            hours_per_day: 8,
            monthly_to_day_factor: 22,
            is_active: true,
            department_allocations: [],
        },
    ];
}

export function updateLabourResource(resources, idx, field, value) {
    return resources.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
}

export function removeLabourResource(resources, idx) {
    return resources.filter((_, i) => i !== idx);
}

// ── Labour Resource Department Allocations ────────────────────

export function addLabourResourceAllocation(resources, resourceIdx) {
    return resources.map((r, i) => {
        if (i !== resourceIdx) return r;
        return {
            ...r,
            department_allocations: [
                ...(r.department_allocations || []),
                { department_id: '', allocation_percent: 0 },
            ],
        };
    });
}

export function updateLabourResourceAllocation(resources, resourceIdx, allocIdx, field, value) {
    return resources.map((r, i) => {
        if (i !== resourceIdx) return r;
        const updated = (r.department_allocations || []).map((a, j) =>
            j === allocIdx ? { ...a, [field]: value } : a
        );
        return { ...r, department_allocations: updated };
    });
}

export function removeLabourResourceAllocation(resources, resourceIdx, allocIdx) {
    return resources.map((r, i) => {
        if (i !== resourceIdx) return r;
        return {
            ...r,
            department_allocations: (r.department_allocations || []).filter((_, j) => j !== allocIdx),
        };
    });
}

// ── Department Labour Hours ───────────────────────────────────

export function addDepartmentLabourHours(entries, departmentId) {
    return [
        ...entries,
        { department_id: departmentId || '', total_hours: 0, notes: '' },
    ];
}

export function updateDepartmentLabourHours(entries, idx, field, value) {
    return entries.map((e, i) => (i === idx ? { ...e, [field]: value } : e));
}

export function removeDepartmentLabourHours(entries, idx) {
    return entries.filter((_, i) => i !== idx);
}