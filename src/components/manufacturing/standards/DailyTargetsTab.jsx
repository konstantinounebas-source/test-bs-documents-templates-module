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
import { Plus, Trash2, AlertCircle, X, Info, Search, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { buildItemOperationMap, computeOpsPerPiece, getOperationBreakdown } from './shared/calculateOperationsTime';

export default function DailyTargetsTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();

  // State
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddTargetDialog, setShowAddTargetDialog] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [filterItemCode, setFilterItemCode] = useState('');
  const [filterTargetType, setFilterTargetType] = useState('');
  const [showBreakdownDialog, setShowBreakdownDialog] = useState(false);
  const [selectedBreakdownTarget, setSelectedBreakdownTarget] = useState(null);

  // Form state for adding target
  const [formTargetType, setFormTargetType] = useState('');
  const [formOperationProfile, setFormOperationProfile] = useState('');
  const [selectedItemCodes, setSelectedItemCodes] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});

  // Fetch Target Types (free text list)
  const [targetTypesList, setTargetTypesList] = useState([]);
  
  // Load target types from existing records
  React.useEffect(() => {
    if (!bundle) return;
    base44.entities.DailyTargetLines.filter({ bundle_id: bundle.id }).then(lines => {
      const types = [...new Set(lines.map(l => l.target_type))].filter(Boolean);
      setTargetTypesList(types);
    });
  }, [bundle]);

  // Fetch Daily Target Lines
  const { data: dailyTargets = [] } = useQuery({
    queryKey: ['DailyTargetLines', bundle?.id],
    queryFn: () => base44.entities.DailyTargetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  // Fetch Operation Profiles (all)
  const { data: allOperationProfiles = [] } = useQuery({
    queryKey: ['OperationProfileName'],
    queryFn: () => base44.entities.OperationProfileName.filter({ is_active: true }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  // Filter operation profiles by current bundle's department
  const operationProfiles = useMemo(() => {
    if (!bundle?.department) return allOperationProfiles;
    return allOperationProfiles.filter(p => p.department === bundle.department);
  }, [allOperationProfiles, bundle?.department]);

  // Profiles now store operations_required directly - no need for ProfileSetLines

  // Fetch Operations
  const { data: allOperations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.filter({ is_active: true }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });
  const operations = allOperations
    .filter(op => op.is_allowed !== false)
    .filter(op => {
      if (!bundle?.department_id) return true;
      if (!op.department_ids || op.department_ids.length === 0) return true;
      return op.department_ids.includes(bundle.department_id);
    })
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .slice(0, 10);

  // Fetch DATA from StdSetLines
  const { data: stdLines = [] } = useQuery({
    queryKey: ['StdSetLines', bundle?.id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  // Extract unique item codes from DATA
  const itemCodesFromData = useMemo(() => {
    return [...new Set(stdLines.map(line => line.item_code).filter(Boolean))];
  }, [stdLines]);

  // Build map: item_code -> { operation -> std_min_per_pc }
  const itemOperationMap = useMemo(() => {
    return buildItemOperationMap(stdLines);
  }, [stdLines]);

  // Calculate per-piece total for item with profile filter (uses shared engine)
  const calculatePerPieceTotal = (itemCode, profileId) => {
    const profile = operationProfiles.find(p => p.id === profileId);
    return computeOpsPerPiece(itemCode, profile, operations, itemOperationMap);
  };

  // Items already used in the current target type (for the form)
  const itemsUsedInFormTargetType = useMemo(() => {
    if (!formTargetType) return new Set();
    return new Set(dailyTargets.filter(dt => dt.target_type === formTargetType).map(dt => dt.item_code));
  }, [dailyTargets, formTargetType]);

  // All items available - only disable if already selected in the SAME target type
  const availableItemCodes = useMemo(() => {
    return itemCodesFromData.map(ic => {
      const alreadyInType = itemsUsedInFormTargetType.has(ic);
      return {
        value: ic,
        label: alreadyInType ? `${ic} (Already in this type)` : ic,
        disabled: alreadyInType
      };
    });
  }, [itemCodesFromData, itemsUsedInFormTargetType]);

  // Filter available items - remove already-selected in current form and apply search
  const filteredAvailableItems = useMemo(() => {
    return availableItemCodes.filter(item => {
      if (!showAssigned && item.disabled) return false;
      if (itemSearch && !item.value.toLowerCase().includes(itemSearch.toLowerCase())) return false;
      return true;
    });
  }, [availableItemCodes, selectedItemCodes, showAssigned, itemSearch]);

  // Filtered daily targets
  const filteredDailyTargets = useMemo(() => {
    return dailyTargets.filter(dt => {
      if (filterItemCode && !dt.item_code.toLowerCase().includes(filterItemCode.toLowerCase())) return false;
      if (filterTargetType && dt.target_type !== filterTargetType) return false;
      return true;
    });
  }, [dailyTargets, filterItemCode, filterTargetType]);

  // Calculate share % for each target within its Target Type group
  const targetsWithShare = useMemo(() => {
    const grouped = {};
    dailyTargets.forEach(dt => {
      if (!grouped[dt.target_type]) grouped[dt.target_type] = [];
      grouped[dt.target_type].push(dt);
    });

    const result = [];
    Object.keys(grouped).forEach(targetType => {
      const targets = grouped[targetType];
      const targetTotal = targets.reduce((sum, t) => sum + t.item_total_min, 0);
      targets.forEach(t => {
        result.push({
          ...t,
          share_percent: targetTotal > 0 ? (t.item_total_min / targetTotal * 100).toFixed(2) : 0
        });
      });
    });

    return result;
  }, [dailyTargets]);

  // Mutations
  const createDailyTargetsMutation = useMutation({
    mutationFn: async (targets) => {
      const results = await Promise.all(
        targets.map(t => base44.entities.DailyTargetLines.create(t))
      );
      return results;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['DailyTargetLines', bundle?.id] });
       toast.success('Daily Targets added');
       setShowAddTargetDialog(false);
       resetForm();
     },
    onError: (err) => toast.error('Failed to add Daily Targets: ' + err.message)
  });

  const deleteDailyTargetMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyTargetLines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['DailyTargetLines', bundle?.id] });
      toast.success('Daily Target deleted');
    },
    onError: (err) => toast.error('Failed to delete Daily Target: ' + err.message)
  });

  const resetForm = () => {
    setFormTargetType('');
    setFormOperationProfile('');
    setSelectedItemCodes([]);
    setItemQuantities({});
  };

  const handleAddTargetType = () => {
    if (!newTypeName.trim()) {
      toast.error('Target Type name is required');
      return;
    }
    if (targetTypesList.length >= 10) {
      toast.error('Maximum 10 Target Types');
      return;
    }
    if (targetTypesList.includes(newTypeName.trim())) {
      toast.error('Target Type already exists');
      return;
    }
    setTargetTypesList([...targetTypesList, newTypeName.trim()]);
    setShowAddTypeDialog(false);
    setNewTypeName('');
    toast.success('Target Type added to list');
  };

  const handleRemoveTargetType = async (typeName) => {
    // Delete only lines that belong to this bundle
    const linesInThisBundle = dailyTargets.filter(dt => dt.target_type === typeName);
    await Promise.all(linesInThisBundle.map(dt => base44.entities.DailyTargetLines.delete(dt.id)));
    queryClient.invalidateQueries({ queryKey: ['DailyTargetLines', bundle?.id] });
    setTargetTypesList(targetTypesList.filter(t => t !== typeName));
    toast.success('Target Type removed');
  };

  const handleAddItemCode = (itemCode) => {
    if (!selectedItemCodes.includes(itemCode)) {
      setSelectedItemCodes([...selectedItemCodes, itemCode]);
      setItemQuantities({ ...itemQuantities, [itemCode]: 1 });
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
    if (!formOperationProfile) {
      toast.error('Operation Profile is required');
      return;
    }
    if (selectedItemCodes.length === 0) {
      toast.error('Select at least one item code');
      return;
    }

    // Validate quantities
    for (const ic of selectedItemCodes) {
      const qty = parseFloat(itemQuantities[ic]);
      if (isNaN(qty) || qty <= 0) {
        toast.error(`Invalid quantity for ${ic}`);
        return;
      }
    }

    if (!formOperationProfile) {
      toast.error('Invalid Operation Profile');
      return;
    }

    const targets = selectedItemCodes.map(ic => {
      const qty = parseFloat(itemQuantities[ic]);
      const perPieceTotal = calculatePerPieceTotal(ic, formOperationProfile);
      const itemTotal = perPieceTotal * qty;
      return {
        bundle_id: bundle.id,
        target_type: formTargetType,
        operation_profile_id: formOperationProfile,
        item_code: ic,
        target_qty: qty,
        per_piece_total_min: perPieceTotal,
        item_total_min: itemTotal
      };
    });

    createDailyTargetsMutation.mutate(targets);
  };

  const handleShowBreakdown = (target) => {
    setSelectedBreakdownTarget(target);
    setShowBreakdownDialog(true);
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
            Target Types (Max 10)
            {isEditable && (
              <Button onClick={() => setShowAddTypeDialog(true)} size="sm" disabled={targetTypesList.length >= 10}>
                <Plus className="w-4 h-4 mr-2" />
                Add Target Type ({targetTypesList.length}/10)
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {targetTypesList.map(tt => {
              const totalMin = dailyTargets
                .filter(dt => dt.target_type === tt)
                .reduce((sum, dt) => sum + (dt.item_total_min || 0), 0);
              
              return (
                <Badge key={tt} variant="secondary" className="text-sm px-3 py-1 flex items-center gap-2">
                  <span>{tt}</span>
                  <span className="text-blue-700 font-semibold">({totalMin.toFixed(2)} min)</span>
                  {isEditable && (
                    <Trash2
                      className="w-3 h-3 cursor-pointer text-red-600 hover:text-red-800"
                      onClick={() => handleRemoveTargetType(tt)}
                    />
                  )}
                </Badge>
              );
            })}
            {targetTypesList.length === 0 && <p className="text-sm text-slate-500">No Target Types defined yet.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Daily Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Daily Targets
            {isEditable && targetTypesList.length > 0 && (
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
                  {targetTypesList.map(tt => (
                    <SelectItem key={tt} value={tt}>{tt}</SelectItem>
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
                  <TableHead>Qty</TableHead>
                  <TableHead>Per-Piece (min)</TableHead>
                  <TableHead>Share %</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targetsWithShare
                  .filter(dt => {
                    if (filterItemCode && !dt.item_code.toLowerCase().includes(filterItemCode.toLowerCase())) return false;
                    if (filterTargetType && dt.target_type !== filterTargetType) return false;
                    return true;
                  })
                  .map(dt => (
                    <TableRow key={dt.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleShowBreakdown(dt)}>
                      <TableCell><Badge variant="outline">{dt.target_type}</Badge></TableCell>
                      <TableCell>{dt.item_code}</TableCell>
                      <TableCell>{dt.target_qty}</TableCell>
                      <TableCell>{dt.per_piece_total_min.toFixed(2)}</TableCell>
                      <TableCell>{dt.share_percent}%</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowBreakdown(dt)}
                          >
                            <Info className="w-4 h-4 text-blue-600" />
                          </Button>
                          {isEditable && (
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
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {filteredDailyTargets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Type *</Label>
                <Select value={formTargetType} onValueChange={setFormTargetType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetTypesList.map(tt => (
                      <SelectItem key={tt} value={tt}>{tt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Operation Profile *</Label>
                <Select value={formOperationProfile} onValueChange={setFormOperationProfile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {operationProfiles.map(op => (
                      <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Item Codes (Multi-Select) *</Label>
                <div className="flex items-center gap-2">
                  <Checkbox id="showAssigned2" checked={showAssigned} onCheckedChange={setShowAssigned} />
                  <Label htmlFor="showAssigned2" className="text-xs font-normal cursor-pointer">Show assigned items</Label>
                </div>
              </div>
              {/* Search + multi-select list */}
              <div className="border rounded-md">
                <div className="flex items-center border-b px-3 py-1.5 gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <input
                    className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
                    placeholder="Search item codes..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {filteredAvailableItems.length === 0 && (
                    <p className="text-xs text-slate-400 px-3 py-2">No items found</p>
                  )}
                  {filteredAvailableItems.map(item => {
                    const isSelected = selectedItemCodes.includes(item.value);
                    const isDisabled = item.disabled;
                    return (
                      <div
                        key={item.value}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer select-none
                          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}
                          ${isSelected ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          if (isDisabled) return;
                          if (isSelected) handleRemoveItemCode(item.value);
                          else handleAddItemCode(item.value);
                        }}
                      >
                        <Checkbox checked={isSelected} disabled={isDisabled} className="pointer-events-none" />
                        <span className={isDisabled ? 'text-slate-400' : ''}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                          min="1"
                          step="1"
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

      {/* Breakdown Dialog */}
      <Dialog open={showBreakdownDialog} onOpenChange={setShowBreakdownDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Target Breakdown - {selectedBreakdownTarget?.item_code}</DialogTitle>
          </DialogHeader>
          {selectedBreakdownTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-500">Target Type</Label>
                  <p className="font-medium">{selectedBreakdownTarget.target_type}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Operation Profile</Label>
                  <p className="font-medium">
                    {operationProfiles.find(op => op.id === selectedBreakdownTarget.operation_profile_id)?.name || '—'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Target Quantity</Label>
                  <p className="font-medium">{selectedBreakdownTarget.target_qty}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Per-Piece Total</Label>
                  <p className="font-medium">{selectedBreakdownTarget.per_piece_total_min.toFixed(2)} min</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Item Total</Label>
                  <p className="font-medium">{selectedBreakdownTarget.item_total_min.toFixed(2)} min</p>
                </div>
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Per-Operation Breakdown (Per Piece)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Operation</TableHead>
                        <TableHead>Minutes</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const profile = operationProfiles.find(p => p.id === selectedBreakdownTarget.operation_profile_id);
                        const breakdown = getOperationBreakdown(selectedBreakdownTarget.item_code, profile, operations, itemOperationMap);
                        const perPieceTotal = selectedBreakdownTarget.per_piece_total_min;
                        
                        return breakdown.map(item => {
                          const opPercent = perPieceTotal > 0 ? (item.minutes / perPieceTotal * 100).toFixed(2) : 0;
                          return (
                            <TableRow key={item.operation}>
                              <TableCell>{item.operation}</TableCell>
                              <TableCell>{item.minutes.toFixed(2)}</TableCell>
                              <TableCell>{opPercent}%</TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowBreakdownDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}