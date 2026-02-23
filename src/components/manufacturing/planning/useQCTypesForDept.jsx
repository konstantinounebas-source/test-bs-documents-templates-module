import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Returns QC types filtered by the given department name,
 * respecting the departments_csv field on each QC_Type record.
 */
export function useQCTypesForDept(departmentName) {
  const { data: allDepartments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.filter({ is_active: true }),
    staleTime: Infinity
  });

  const { data: allQcTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.filter({ is_active: true }),
    staleTime: 0
  });

  const qcTypes = useMemo(() => {
    const deptId = allDepartments.find(d => d.name === departmentName)?.id;
    return allQcTypes.filter(qt => {
      if (!qt.departments_csv) return true;
      const ids = qt.departments_csv.split(',').filter(Boolean);
      return ids.length === 0 || (deptId && ids.includes(deptId));
    });
  }, [allQcTypes, allDepartments, departmentName]);

  return qcTypes;
}