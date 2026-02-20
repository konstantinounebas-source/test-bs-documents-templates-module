import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, RefreshCw, Edit2, Check, X, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function ConsumablesActualTab({ batchId }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingActualQty, setEditingActualQty] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [formData, setFormData] = useState({
    consumable: '',
    item_code: '',
    operation: '',
    actual_qty: '',
    unit: '',
    notes: ''
  });

  // ── Load batch header to get department, date, bundle
  const { data: batchHeader } = useQuery({
    queryKey: ['BatchHeader', batchId],
    queryFn: () => base44.entities.BatchHeader.filter({ id: batchId }),
    enabled: !!batchId,
    select: d => d?.[0]
  });

  // ── Load consumables standards from the bundle
  const { data: consumablesStdLines = [] } = useQuery({
    queryKey: ['ConsumablesStandardsLines', batchHeader?.bundle_id],
    queryFn: () => base44.entities.ConsumablesStandardsLines.filter({ bundle_id: batchHeader.bundle_id }),
    enabled: !!batchHeader?.bundle_id,
    staleTime: Infinity
  });

  // ── Load operations entered for this batch
  const { data: batchOperations = [] } = useQuery({
    queryKey: ['Operations', batchId],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 30 * 1000
  });

  // ── Load existing actual consumables
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['ConsumablesActual', batchId],
    queryFn: () => base44.entities.ConsumablesActual.filter({ batch_header_id: batchId }),
    enabled: !!batchId
  });

  // ── Load reference lists
  const { data: consumables = [] } = useQuery({
    queryKey: ['Consumable'],
    queryFn: () => base44.entities.Consumable.list(),
    staleTime: Infinity
  });

  // ── Compute expected consumables from operations + standards
  const expectedRows = useMemo(() => {
    if (!batchOperations.length || !consumablesStdLines.length) return [];

    const rows = [];
    batchOperations.forEach(op => {
      // Find matching consumable standards: item_code + operation match OR item_code-only match OR operation-only match
      const matchingStds = consumablesStdLines.filter(std => {
        const itemMatch = !std.item_code || std.item_code === op.item_code;
        const opMatch = !std.operation || std.operation === op.operation;
        return itemMatch && opMatch && (std.item_code || std.operation); // must have at least one
      });

      matchingStds.forEach(std => {
        const qty = op.qty_operation || 0;
        const expectedQty = std.rate_type === 'unit'
          ? qty * (std.rate_value || 0)
          : qty * (std.rate_value || 0) / 100; // percentage

        rows.push({
          key: `${op.id}_${std.id}`,
          operation_id: op.id,
          item_code: op.item_code,
          operation: op.operation,
          consumable: std.consumable,
          unit: std.unit,
          rate_type: std.rate_type,
          rate_value: std.rate_value,
          ops_qty: qty,
          expected_qty: expectedQty
        });
      });
    });

    return rows;
  }, [batchOperations, consumablesStdLines]);

  // ── Unique item_code+operation combos for the add dialog
  const operationOptions = useMemo(() => {
    const seen = new Set();
    return batchOperations
      .filter(op => {
        const key = `${op.item_code}__${op.operation}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(op => ({ item_code: op.item_code, operation: op.operation }));
  }, [batchOperations]);

  // ── Auto-generate expected consumables as actual rows (only once, if none exist)
  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      if (expectedRows.length === 0) throw new Error('No matching standards found for current operations.');

      const promises = expectedRows.map(row =>
        base44.entities.ConsumablesActual.create({
          batch_header_id: batchId,
          department: batchHeader?.department || '',
          consumable: row.consumable,
          item_code: row.item_code,
          operation: row.operation,
          expected_qty: row.expected_qty,
          actual_qty: row.expected_qty, // default actual = expected
          unit: row.unit,
          rate_type: row.rate_type,
          is_auto_generated: true,
          notes: ''
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ConsumablesActual', batchId]);
      toast.success(`Auto-generated ${expectedRows.length} consumable rows from standards`);
    },
    onError: (err) => toast.error(err.message || 'Failed to auto-generate consumables')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ConsumablesActual.create({
      batch_header_id: batchId,
      department: batchHeader?.department || '',
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['ConsumablesActual', batchId]);
      setShowAddDialog(false);
      setFormData({ consumable: '', item_code: '', operation: '', actual_qty: '', unit: '', notes: '' });
      toast.success('Consumable added');
    },
    onError: () => toast.error('Failed to add consumable')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ConsumablesActual.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['ConsumablesActual', batchId]);
      setEditingId(null);
      toast.success('Updated');
      // Save metrics after update
      if (batchHeader) await saveConsumablesMetrics();
    },
    onError: () => toast.error('Failed to update')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsumablesActual.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['ConsumablesActual', batchId]);
      toast.success('Deleted');
      if (batchHeader) await saveConsumablesMetrics();
    },
    onError: () => toast.error('Failed to delete')
  });

  // ── Save EXP_CONS and ACT_CONS metrics → CONS_U is computed in DailyKPIValuesViewer
  const saveConsumablesMetrics = async () => {
    if (!batchHeader) return;
    const allLines = await base44.entities.ConsumablesActual.filter({ batch_header_id: batchId });

    const expCons = allLines.reduce((sum, l) => sum + (l.expected_qty || 0), 0);
    const actCons = allLines.reduce((sum, l) => sum + (l.actual_qty || 0), 0);

    const upsertMetric = async (code, value) => {
      const existing = await base44.entities.DailyMetricValue.filter({
        metric_code: code,
        date: batchHeader.date,
        department: batchHeader.department
      });
      if (existing.length > 0) {
        await base44.entities.DailyMetricValue.update(existing[0].id, { value });
      } else {
        await base44.entities.DailyMetricValue.create({
          metric_code: code,
          date: batchHeader.date,
          department: batchHeader.department,
          bundle_id: batchHeader.bundle_id || '',
          value
        });
      }
    };

    await Promise.all([
      upsertMetric('EXP_CONS', expCons),
      upsertMetric('ACT_CONS', actCons)
    ]);

    queryClient.invalidateQueries(['DailyMetricValue']);
  };

  const handleAdd = async () => {
    if (!formData.consumable || !formData.actual_qty || !formData.unit) {
      toast.error('Consumable, Actual Qty and Unit are required');
      return;
    }
    await createMutation.mutateAsync({
      ...formData,
      actual_qty: parseFloat(formData.actual_qty),
      expected_qty: parseFloat(formData.expected_qty || 0)
    });
    await saveConsumablesMetrics();
  };

  const startEdit = (line) => {
    setEditingId(line.id);
    setEditingActualQty(String(line.actual_qty ?? ''));
    setEditingNotes(line.notes || '');
  };

  const confirmEdit = (line) => {
    updateMutation.mutate({
      id: line.id,
      data: {
        actual_qty: parseFloat(editingActualQty) || 0,
        notes: editingNotes
      }
    });
  };

  // totals
  const totalExpected = lines.reduce((s, l) => s + (l.expected_qty || 0), 0);
  const totalActual = lines.reduce((s, l) => s + (l.actual_qty || 0), 0);
  const consU = totalExpected > 0 ? (totalActual / totalExpected) : null;

  const noAutoGenLines = lines.filter(l => l.is_auto_generated).length === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Consumables</h3>
        <div className="flex gap-2">
          {expectedRows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => autoGenerateMutation.mutate()}
              disabled={autoGenerateMutation.isPending}
              className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
            >
              {autoGenerateMutation.isPending
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <RefreshCw className="w-4 h-4 mr-2" />}
              Generate from Standards ({expectedRows.length})
            </Button>
          )}
          <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Manual
          </Button>
        </div>
      </div>

      {/* Info: expected rows available */}
      {expectedRows.length > 0 && lines.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>{expectedRows.length} expected consumable rows</strong> found based on the operations entered for this batch.
            Click "Generate from Standards" to pre-fill them.
          </span>
        </div>
      )}

      {/* Summary row */}
      {lines.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 border text-center">
            <p className="text-xs text-slate-500 mb-1">EXP_CONS</p>
            <p className="text-lg font-bold text-slate-700">{totalExpected.toFixed(2)}</p>
            <p className="text-xs text-slate-400">Expected units</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border text-center">
            <p className="text-xs text-slate-500 mb-1">ACT_CONS</p>
            <p className="text-lg font-bold text-slate-700">{totalActual.toFixed(2)}</p>
            <p className="text-xs text-slate-400">Actual units</p>
          </div>
          <div className={`rounded-lg p-3 border text-center ${
            consU === null ? 'bg-slate-50' :
            consU <= 1.05 ? 'bg-green-50 border-green-200' :
            consU <= 1.2 ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <p className="text-xs text-slate-500 mb-1">CONS_U</p>
            <p className={`text-lg font-bold ${
              consU === null ? 'text-slate-400' :
              consU <= 1.05 ? 'text-green-700' :
              consU <= 1.2 ? 'text-yellow-700' :
              'text-red-700'
            }`}>
              {consU !== null ? `${(consU * 100).toFixed(1)}%` : '-'}
            </p>
            <p className="text-xs text-slate-400">Usage ratio (ACT/EXP)</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Consumable</TableHead>
              <TableHead>Item Code</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead className="text-right">Exp. Qty</TableHead>
              <TableHead className="text-right">Actual Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                  No consumables recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              lines.map(line => (
                <TableRow key={line.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{line.consumable}</TableCell>
                  <TableCell className="font-mono text-sm">{line.item_code || '-'}</TableCell>
                  <TableCell className="text-sm">{line.operation || '-'}</TableCell>
                  <TableCell className="text-right text-slate-500">{(line.expected_qty || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {editingId === line.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editingActualQty}
                        onChange={e => setEditingActualQty(e.target.value)}
                        className="w-24 h-7 text-right text-sm"
                        autoFocus
                      />
                    ) : (
                      <span className={`font-semibold ${
                        line.expected_qty > 0 && line.actual_qty > line.expected_qty * 1.05 ? 'text-red-600' :
                        line.expected_qty > 0 && line.actual_qty > line.expected_qty * 1.2 ? 'text-red-700' :
                        'text-slate-800'
                      }`}>
                        {(line.actual_qty || 0).toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{line.unit}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {editingId === line.id ? (
                      <Input
                        value={editingNotes}
                        onChange={e => setEditingNotes(e.target.value)}
                        className="h-7 text-sm"
                        placeholder="Notes..."
                      />
                    ) : (
                      line.notes || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${line.is_auto_generated ? 'border-indigo-300 text-indigo-600 bg-indigo-50' : 'border-slate-300 text-slate-600'}`}>
                      {line.is_auto_generated ? 'Auto' : 'Manual'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {editingId === line.id ? (
                        <>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => confirmEdit(line)}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => startEdit(line)}
                          >
                            <Edit2 className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => deleteMutation.mutate(line.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Manual Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Consumable</DialogTitle>
            <DialogDescription>Manually record a consumable usage</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Consumable *</Label>
              <Select value={formData.consumable} onValueChange={v => setFormData({ ...formData, consumable: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select consumable" />
                </SelectTrigger>
                <SelectContent>
                  {consumables.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {operationOptions.length > 0 && (
              <div>
                <Label>Link to Operation (optional)</Label>
                <Select
                  value={formData.item_code && formData.operation ? `${formData.item_code}__${formData.operation}` : ''}
                  onValueChange={v => {
                    if (v === '__none__') {
                      setFormData({ ...formData, item_code: '', operation: '' });
                    } else {
                      const [ic, op] = v.split('__');
                      setFormData({ ...formData, item_code: ic, operation: op });
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {operationOptions.map((o, i) => (
                      <SelectItem key={i} value={`${o.item_code}__${o.operation}`}>
                        {o.item_code} – {o.operation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Expected Qty</Label>
                <Input
                  type="number" step="0.01"
                  value={formData.expected_qty || ''}
                  onChange={e => setFormData({ ...formData, expected_qty: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Actual Qty *</Label>
                <Input
                  type="number" step="0.01"
                  value={formData.actual_qty}
                  onChange={e => setFormData({ ...formData, actual_qty: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Unit *</Label>
                <Input
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., pcs, kg"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}