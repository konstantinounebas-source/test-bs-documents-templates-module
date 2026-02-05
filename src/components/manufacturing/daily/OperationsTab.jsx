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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
    staleTime: 0
  });
}

export default function OperationsTab({ batchId, department }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedOperations, setSelectedOperations] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [formData, setFormData] = useState({
    item_code: '',
    operation_profile_id: '',
    operation_profile_name: ''
  });

  const { data: itemCodes = [], isLoading: itemCodesLoading } = useBatchItemCodes(batchId, department);
  const hasItemCodes = itemCodes.length > 0;

  const { data: operations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.list()
  });

  const { data: profileNames = [] } = useQuery({
    queryKey: ['OperationProfileName'],
    queryFn: () => base44.entities.OperationProfileName.list()
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
    staleTime: 0
  });

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
    queryKey: ['Operations', batchId],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 0
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
  useMemo(() => {
    if (!batchId || !batchHeader || lines.length > 0 || scheduledData.length === 0) return;

    const autoFillPromises = [];

    scheduledData.forEach(sd => {
      const profile = profileNames.find(p => p.id === sd.operation_profile_id);
      if (!profile || !profile.operations_required) return;

      const groupId = `schedule-${sd.item_code}-${Date.now()}`;
      
      profile.operations_required.forEach(opId => {
        const operation = operations.find(op => op.id === opId);
        if (!operation) return;

        const stdLine = stdSetLines.find(sl => 
          sl.item_code === sd.item_code && 
          sl.operation === operation.name
        );

        const stdMinPc = stdLine?.time_min_pc || 0;
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
  }, [batchId, batchHeader, lines.length, scheduledData, profileNames, operations, stdSetLines, queryClient]);

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

  const deleteMutation = useMutation({
    mutationFn: async (profile_group_id) => {
      const opsToDelete = lines.filter(l => l.profile_group_id === profile_group_id);
      await Promise.all(opsToDelete.map(op => base44.entities.Operations.delete(op.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['Operations']);
      toast.success('Operations deleted');
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

      const stdMinPc = stdLine?.time_min_pc || 0;
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
      queryClient.invalidateQueries(['Operations']);
      setShowAddDialog(false);
      resetForm();
      toast.success(editingGroupId ? 'Operations updated' : 'Operations added');
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">Total Operations Time</span>
          <span className="text-lg font-bold text-blue-900">{totalOperationsTime.toFixed(2)} min ({(totalOperationsTime / 60).toFixed(2)} hrs)</span>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold w-12"></TableHead>
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold">Profile</TableHead>
              <TableHead className="font-semibold">Total Time (min)</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-12">
                  {searchFilter ? 'No matching operations found' : 'No operations defined. Click "Add Operations" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredGroups.map(group => (
                  <React.Fragment key={group.item_code}>
                    <Collapsible
                      open={expandedItems[group.item_code]}
                      onOpenChange={(open) => setExpandedItems(prev => ({ ...prev, [group.item_code]: open }))}
                    >
                      <TableRow className="hover:bg-slate-50 bg-slate-100 font-semibold">
                        <CollapsibleTrigger asChild>
                          <TableCell className="cursor-pointer">
                            {expandedItems[group.item_code] ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </TableCell>
                        </CollapsibleTrigger>
                        <TableCell className="font-bold">{group.item_code}</TableCell>
                        <TableCell>{group.subGroups.length} profile(s)</TableCell>
                        <TableCell className="font-mono font-bold">{group.total_time.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <>
                          {group.subGroups.map(subGroup => (
                            <React.Fragment key={subGroup.profile_group_id}>
                              <TableRow className="bg-purple-50">
                                <TableCell></TableCell>
                                <TableCell colSpan={2} className="font-semibold text-purple-800">
                                  {subGroup.profile_name}
                                </TableCell>
                                <TableCell className="font-mono font-semibold">{subGroup.total_time.toFixed(2)}</TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleEdit(subGroup.profile_group_id)}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      onClick={() => deleteMutation.mutate(subGroup.profile_group_id)}
                                      variant="ghost"
                                      size="icon"
                                      disabled={deleteMutation.isPending}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {subGroup.operations.map(op => (
                                <TableRow key={op.id} className="hover:bg-slate-50">
                                  <TableCell></TableCell>
                                  <TableCell className="pl-8">↳ {op.operation}</TableCell>
                                  <TableCell className="font-mono text-sm">Qty: {op.qty_operation}</TableCell>
                                  <TableCell className="font-mono text-sm">{op.operation_time_min?.toFixed(2) || 0}</TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              ))}
                            </React.Fragment>
                          ))}
                        </>
                      </CollapsibleContent>
                    </Collapsible>
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
                        const stdMinPc = stdLine?.time_min_pc || 0;
                        const qty = selectedOperations[op.id] || 0;
                        const opTime = qty * stdMinPc;

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