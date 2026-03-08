import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Save, Download, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { exportDataTabToExcel } from './shared/exportToExcel';

export default function DataTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();
  const [gridRows, setGridRows] = useState([]);
  const [sortBy, setSortBy] = useState('none'); // 'none' | 'name_asc' | 'name_desc' | 'mins_asc' | 'mins_desc'
  const [itemCodeFilter, setItemCodeFilter] = useState('');

  // Fetch departments to get bundle's department id
  const { data: allDepartments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.filter({ is_active: true }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  const bundleDepartmentId = useMemo(() => {
    if (!bundle?.department) return null;
    const dept = allDepartments.find(d => d.name === bundle.department);
    return dept?.id || null;
  }, [bundle, allDepartments]);

  // Fetch operations from Step 1 - dynamically build columns
  const { data: allOperations = [], isLoading: operationsLoading } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.filter({ is_active: true }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  // Filter operations by department: include if department_ids is empty/missing OR includes this bundle's department
  const filteredOperations = useMemo(() => {
    return allOperations.filter(op => {
      if (!op.department_ids || op.department_ids.length === 0) return true;
      if (!bundleDepartmentId) return true;
      return op.department_ids.includes(bundleDepartmentId);
    });
  }, [allOperations, bundleDepartmentId]);

  const operationColumns = useMemo(() => {
    const sorted = [...filteredOperations]
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    return sorted.slice(0, 10).map(op => ({ 
      id: op.id,
      operation: op.name, 
      label: `${op.name} (min)` 
    }));
  }, [filteredOperations]);

  const hasMoreThan10 = filteredOperations.length > 10;
  const hasNoOperations = filteredOperations.length === 0;

  // Fetch lines for this bundle - CRITICAL: Use bundle.id as primary key
  const { data: lines = [], isLoading, refetch } = useQuery({
    queryKey: ['StdSetLines', bundle?.id],
    queryFn: async () => {
      if (!bundle?.id) return [];
      
      console.log('🔍 DataTab: Loading StdSetLines for bundle', bundle.id);
      
      const result = await base44.entities.StdSetLines.filter({ bundle_id: bundle.id });
      
      console.log('✅ DataTab: Loaded', result.length, 'rows');
      
      return result;
    },
    enabled: !!bundle?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  // Convert lines to grid format - reload whenever lines or bundle changes
  React.useEffect(() => {
    if (!bundle?.id) {
      setGridRows([]);
      return;
    }

    const grouped = {};
    lines.forEach(line => {
      if (!grouped[line.item_code]) {
        grouped[line.item_code] = { item_code: line.item_code, notes: line.notes || '' };
      }
      grouped[line.item_code][line.operation] = line.std_min_per_pc;
    });
    
    const rows = Object.values(grouped);
    setGridRows(rows);
  }, [lines, bundle?.id]);

  // Save mutation (UPSERT per cell)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isEditable) throw new Error('Cannot edit non-DRAFT bundle');

      // Validation
      const itemCodes = gridRows.map(r => r.item_code?.trim()).filter(Boolean);
      const uniqueItemCodes = new Set(itemCodes);
      if (itemCodes.length !== uniqueItemCodes.size) {
        throw new Error('Duplicate item codes found');
      }

      for (const row of gridRows) {
        if (!row.item_code || row.item_code.trim() === '') {
          throw new Error('All rows must have an item code');
        }

        for (const col of operationColumns) {
          const val = row[col.operation];
          if (val != null && val !== '' && (isNaN(parseFloat(val)) || parseFloat(val) < 0)) {
            throw new Error(`Invalid value for ${row.item_code} - ${col.label}: must be >= 0`);
          }
        }
      }

      // UPSERT logic
      const existingLinesMap = new Map();
      lines.forEach(line => {
        const key = `${line.item_code}|${line.operation}`;
        existingLinesMap.set(key, line);
      });

      const updates = [];
      const creates = [];
      const deletes = [];

      for (const row of gridRows) {
        for (const col of operationColumns) {
          const key = `${row.item_code}|${col.operation}`;
          const value = row[col.operation];
          const existingLine = existingLinesMap.get(key);

          if (value == null || value === '') {
            if (existingLine) {
              deletes.push(existingLine.id);
            }
          } else {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              if (existingLine) {
                if (existingLine.std_min_per_pc !== numValue || existingLine.notes !== (row.notes || '')) {
                  updates.push({
                    id: existingLine.id,
                    data: { std_min_per_pc: numValue, notes: row.notes || '' }
                  });
                }
              } else {
                creates.push({
                  bundle_id: bundle.id,
                  item_code: row.item_code,
                  operation: col.operation,
                  std_min_per_pc: numValue,
                  notes: row.notes || ''
                });
              }
            }
          }
        }
      }

      // Delete lines for removed item_codes
      const gridItemCodes = new Set(gridRows.map(r => r.item_code));
      lines.forEach(line => {
        if (!gridItemCodes.has(line.item_code)) {
          deletes.push(line.id);
        }
      });

      console.log('💾 DataTab: Saving', { creates: creates.length, updates: updates.length, deletes: deletes.length });

      await Promise.all([
        ...deletes.map(id => base44.entities.StdSetLines.delete(id)),
        ...updates.map(u => base44.entities.StdSetLines.update(u.id, u.data)),
        ...creates.map(c => base44.entities.StdSetLines.create(c))
      ]);

      const totalWrites = creates.length + updates.length + deletes.length;

      return totalWrites;
    },
    onSuccess: (totalWrites) => {
       refetch();
       toast.success(`Data saved: ${totalWrites} operations`);
     },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  // Sorted & filtered view (display only - does not reorder gridRows state)
  const displayRows = useMemo(() => {
    let rows = gridRows.map((row, originalIndex) => ({ ...row, _originalIndex: originalIndex }));

    // Filter by item code
    if (itemCodeFilter.trim()) {
      rows = rows.filter(r => r.item_code?.toLowerCase().includes(itemCodeFilter.toLowerCase()));
    }

    // Sort
    if (sortBy === 'name_asc') rows.sort((a, b) => (a.item_code || '').localeCompare(b.item_code || ''));
    else if (sortBy === 'name_desc') rows.sort((a, b) => (b.item_code || '').localeCompare(a.item_code || ''));
    else if (sortBy === 'mins_asc' || sortBy === 'mins_desc') {
      const getTotal = (row) => operationColumns.reduce((sum, col) => sum + (parseFloat(row[col.operation]) || 0), 0);
      if (sortBy === 'mins_asc') rows.sort((a, b) => getTotal(a) - getTotal(b));
      else rows.sort((a, b) => getTotal(b) - getTotal(a));
    }

    return rows;
  }, [gridRows, sortBy, itemCodeFilter, operationColumns]);

  const addRow = () => {
    setGridRows([...gridRows, { item_code: '', notes: '' }]);
  };

  const deleteRow = (index) => {
    setGridRows(gridRows.filter((_, i) => i !== index));
  };

  const updateCell = (index, field, value) => {
    const newRows = [...gridRows];
    newRows[index][field] = value;
    setGridRows(newRows);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (operationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Operations Warning/Error Messages */}
      {hasNoOperations && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-red-800">⚠️ No active Operations found</p>
          <p className="text-red-700">Add Operations in Step 1 (Reference Data Setup) before configuring standards.</p>
        </div>
      )}

      {hasMoreThan10 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-orange-800">⚠️ Only first 10 active operations shown</p>
          <p className="text-orange-700">You have {allOperations.length} active operations. Deactivate extras in Step 1 if needed.</p>
        </div>
      )}

      {/* Sort & Filter toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Filter by Item Code..."
            value={itemCodeFilter}
            onChange={e => setItemCodeFilter(e.target.value)}
            className="pl-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[220px]">
            <ArrowUpDown className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Sort</SelectItem>
            <SelectItem value="name_asc">Item Code A → Z</SelectItem>
            <SelectItem value="name_desc">Item Code Z → A</SelectItem>
            <SelectItem value="mins_asc">Total Minutes ↑ (Low first)</SelectItem>
            <SelectItem value="mins_desc">Total Minutes ↓ (High first)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Standard Minutes Grid (Excel-like)</h3>
        <div className="flex gap-2">
          <Button 
            onClick={() => exportDataTabToExcel(gridRows, operationColumns, bundle?.name)}
            variant="outline" 
            size="sm"
            disabled={gridRows.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
          {isEditable && (
            <>
              <Button onClick={addRow} variant="outline" size="sm" disabled={hasNoOperations}>
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
              <Button 
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending || hasNoOperations} 
                size="sm"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[600px] bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="sticky left-0 bg-slate-50 z-10 min-w-[150px] font-semibold">Item Code</TableHead>
              {operationColumns.map(col => (
                <TableHead key={col.operation} className="min-w-[120px] font-semibold">{col.label}</TableHead>
              ))}
              <TableHead className="min-w-[200px] font-semibold">Notes</TableHead>
              {isEditable && <TableHead className="w-[100px] font-semibold">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasNoOperations ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 py-12">
                  No operations available. Configure Operations in Step 1 first.
                </TableCell>
              </TableRow>
            ) : gridRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={operationColumns.length + 3} className="text-center text-slate-500 py-12">
                  No data. Click "Add Row" to start.
                </TableCell>
              </TableRow>
            ) : displayRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={operationColumns.length + 3} className="text-center text-slate-500 py-8">
                  No rows match the filter.
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row) => {
                const index = row._originalIndex;
                return (
                  <TableRow key={index} className="hover:bg-slate-50">
                    <TableCell className="sticky left-0 bg-white hover:bg-slate-50">
                      <Input
                        value={row.item_code}
                        onChange={(e) => updateCell(index, 'item_code', e.target.value)}
                        disabled={!isEditable}
                        placeholder="Item code"
                        className="font-medium"
                      />
                    </TableCell>
                    {operationColumns.map(col => (
                      <TableCell key={col.operation}>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row[col.operation] || ''}
                          onChange={(e) => updateCell(index, col.operation, e.target.value)}
                          disabled={!isEditable}
                          placeholder="-"
                          className="min-w-[110px] text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Input
                        value={row.notes || ''}
                        onChange={(e) => updateCell(index, 'notes', e.target.value)}
                        disabled={!isEditable}
                        placeholder="Optional notes"
                      />
                    </TableCell>
                    {isEditable && (
                      <TableCell>
                        <Button onClick={() => deleteRow(index)} variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}