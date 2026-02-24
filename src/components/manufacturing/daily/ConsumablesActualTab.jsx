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
import { Plus, Trash2, Loader2, RefreshCw, Edit2, Check, X, Info, ChevronDown, ChevronRight } from 'lucide-react';
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
      // Progressive matching: exact → item_code only → operation only
      let matchingStds = consumablesStdLines.filter(std => 
        std.item_code === op.item_code && std.operation === op.operation
      );
      if (!matchingStds.length) {
        matchingStds = consumablesStdLines.filter(std => std.item_code === op.item_code);
      }
      if (!matchingStds.length) {
        matchingStds = consumablesStdLines.filter(std => std.operation === op.operation);
      }

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

  // Grouped view: aggregate by consumable name
  const [showGrouped, setShowGrouped] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [editingGroupTotal, setEditingGroupTotal] = useState(null); // { consumable, value }
  const groupedLines = useMemo(() => {
    const map = {};
    lines.forEach(line => {
      const key = line.consumable;
      if (!map[key]) {
        map[key] = { consumable: line.consumable, unit: line.unit, totalExpected: 0, totalActual: 0, rows: [] };
      }
      map[key].totalExpected += line.expected_qty || 0;
      map[key].totalActual += line.actual_qty || 0;
      map[key].rows.push(line);
    });
    return Object.values(map);
  }, [lines]);

  const toggleGroup = (consumable) => {
    setExpandedGroups(prev => ({ ...prev, [consumable]: !prev[consumable] }));
  };

  // Save group total: distribute proportionally across rows, or evenly if all expected=0
  const confirmGroupTotalEdit = async (group) => {
    const newTotal = parseFloat(editingGroupTotal.value) || 0;
    const totalExp = group.totalExpected;
    const rows = group.rows;

    let updates;
    if (totalExp > 0) {
      // Distribute proportionally by expected_qty
      updates = rows.map(line => ({
        id: line.id,
        actual_qty: totalExp > 0 ? (line.expected_qty || 0) / totalExp * newTotal : 0
      }));
    } else {
      // Distribute evenly
      const perRow = newTotal / rows.length;
      updates = rows.map(line => ({ id: line.id, actual_qty: perRow }));
    }

    await Promise.all(updates.map(u =>
      base44.entities.ConsumablesActual.update(u.id, { actual_qty: parseFloat(u.actual_qty.toFixed(4)) })
    ));

    await queryClient.invalidateQueries(['ConsumablesActual', batchId]);
    setEditingGroupTotal(null);
    toast.success('Updated actual qty');
    if (batchHeader) await saveConsumablesMetrics();
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

      {/* Toggle view */}
      {lines.length > 0 && (
        <div className="flex gap-2 items-center">
          <span className="text-sm text-slate-500">View:</span>
          <Button size="sm" variant={showGrouped ? 'default' : 'outline'} onClick={() => setShowGrouped(true)}>Grouped</Button>
          <Button size="sm" variant={!showGrouped ? 'default' : 'outline'} onClick={() => setShowGrouped(false)}>Detailed</Button>
        </div>
      )}

      {/* Grouped Table */}
      {showGrouped && lines.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Consumable</TableHead>
                <TableHead className="w-16">Unit</TableHead>
                <TableHead className="text-right w-24">Exp. Qty (Total)</TableHead>
                <TableHead className="text-right w-24">Actual Qty (Total)</TableHead>
                <TableHead className="text-right w-24">Usage %</TableHead>
                <TableHead className="w-20">Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedLines.map(group => {
                const usage = group.totalExpected > 0 ? (group.totalActual / group.totalExpected) * 100 : null;
                const isExpanded = !!expandedGroups[group.consumable];
                return (
                  <React.Fragment key={group.consumable}>
                    {/* Group header row */}
                    <TableRow
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => toggleGroup(group.consumable)}
                    >
                      <TableCell className="w-8">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{group.consumable}</TableCell>
                      <TableCell className="text-sm">{group.unit}</TableCell>
                      <TableCell className="text-right text-sm">{group.totalExpected.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{group.totalActual.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {usage !== null ? (
                          <span className={`text-sm font-semibold ${usage <= 105 ? 'text-green-700' : usage <= 120 ? 'text-yellow-700' : 'text-red-700'}`}>
                            {usage.toFixed(1)}%
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{group.rows.length} row(s)</TableCell>
                    </TableRow>

                    {/* Expanded detail rows with edit capability */}
                    {isExpanded && group.rows.map(line => (
                      <TableRow key={line.id} className="bg-slate-50/60">
                        <TableCell></TableCell>
                        <TableCell className="text-xs text-slate-500 pl-6">
                          {line.item_code && <span className="mr-2">📦 {line.item_code}</span>}
                          {line.operation && <span>⚙ {line.operation}</span>}
                        </TableCell>
                        <TableCell className="text-xs">{line.unit}</TableCell>
                        <TableCell className="text-right text-xs">{line.expected_qty?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {editingId === line.id ? (
                            <Input
                              type="number"
                              value={editingActualQty}
                              onChange={(e) => setEditingActualQty(e.target.value)}
                              className="w-24 text-sm h-7"
                              step="0.01"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-semibold">{line.actual_qty?.toFixed(2) || '0.00'}</span>
                          )}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            {editingId === line.id ? (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => confirmEdit(line)} disabled={updateMutation.isPending}>
                                  <Check className="w-3 h-3 text-green-600" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                                  <X className="w-3 h-3 text-slate-400" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(line)}>
                                  <Edit2 className="w-3 h-3 text-slate-400" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteMutation.mutate(line.id)} disabled={deleteMutation.isPending}>
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detailed Table */}
      {(!showGrouped || lines.length === 0) && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-20">Consumable</TableHead>
                <TableHead className="w-16">Item Code</TableHead>
                <TableHead className="w-16">Operation</TableHead>
                <TableHead className="text-right w-20">Exp. Qty</TableHead>
                <TableHead className="text-right w-20">Actual Qty</TableHead>
                <TableHead className="w-12">Unit</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-24">Source</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="9" className="text-center py-8 text-slate-500">
                    No consumables recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                lines.map(line => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium text-sm">{line.consumable}</TableCell>
                    <TableCell className="text-sm">{line.item_code}</TableCell>
                    <TableCell className="text-sm">{line.operation}</TableCell>
                    <TableCell className="text-right text-sm">{line.expected_qty?.toFixed(2) || '-'}</TableCell>
                    <TableCell className="text-right">
                      {editingId === line.id ? (
                        <Input type="number" value={editingActualQty} onChange={(e) => setEditingActualQty(e.target.value)} className="w-full text-sm" step="0.01" />
                      ) : (
                        <span className="text-sm font-semibold">{line.actual_qty?.toFixed(2) || '0.00'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{line.unit}</TableCell>
                    <TableCell className="text-sm max-w-xs">
                      {editingId === line.id ? (
                        <Input value={editingNotes} onChange={(e) => setEditingNotes(e.target.value)} className="w-full text-sm" placeholder="Notes..." />
                      ) : (
                        line.notes || '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {line.is_auto_generated && <Badge variant="outline" className="text-xs bg-indigo-50">Auto</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {editingId === line.id ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => confirmEdit(line)} disabled={updateMutation.isPending}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4 text-slate-400" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(line)}>
                            <Edit2 className="w-4 h-4 text-slate-400" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(line.id)} disabled={deleteMutation.isPending}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Consumable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cons-select">Consumable *</Label>
              <Select
                value={formData.consumable}
                onValueChange={(val) => setFormData({ ...formData, consumable: val })}
              >
                <SelectTrigger id="cons-select">
                  <SelectValue placeholder="Select consumable" />
                </SelectTrigger>
                <SelectContent>
                  {consumables.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {operationOptions.length > 0 && (
              <div>
                <Label htmlFor="op-select">Item Code + Operation</Label>
                <Select
                  onValueChange={(val) => {
                    const [itemCode, operation] = val.split('||');
                    setFormData({ ...formData, item_code: itemCode, operation });
                  }}
                >
                  <SelectTrigger id="op-select">
                    <SelectValue placeholder="Select operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {operationOptions.map((op, i) => (
                      <SelectItem key={i} value={`${op.item_code}||${op.operation}`}>
                        {op.item_code} - {op.operation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="unit-select">Unit *</Label>
              <Input
                id="unit-select"
                placeholder="e.g., kg, ltr, pcs"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="actual-qty">Actual Qty *</Label>
              <Input
                id="actual-qty"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.actual_qty}
                onChange={(e) => setFormData({ ...formData, actual_qty: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}