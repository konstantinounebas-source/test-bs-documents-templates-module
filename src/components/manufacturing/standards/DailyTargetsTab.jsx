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
import { Plus, Trash2, AlertCircle, X, Info } from "lucide-react";
import { toast } from "sonner";

export default function DailyTargetsTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();

  // State
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddTargetDialog, setShowAddTargetDialog] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);
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
    enabled: !!bundle
  });

  // Fetch Operation Profiles
  const { data: operationProfiles = [] } = useQuery({
    queryKey: ['Operation_Profile_Name'],
    queryFn: () => base44.entities.Operation_Profile_Name.filter({ is_active: true })
  });

  // Profiles now store operations_required directly - no need for ProfileSetLines

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

  // Get enabled operations for a profile from operations_required array
  const getEnabledOperations = (profileId) => {
    const profile = operationProfiles.find(p => p.id === profileId);
    if (!profile || !profile.operations_required) return [];
    
    // Return operation names from the operations_required array
    return profile.operations_required
      .map(opId => operations.find(o => o.id === opId))
      .filter(Boolean)
      .map(op => op.name);
  };

  // Calculate per-piece total for item with profile filter
  const calculatePerPieceTotal = (itemCode, profileId) => {
    const enabledOps = getEnabledOperations(profileId);
    const itemOps = itemOperationMap[itemCode] || {};
    let total = 0;
    enabledOps.forEach(opName => {
      total += itemOps[opName] || 0;
    });
    return total;
  };

  // Assigned items map: item_code -> true
  const assignedItems = useMemo(() => {
    const map = {};
    dailyTargets.forEach(dt => {
      map[dt.item_code] = true;
    });
    return map;
  }, [dailyTargets]);

  // Item codes available for selection
  const availableItemCodes = useMemo(() => {
    return itemCodesFromData.map(ic => {
      const isAssigned = assignedItems[ic];
      return {
        value: ic,
        label: isAssigned ? `${ic} (Already Assigned)` : ic,
        disabled: isAssigned
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

  const handleRemoveTargetType = (typeName) => {
    // Check if any targets use this type
    const used = dailyTargets.some(dt => dt.target_type === typeName);
    if (used) {
      toast.error('Cannot remove: Target Type is in use');
      return;
    }
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

    const profileId = operationProfiles.find(op => op.name === formOperationProfile)?.id;
    if (!profileId) {
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
        operation_profile_id: profileId,
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
            {targetTypesList.map(tt => (
              <Badge key={tt} variant="secondary" className="text-sm px-3 py-1">
                {tt}
                {isEditable && (
                  <Trash2
                    className="w-3 h-3 ml-2 cursor-pointer text-red-600 hover:text-red-800"
                    onClick={() => handleRemoveTargetType(tt)}
                  />
                )}
              </Badge>
            ))}
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
                        const enabledOps = getEnabledOperations(selectedBreakdownTarget.operation_profile_id);
                        const itemOps = itemOperationMap[selectedBreakdownTarget.item_code] || {};
                        const perPieceTotal = selectedBreakdownTarget.per_piece_total_min;
                        
                        return enabledOps.map(opName => {
                          const opMin = itemOps[opName] || 0;
                          const opPercent = perPieceTotal > 0 ? (opMin / perPieceTotal * 100).toFixed(2) : 0;
                          return (
                            <TableRow key={opName}>
                              <TableCell>{opName}</TableCell>
                              <TableCell>{opMin.toFixed(2)}</TableCell>
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