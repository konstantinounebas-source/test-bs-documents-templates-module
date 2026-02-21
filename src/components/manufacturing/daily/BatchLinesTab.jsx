import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Search, AlertCircle, Edit2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

function useBatchItemCodes(batchId, department) {
  return useQuery({
    queryKey: ['BatchItemCodes', batchId, department],
    queryFn: async () => {
      if (!batchId || !department) return [];
      
      // Get batch header to get its bundle_id
      const batch = await base44.entities.BatchHeader.filter({ id: batchId });
      if (!batch || batch.length === 0) return [];
      
      const bundleId = batch[0].bundle_id;
      const lines = await base44.entities.StdSetLines.filter({ bundle_id: bundleId });
      
      const uniqueItemCodes = [...new Set(lines.map(l => l.item_code))].filter(Boolean);
      return uniqueItemCodes.sort();
    },
    enabled: !!batchId && !!department,
    staleTime: Infinity
  });
}

export default function BatchLinesTab({ batchId, department, selectedBundle }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [formData, setFormData] = useState({
    item_code: '',
    scheduled_qty: '',
    qty_processed: '',
    qty_out_good: '',
    qty_scrap: ''
  });

  const { data: itemCodes = [], isLoading: itemCodesLoading } = useBatchItemCodes(batchId, department);
  const hasItemCodes = itemCodes.length > 0;

  // Fetch batch header to get date and department for scheduled data lookup
  const { data: batchHeader } = useQuery({
    queryKey: ['BatchHeader', batchId],
    queryFn: () => base44.entities.BatchHeader.filter({ id: batchId }),
    enabled: !!batchId,
    select: (data) => data?.[0]
  });

  // Fetch scheduled data for auto-filling batch lines
  const { data: scheduledData = [] } = useQuery({
    queryKey: ['ScheduledData', batchHeader?.date, batchHeader?.department],
    queryFn: () => base44.entities.ScheduledData.filter({
      date: batchHeader.date,
      department_id: batchHeader.department
    }),
    enabled: !!batchHeader?.date && !!batchHeader?.department,
    staleTime: Infinity
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['Batch_Lines', batchId],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 30 * 1000
  });

  // Fetch QC and Profile set lines from selected bundle
  const { data: qcSetLines = [] } = useQuery({
    queryKey: ['QC_Set_Lines', selectedBundle?.qc_set_id],
    queryFn: async () => {
      if (!selectedBundle?.qc_set_id) return [];
      return await base44.entities.QC_Set_Lines.filter({ qc_set_id: selectedBundle.qc_set_id });
    },
    staleTime: Infinity
  });

  const { data: profileSetLines = [] } = useQuery({
    queryKey: ['Profile_Set_Lines', selectedBundle?.profile_set_id],
    queryFn: async () => {
      if (!selectedBundle?.profile_set_id) return [];
      return await base44.entities.Profile_Set_Lines.filter({ profile_set_id: selectedBundle.profile_set_id });
    },
    staleTime: Infinity
  });

  const filteredLines = useMemo(() => {
    if (!searchFilter) return lines;
    const term = searchFilter.toLowerCase();
    return lines.filter(l => l.item_code?.toLowerCase().includes(term));
  }, [lines, searchFilter]);

  const totals = useMemo(() => ({
    scheduled_qty: lines.reduce((sum, l) => sum + (l.scheduled_qty || 0), 0),
    qty_processed: lines.reduce((sum, l) => sum + (l.qty_processed || 0), 0),
    qty_out_good: lines.reduce((sum, l) => sum + (l.qty_out_good || 0), 0),
    qty_scrap: lines.reduce((sum, l) => sum + (l.qty_scrap || 0), 0)
  }), [lines]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newLine = await base44.entities.Batch_Lines.create({
        batch_header_id: batchId,
        ...data
      });
      
      // Create QC and Operations if qty_processed > 0
      if (Number(data.qty_processed) > 0) {
        await Promise.all([
          createOrUpdateQCInitialStock(data),
          createOrUpdateOperations(data)
        ]);
      }
      
      return newLine;
    },
    onSuccess: async () => {
      await saveACTQtyMetric();
      await saveSchQtyMetric();
      queryClient.invalidateQueries(['Batch_Lines']);
      setShowAddDialog(false);
      setFormData({ item_code: '', scheduled_qty: '', qty_processed: '', qty_out_good: '', qty_scrap: '' });
      toast.success('Batch line added');
    },
    onError: () => toast.error('Failed to add batch line')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Batch_Lines.update(id, data),
    onSuccess: async () => {
      await saveACTQtyMetric();
      await saveSchQtyMetric();
      queryClient.invalidateQueries(['Batch_Lines']);
      setShowAddDialog(false);
      setEditingLine(null);
      setFormData({ item_code: '', scheduled_qty: '', qty_processed: '', qty_out_good: '', qty_scrap: '' });
      toast.success('Batch line updated');
    },
    onError: () => toast.error('Failed to update batch line')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Batch_Lines.delete(id),
    onSuccess: async () => {
      await saveACTQtyMetric();
      await saveSchQtyMetric();
      queryClient.invalidateQueries(['Batch_Lines']);
      toast.success('Batch line deleted');
    },
    onError: () => toast.error('Failed to delete batch line')
  });

  const saveACTQtyMetric = async () => {
    try {
      const batchHeader = await base44.entities.BatchHeader.filter({ id: batchId });
      if (!batchHeader || batchHeader.length === 0) return;

      // Fetch fresh Batch_Lines data from database
      const allLines = await base44.entities.Batch_Lines.filter({ batch_header_id: batchId });
      
      // Calculate total Qty Out Good
      const totalQtyOutGood = allLines.reduce((sum, line) => sum + (line.qty_out_good || 0), 0);

      // Find and update the ACT_QTY metric by date and department
      const existingMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'ACT_QTY',
        date: batchHeader[0].date,
        department: batchHeader[0].department
      });

      if (existingMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
          value: totalQtyOutGood
        });
      }

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save ACT_QTY metric:', error);
    }
  };

  const saveSchQtyMetric = async () => {
    try {
      const batchHeader = await base44.entities.BatchHeader.filter({ id: batchId });
      if (!batchHeader || batchHeader.length === 0) return;

      // Fetch fresh Batch_Lines data from database
      const allLines = await base44.entities.Batch_Lines.filter({ batch_header_id: batchId });
      
      // Calculate total Scheduled Qty
      const totalScheduledQty = allLines.reduce((sum, line) => sum + (line.scheduled_qty || 0), 0);

      // Find and update the SCH_QTY metric by date and department
      const existingMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'SCH_QTY',
        date: batchHeader[0].date,
        department: batchHeader[0].department
      });

      if (existingMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
          value: totalScheduledQty
        });
      }

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save SCH_QTY metric:', error);
    }
  };

  const deleteQCInitialStock = async (itemCode) => {
    try {
      const existingQCs = await base44.entities.QC_Initial_Stock.filter({
        batch_header_id: batchId,
        item_code: itemCode
      });
      if (existingQCs.length > 0) {
        await Promise.all(existingQCs.map(qc => base44.entities.QC_Initial_Stock.delete(qc.id)));
        queryClient.invalidateQueries(['QC_Initial_Stock']);
      }
    } catch (error) {
      console.error('Failed to delete QC Initial Stock:', error);
    }
  };

  const createOrUpdateQCInitialStock = async (batchLine) => {
    try {
      if (!batchLine.item_code || (batchLine.qty_processed || 0) <= 0) {
        await deleteQCInitialStock(batchLine.item_code);
        return;
      }

      const scheduledItem = scheduledData.find(sd => sd.item_code === batchLine.item_code);
      const qcType = (scheduledItem?.qc_type) || null;
      const qcLevel = (scheduledItem?.qc_level) || null;

      const existingQC = await base44.entities.QC_Initial_Stock.filter({
        batch_header_id: batchId,
        item_code: batchLine.item_code
      });

      if (existingQC.length > 0) {
        await base44.entities.QC_Initial_Stock.update(existingQC[0].id, {
          qty_affected: batchLine.qty_processed,
          ...(qcType && { qc_type: qcType }),
          ...(qcLevel && { qc_level: qcLevel })
        });
      } else {
        await base44.entities.QC_Initial_Stock.create({
          batch_header_id: batchId,
          item_code: batchLine.item_code,
          qty_affected: batchLine.qty_processed,
          ...(qcType && { qc_type: qcType }),
          ...(qcLevel && { qc_level: qcLevel })
        });
      }

      queryClient.invalidateQueries(['QC_Initial_Stock']);
    } catch (error) {
      console.error('Failed to create/update QC Initial Stock:', error);
    }
  };

  const deleteOperations = async (itemCode) => {
    try {
      const existingOps = await base44.entities.Operations.filter({
        batch_header_id: batchId,
        item_code: itemCode
      });
      if (existingOps.length > 0) {
        await Promise.all(existingOps.map(op => base44.entities.Operations.delete(op.id)));
        queryClient.invalidateQueries(['Operations']);
      }
    } catch (error) {
      console.error('Failed to delete Operations:', error);
    }
  };

  const createOrUpdateOperations = async (batchLine) => {
    try {
      if (!batchLine.item_code || (batchLine.qty_processed || 0) <= 0) {
        await deleteOperations(batchLine.item_code);
        return;
      }

      const qty = batchLine.qty_processed;
      const scheduledItem = scheduledData.find(sd => sd.item_code === batchLine.item_code);

      if (scheduledItem && scheduledItem.operation_profile_id) {
        // Has schedule entry with profile → use ProfileSetLines (bundle_id + item_code) to find active operations
        // Then use StdSetLines for per-operation std_min_per_pc
        const batchHdr = await base44.entities.BatchHeader.filter({ id: batchId });
        const bundleId = batchHdr?.[0]?.bundle_id;

        // Get profile line for this item_code to know which operations are active (yn flags)
        const profileLines = bundleId
          ? await base44.entities.Profile_Set_Lines.filter({ bundle_id: bundleId, item_code: batchLine.item_code })
          : [];

        // Get std lines for this bundle + item_code for per-operation times
        const stdLines = bundleId
          ? await base44.entities.Std_Set_Lines.filter({ bundle_id: bundleId, item_code: batchLine.item_code })
          : [];
        // Also get general std lines (no item_code) as fallback
        const stdLinesGeneral = bundleId
          ? await base44.entities.Std_Set_Lines.filter({ bundle_id: bundleId })
          : [];

        // Map of operation name → std_min_per_pc
        const stdMap = {};
        [...stdLinesGeneral, ...stdLines].forEach(sl => {
          if (sl.operation) stdMap[sl.operation] = sl.std_min_per_pc || 0;
        });

        // The yn-flag → operation name mapping
        const ynOpMap = {
          sanding_yn: 'Sanding',
          masking_yn: 'Masking',
          zink_yn: 'Zink',
          repair_yn: 'Repair',
          remake_yn: 'Remake',
          hanging_yn: 'Hanging',
          unhanging_yn: 'Unhanging',
          oven_clean_yn: 'Oven Clean',
          other_yn: 'Other'
        };

        // Collect active operations from the profile line
        const profileLine = profileLines[0];
        let activeOps = [];
        if (profileLine) {
          Object.entries(ynOpMap).forEach(([flag, opName]) => {
            if (profileLine[flag] === true) {
              activeOps.push(opName);
            }
          });
        }

        // Fallback: if no profile line found, use operations_required from OperationProfileName
        if (activeOps.length === 0) {
          const profile = profileNames.find(p => p.id === scheduledItem.operation_profile_id);
          const opDefs = operations; // base44.entities.Operation list
          (profile?.operations_required || []).forEach(opId => {
            const op = opDefs.find(o => o.id === opId);
            if (op) activeOps.push(op.name);
          });
        }

        // Fetch existing operations for this batch+item to upsert
        const existingOps = await base44.entities.Operations.filter({
          batch_header_id: batchId,
          item_code: batchLine.item_code
        });
        const existingMap = {};
        existingOps.forEach(op => { if (op.operation) existingMap[op.operation] = op; });

        // Delete operations no longer in active list
        const toDelete = existingOps.filter(op => op.operation && !activeOps.includes(op.operation));
        await Promise.all(toDelete.map(op => base44.entities.Operations.delete(op.id)));

        // Upsert each active operation
        for (const opName of activeOps) {
          const stdMinPC = stdMap[opName] || 0;
          const operationTimeMin = qty * stdMinPC;
          if (existingMap[opName]) {
            await base44.entities.Operations.update(existingMap[opName].id, {
              qty_operation: qty,
              std_min_pc_lookup: stdMinPC,
              operation_time_min: operationTimeMin,
              operation_profile_id: scheduledItem.operation_profile_id,
              source_type: 'SCHEDULE'
            });
          } else {
            await base44.entities.Operations.create({
              batch_header_id: batchId,
              item_code: batchLine.item_code,
              operation: opName,
              qty_operation: qty,
              std_min_pc_lookup: stdMinPC,
              operation_time_min: operationTimeMin,
              operation_profile_id: scheduledItem.operation_profile_id,
              source_type: 'SCHEDULE'
            });
          }
        }

        // If no active ops found at all, create a single manual entry
        if (activeOps.length === 0) {
          if (existingOps.length > 0) {
            await base44.entities.Operations.update(existingOps[0].id, { qty_operation: qty });
          } else {
            await base44.entities.Operations.create({
              batch_header_id: batchId,
              item_code: batchLine.item_code,
              operation: '',
              qty_operation: qty,
              operation_profile_id: scheduledItem.operation_profile_id,
              source_type: 'SCHEDULE'
            });
          }
        }

      } else {
        // No schedule entry → create 1 record with item_code + qty, rest empty
        const existing = await base44.entities.Operations.filter({
          batch_header_id: batchId,
          item_code: batchLine.item_code
        });
        if (existing.length > 0) {
          await base44.entities.Operations.update(existing[0].id, {
            qty_operation: qty
          });
        } else {
          await base44.entities.Operations.create({
            batch_header_id: batchId,
            item_code: batchLine.item_code,
            operation: '',
            qty_operation: qty,
            source_type: 'MANUAL'
          });
        }
      }

      queryClient.invalidateQueries(['Operations']);
    } catch (error) {
      console.error('Failed to create/update Operations:', error);
    }
  };

  const onSaveQtyProcessed = async (lineId, newQtyProcessed, allData) => {
    // Update the batch line itself
    await updateMutation.mutateAsync({
      id: lineId,
      data: allData
    });

    const updatedLine = { ...allData, id: lineId };

    if (Number(newQtyProcessed) > 0) {
      await Promise.all([
        createOrUpdateQCInitialStock(updatedLine),
        createOrUpdateOperations(updatedLine)
      ]);
    } else {
      // If qty_processed is 0 or less, ensure QC and Operations are deleted
      await Promise.all([
        deleteQCInitialStock(updatedLine.item_code),
        deleteOperations(updatedLine.item_code)
      ]);
    }
  };

  const handleAdd = () => {
    if (!formData.item_code) {
      toast.error('Item code is required');
      return;
    }

    const data = {
      item_code: formData.item_code,
      scheduled_qty: parseFloat(formData.scheduled_qty) || 0,
      qty_processed: parseFloat(formData.qty_processed) || 0,
      qty_out_good: parseFloat(formData.qty_out_good) || 0,
      qty_scrap: parseFloat(formData.qty_scrap) || 0
    };

    if (editingLine) {
      onSaveQtyProcessed(editingLine.id, data.qty_processed, data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (line) => {
    setEditingLine(line);
    setFormData({
      item_code: line.item_code,
      scheduled_qty: line.scheduled_qty || '',
      qty_processed: line.qty_processed || '',
      qty_out_good: line.qty_out_good || '',
      qty_scrap: line.qty_scrap || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this batch line?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingLine(null);
    setFormData({ item_code: '', scheduled_qty: '', qty_processed: '', qty_out_good: '', qty_scrap: '' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Batch Lines</CardTitle>
          <p className="text-sm text-slate-600 mt-1">Enter qty processed for each item</p>
        </div>
        <Button
          onClick={() => {
            setShowAddDialog(true);
            setEditingLine(null);
            setFormData({ item_code: '', scheduled_qty: '', qty_processed: '', qty_out_good: '', qty_scrap: '' });
          }}
          disabled={!hasItemCodes}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Line
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasItemCodes && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No item codes available. Please ensure a standards bundle is assigned to this batch.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search by item code..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              prefix={<Search className="w-4 h-4" />}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead className="text-right">Scheduled Qty</TableHead>
                <TableHead className="text-right">Qty Processed</TableHead>
                <TableHead className="text-right">Qty Out Good</TableHead>
                <TableHead className="text-right">Qty Scrap</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.item_code}</TableCell>
                  <TableCell className="text-right">{line.scheduled_qty || 0}</TableCell>
                  <TableCell className="text-right">{line.qty_processed || 0}</TableCell>
                  <TableCell className="text-right">{line.qty_out_good || 0}</TableCell>
                  <TableCell className="text-right">{line.qty_scrap || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(line)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(line.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLines.length > 0 && (
                <TableRow className="bg-slate-50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.scheduled_qty}</TableCell>
                  <TableCell className="text-right">{totals.qty_processed}</TableCell>
                  <TableCell className="text-right">{totals.qty_out_good}</TableCell>
                  <TableCell className="text-right">{totals.qty_scrap}</TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {filteredLines.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p>No batch lines added yet</p>
          </div>
        )}
      </CardContent>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Edit Batch Line' : 'Add Batch Line'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="item_code">Item Code</Label>
              <Select value={formData.item_code} onValueChange={(val) => setFormData({ ...formData, item_code: val })}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select item code" />
                </SelectTrigger>
                <SelectContent>
                  {itemCodes.map((code) => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scheduled_qty">Scheduled Qty</Label>
              <Input
                type="number"
                value={formData.scheduled_qty}
                onChange={(e) => setFormData({ ...formData, scheduled_qty: e.target.value })}
                placeholder="0"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="qty_processed">Qty Processed</Label>
              <Input
                type="number"
                value={formData.qty_processed}
                onChange={(e) => setFormData({ ...formData, qty_processed: e.target.value })}
                placeholder="0"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="qty_out_good">Qty Out Good</Label>
              <Input
                type="number"
                value={formData.qty_out_good}
                onChange={(e) => setFormData({ ...formData, qty_out_good: e.target.value })}
                placeholder="0"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="qty_scrap">Qty Scrap</Label>
              <Input
                type="number"
                value={formData.qty_scrap}
                onChange={(e) => setFormData({ ...formData, qty_scrap: e.target.value })}
                placeholder="0"
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingLine ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}