import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function DataTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();
  const [gridRows, setGridRows] = useState([]);
  const [debugInfo, setDebugInfo] = useState({
    saveWrites: 0,
    loadReads: 0,
    lastSaveSample: null,
    lastLoadFilter: null
  });

  // Fetch operations from Step 1 - dynamically build columns
  const { data: allOperations = [], isLoading: operationsLoading } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.filter({ is_active: true })
  });

  const operationColumns = useMemo(() => {
    const sorted = [...allOperations]
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    return sorted.slice(0, 10).map(op => ({ 
      id: op.id,
      operation: op.name, 
      label: `${op.name} (min)` 
    }));
  }, [allOperations]);

  const hasMoreThan10 = allOperations.length > 10;
  const hasNoOperations = allOperations.length === 0;

  // Fetch lines for this bundle - CRITICAL: Use bundle.id as primary key
  const { data: lines = [], isLoading, refetch } = useQuery({
    queryKey: ['StdSetLines', bundle?.id],
    queryFn: async () => {
      if (!bundle?.id) return [];
      
      console.log('🔍 LOAD QUERY:', { 
        table: 'StdSetLines', 
        filter: { bundle_id: bundle.id },
        bundleVersion: bundle.version_no 
      });
      
      const result = await base44.entities.StdSetLines.filter({ bundle_id: bundle.id });
      
      console.log('✅ LOADED ROWS:', result.length, result.slice(0, 2));
      
      setDebugInfo(prev => ({
        ...prev,
        loadReads: result.length,
        lastLoadFilter: { table: 'StdSetLines', bundle_id: bundle.id, department: bundle.department }
      }));
      
      return result;
    },
    enabled: !!bundle?.id,
    staleTime: 0 // Always refetch
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

      console.log('💾 SAVE OPERATION:', {
        bundleId: bundle.id,
        bundleVersion: bundle.version_no,
        department: bundle.department,
        creates: creates.length,
        updates: updates.length,
        deletes: deletes.length,
        sampleCreate: creates[0]
      });

      await Promise.all([
        ...deletes.map(id => base44.entities.StdSetLines.delete(id)),
        ...updates.map(u => base44.entities.StdSetLines.update(u.id, u.data)),
        ...creates.map(c => base44.entities.StdSetLines.create(c))
      ]);

      const totalWrites = creates.length + updates.length + deletes.length;
      
      setDebugInfo(prev => ({
        ...prev,
        saveWrites: totalWrites,
        lastSaveSample: creates[0] || updates[0]?.data || null
      }));

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

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Standard Minutes Grid (Excel-like)</h3>
        <div className="flex gap-2">
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

      {/* DEBUG PANEL */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs space-y-1">
        <div className="font-semibold text-yellow-800">🔍 DEBUG INFO:</div>
        <div><strong>Bundle ID:</strong> {bundle?.id || 'N/A'}</div>
        <div><strong>Bundle Version:</strong> {bundle?.version_no || 'N/A'}</div>
        <div><strong>Department:</strong> {bundle?.department || 'N/A'}</div>
        <div><strong>Save Writes:</strong> {debugInfo.saveWrites}</div>
        <div><strong>Load Reads:</strong> {debugInfo.loadReads}</div>
        <div><strong>Last Save Sample:</strong> {debugInfo.lastSaveSample ? JSON.stringify(debugInfo.lastSaveSample) : 'N/A'}</div>
        <div><strong>Last Load Filter:</strong> {debugInfo.lastLoadFilter ? JSON.stringify(debugInfo.lastLoadFilter) : 'N/A'}</div>
        <div><strong>Current Grid Rows:</strong> {gridRows.length}</div>
        <div><strong>Fetched Lines:</strong> {lines.length}</div>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-white z-10 min-w-[150px]">Item Code</TableHead>
              {operationColumns.map(col => (
                <TableHead key={col.operation} className="min-w-[120px]">{col.label}</TableHead>
              ))}
              <TableHead className="min-w-[200px]">Notes</TableHead>
              {isEditable && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasNoOperations ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500">
                  No operations available. Configure Operations in Step 1 first.
                </TableCell>
              </TableRow>
            ) : gridRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={operationColumns.length + 3} className="text-center text-slate-500">
                  No data. Click "Add Row" to start.
                </TableCell>
              </TableRow>
            ) : (
              gridRows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="sticky left-0 bg-white">
                    <Input
                      value={row.item_code}
                      onChange={(e) => updateCell(index, 'item_code', e.target.value)}
                      disabled={!isEditable}
                      placeholder="Item code"
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
                        className="min-w-[110px]"
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}