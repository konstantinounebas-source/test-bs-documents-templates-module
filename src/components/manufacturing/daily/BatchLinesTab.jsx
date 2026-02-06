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
    staleTime: 0
  });
}

export default function BatchLinesTab({ batchId, department }) {
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
    staleTime: 0
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['Batch_Lines', batchId],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 0
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Batch_Lines.create({
      batch_header_id: batchId,
      ...data
    }),
    onSuccess: async () => {
      await saveACTQtyMetric();
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

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Scheduled Qty</TableHead>
              <TableHead>Qty Processed</TableHead>
              <TableHead>Qty Out Good</TableHead>
              <TableHead>Qty Scrap</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  {searchFilter ? 'No matching batch lines found' : 'No batch lines defined. Click "Add Line" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.item_code}</TableCell>
                  <TableCell>{line.scheduled_qty || 0}</TableCell>
                  <TableCell>{line.qty_processed || 0}</TableCell>
                  <TableCell>{line.qty_out_good || 0}</TableCell>
                  <TableCell>{line.qty_scrap || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(line)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deleteMutation.mutate(line.id)}
                        variant="ghost"
                        size="icon"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowAddDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Edit Batch Line' : 'Add Batch Line'}</DialogTitle>
            <DialogDescription>
              {editingLine ? 'Update production quantities for this item' : 'Add production quantities for an item'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Item Code *</Label>
              <Select value={formData.item_code} onValueChange={(v) => setFormData({ ...formData, item_code: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item code from standards" />
                </SelectTrigger>
                <SelectContent>
                  {itemCodes.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scheduled Qty</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.scheduled_qty}
                  onChange={(e) => setFormData({ ...formData, scheduled_qty: e.target.value })}
                />
              </div>
              <div>
                <Label>Qty Processed</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_processed}
                  onChange={(e) => setFormData({ ...formData, qty_processed: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Qty Out Good</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_out_good}
                  onChange={(e) => setFormData({ ...formData, qty_out_good: e.target.value })}
                />
              </div>
              <div>
                <Label>Qty Scrap</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_scrap}
                  onChange={(e) => setFormData({ ...formData, qty_scrap: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : editingLine ? (
                <Edit2 className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {editingLine ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}