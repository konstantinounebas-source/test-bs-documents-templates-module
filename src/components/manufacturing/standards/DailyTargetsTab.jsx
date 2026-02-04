import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DailyTargetsTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();

  // State
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddTargetDialog, setShowAddTargetDialog] = useState(false);
  const [showAssigned, setShowAssigned] = useState(true);
  const [filterItemCode, setFilterItemCode] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterTargetType, setFilterTargetType] = useState('');

  // Form state for adding target
  const [formDate, setFormDate] = useState('');
  const [formTargetType, setFormTargetType] = useState('');
  const [formItemCode, setFormItemCode] = useState('');
  const [formTargetQty, setFormTargetQty] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Fetch Target Types
  const { data: targetTypes = [] } = useQuery({
    queryKey: ['TargetType', bundle?.id],
    queryFn: () => base44.entities.TargetType.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Fetch Daily Target Lines
  const { data: dailyTargets = [] } = useQuery({
    queryKey: ['DailyTargetLines', bundle?.id],
    queryFn: () => base44.entities.DailyTargetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Fetch Operations
  const { data: allOperations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.filter({ is_active: true })
  });
  const operations = allOperations
    .filter(op => op.is_allowed !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .slice(0, 10);

  // Fetch DATA from StdSetLines
  const { data: stdLines = [] } = useQuery({
    queryKey: ['StdSetLines', bundle?.id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Extract unique item codes from DATA
  const itemCodesFromData = useMemo(() => {
    return [...new Set(stdLines.map(line => line.item_code).filter(Boolean))];
  }, [stdLines]);

  // Build map: item_code -> { operation -> std_min_per_pc }
  const itemOperationMap = useMemo(() => {
    const map = {};
    stdLines.forEach(line => {
      if (!line.item_code) return;
      if (!map[line.item_code]) map[line.item_code] = {};
      map[line.item_code][line.operation] = line.std_min_per_pc || 0;
    });
    return map;
  }, [stdLines]);

  // Assigned items map: item_code -> target_type
  const assignedItems = useMemo(() => {
    const map = {};
    dailyTargets.forEach(dt => {
      if (!map[dt.item_code]) {
        map[dt.item_code] = dt.target_type;
      }
    });
    return map;
  }, [dailyTargets]);

  // Item codes available for selection
  const availableItemCodes = useMemo(() => {
    return itemCodesFromData.map(ic => {
      const assignedTo = assignedItems[ic];
      return {
        value: ic,
        label: assignedTo ? `${ic} (Assigned to ${assignedTo})` : ic,
        disabled: !!assignedTo
      };
    });
  }, [itemCodesFromData, assignedItems]);

  // Filter available items
  const filteredAvailableItems = useMemo(() => {
    if (showAssigned) return availableItemCodes;
    return availableItemCodes.filter(item => !item.disabled);
  }, [availableItemCodes, showAssigned]);

  // Filtered daily targets
  const filteredDailyTargets = useMemo(() => {
    return dailyTargets.filter(dt => {
      if (filterItemCode && !dt.item_code.toLowerCase().includes(filterItemCode.toLowerCase())) return false;
      if (filterDate && dt.date !== filterDate) return false;
      if (filterTargetType && dt.target_type !== filterTargetType) return false;
      return true;
    });
  }, [dailyTargets, filterItemCode, filterDate, filterTargetType]);

  // Calculate summaries per Target Type
  const targetTypeSummaries = useMemo(() => {
    const summaries = {};

    targetTypes.forEach(tt => {
      const targets = dailyTargets.filter(dt => dt.target_type === tt.name);
      const operationTotals = {};
      let totalMinutes = 0;

      targets.forEach(dt => {
        const itemOps = itemOperationMap[dt.item_code] || {};
        operations.forEach(op => {
          const opMinutes = (itemOps[op.name] || 0) * dt.target_qty;
          operationTotals[op.name] = (operationTotals[op.name] || 0) + opMinutes;
          totalMinutes += opMinutes;
        });
      });

      const breakdown = operations.map(op => ({
        name: op.name,
        minutes: operationTotals[op.name] || 0,
        percent: totalMinutes > 0 ? ((operationTotals[op.name] || 0) / totalMinutes * 100).toFixed(2) : 0
      }));

      summaries[tt.name] = { totalMinutes, breakdown };
    });

    return summaries;
  }, [targetTypes, dailyTargets, itemOperationMap, operations]);

  // Mutations
  const createTargetTypeMutation = useMutation({
    mutationFn: (data) => base44.entities.TargetType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['TargetType']);
      toast.success('Target Type created');
      setShowAddTypeDialog(false);
      setNewTypeName('');
    },
    onError: (err) => toast.error('Failed to create Target Type: ' + err.message)
  });

  const deleteTargetTypeMutation = useMutation({
    mutationFn: (id) => base44.entities.TargetType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['TargetType']);
      toast.success('Target Type deleted');
    },
    onError: (err) => toast.error('Failed to delete Target Type: ' + err.message)
  });

  const createDailyTargetMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyTargetLines.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['DailyTargetLines']);
      toast.success('Daily Target added');
      setShowAddTargetDialog(false);
      resetForm();
    },
    onError: (err) => toast.error('Failed to add Daily Target: ' + err.message)
  });

  const deleteDailyTargetMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyTargetLines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['DailyTargetLines']);
      toast.success('Daily Target deleted');
    },
    onError: (err) => toast.error('Failed to delete Daily Target: ' + err.message)
  });

  const resetForm = () => {
    setFormDate('');
    setFormTargetType('');
    setFormItemCode('');
    setFormTargetQty('');
    setFormNotes('');
  };

  const handleAddTargetType = () => {
    if (!newTypeName.trim()) {
      toast.error('Target Type name is required');
      return;
    }
    if (targetTypes.length >= 10) {
      toast.error('Maximum 10 Target Types per bundle');
      return;
    }
    createTargetTypeMutation.mutate({ bundle_id: bundle.id, name: newTypeName.trim() });
  };

  const handleAddDailyTarget = () => {
    if (!formDate || !formTargetType || !formItemCode || formTargetQty === '' || parseFloat(formTargetQty) < 0) {
      toast.error('Date, Target Type, Item Code, and Target Quantity (≥0) are required');
      return;
    }
    // Server-side validation will block if item already assigned to another target type
    createDailyTargetMutation.mutate({
      bundle_id: bundle.id,
      date: formDate,
      target_type: formTargetType,
      item_code: formItemCode,
      target_qty: parseFloat(formTargetQty),
      notes: formNotes
    });
  };

  if (!bundle) {
    return <Alert><AlertCircle className="w-4 h-4" /><AlertDescription>No bundle selected</AlertDescription></Alert>;
  }

  if (itemCodesFromData.length === 0) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>Define Item Codes in DATA tab first.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Target Types Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Target Types
            {isEditable && (
              <Button onClick={() => setShowAddTypeDialog(true)} size="sm" disabled={targetTypes.length >= 10}>
                <Plus className="w-4 h-4 mr-2" />
                Add Target Type ({targetTypes.length}/10)
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {targetTypes.map(tt => (
              <Badge key={tt.id} variant="secondary" className="text-sm px-3 py-1">
                {tt.name}
                {isEditable && (
                  <Trash2
                    className="w-3 h-3 ml-2 cursor-pointer text-red-600 hover:text-red-800"
                    onClick={() => {
                      if (confirm(`Delete Target Type "${tt.name}"?`)) {
                        deleteTargetTypeMutation.mutate(tt.id);
                      }
                    }}
                  />
                )}
              </Badge>
            ))}
            {targetTypes.length === 0 && <p className="text-sm text-slate-500">No Target Types defined yet.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Target Type Summaries */}
      {targetTypes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {targetTypes.map(tt => {
            const summary = targetTypeSummaries[tt.name] || { totalMinutes: 0, breakdown: [] };
            return (
              <Card key={tt.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                    {tt.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Minutes:</span>
                      <span>{summary.totalMinutes.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      {summary.breakdown.map(op => (
                        <div key={op.name} className="flex justify-between">
                          <span>{op.name}:</span>
                          <span>{op.minutes.toFixed(2)} min ({op.percent}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Daily Targets Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Daily Targets
            {isEditable && targetTypes.length > 0 && (
              <Button onClick={() => setShowAddTargetDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Daily Target
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Item Code</Label>
              <Input placeholder="Filter by item..." value={filterItemCode} onChange={(e) => setFilterItemCode(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
            <div>
              <Label>Target Type</Label>
              <Select value={filterTargetType} onValueChange={setFilterTargetType}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All</SelectItem>
                  {targetTypes.map(tt => (
                    <SelectItem key={tt.id} value={tt.name}>{tt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Target Qty</TableHead>
                  <TableHead>Notes</TableHead>
                  {isEditable && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDailyTargets.map(dt => (
                  <TableRow key={dt.id}>
                    <TableCell>{format(new Date(dt.date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell><Badge variant="outline">{dt.target_type}</Badge></TableCell>
                    <TableCell>{dt.item_code}</TableCell>
                    <TableCell>{dt.target_qty}</TableCell>
                    <TableCell className="text-sm text-slate-600">{dt.notes || '—'}</TableCell>
                    {isEditable && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this target?')) {
                              deleteDailyTargetMutation.mutate(dt.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {filteredDailyTargets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isEditable ? 6 : 5} className="text-center text-slate-500">
                      No daily targets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Target Type Dialog */}
      <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Target Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Target Type Name *</Label>
              <Input
                placeholder="e.g., Production Line A"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTypeDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTargetType}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Daily Target Dialog */}
      <Dialog open={showAddTargetDialog} onOpenChange={setShowAddTargetDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Daily Target</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div>
                <Label>Target Type *</Label>
                <Select value={formTargetType} onValueChange={setFormTargetType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetTypes.map(tt => (
                      <SelectItem key={tt.id} value={tt.name}>{tt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox id="showAssigned" checked={showAssigned} onCheckedChange={setShowAssigned} />
                <Label htmlFor="showAssigned" className="text-sm">Show assigned items</Label>
              </div>
              <Label>Item Code *</Label>
              <Select value={formItemCode} onValueChange={setFormItemCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAvailableItems.map(item => (
                    <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Quantity *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formTargetQty}
                onChange={(e) => setFormTargetQty(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTargetDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDailyTarget}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}