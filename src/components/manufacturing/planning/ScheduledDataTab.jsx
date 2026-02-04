import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Search, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ScheduledDataTab({ selectedDepartment, selectedBundle }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    operation_profile_id: '',
    item_codes: [],
    qc_type: '',
    qc_level: '',
    ops_qty: '',
    qc_qty: '0',
    notes: ''
  });

  // Fetch item codes from DATA tab of selected bundle
  const { data: dataLines = [], isLoading: dataLinesLoading } = useQuery({
    queryKey: ['StdSetLines', selectedBundle?.id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle,
    staleTime: 0
  });
  
  const itemCodes = useMemo(() => {
    return [...new Set(dataLines.map(l => l.item_code).filter(Boolean))].sort();
  }, [dataLines]);
  const hasItemCodes = itemCodes.length > 0;

  // Fetch operation profiles from Profiles tab (same department)
  const { data: allProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['OperationProfileName'],
    queryFn: () => base44.entities.OperationProfileName.filter({ is_active: true }),
    staleTime: 0
  });

  const profiles = useMemo(() => {
    if (!selectedBundle?.department) return [];
    return allProfiles.filter(p => p.department === selectedBundle.department);
  }, [allProfiles, selectedBundle]);

  // Fetch QC types
  const { data: qcTypes = [], isLoading: qcTypesLoading } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.filter({ is_active: true }),
    staleTime: 0
  });

  // Fetch QC levels
  const { data: qcLevels = [], isLoading: qcLevelsLoading } = useQuery({
    queryKey: ['QCLevel'],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true }),
    staleTime: 0
  });

  // Fetch QC Set Lines for QC calculations
  const { data: qcSetLines = [] } = useQuery({
    queryKey: ['QCSetLines', selectedBundle?.id],
    queryFn: () => base44.entities.QCSetLines.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle,
    staleTime: 0
  });

  // Fetch scheduled data lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['ScheduledData', selectedBundle?.id],
    queryFn: () => base44.entities.ScheduledData.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle,
    staleTime: 0
  });

  // Filtered lines
  const filteredLines = useMemo(() => {
    if (!searchFilter) return lines;
    const term = searchFilter.toLowerCase();
    return lines.filter(l => 
      l.item_code?.toLowerCase().includes(term) || 
      l.date?.includes(term)
    );
  }, [lines, searchFilter]);

  // Normalize operation names for matching
  const normalizeOpName = (name) => {
    if (!name) return '';
    return name.toString().trim().toLowerCase().replace(/[_\s-]+/g, ' ');
  };

  // Calculate per-piece and total times
  const calculateTimes = (itemCode, profileId, opsQty, qcQty, qcType, qcLevel) => {
    console.log('🔢 calculateTimes called:', { itemCode, profileId, opsQty, qcQty, qcType, qcLevel });

    // Get the profile
    const profile = allProfiles.find(p => p.id === profileId);
    if (!profile || !profile.operations_required || profile.operations_required.length === 0) {
      console.warn('⚠️ No profile or operations_required:', profile);
      return { ops_per_piece_min: 0, ops_total_min: 0, qc_per_piece_min: 0, qc_total_min: 0, grand_total_min: 0 };
    }

    console.log('✅ Profile found:', profile.name, 'Operations:', profile.operations_required);

    // Calculate operations time (only for operations in profile)
    // Normalize both sides for matching
    const allowedOpsNormalized = profile.operations_required.map(normalizeOpName);
    const itemDataLines = dataLines.filter(l => {
      const match = l.item_code === itemCode && allowedOpsNormalized.includes(normalizeOpName(l.operation));
      return match;
    });

    console.log('📊 Matched DATA lines:', itemDataLines.length, itemDataLines);

    const ops_per_piece_min = itemDataLines.reduce((sum, l) => sum + (l.std_min_per_pc || 0), 0);
    const ops_total_min = ops_per_piece_min * opsQty;

    console.log('⚙️ Ops calculation:', { ops_per_piece_min, ops_total_min });

    // Calculate QC time (independent from ops_qty)
    let qc_per_piece_min = 0;
    let qc_total_min = 0;

    if (qcType && qcLevel && qcQty > 0) {
      // Find QC rules for this item's operations (that are in the profile)
      const qcRules = qcSetLines.filter(qc => {
        const opMatch = qc.item_code === itemCode && 
          qc.qc_type === qcType && 
          qc.qc_level === qcLevel &&
          allowedOpsNormalized.includes(normalizeOpName(qc.operation));
        return opMatch;
      });

      console.log('🔍 Matched QC rules:', qcRules.length, qcRules);

      // For each QC rule, recalculate if needed
      for (const qc of qcRules) {
        // Get base time for this operation from DATA
        const baseLine = dataLines.find(l => 
          l.item_code === itemCode && 
          normalizeOpName(l.operation) === normalizeOpName(qc.operation)
        );
        const baseTime = baseLine?.std_min_per_pc || 0;

        let extraTime = 0;
        if (qc.mode === 'percent') {
          extraTime = baseTime * (qc.qc_value / 100);
        } else if (qc.mode === 'fixed') {
          extraTime = qc.qc_value;
        } else {
          // Use pre-calculated if available
          extraTime = qc.calculated_extra_time_min || 0;
        }

        qc_per_piece_min += extraTime;
      }

      qc_total_min = qc_per_piece_min * qcQty;

      console.log('🧪 QC calculation:', { qc_per_piece_min, qc_total_min });
    }

    const grand_total_min = ops_total_min + qc_total_min;

    console.log('✅ Final totals:', { ops_total_min, qc_total_min, grand_total_min });

    return { ops_per_piece_min, ops_total_min, qc_per_piece_min, qc_total_min, grand_total_min };
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (records) => {
      // Check for duplicates
      for (const record of records) {
        const exists = lines.find(l => 
          l.date === record.date &&
          l.bundle_id === record.bundle_id &&
          l.item_code === record.item_code &&
          l.operation_profile_id === record.operation_profile_id
        );
        if (exists) {
          throw new Error(`This item is already scheduled with the same operation profile for this date: ${record.item_code}`);
        }
      }

      // Create all records
      await Promise.all(records.map(r => base44.entities.ScheduledData.create(r)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduledData'] });
      setShowAddDialog(false);
      setFormData({
        date: '',
        operation_profile_id: '',
        item_codes: [],
        qc_type: '',
        qc_level: '',
        ops_qty: '',
        qc_qty: '0',
        notes: ''
      });
      toast.success('Scheduled data added');
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.ScheduledData.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduledData'] });
      toast.success('Scheduled data deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const handleAdd = () => {
    // Validation
    if (!formData.date || !formData.operation_profile_id || formData.item_codes.length === 0 || !formData.ops_qty) {
      toast.error('Please fill all required fields (Date, Operation Profile, Item Codes, Ops Qty)');
      return;
    }

    const opsQty = parseFloat(formData.ops_qty);
    if (isNaN(opsQty) || opsQty <= 0) {
      toast.error('Ops Qty must be greater than 0');
      return;
    }

    // Default QC Qty to Ops Qty if not specified or 0
    let qcQty = parseFloat(formData.qc_qty);
    if (isNaN(qcQty) || qcQty === 0) {
      qcQty = opsQty; // Default to ops_qty
    }
    if (qcQty < 0) {
      toast.error('QC Qty must be 0 or greater');
      return;
    }

    if (formData.qc_type && !formData.qc_level) {
      toast.error('QC Level is required when QC Type is selected');
      return;
    }

    // Check item codes exist in DATA
    const invalidItems = formData.item_codes.filter(ic => !itemCodes.includes(ic));
    if (invalidItems.length > 0) {
      toast.error(`Item codes not found in DATA tab: ${invalidItems.join(', ')}`);
      return;
    }

    // Check profile is active
    const profile = allProfiles.find(p => p.id === formData.operation_profile_id);
    if (!profile || !profile.is_active) {
      toast.error('Selected Operation Profile is not active');
      return;
    }

    // Create one record per selected item code
    const records = formData.item_codes.map(itemCode => {
      const times = calculateTimes(itemCode, formData.operation_profile_id, opsQty, qcQty, formData.qc_type, formData.qc_level);
      return {
        bundle_id: selectedBundle.id,
        date: formData.date,
        item_code: itemCode,
        operation_profile_id: formData.operation_profile_id,
        ops_qty: opsQty,
        qc_qty: qcQty,
        qc_type: formData.qc_type || null,
        qc_level: formData.qc_level || null,
        notes: formData.notes || null,
        ...times
      };
    });

    createMutation.mutate(records);
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setShowDetailsDialog(true);
  };

  const getProfileName = (profileId) => {
    const profile = allProfiles.find(p => p.id === profileId);
    return profile?.name || 'Unknown';
  };

  const getRecordDetails = (record) => {
    const profile = allProfiles.find(p => p.id === record.operation_profile_id);
    if (!profile) return null;

    const allowedOps = profile.operations_required || [];
    const allowedOpsNormalized = allowedOps.map(normalizeOpName);
    
    const itemDataLines = dataLines.filter(l => 
      l.item_code === record.item_code && 
      allowedOpsNormalized.includes(normalizeOpName(l.operation))
    );
    
    const breakdown = itemDataLines.map(l => ({
      operation: l.operation,
      minutes: l.std_min_per_pc || 0
    }));

    const qcBreakdown = [];
    if (record.qc_type && record.qc_level) {
      const qcRules = qcSetLines.filter(qc => 
        qc.item_code === record.item_code && 
        qc.qc_type === record.qc_type && 
        qc.qc_level === record.qc_level &&
        allowedOpsNormalized.includes(normalizeOpName(qc.operation))
      );

      // Recalculate QC extra time per operation
      qcBreakdown.push(...qcRules.map(qc => {
        const baseLine = dataLines.find(l => 
          l.item_code === record.item_code && 
          normalizeOpName(l.operation) === normalizeOpName(qc.operation)
        );
        const baseTime = baseLine?.std_min_per_pc || 0;

        let extraTime = 0;
        if (qc.mode === 'percent') {
          extraTime = baseTime * (qc.qc_value / 100);
        } else if (qc.mode === 'fixed') {
          extraTime = qc.qc_value;
        } else {
          extraTime = qc.calculated_extra_time_min || 0;
        }

        return {
          operation: qc.operation,
          minutes: extraTime
        };
      }));
    }

    return { profile, breakdown, qcBreakdown };
  };

  const isLoading_any = isLoading || dataLinesLoading || profilesLoading || qcTypesLoading || qcLevelsLoading;

  if (isLoading_any) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hasItemCodes && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Define Item Codes in Standards → DATA tab first.
          </AlertDescription>
        </Alert>
      )}

      {profiles.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Define Operation Profiles in Standards → Profiles tab first.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">Scheduled Data</h3>
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by item code or date..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)} 
          variant="outline" 
          size="sm"
          disabled={!hasItemCodes || profiles.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Scheduled Data
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold">Operation Profile</TableHead>
              <TableHead className="font-semibold text-right">Ops Qty</TableHead>
              <TableHead className="font-semibold text-right">QC Qty</TableHead>
              <TableHead className="font-semibold text-right">Ops Per-piece</TableHead>
              <TableHead className="font-semibold text-right">Ops Total</TableHead>
              <TableHead className="font-semibold text-right">QC Per-piece</TableHead>
              <TableHead className="font-semibold text-right">QC Total</TableHead>
              <TableHead className="font-semibold text-right">Grand Total</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-slate-500 py-12">
                  {searchFilter ? 'No matching scheduled data found' : 'No scheduled data defined. Click "Add Scheduled Data" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map(line => (
                <TableRow 
                  key={line.id} 
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleRowClick(line)}
                >
                  <TableCell className="font-medium">{line.date}</TableCell>
                  <TableCell className="font-medium">{line.item_code}</TableCell>
                  <TableCell>{getProfileName(line.operation_profile_id)}</TableCell>
                  <TableCell className="text-right font-mono">{line.ops_qty}</TableCell>
                  <TableCell className="text-right font-mono">{line.qc_qty}</TableCell>
                  <TableCell className="text-right font-mono">{(line.ops_per_piece_min || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{(line.ops_total_min || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{(line.qc_per_piece_min || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{(line.qc_total_min || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{(line.grand_total_min || 0).toFixed(2)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      onClick={() => deleteMutation.mutate(line.id)}
                      variant="ghost"
                      size="icon"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Scheduled Data</DialogTitle>
            <DialogDescription>Schedule production data for planning</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[500px] overflow-auto">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <Label>Operation Profile *</Label>
              <Select 
                value={formData.operation_profile_id} 
                onValueChange={(v) => setFormData({ ...formData, operation_profile_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operation profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>QC Type (Optional)</Label>
                <Select 
                  value={formData.qc_type} 
                  onValueChange={(v) => setFormData({ ...formData, qc_type: v, qc_level: v ? formData.qc_level : '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select QC type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {qcTypes.map(qt => (
                      <SelectItem key={qt.id} value={qt.name}>{qt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>QC Level {formData.qc_type && '*'}</Label>
                <Select 
                  value={formData.qc_level} 
                  onValueChange={(v) => setFormData({ ...formData, qc_level: v })}
                  disabled={!formData.qc_type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select QC level" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcLevels.map(ql => (
                      <SelectItem key={ql.id} value={ql.name}>{ql.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.operation_profile_id && (
              <div>
                <Label>Item Codes * (Multi-select)</Label>
                <MultiSelect
                  options={itemCodes.map(code => ({ value: code, label: code }))}
                  selected={formData.item_codes}
                  onChange={(selected) => setFormData({ ...formData, item_codes: selected })}
                  placeholder="Select item codes from DATA tab"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ops Qty *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.ops_qty}
                  onChange={(e) => setFormData({ ...formData, ops_qty: e.target.value })}
                  placeholder="Enter ops quantity"
                />
              </div>

              <div>
                <Label>QC Qty (Optional, defaults to Ops Qty)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.qc_qty}
                  onChange={(e) => setFormData({ ...formData, qc_qty: e.target.value })}
                  placeholder="Leave blank to use Ops Qty"
                />
              </div>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Scheduled Data Details</DialogTitle>
          </DialogHeader>

          {selectedRecord && (() => {
            const details = getRecordDetails(selectedRecord);
            if (!details) return <p>No details available</p>;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-600">Date</Label>
                    <p className="font-medium">{selectedRecord.date}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Item Code</Label>
                    <p className="font-medium">{selectedRecord.item_code}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Operation Profile</Label>
                    <p className="font-medium">{details.profile.name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Ops Qty</Label>
                    <p className="font-medium">{selectedRecord.ops_qty}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">QC Qty</Label>
                    <p className="font-medium">{selectedRecord.qc_qty}</p>
                  </div>
                  {selectedRecord.notes && (
                    <div className="col-span-2">
                      <Label className="text-slate-600">Notes</Label>
                      <p className="font-medium">{selectedRecord.notes}</p>
                    </div>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Operations Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Operation</TableHead>
                          <TableHead className="text-right">Minutes per Piece</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {details.breakdown.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.operation}</TableCell>
                            <TableCell className="text-right font-mono">{item.minutes.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold bg-slate-50">
                          <TableCell>Total Per-piece</TableCell>
                          <TableCell className="text-right font-mono">{(selectedRecord.ops_per_piece_min || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {details.qcBreakdown.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">QC Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operation</TableHead>
                            <TableHead className="text-right">Extra Minutes per Piece</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {details.qcBreakdown.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.operation}</TableCell>
                              <TableCell className="text-right font-mono">{item.minutes.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-slate-50">
                            <TableCell>Total Per-piece</TableCell>
                            <TableCell className="text-right font-mono">{(selectedRecord.qc_per_piece_min || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-slate-600">Ops Total</p>
                        <p className="text-lg font-bold">{(selectedRecord.ops_total_min || 0).toFixed(2)} min</p>
                        <p className="text-xs text-slate-500">({selectedRecord.ops_per_piece_min.toFixed(2)} × {selectedRecord.ops_qty})</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">QC Total</p>
                        <p className="text-lg font-bold">{(selectedRecord.qc_total_min || 0).toFixed(2)} min</p>
                        <p className="text-xs text-slate-500">({selectedRecord.qc_per_piece_min.toFixed(2)} × {selectedRecord.qc_qty})</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Grand Total</p>
                        <p className="text-lg font-bold text-blue-700">{(selectedRecord.grand_total_min || 0).toFixed(2)} min</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}