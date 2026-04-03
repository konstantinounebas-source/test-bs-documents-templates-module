import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Save, Download, ArrowUpDown, ArrowUp, ArrowDown, Search, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { exportDataTabToExcel } from './shared/exportToExcel';
import ImportStandardsDialog from './ImportStandardsDialog';

export default function DataTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();
  const [gridRows, setGridRows] = useState([]);
  const [sortBy, setSortBy] = useState('none'); // 'none' | 'name_asc' | 'name_desc' | 'mins_asc' | 'mins_desc'
  const [itemCodeFilter, setItemCodeFilter] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

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
  // Fetch Operation Profiles for this department
  const { data: profiles = [] } = useQuery({
    queryKey: ['OperationProfileName', bundle?.department],
    queryFn: () => base44.entities.OperationProfileName.filter({ department: bundle.department }),
    enabled: !!bundle,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  const filteredOperations = useMemo(() => {
    return allOperations.filter(op => {
      if (!op.department_ids || op.department_ids.length === 0) return true;
      if (!bundleDepartmentId) return true;
      return op.department_ids.includes(bundleDepartmentId);
    });
  }, [allOperations, bundleDepartmentId]);

  // Get operations for selected profile
  const selectedProfile = useMemo(() => {
    return profiles.find(p => p.id === selectedProfileId);
  }, [profiles, selectedProfileId]);

  // If a profile is selected, use its operations in its defined order; otherwise use all department operations
  const displayedOperations = useMemo(() => {
    if (selectedProfile && selectedProfile.operations_required && selectedProfile.operations_required.length > 0) {
      // Only use operations that are explicitly in operations_required (strict filtering)
      const requiredSet = new Set(selectedProfile.operations_required);
      
      // If operations_order exists and matches, use it; otherwise use operations_required
      let opsToUse = selectedProfile.operations_order || selectedProfile.operations_required;
      
      // Filter to only operations that exist in both the order list and required list
      opsToUse = opsToUse.filter(opId => requiredSet.has(opId));
      
      const orderedOps = [];
      opsToUse.forEach(opId => {
        const op = filteredOperations.find(o => o.id === opId);
        if (op) orderedOps.push(op);
      });
      return orderedOps;
    }
    return filteredOperations;
  }, [filteredOperations, selectedProfile]);

  const operationColumns = useMemo(() => {
    // If a profile is selected, use its operation order; otherwise sort by display_order
    let sorted = [...displayedOperations];
    
    if (selectedProfile && selectedProfile.operations_order && selectedProfile.operations_order.length > 0) {
      // Sort by the profile's operations_order
      const orderMap = new Map(selectedProfile.operations_order.map((id, idx) => [id, idx]));
      sorted.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
    } else {
      // Default: sort by display_order
      sorted.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
    
    return sorted.map(op => ({ 
      id: op.id,
      operation: op.name, 
      label: `${op.name} (min)` 
    }));
  }, [displayedOperations, selectedProfile]);

  const hasMoreThan10 = filteredOperations.length > 10;
  const hasNoOperations = filteredOperations.length === 0;
  const activeProfiles = useMemo(() => {
    return profiles.filter(p => p.is_active !== false);
  }, [profiles]);

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
        grouped[line.item_code] = { item_code: line.item_code, notes: line.notes || '', surface_area_m2: '' };
      }
      grouped[line.item_code][line.operation] = line.std_min_per_pc;
      // surface_area_m2 is per item_code (not per operation), take from any line
      if (line.surface_area_m2 != null && line.surface_area_m2 !== '') {
        grouped[line.item_code].surface_area_m2 = line.surface_area_m2;
      }
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
        const surfaceArea = row.surface_area_m2 !== '' && row.surface_area_m2 != null ? parseFloat(row.surface_area_m2) : null;

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
                if (existingLine.std_min_per_pc !== numValue || existingLine.notes !== (row.notes || '') || existingLine.surface_area_m2 !== surfaceArea) {
                  updates.push({
                    id: existingLine.id,
                    data: { std_min_per_pc: numValue, notes: row.notes || '', surface_area_m2: surfaceArea }
                  });
                }
              } else {
                creates.push({
                  bundle_id: bundle.id,
                  item_code: row.item_code,
                  operation: col.operation,
                  std_min_per_pc: numValue,
                  notes: row.notes || '',
                  surface_area_m2: surfaceArea
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
      queryClient.invalidateQueries({ queryKey: ['StdSetLines', bundle.id] });
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
    setGridRows([...gridRows, { item_code: '', notes: '', surface_area_m2: '' }]);
  };

  const deleteRow = (index) => {
    setGridRows(gridRows.filter((_, i) => i !== index));
  };

  const updateCell = (index, field, value) => {
    const newRows = [...gridRows];
    newRows[index][field] = value;
    setGridRows(newRows);
  };

  const handleImport = async (records) => {
    // Add imported records to grid
    const newRows = [...gridRows];
    
    // Group records by item_code
    const importedByItemCode = {};
    records.forEach(rec => {
      if (!importedByItemCode[rec.item_code]) {
        importedByItemCode[rec.item_code] = { 
          item_code: rec.item_code, 
          notes: rec.notes || '', 
          surface_area_m2: ''
        };
      }
      importedByItemCode[rec.item_code][rec.operation] = rec.std_min_per_pc;
    });

    // Merge with existing grid (new items + update existing)
    const gridByItemCode = {};
    gridRows.forEach(row => {
      gridByItemCode[row.item_code] = row;
    });

    Object.entries(importedByItemCode).forEach(([itemCode, importedRow]) => {
      if (gridByItemCode[itemCode]) {
        // Merge operations into existing row
        Object.assign(gridByItemCode[itemCode], importedRow);
      } else {
        // Add new row
        gridByItemCode[itemCode] = importedRow;
      }
    });

    setGridRows(Object.values(gridByItemCode));
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

      {/* Profile Selector & Sort & Filter toolbar */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">Filter by Profile (Optional)</label>
          <Select value={selectedProfileId || ''} onValueChange={(val) => setSelectedProfileId(val || null)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select profile to filter operations..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Operations (No Filter)</SelectItem>
              {activeProfiles.map(profile => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name} ({profile.operations_required?.length || 0} ops)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProfile && (
            <p className="text-xs text-slate-500 mt-1">
              ✓ Showing {operationColumns.length} operation(s) from profile "{selectedProfile.name}"
            </p>
          )}
        </div>

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
              <Button 
                onClick={() => setShowImportDialog(true)} 
                variant="outline" 
                size="sm"
                disabled={hasNoOperations}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import from Excel
              </Button>
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
              <TableHead className="min-w-[130px] font-semibold text-blue-700">Surface Area (m²)</TableHead>
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
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.surface_area_m2 || ''}
                        onChange={(e) => updateCell(index, 'surface_area_m2', e.target.value)}
                        disabled={!isEditable}
                        placeholder="-"
                        className="min-w-[110px] text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
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

      <ImportStandardsDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog}
        onImport={handleImport}
        isLoading={false}
      />
    </div>
  );
}