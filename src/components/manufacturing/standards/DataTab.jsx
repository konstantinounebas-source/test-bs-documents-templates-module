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

  // Fetch operations (with is_allowed filter for max 10)
  const { data: allOperations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.list()
  });

  const operationColumns = useMemo(() => {
    return allOperations
      .filter(op => op.is_active && op.is_allowed)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .slice(0, 10)
      .map(op => ({ operation: op.name, label: `${op.name} (min)` }));
  }, [allOperations]);

  // Fetch lines for this bundle
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['StdSetLines', bundle.id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Convert lines to grid format
  React.useEffect(() => {
    if (lines.length > 0) {
      const grouped = {};
      lines.forEach(line => {
        if (!grouped[line.item_code]) {
          grouped[line.item_code] = { item_code: line.item_code, notes: line.notes || '' };
        }
        grouped[line.item_code][line.operation] = line.std_min_per_pc;
      });
      setGridRows(Object.values(grouped));
    } else {
      setGridRows([]);
    }
  }, [lines]);

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

      await Promise.all([
        ...deletes.map(id => base44.entities.StdSetLines.delete(id)),
        ...updates.map(u => base44.entities.StdSetLines.update(u.id, u.data)),
        ...creates.map(c => base44.entities.StdSetLines.create(c))
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['StdSetLines'] });
      toast.success('Data saved successfully');
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Standard Minutes Grid (Excel-like)</h3>
        <div className="flex gap-2">
          {isEditable && (
            <>
              <Button onClick={addRow} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </>
          )}
        </div>
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
            {gridRows.length === 0 ? (
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