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
import { Plus, Trash2, AlertCircle, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";

export default function DailyTargetsTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();

  // State
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddTargetDialog, setShowAddTargetDialog] = useState(false);
  const [showAssigned, setShowAssigned] = useState(true);
  const [filterItemCode, setFilterItemCode] = useState('');
  const [filterTargetType, setFilterTargetType] = useState('');

  // Form state for adding target
  const [formTargetType, setFormTargetType] = useState('');
  const [selectedItemCodes, setSelectedItemCodes] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});

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

  // Calculate per-piece totals for each item
  const itemPerPieceTotals = useMemo(() => {
    const totals = {};
    itemCodesFromData.forEach(ic => {
      const itemOps = itemOperationMap[ic] || {};
      let total = 0;
      operations.forEach(op => {
        total += itemOps[op.name] || 0;
      });
      totals[ic] = total;
    });
    return totals;
  }, [itemCodesFromData, itemOperationMap, operations]);

  // Assigned items map: item_code -> target_type_name
  const assignedItems = useMemo(() => {
    const map = {};
    dailyTargets.forEach(dt => {
      if (!map[dt.item_code]) {
        const tt = targetTypes.find(t => t.id === dt.target_type_id);
        map[dt.item_code] = tt?.name || 'Unknown';
      }
    });
    return map;
  }, [dailyTargets, targetTypes]);

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
      if (filterTargetType) {
        const tt = targetTypes.find(t => t.id === dt.target_type_id);
        if (tt?.name !== filterTargetType) return false;
      }
      return true;
    });
  }, [dailyTargets, filterItemCode, filterTargetType, targetTypes]);

  // Group targets by Target Type for display
  const targetsByType = useMemo(() => {
    const grouped = {};
    targetTypes.forEach(tt => {
      grouped[tt.id] = dailyTargets.filter(dt => dt.target_type_id === tt.id);
    });
    return grouped;
  }, [targetTypes, dailyTargets]);

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

  const createDailyTargetsMutation = useMutation({
    mutationFn: async (targets) => {
      const results = await Promise.all(
        targets.map(t => base44.entities.DailyTargetLines.create(t))
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['DailyTargetLines']);
      toast.success('Daily Targets added');
      setShowAddTargetDialog(false);
      resetForm();
    },
    onError: (err) => toast.error('Failed to add Daily Targets: ' + err.message)
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
    setFormTargetType('');
    setSelectedItemCodes([]);
    setItemQuantities({});
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

  const handleAddItemCode = (itemCode) => {
    if (!selectedItemCodes.includes(itemCode)) {
      setSelectedItemCodes([...selectedItemCodes, itemCode]);
      setItemQuantities({ ...itemQuantities, [itemCode]: 0 });
    }
  };

  const handleRemoveItemCode = (itemCode) => {
    setSelectedItemCodes(selectedItemCodes.filter(ic => ic !== itemCode));
    const newQty = { ...itemQuantities };
    delete newQty[itemCode];
    setItemQuantities(newQty);
  };

  const handleAddDailyTargets = () => {
    if (!formTargetType) {
      toast.error('Target Type is required');
      return;
    }
    if (selectedItemCodes.length === 0) {
      toast.error('Select at least one item code');
      return;
    }

    // Validate quantities
    for (const ic of selectedItemCodes) {
      const qty = parseFloat(itemQuantities[ic]);
      if (isNaN(qty) || qty < 0) {
        toast.error(`Invalid quantity for ${ic}`);
        return;
      }
    }

    const targetTypeId = targetTypes.find(tt => tt.name === formTargetType)?.id;
    if (!targetTypeId) {
      toast.error('Invalid Target Type');
      return;
    }

    const targets = selectedItemCodes.map(ic => {
      const qty = parseFloat(itemQuantities[ic]);
      const perPieceTotal = itemPerPieceTotals[ic] || 0;
      const itemTotal = perPieceTotal * qty;
      return {
        bundle_id: bundle.id,
        target_type_id: targetTypeId,
        item_code: ic,
        target_qty: qty,
        per_piece_total_min: perPieceTotal,
        item_total_min: itemTotal
      };
    });

    createDailyTargetsMutation.mutate(targets);
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

      {/* Target Type Summaries with Per-Piece Breakdowns */}
      {targetTypes.length > 0 && (
        <div className="space-y-4">
          {targetTypes.map(tt => {
            const targets = targetsByType[tt.id] || [];
            if (targets.length === 0) return null;

            return (
              <Card key={tt.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                    {tt.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {targets.map(target => {
                      const itemOps = itemOperationMap[target.item_code] || {};
                      const perPieceTotal = target.per_piece_total_min;
                      const breakdown = operations.map(op => {
                        const opMin = itemOps[op.name] || 0;
                        const opPercent = perPieceTotal > 0 ? (opMin / perPieceTotal * 100).toFixed(2) : 0;
                        return { name: op.name, minutes: opMin, percent: opPercent };
                      });

                      return (
                        <div key={target.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-slate-900">{target.item_code}</span>
                              <span className="text-sm text-slate-500 ml-2">Qty: {target.target_qty}</span>
                            </div>
                            {isEditable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Delete this target?')) {
                                    deleteDailyTargetMutation.mutate(target.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                          <div className="text-sm">
                            <div className="flex justify-between font-medium text-slate-700">
                              <span>Per-Piece Total:</span>
                              <span>{perPieceTotal.toFixed(2)} min</span>
                            </div>
                            <div className="flex justify-between font-medium text-slate-700">
                              <span>Item Total:</span>
                              <span>{target.item_total_min.toFixed(2)} min</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-600 space-y-1 pl-2">
                            <p className="font-semibold text-slate-700">Per-Piece Breakdown:</p>
                            {breakdown.map(op => (
                              <div key={op.name} className="flex justify-between">
                                <span>{op.name}:</span>
                                <span>{op.minutes.toFixed(2)} min ({op.percent}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Item Code</Label>
              <Input placeholder="Filter by item..." value={filterItemCode} onChange={(e) => setFilterItemCode(e.target.value)} />
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
                  <TableHead>Target Type</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Target Qty</TableHead>
                  <TableHead>Per-Piece (min)</TableHead>
                  <TableHead>Total (min)</TableHead>
                  {isEditable && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDailyTargets.map(dt => {
                  const tt = targetTypes.find(t => t.id === dt.target_type_id);
                  return (
                    <TableRow key={dt.id}>
                      <TableCell><Badge variant="outline">{tt?.name || '—'}</Badge></TableCell>
                      <TableCell>{dt.item_code}</TableCell>
                      <TableCell>{dt.target_qty}</TableCell>
                      <TableCell>{dt.per_piece_total_min.toFixed(2)}</TableCell>
                      <TableCell>{dt.item_total_min.toFixed(2)}</TableCell>
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
                  );
                })}
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
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Daily Target</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox id="showAssigned" checked={showAssigned} onCheckedChange={setShowAssigned} />
                <Label htmlFor="showAssigned" className="text-sm">Show assigned items</Label>
              </div>
              <Label>Item Codes (Multi-Select) *</Label>
              <Select onValueChange={handleAddItemCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select items to add" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAvailableItems.map(item => (
                    <SelectItem key={item.value} value={item.value} disabled={item.disabled || selectedItemCodes.includes(item.value)}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Items with Quantities */}
            {selectedItemCodes.length > 0 && (
              <div className="border rounded-lg p-4 space-y-2">
                <Label className="font-semibold">Selected Items & Quantities</Label>
                <div className="space-y-2">
                  {selectedItemCodes.map(ic => (
                    <div key={ic} className="flex items-center gap-3">
                      <div className="flex-1 font-medium text-sm">{ic}</div>
                      <div className="w-32">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Qty"
                          value={itemQuantities[ic] || ''}
                          onChange={(e) => setItemQuantities({ ...itemQuantities, [ic]: e.target.value })}
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveItemCode(ic)}>
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTargetDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDailyTargets} disabled={selectedItemCodes.length === 0}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}