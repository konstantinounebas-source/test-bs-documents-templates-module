import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Search, AlertCircle, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';


function useBatchItemCodes(batchId, department) {
  return useQuery({
    queryKey: ['BatchItemCodes', batchId, department],
    queryFn: async () => {
      if (!batchId || !department) return [];
      
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

export default function OperationsTab({ batchId, department }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedOperations, setSelectedOperations] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [editingRemakeQty, setEditingRemakeQty] = useState({});
  const [formData, setFormData] = useState({
    item_code: '',
    operation_profile_id: '',
    operation_profile_name: ''
  });

  const { data: itemCodes = [], isLoading: itemCodesLoading } = useBatchItemCodes(batchId, department);
  const hasItemCodes = itemCodes.length > 0;

  const { data: operations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.list(),
    staleTime: Infinity
  });

  const { data: profileNames = [] } = useQuery({
    queryKey: ['OperationProfileName'],
    queryFn: () => base44.entities.OperationProfileName.list(),
    staleTime: Infinity
  });

  const { data: batchHeader } = useQuery({
    queryKey: ['BatchHeader', batchId],
    queryFn: () => base44.entities.BatchHeader.filter({ id: batchId }),
    enabled: !!batchId,
    select: (data) => data?.[0]
  });

  const { data: stdSetLines = [] } = useQuery({
    queryKey: ['StdSetLines', batchHeader?.bundle_id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: batchHeader.bundle_id }),
    enabled: !!batchHeader?.bundle_id,
    staleTime: Infinity
  });

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
    queryKey: ['Operations', batchId],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 30 * 1000
  });

  const operationsForProfile = useMemo(() => {
    if (!formData.operation_profile_id) return [];
    
    const profile = profileNames.find(p => p.id === formData.operation_profile_id);
    if (!profile || !profile.operations_required) return [];
    
    return profile.operations_required
      .map(opId => operations.find(op => op.id === opId))
      .filter(Boolean);
  }, [formData.operation_profile_id, profileNames, operations]);

  // Auto-fill from scheduled data (seed only, once)
  const autoFillDoneRef = React.useRef(false);
  React.useEffect(() => {
    // Guard: only run when all data is ready, lines are empty, and we haven't already run
    if (autoFillDoneRef.current) return;
    if (!batchId || !batchHeader || scheduledData.length === 0) return;
    if (profileNames.length === 0 || operations.length === 0) return;
    if (isLoading) return; // wait until lines are fully loaded
    if (lines.length > 0) {
      autoFillDoneRef.current = true; // already has data, skip
      return;
    }

    autoFillDoneRef.current = true;

    const autoFillPromises = [];

    scheduledData.forEach(sd => {
      const profile = profileNames.find(p => p.id === sd.operation_profile_id);
      if (!profile || !profile.operations_required) return;

      // Use stable groupId based on scheduled data ID - no Date.now()
      const groupId = `schedule-${sd.id}`;
      
      profile.operations_required.forEach(opId => {
        const operation = operations.find(op => op.id === opId);
        if (!operation) return;

        const stdLine = stdSetLines.find(sl => 
          sl.item_code === sd.item_code && 
          sl.operation === operation.name
        );

        const stdMinPc = stdLine?.std_min_per_pc || 0;
        const qty = sd.ops_qty || 0;
        const opTime = qty * stdMinPc;

        autoFillPromises.push(
          base44.entities.Operations.create({
            batch_header_id: batchId,
            item_code: sd.item_code,
            operation: operation.name,
            qty_operation: qty,
            source_type: 'SCHEDULE',
            operation_profile_id: sd.operation_profile_id,
            profile_group_id: groupId,
            std_min_pc_lookup: stdMinPc,
            operation_time_min: opTime
          })
        );
      });
    });

    if (autoFillPromises.length > 0) {
      Promise.all(autoFillPromises)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['Operations', batchId] });
          toast.success(`Auto-filled operations from schedule`);
        })
        .catch(() => {
          // Silent fail
        });
    }
  }, [batchId, batchHeader, isLoading, lines.length, scheduledData, profileNames, operations, stdSetLines, queryClient]);

  // Group operations by item_code and profile_group_id
  const groupedOperations = useMemo(() => {
    const groups = {};
    
    lines.forEach(line => {
      const key = line.item_code;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(line);
    });

    return Object.entries(groups).map(([itemCode, ops]) => {
      // Further group by profile_group_id
      const profileGroups = {};
      ops.forEach(op => {
        const pgId = op.profile_group_id || op.id;
        if (!profileGroups[pgId]) {
          profileGroups[pgId] = [];
        }
        profileGroups[pgId].push(op);
      });

      const subGroups = Object.entries(profileGroups).map(([pgId, groupOps]) => {
        const totalTime = groupOps.reduce((sum, op) => sum + (op.operation_time_min || 0), 0);
        const profile = groupOps[0].operation_profile_id 
          ? profileNames.find(p => p.id === groupOps[0].operation_profile_id) 
          : null;
        
        return {
          profile_group_id: pgId,
          profile_name: profile?.name || 'Manual Entry',
          operations: groupOps,
          total_time: totalTime
        };
      });

      const itemTotalTime = ops.reduce((sum, op) => sum + (op.operation_time_min || 0), 0);

      return {
        item_code: itemCode,
        subGroups,
        total_time: itemTotalTime
      };
    });
  }, [lines, profileNames]);

  const filteredGroups = useMemo(() => {
    if (!searchFilter) return groupedOperations;
    const term = searchFilter.toLowerCase();
    return groupedOperations.filter(g => g.item_code?.toLowerCase().includes(term));
  }, [groupedOperations, searchFilter]);

  const saveOpTimeMetric = async () => {
    try {
      const batchHeader = await base44.entities.BatchHeader.filter({ id: batchId });
      if (!batchHeader || batchHeader.length === 0) return;

      // Fetch fresh operations data from database
      const allOps = await base44.entities.Operations.filter({ batch_header_id: batchId });
      
      // Calculate total from fresh data
      const totalOpTime = allOps.reduce((sum, op) => sum + (op.operation_time_min || 0), 0);
      
      // Calculate REMAKE_QTY and REMAKE_TIME from operations with operation name "Remake"
      const remakeOps = allOps.filter(op => {
        const opName = op.operation || '';
        return opName.toLowerCase().trim() === 'remake';
      });
      
      const totalRemakeQty = remakeOps.reduce((sum, op) => sum + (op.qty_operation || 0), 0);
      const totalRemakeTime = remakeOps.reduce((sum, op) => sum + (op.operation_time_min || 0), 0);

      // Find and update the OP_TIME metric by date and department
      const existingMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'OP_TIME',
        date: batchHeader[0].date,
        department: batchHeader[0].department
      });

      if (existingMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
          value: totalOpTime
        });
      } else {
        await base44.entities.DailyMetricValue.create({
          metric_code: 'OP_TIME',
          date: batchHeader[0].date,
          department: batchHeader[0].department,
          value: totalOpTime
        });
      }

      // Update REMAKE_QTY metric
      const remakeQtyMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'REMAKE_QTY',
        date: batchHeader[0].date,
        department: batchHeader[0].department
      });

      if (remakeQtyMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(remakeQtyMetrics[0].id, {
          value: totalRemakeQty
        });
      } else {
        await base44.entities.DailyMetricValue.create({
          metric_code: 'REMAKE_QTY',
          date: batchHeader[0].date,
          department: batchHeader[0].department,
          value: totalRemakeQty
        });
      }

      // Update Remake_TIME metric (note: case-sensitive)
      const remakeTimeMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'Remake_TIME',
        date: batchHeader[0].date,
        department: batchHeader[0].department
      });

      if (remakeTimeMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(remakeTimeMetrics[0].id, {
          value: totalRemakeTime
        });
      } else {
        await base44.entities.DailyMetricValue.create({
          metric_code: 'Remake_TIME',
          date: batchHeader[0].date,
          department: batchHeader[0].department,
          value: totalRemakeTime
        });
      }

      // Update SBP_TIME (OP_TIME + QC_TIME)
      await saveSBPTimeMetric(batchHeader[0].date, batchHeader[0].department);

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save OP_TIME metric:', error);
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

  const deleteMutation = useMutation({
    mutationFn: async (profile_group_id) => {
      const opsToDelete = lines.filter(l => l.profile_group_id === profile_group_id);
      await Promise.all(opsToDelete.map(op => base44.entities.Operations.delete(op.id)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['Operations']);
      await saveOpTimeMetric();
      toast.success('✓ Operations deleted');
    },
    onError: () => toast.error('Failed to delete operations')
  });

  const handleAdd = async () => {
    if (!formData.item_code || !formData.operation_profile_id) {
      toast.error('Item code and operation profile are required');
      return;
    }

    const selectedOps = Object.entries(selectedOperations)
      .filter(([_, qty]) => qty > 0);
    
    if (selectedOps.length === 0) {
      toast.error('Select at least one operation with quantity');
      return;
    }

    const groupId = editingGroupId || `manual-${Date.now()}`;
    
    if (editingGroupId) {
      // Delete existing operations in this group
      const opsToDelete = lines.filter(l => l.profile_group_id === editingGroupId);
      await Promise.all(opsToDelete.map(op => base44.entities.Operations.delete(op.id)));
    }

    // Create new operations
    const createPromises = selectedOps.map(([opId, qty]) => {
      const operation = operations.find(op => op.id === opId);
      if (!operation) return null;

      const stdLine = stdSetLines.find(sl => 
        sl.item_code === formData.item_code && 
        sl.operation === operation.name
      );

      const stdMinPc = stdLine?.std_min_per_pc || 0;
      const opTime = parseFloat(qty) * stdMinPc;

      return base44.entities.Operations.create({
        batch_header_id: batchId,
        item_code: formData.item_code,
        operation: operation.name,
        qty_operation: parseFloat(qty),
        source_type: 'PROFILE',
        operation_profile_id: formData.operation_profile_id,
        profile_group_id: groupId,
        std_min_pc_lookup: stdMinPc,
        operation_time_min: opTime
      });
    }).filter(Boolean);

    try {
      await Promise.all(createPromises);
      await queryClient.invalidateQueries(['Operations']);
      await saveOpTimeMetric();
      
      // Reset form but keep dialog open for adding more
      setFormData({
        item_code: '',
        operation_profile_id: '',
        operation_profile_name: ''
      });
      setSelectedOperations({});
      setEditingGroupId(null);
      
      toast.success(editingGroupId ? '✓ Operations updated' : '✓ Operations added');
    } catch (error) {
      toast.error('Failed to save operations');
    }
  };

  const handleEdit = (profile_group_id) => {
    const groupOps = lines.filter(l => l.profile_group_id === profile_group_id);
    if (groupOps.length === 0) return;

    const firstOp = groupOps[0];
    setEditingGroupId(profile_group_id);
    setFormData({
      item_code: firstOp.item_code,
      operation_profile_id: firstOp.operation_profile_id || '',
      operation_profile_name: profileNames.find(p => p.id === firstOp.operation_profile_id)?.name || ''
    });

    const opsMap = {};
    groupOps.forEach(op => {
      const operation = operations.find(o => o.name === op.operation);
      if (operation) {
        opsMap[operation.id] = op.qty_operation;
      }
    });
    setSelectedOperations(opsMap);
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({ item_code: '', operation_profile_id: '', operation_profile_name: '' });
    setSelectedOperations({});
    setEditingGroupId(null);
    setShowAddDialog(false);
  };

  const totalOperationsTime = useMemo(() => {
    return lines.reduce((sum, op) => sum + (op.operation_time_min || 0), 0);
  }, [lines]);

  const totalRemakeQty = useMemo(() => {
    const remakeOps = lines.filter(op => {
      const opName = op.operation || '';
      return opName.toLowerCase().trim() === 'remake';
    });
    return remakeOps.reduce((sum, op) => sum + (op.qty_operation || 0), 0);
  }, [lines]);

  const totalRemakeTime = useMemo(() => {
    const remakeOps = lines.filter(op => {
      const opName = op.operation || '';
      return opName.toLowerCase().trim() === 'remake';
    });
    return remakeOps.reduce((sum, op) => sum + (op.operation_time_min || 0), 0);
  }, [lines]);

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
        <h3 className="text-lg font-semibold">Operations</h3>
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
          Add Operations
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">Total Operations Time</span>
            <span className="text-lg font-bold text-blue-900">{totalOperationsTime.toFixed(2)} min ({(totalOperationsTime / 60).toFixed(2)} hrs)</span>
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-orange-900">Total Remake Qty</span>
            <span className="text-lg font-bold text-orange-900">{totalRemakeQty.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-900">Total Remake Time</span>
            <span className="text-lg font-bold text-red-900">{totalRemakeTime.toFixed(2)} min ({(totalRemakeTime / 60).toFixed(2)} hrs)</span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold w-12"></TableHead>
              <TableHead className="font-semibold w-32">Item Code</TableHead>
              <TableHead className="font-semibold">Profile</TableHead>
              <TableHead className="font-semibold w-32 text-right">Qty</TableHead>
              <TableHead className="font-semibold w-32 text-right">Remake Qty</TableHead>
              <TableHead className="font-semibold w-40 text-right">Total Time (min)</TableHead>
              <TableHead className="font-semibold w-32 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-12">
                  {searchFilter ? 'No matching operations found' : 'No operations defined. Click "Add Operations" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredGroups.map(group => (
                  <React.Fragment key={group.item_code}>
                    <TableRow 
                      className="hover:bg-slate-50 bg-slate-100 font-semibold cursor-pointer"
                      onClick={() => setExpandedItems(prev => ({ ...prev, [group.item_code]: !prev[group.item_code] }))}
                    >
                      <TableCell className="w-12">
                        {expandedItems[group.item_code] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-bold">{group.item_code}</TableCell>
                      <TableCell className="text-slate-600">{group.subGroups.length} profile(s)</TableCell>
                      <TableCell className="font-mono font-bold text-right">
                        {group.subGroups.reduce((sum, sg) => sum + sg.operations.reduce((s, o) => s + (o.qty_operation || 0), 0), 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-right text-orange-700">
                        {group.subGroups.reduce((sum, sg) => sum + sg.operations.filter(o => (o.operation || '').toLowerCase().trim() === 'remake').reduce((s, o) => s + (o.qty_operation || 0), 0), 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-right">{group.total_time.toFixed(2)}</TableCell>
                      <TableCell className="text-center"></TableCell>
                    </TableRow>
                    {expandedItems[group.item_code] && group.subGroups.map(subGroup => (
                      <React.Fragment key={subGroup.profile_group_id}>
                        <TableRow className="bg-purple-50">
                          <TableCell className="w-12"></TableCell>
                          <TableCell className="font-semibold text-purple-800 pl-6">
                            {subGroup.profile_name}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-right text-purple-900">
                            {subGroup.operations.reduce((s, o) => s + (o.qty_operation || 0), 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-right text-orange-700">
                            {subGroup.operations.filter(o => (o.operation || '').toLowerCase().trim() === 'remake').reduce((s, o) => s + (o.qty_operation || 0), 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-right text-purple-900">{subGroup.total_time.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(subGroup.profile_group_id);
                                }}
                                className="h-8 w-8"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(subGroup.profile_group_id);
                                }}
                                variant="ghost"
                                size="icon"
                                disabled={deleteMutation.isPending}
                                className="h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {subGroup.operations.map(op => {
                        console.log('Operation:', {
                          operation: op.operation,
                          qty: op.qty_operation,
                          remake_qty: op.remake_qty,
                          std_min_pc: op.std_min_pc_lookup,
                          time_min: op.operation_time_min,
                          calculated: (op.qty_operation || 0) * (op.std_min_pc_lookup || 0)
                        });
                        return (
                          <TableRow key={op.id} className="hover:bg-slate-50">
                            <TableCell className="w-12"></TableCell>
                            <TableCell className="pl-12 text-slate-700">
                              <span className="text-slate-400">↳</span> {op.operation}
                              <span className="text-xs text-slate-400 ml-2">
                                (std: {op.std_min_pc_lookup?.toFixed(3) || '0.000'} min/pc)
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-slate-600 text-right">
                              <span className="font-semibold">{op.qty_operation}</span>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-orange-700 text-right">
                              {(op.operation || '').toLowerCase().trim() === 'remake' ? (
                                <span className="font-semibold">{op.qty_operation || 0}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm font-medium text-right">{op.operation_time_min?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell className="text-center"></TableCell>
                          </TableRow>
                        );
                        })}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowAddDialog(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingGroupId ? 'Edit Operations' : 'Add Operations'}</DialogTitle>
            <DialogDescription>
              {editingGroupId ? 'Update operations for this item' : 'Select profile and operations to add'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Item Code *</Label>
              <Select 
                value={formData.item_code} 
                onValueChange={(v) => setFormData({ ...formData, item_code: v })}
                disabled={!!editingGroupId}
              >
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
              <Label>Operation Profile *</Label>
              <Select 
                value={formData.operation_profile_id} 
                onValueChange={(v) => {
                  const profile = profileNames.find(p => p.id === v);
                  setFormData({ 
                    ...formData, 
                    operation_profile_id: v,
                    operation_profile_name: profile?.name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  {profileNames.map(pn => (
                    <SelectItem key={pn.id} value={pn.id}>{pn.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.operation_profile_id && (
              <div>
                <Label>Select Operations & Quantities *</Label>
                <p className="text-sm text-slate-500 mb-2">Check operations and enter quantities</p>
                {/* DEBUG INFO */}
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs space-y-1">
                  <div><strong>Debug:</strong> Item Code: {formData.item_code}, StdSetLines count: {stdSetLines.length}, Bundle ID: {batchHeader?.bundle_id}</div>
                  <div>Available item_codes: {[...new Set(stdSetLines.map(s => s.item_code))].join(', ')}</div>
                  <div>Operations for {formData.item_code}: {stdSetLines.filter(s => s.item_code === formData.item_code).map(s => `${s.operation} (${s.std_min_per_pc} min/pc)`).join(', ')}</div>
                </div>
                <div className="border rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
                  {operationsForProfile.length === 0 ? (
                    <p className="text-sm text-slate-500">No operations in this profile</p>
                  ) : (
                    <div className="space-y-3">
                      {operationsForProfile.map(op => {
                        const stdLine = stdSetLines.find(sl => 
                          sl.item_code === formData.item_code && 
                          sl.operation === op.name
                        );
                        const stdMinPc = stdLine?.std_min_per_pc || 0;
                        const qty = selectedOperations[op.id] || 0;
                        const opTime = qty * stdMinPc;

                        console.log('Looking for std time:', {
                          item_code: formData.item_code,
                          operation: op.name,
                          found: !!stdLine,
                          stdMinPc,
                          stdLine
                        });

                        return (
                          <div key={op.id} className="flex items-center gap-3 p-3 bg-white rounded border">
                            <Checkbox
                              checked={selectedOperations[op.id] > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedOperations(prev => ({ ...prev, [op.id]: 1 }));
                                } else {
                                  const { [op.id]: _, ...rest } = selectedOperations;
                                  setSelectedOperations(rest);
                                }
                              }}
                              id={`op-${op.id}`}
                            />
                            <label htmlFor={`op-${op.id}`} className="text-sm font-medium cursor-pointer flex-1">
                              {op.name}
                              {!stdLine && <span className="text-red-500 text-xs ml-2">(⚠ No std time found)</span>}
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={selectedOperations[op.id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    setSelectedOperations(prev => ({ ...prev, [op.id]: parseFloat(val) || 0 }));
                                  } else {
                                    const { [op.id]: _, ...rest } = selectedOperations;
                                    setSelectedOperations(rest);
                                  }
                                }}
                                disabled={!selectedOperations[op.id]}
                                placeholder="Qty"
                                className="w-24 h-9"
                              />
                              <span className="text-xs text-slate-500 w-32">
                                {stdMinPc.toFixed(3)} min/pc
                              </span>
                              <span className="text-sm font-semibold text-blue-700 w-24 text-right">
                                {opTime.toFixed(2)} min
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAdd}>
              {editingGroupId ? (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Update
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}