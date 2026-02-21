import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Search, AlertCircle, Edit2, RefreshCw } from 'lucide-react';
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

export default function QCInitialStockTab({ batchId, department }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [itemQuantities, setItemQuantities] = useState({});
  const [formData, setFormData] = useState({
    qc_type: '',
    qc_level: ''
  });

  const { data: itemCodes = [], isLoading: itemCodesLoading } = useBatchItemCodes(batchId, department);
  const hasItemCodes = itemCodes.length > 0;

  const { data: qcTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.list(),
    staleTime: Infinity
  });

  const { data: qcLevels = [] } = useQuery({
    queryKey: ['QCLevel'],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true }),
    staleTime: Infinity
  });

  // Fetch batch header to get date and department for scheduled data lookup
  const { data: batchHeader } = useQuery({
    queryKey: ['BatchHeader', batchId],
    queryFn: async () => {
      const result = await base44.entities.BatchHeader.filter({ id: batchId });
      return result;
    },
    enabled: !!batchId,
    select: (data) => data?.[0],
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

  // Fetch scheduled data for auto-filling QC records
  const { data: scheduledData = [] } = useQuery({
    queryKey: ['ScheduledData', batchHeader?.date, batchHeader?.department],
    queryFn: () => base44.entities.ScheduledData.filter({
      date: batchHeader.date,
      department_id: batchHeader.department
    }),
    enabled: !!batchHeader?.date && !!batchHeader?.department,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['QC_Initial_Stock', batchId],
    queryFn: () => base44.entities.QC_Initial_Stock.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Fetch batch lines for qty_processed validation
  const { data: batchLines = [] } = useQuery({
    queryKey: ['Batch_Lines', batchId],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // qty_processed for item in dialog
  const selectedItemQtyProcessed = useMemo(() => {
    if (!formData.item_code) return null;
    const bl = batchLines.find(l => l.item_code === formData.item_code);
    return bl?.qty_processed ?? null;
  }, [formData.item_code, batchLines]);

  // Fetch QC rules from bundle for calculated extra time
  const { data: qcSetLines = [] } = useQuery({
    queryKey: ['QCSetLines', batchHeader?.bundle_id],
    queryFn: () => base44.entities.QCSetLines.filter({ bundle_id: batchHeader.bundle_id }),
    enabled: !!batchHeader?.bundle_id,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

  // Add QC per-piece to each line
  const linesWithQCPerPiece = useMemo(() => {
    return lines.map(line => {
      const trimmedItemCode = (line.item_code || '').trim().toLowerCase();
      const qcRule = qcSetLines.find(ql => {
        const qlItemCode = (ql.data?.item_code || ql.item_code || '').trim().toLowerCase();
        const qlQcType = ql.data?.qc_type || ql.qc_type;
        const qlQcLevel = ql.data?.qc_level || ql.qc_level;
        return qlItemCode === trimmedItemCode && qlQcType === line.qc_type && qlQcLevel === line.qc_level;
      });
      const extraTime = qcRule?.calculated_extra_time_min ?? qcRule?.calculated_extra_time ?? 0;
      return { ...line, qcPerPiece: parseFloat(extraTime || 0).toFixed(2) };
    });
  }, [lines, qcSetLines]);

  const filteredLines = useMemo(() => {
    if (!searchFilter) return linesWithQCPerPiece;
    const term = searchFilter.toLowerCase();
    return linesWithQCPerPiece.filter(l => l.item_code?.toLowerCase().includes(term));
  }, [linesWithQCPerPiece, searchFilter]);

  // Calculate total QC time
  const totalQCTime = useMemo(() => {
    const totalMin = filteredLines.reduce((sum, line) => {
      const qcTime = parseFloat(line.qcPerPiece) || 0;
      const qty = parseFloat(line.qty_affected) || 0;
      return sum + (qcTime * qty);
    }, 0);
    return {
      minutes: totalMin.toFixed(2),
      hours: (totalMin / 60).toFixed(2)
    };
  }, [filteredLines]);

  const saveQCTimeMetric = async () => {
    try {
      const batchHeader = await base44.entities.BatchHeader.filter({ id: batchId });
      if (!batchHeader || batchHeader.length === 0) return;

      // Fetch fresh QC data from database
      const allQC = await base44.entities.QC_Initial_Stock.filter({ batch_header_id: batchId });
      
      // Fetch fresh QC set lines for calculations
      const freshQCSetLines = await base44.entities.QCSetLines.filter({ bundle_id: batchHeader[0].bundle_id });
      
      // Calculate total QC time from fresh data
      const totalQCMin = allQC.reduce((sum, line) => {
        const trimmedItemCode = (line.item_code || '').trim();
        
        const qcRule = freshQCSetLines.find(
          ql => {
            const qlItemCode = (ql.data?.item_code || ql.item_code || '').trim().toLowerCase();
            const qlQcType = ql.data?.qc_type || ql.qc_type;
            const qlQcLevel = ql.data?.qc_level || ql.qc_level;
            
            return qlItemCode === trimmedItemCode.toLowerCase() &&
                   qlQcType === line.qc_type &&
                   qlQcLevel === line.qc_level;
          }
        );
        
        let qcPerPiece = 0;
        if (qcRule) {
          const extraTime = qcRule.data?.calculated_extra_time_min || qcRule.calculated_extra_time_min || qcRule.calculated_extra_time;
          if (extraTime) {
            qcPerPiece = parseFloat(extraTime);
          }
        }
        
        const qty = parseFloat(line.qty_affected) || 0;
        return sum + (qcPerPiece * qty);
      }, 0);

      // Find and update the QC_TIME metric by date and department
      const existingMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'QC_TIME',
        date: batchHeader[0].date,
        department: batchHeader[0].department
      });

      if (existingMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
          value: totalQCMin
        });
      }

      // Update SBP_TIME (OP_TIME + QC_TIME)
      await saveSBPTimeMetric(batchHeader[0].date, batchHeader[0].department);

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save QC_TIME metric:', error);
    }
  };

  const saveSBPTimeMetric = async (date, department) => {
    try {
      // Fetch OP_TIME and QC_TIME metrics
      const opTimeMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'OP_TIME',
        date: date,
        department: department
      });
      
      const qcTimeMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'QC_TIME',
        date: date,
        department: department
      });

      const opTimeValue = opTimeMetrics.length > 0 ? (opTimeMetrics[0].value || 0) : 0;
      const qcTimeValue = qcTimeMetrics.length > 0 ? (qcTimeMetrics[0].value || 0) : 0;
      const sbpTimeValue = opTimeValue + qcTimeValue;

      // Find and update the SBP_TIME metric
      const existingSBPMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'SBP_TIME',
        date: date,
        department: department
      });

      if (existingSBPMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(existingSBPMetrics[0].id, {
          value: sbpTimeValue
        });
      }
    } catch (error) {
      console.error('Failed to save SBP_TIME metric:', error);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.QC_Initial_Stock.create({
      batch_header_id: batchId,
      ...data
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      await queryClient.refetchQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      await saveQCTimeMetric();
      setShowAddDialog(false);
      setFormData({ item_code: '', qc_type: '', qc_level: '', qty_affected: '' });
      toast.success('✓ QC Initial Stock added');
    },
    onError: () => toast.error('Failed to add QC initial stock')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QC_Initial_Stock.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      await queryClient.refetchQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      await saveQCTimeMetric();
      setShowAddDialog(false);
      setEditingLine(null);
      setFormData({ item_code: '', qc_type: '', qc_level: '', qty_affected: '' });
      toast.success('✓ QC Initial Stock updated');
    },
    onError: () => toast.error('Failed to update QC initial stock')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.QC_Initial_Stock.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      await queryClient.refetchQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      await saveQCTimeMetric();
      toast.success('QC initial stock deleted');
    },
    onError: () => toast.error('Failed to delete QC initial stock')
  });

  // Qty validation helper for an item
  const isQtyOverLimit = (itemCode, qty) => {
    const bl = batchLines.find(l => l.item_code === itemCode);
    return bl && parseFloat(qty) > bl.qty_processed;
  };

  const handleSyncFromBatchLines = async () => {
    if (!batchId || !batchHeader) return;
    setIsSyncing(true);
    try {
      // Only sync item codes that appear in ScheduledData with a qc_type set
      const schedItemsWithQC = scheduledData.filter(sd => sd.qc_type && sd.qc_qty > 0);

      if (schedItemsWithQC.length === 0) {
        toast.info('No scheduled QC entries found for this batch');
        setIsSyncing(false);
        return;
      }

      let created = 0;
      let skipped = 0;

      for (const sd of schedItemsWithQC) {
        // Check if a QC record already exists for this item+qc_type combination
        const existing = lines.filter(l => l.item_code === sd.item_code && l.qc_type === sd.qc_type);
        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Use qty_processed from batch line as qty_affected; fallback to qc_qty from schedule
        const bl = batchLines.find(l => l.item_code === sd.item_code);
        const qty = bl?.qty_processed ?? sd.qc_qty ?? 0;

        await base44.entities.QC_Initial_Stock.create({
          batch_header_id: batchId,
          item_code: sd.item_code,
          qc_type: sd.qc_type,
          qc_level: sd.qc_level || '',
          qty_affected: qty
        });
        created++;
      }

      await queryClient.invalidateQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      await queryClient.refetchQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      await saveQCTimeMetric();

      if (created > 0) {
        toast.success(`Synced ${created} QC record(s)${skipped > 0 ? ` (${skipped} skipped - already exist)` : ''}`);
      } else {
        toast.info(`All QC records already exist (${skipped} skipped)`);
      }
    } catch (err) {
      toast.error('Sync failed');
    }
    setIsSyncing(false);
  };

  const handleAdd = async () => {
    if (!formData.qc_type || !formData.qc_level) {
      toast.error('QC Type and QC Level are required');
      return;
    }
    if (selectedItems.size === 0) {
      toast.error('Select at least one item code');
      return;
    }

    // Validate all quantities
    const selectedArray = Array.from(selectedItems);
    for (const itemCode of selectedArray) {
      const qty = itemQuantities[itemCode];
      if (!qty || parseFloat(qty) === 0) {
        toast.error(`Quantity required for ${itemCode}`);
        return;
      }
      if (isQtyOverLimit(itemCode, qty)) {
        const bl = batchLines.find(l => l.item_code === itemCode);
        toast.error(`${itemCode}: Qty exceeds qty processed (${bl?.qty_processed})`);
        return;
      }
    }

    if (editingLine) {
      // For editing, just update the one line
      const data = {
        qc_type: formData.qc_type,
        qc_level: formData.qc_level,
        qty_affected: parseFloat(itemQuantities[editingLine.item_code])
      };
      updateMutation.mutate({ id: editingLine.id, data });
    } else {
      // Create multiple records at once
      for (const itemCode of selectedArray) {
        await base44.entities.QC_Initial_Stock.create({
          batch_header_id: batchId,
          item_code: itemCode,
          qc_type: formData.qc_type,
          qc_level: formData.qc_level,
          qty_affected: parseFloat(itemQuantities[itemCode])
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      await queryClient.refetchQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      await saveQCTimeMetric();
      resetForm();
      toast.success(`✓ QC Initial Stock added for ${selectedArray.length} item(s)`);
    }
  };

  const handleEdit = (line) => {
    setEditingLine(line);
    setFormData({
      qc_type: line.qc_type,
      qc_level: line.qc_level
    });
    setSelectedItems(new Set([line.item_code]));
    setItemQuantities({ [line.item_code]: line.qty_affected });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({ qc_type: '', qc_level: '' });
    setSelectedItems(new Set());
    setItemQuantities({});
    setEditingLine(null);
    setShowAddDialog(false);
  };

  const toggleItemSelection = (itemCode) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(itemCode)) {
      newSet.delete(itemCode);
      const newQtys = { ...itemQuantities };
      delete newQtys[itemCode];
      setItemQuantities(newQtys);
    } else {
      newSet.add(itemCode);
      const bl = batchLines.find(l => l.item_code === itemCode);
      setItemQuantities(prev => ({ ...prev, [itemCode]: bl?.qty_processed || '' }));
    }
    setSelectedItems(newSet);
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
            No item codes found in active standards bundle for this department.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">QC Initial Stock</h3>
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
        <div className="flex gap-2">
          <Button onClick={handleSyncFromBatchLines} variant="outline" size="sm" disabled={isSyncing}>
            {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync from Schedule
          </Button>
          <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm" disabled={!hasItemCodes}>
            <Plus className="w-4 h-4 mr-2" />
            Add QC Stock
          </Button>
        </div>
      </div>

      {filteredLines.length > 0 && (
        <div className="border rounded-lg bg-blue-50 p-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-700">Total QC Time</span>
            <span className="text-lg font-bold text-blue-700">
              {totalQCTime.minutes} min ({totalQCTime.hours} hrs)
            </span>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold">QC Type</TableHead>
              <TableHead className="font-semibold">QC Level</TableHead>
              <TableHead className="font-semibold text-right">QC Per-piece (min)</TableHead>
              <TableHead className="font-semibold">Qty Affected</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-12">
                  {searchFilter ? 'No matching QC records found' : 'No QC initial stock defined. Click "Add QC Stock" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredLines.map(line => (
                  <TableRow key={line.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{line.item_code}</TableCell>
                    <TableCell>{line.qc_type}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm font-medium">
                        {line.qc_level}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-right">{line.qcPerPiece}</TableCell>
                    <TableCell className="font-mono">{line.qty_affected}</TableCell>
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
                ))}
                <TableRow className="bg-blue-50 font-semibold border-t-2">
                  <TableCell colSpan={3} className="text-right">Total:</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="font-mono font-bold">
                    {filteredLines.reduce((sum, line) => sum + (parseFloat(line.qty_affected) || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </>
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
            <DialogTitle>{editingLine ? 'Edit QC Initial Stock' : 'Add QC Initial Stock'}</DialogTitle>
            <DialogDescription>
              {editingLine ? 'Update initial QC stock for this item' : 'Record initial QC stock for an item'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Item Code *{selectedItemQtyProcessed !== null && <span className="text-slate-500 font-normal ml-2">(Qty Processed: <strong>{selectedItemQtyProcessed}</strong>)</span>}</Label>
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

            <div>
              <Label>QC Type *</Label>
              <Select value={formData.qc_type} onValueChange={(v) => setFormData({ ...formData, qc_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select QC type" />
                </SelectTrigger>
                <SelectContent>
                  {qcTypes.map(qt => (
                    <SelectItem key={qt.id} value={qt.name}>{qt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>QC Level *</Label>
                <Select value={formData.qc_level} onValueChange={(v) => setFormData({ ...formData, qc_level: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcLevels.map(ql => (
                      <SelectItem key={ql.id} value={ql.name}>{ql.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Qty Affected *</Label>
                <Input
                  type="number"
                  step="0.01"
                  max={selectedItemQtyProcessed ?? undefined}
                  value={formData.qty_affected}
                  onChange={(e) => setFormData({ ...formData, qty_affected: e.target.value })}
                  className={isQtyOverLimit(formData.qty_affected) ? 'border-red-500 bg-red-50' : ''}
                />
                {isQtyOverLimit(formData.qty_affected) && (
                  <p className="text-xs text-red-500 mt-1">Exceeds qty processed ({selectedItemQtyProcessed})</p>
                )}
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