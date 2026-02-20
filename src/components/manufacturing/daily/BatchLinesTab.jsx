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

  // Auto-fill batch lines from scheduled data (only on initial load)
  useMemo(() => {
    if (!batchId || lines.length > 0 || scheduledData.length === 0) return;

    // Create batch lines from scheduled data
    const autoFillLines = scheduledData.map(sd => ({
      batch_header_id: batchId,
      item_code: sd.item_code,
      scheduled_qty: sd.ops_qty,
      qty_processed: 0,
      qty_out_good: 0,
      qty_scrap: 0
    }));

    // Create all lines
    Promise.all(autoFillLines.map(line =>
      base44.entities.Batch_Lines.create(line)
    )).then(() => {
      queryClient.invalidateQueries({ queryKey: ['Batch_Lines', batchId] });
      toast.success(`Auto-filled ${autoFillLines.length} batch lines from schedule`);
    }).catch(() => {
      // Silent fail on auto-fill
    });
  }, [batchId, lines.length, scheduledData, queryClient]);

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
    mutationFn: (data) => base44.entities.Batch_Lines.create({
      batch_header_id: batchId,
      ...data
    }),
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
    onSuccess: async (_, { id, data }) => {
      // Find the updated batch line to get its merged data
      const updatedLine = lines.find(l => l.id === id);
      const mergedLine = updatedLine ? { ...updatedLine, ...data } : null;
      
      // If qty_processed changed, create/update QC and Operations records
      if (mergedLine && selectedBundle) {
        await createOrUpdateQCInitialStock(mergedLine);
        await createOrUpdateOperations(mergedLine);
      }
      
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

  const createOrUpdateQCInitialStock = async (batchLine) => {
    try {
      if (!selectedBundle || !batchLine.qty_processed) return;

      // Fetch QC_Set_Lines from the bundle
      const qcSetLines = await base44.entities.QC_Set_Lines.filter({
        qc_set_id: selectedBundle.qc_set_id,
        item_code: batchLine.item_code
      });

      // Delete existing QC records for this batch line
      const existingQCRecords = await base44.entities.QC_Initial_Stock.filter({
        batch_header_id: batchId,
        item_code: batchLine.item_code
      });
      
      for (const record of existingQCRecords) {
        await base44.entities.QC_Initial_Stock.delete(record.id);
      }

      // Create new QC records based on QC_Set_Lines, scaling by qty_processed
      for (const qcLine of qcSetLines) {
        const qtyAffected = (batchLine.qty_processed || 0);
        await base44.entities.QC_Initial_Stock.create({
          batch_header_id: batchId,
          item_code: batchLine.item_code,
          qc_type: qcLine.qc_type,
          qc_level: qcLine.level,
          qty_affected: qtyAffected
        });
      }

      queryClient.invalidateQueries(['QC_Initial_Stock']);
    } catch (error) {
      console.error('Failed to create/update QC Initial Stock:', error);
    }
  };

  const createOrUpdateOperations = async (batchLine) => {
    try {
      if (!selectedBundle || !batchLine.qty_processed) return;

      // Fetch Profile_Set_Lines from the bundle
      const profileSetLines = await base44.entities.Profile_Set_Lines.filter({
        profile_set_id: selectedBundle.profile_set_id,
        item_code: batchLine.item_code
      });

      // Delete existing Operations records for this batch line
      const existingOpsRecords = await base44.entities.Operations.filter({
        batch_header_id: batchId,
        item_code: batchLine.item_code,
        source_type: 'SCHEDULE'
      });
      
      for (const record of existingOpsRecords) {
        await base44.entities.Operations.delete(record.id);
      }

      // Create new Operations records based on Profile_Set_Lines, scaling by qty_processed
      for (const profileLine of profileSetLines) {
        const qtyOperation = (batchLine.qty_processed || 0);
        await base44.entities.Operations.create({
          batch_header_id: batchId,
          item_code: batchLine.item_code,
          operation: profileLine.profile_name,
          qty_operation: qtyOperation,
          source_type: 'SCHEDULE',
          operation_profile_id: profileLine.id
        });
      }

      queryClient.invalidateQueries(['Operations']);
    } catch (error) {
      console.error('Failed to create/update Operations:', error);
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
      updateMutation.mutate({ id: editingLine.id, data });
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

  const resetForm = () => {
    setFormData({ item_code: '', scheduled_qty: '', qty_processed: '', qty_out_good: '', qty_scrap: '' });
    setEditingLine(null);
    setShowAddDialog(false);
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
      {!hasItemCodes && !itemCodesLoading && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            No item codes found in active standards bundle for this department. Please set up standards first.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">Batch Lines</h3>
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by item code..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm" disabled={!hasItemCodes}>
          <Plus className="w-4 h-4 mr-2" />
          Add Line
        </Button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs font-medium text-blue-900">Total Scheduled Qty</div>
            <div className="text-lg font-bold text-blue-900">{totals.scheduled_qty.toFixed(2)}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-xs font-medium text-purple-900">Total Qty Processed</div>
            <div className="text-lg font-bold text-purple-900">{totals.qty_processed.toFixed(2)}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs font-medium text-green-900">Total Qty Good</div>
            <div className="text-lg font-bold text-green-900">{totals.qty_out_good.toFixed(2)}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-xs font-medium text-red-900">Total Qty Scrap</div>
            <div className="text-lg font-bold text-red-900">{totals.qty_scrap.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-900">Item Code</TableHead>
                <TableHead className="text-right font-semibold text-slate-900">Scheduled Qty</TableHead>
                <TableHead className="text-right font-semibold text-slate-900">Qty Processed</TableHead>
                <TableHead className="text-right font-semibold text-slate-900">Qty Out Good</TableHead>
                <TableHead className="text-right font-semibold text-slate-900">Qty Scrap</TableHead>
                <TableHead className="text-center font-semibold text-slate-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="6" className="text-center py-4 text-slate-500">
                    No batch lines found. Click "Add Line" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLines.map((line) => (
                  <TableRow key={line.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{line.item_code}</TableCell>
                    <TableCell className="text-right">{(line.scheduled_qty || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">{(line.qty_processed || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-700 font-semibold">{(line.qty_out_good || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-red-700 font-semibold">{(line.qty_scrap || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-center flex gap-1 justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(line)}
                        disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(line.id)}
                        disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Edit Batch Line' : 'Add Batch Line'}</DialogTitle>
            <DialogDescription>
              {editingLine ? 'Update the batch line details' : 'Create a new batch line'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="item_code" className="text-sm font-medium">Item Code</Label>
              <Select 
                value={formData.item_code} 
                onValueChange={(value) => setFormData({ ...formData, item_code: value })}
                disabled={!!editingLine}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select item code" />
                </SelectTrigger>
                <SelectContent>
                  {itemCodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scheduled_qty" className="text-sm font-medium">Scheduled Qty</Label>
              <Input
                id="scheduled_qty"
                type="number"
                step="0.01"
                value={formData.scheduled_qty}
                onChange={(e) => setFormData({ ...formData, scheduled_qty: e.target.value })}
                className="mt-1"
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="qty_processed" className="text-sm font-medium">Qty Processed</Label>
              <Input
                id="qty_processed"
                type="number"
                step="0.01"
                value={formData.qty_processed}
                onChange={(e) => setFormData({ ...formData, qty_processed: e.target.value })}
                className="mt-1"
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="qty_out_good" className="text-sm font-medium">Qty Out Good</Label>
              <Input
                id="qty_out_good"
                type="number"
                step="0.01"
                value={formData.qty_out_good}
                onChange={(e) => setFormData({ ...formData, qty_out_good: e.target.value })}
                className="mt-1"
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="qty_scrap" className="text-sm font-medium">Qty Scrap</Label>
              <Input
                id="qty_scrap"
                type="number"
                step="0.01"
                value={formData.qty_scrap}
                onChange={(e) => setFormData({ ...formData, qty_scrap: e.target.value })}
                className="mt-1"
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm} disabled={createMutation.isPending || updateMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdd}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingLine ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}