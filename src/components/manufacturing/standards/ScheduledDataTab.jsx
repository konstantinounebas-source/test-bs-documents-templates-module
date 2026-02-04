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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, AlertCircle, X, Save, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ScheduledDataTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();

  // State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [searchItem, setSearchItem] = useState('');
  const [filterProfile, setFilterProfile] = useState('');
  
  // Form state
  const [formOperationProfile, setFormOperationProfile] = useState('');
  const [formQCType, setFormQCType] = useState('');
  const [formQCLevel, setFormQCLevel] = useState('');
  const [selectedItemCodes, setSelectedItemCodes] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});
  
  // Template state
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Fetch Scheduled Data
  const { data: scheduledData = [], isLoading: scheduledLoading } = useQuery({
    queryKey: ['StdScheduledData', bundle?.id, selectedDate],
    queryFn: () => base44.entities.StdScheduledData.filter({ 
      bundle_id: bundle.id,
      date: selectedDate 
    }),
    enabled: !!bundle
  });

  // Fetch Operation Profiles
  const { data: operationProfiles = [] } = useQuery({
    queryKey: ['OperationProfileName', bundle?.department],
    queryFn: () => base44.entities.OperationProfileName.filter({ 
      department: bundle.department,
      is_active: true 
    }),
    enabled: !!bundle
  });

  // Fetch QC Types
  const { data: qcTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.filter({ is_active: true })
  });

  // Fetch QC Levels
  const { data: qcLevels = [] } = useQuery({
    queryKey: ['QCLevel'],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true })
  });

  // Fetch DATA from StdSetLines
  const { data: stdLines = [] } = useQuery({
    queryKey: ['StdSetLines', bundle?.id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: bundle.id }),
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

  // Fetch Daily Targets to get target minutes
  const { data: dailyTargets = [] } = useQuery({
    queryKey: ['DailyTargetLines', bundle?.id],
    queryFn: () => base44.entities.DailyTargetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Fetch QC Set Lines for QC calculation
  const { data: qcSetLines = [] } = useQuery({
    queryKey: ['QCSetLines', bundle?.id],
    queryFn: () => base44.entities.QCSetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Fetch Templates
  const { data: templates = [] } = useQuery({
    queryKey: ['ScheduledTemplate', bundle?.id],
    queryFn: () => base44.entities.ScheduledTemplate.filter({ bundle_id: bundle.id }),
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

  // Get enabled operations for a profile
  const getEnabledOperations = (profileId) => {
    const profile = operationProfiles.find(p => p.id === profileId);
    if (!profile || !profile.operations_required) return [];
    
    return profile.operations_required
      .map(opId => operations.find(o => o.id === opId))
      .filter(Boolean)
      .map(op => op.name);
  };

  // Calculate ops per-piece for item with profile
  const calculateOpsPerPiece = (itemCode, profileId) => {
    const enabledOps = getEnabledOperations(profileId);
    const itemOps = itemOperationMap[itemCode] || {};
    let total = 0;
    enabledOps.forEach(opName => {
      total += itemOps[opName] || 0;
    });
    return total;
  };

  // Calculate QC per-piece
  const calculateQCPerPiece = (itemCode, operation, qcTypeId, qcLevel) => {
    if (!qcTypeId || !qcLevel) return 0;
    
    const qcLine = qcSetLines.find(qc => 
      qc.item_code === itemCode && 
      qc.operation === operation &&
      qc.qc_type === qcTypes.find(qt => qt.id === qcTypeId)?.name &&
      qc.qc_level === qcLevel
    );
    
    if (!qcLine) return 0;
    return qcLine.calculated_extra_time_min || 0;
  };

  // Calculate total QC for item
  const calculateTotalQC = (itemCode, profileId, qcTypeId, qcLevel) => {
    if (!qcTypeId || !qcLevel) return 0;
    
    const enabledOps = getEnabledOperations(profileId);
    let total = 0;
    enabledOps.forEach(opName => {
      total += calculateQCPerPiece(itemCode, opName, qcTypeId, qcLevel);
    });
    return total;
  };

  // Calculate totals
  const bundleTargetMinutes = useMemo(() => {
    return dailyTargets.reduce((sum, dt) => sum + (dt.item_total_min || 0), 0);
  }, [dailyTargets]);

  const scheduledTotalMinutes = useMemo(() => {
    return scheduledData.reduce((sum, sd) => sum + (sd.computed_grand_total || 0), 0);
  }, [scheduledData]);

  const difference = scheduledTotalMinutes - bundleTargetMinutes;

  // Filter scheduled data
  const filteredScheduledData = useMemo(() => {
    return scheduledData.filter(sd => {
      if (searchItem && !sd.item_code.toLowerCase().includes(searchItem.toLowerCase())) return false;
      if (filterProfile && sd.operation_profile_id !== filterProfile) return false;
      return true;
    });
  }, [scheduledData, searchItem, filterProfile]);

  // Mutations
  const createScheduledMutation = useMutation({
    mutationFn: async (records) => {
      // Check for duplicates
      for (const rec of records) {
        const exists = scheduledData.some(sd => 
          sd.date === rec.date &&
          sd.item_code === rec.item_code &&
          sd.operation_profile_id === rec.operation_profile_id
        );
        if (exists) {
          throw new Error(`Item ${rec.item_code} is already scheduled with the same operation profile for this date.`);
        }
      }
      
      const results = await Promise.all(
        records.map(r => base44.entities.StdScheduledData.create(r))
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['StdScheduledData']);
      toast.success('Scheduled data added');
      handleCloseDialog();
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteScheduledMutation = useMutation({
    mutationFn: (id) => base44.entities.StdScheduledData.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['StdScheduledData']);
      toast.success('Scheduled data deleted');
    },
    onError: (err) => toast.error('Failed to delete: ' + err.message)
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduledTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ScheduledTemplate']);
      toast.success('Template saved');
      setShowSaveTemplateDialog(false);
      setTemplateName('');
    },
    onError: (err) => toast.error('Failed to save template: ' + err.message)
  });

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setFormOperationProfile('');
    setFormQCType('');
    setFormQCLevel('');
    setSelectedItemCodes([]);
    setItemQuantities({});
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

  const handleAddScheduled = () => {
    if (!formOperationProfile) {
      toast.error('Operation Profile is required');
      return;
    }
    if (selectedItemCodes.length === 0) {
      toast.error('Select at least one item code');
      return;
    }
    
    // Validate QC consistency
    if ((formQCType && !formQCLevel) || (!formQCType && formQCLevel)) {
      toast.error('Both QC Type and QC Level must be selected, or neither');
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

    const records = selectedItemCodes.map(ic => {
      const qty = parseFloat(itemQuantities[ic]);
      const opsPerPiece = calculateOpsPerPiece(ic, formOperationProfile);
      const opsTotal = opsPerPiece * qty;
      const qcPerPiece = calculateTotalQC(ic, formOperationProfile, formQCType, formQCLevel);
      const qcTotal = qcPerPiece * qty;
      const grandTotal = opsTotal + qcTotal;

      return {
        bundle_id: bundle.id,
        department: bundle.department,
        date: selectedDate,
        item_code: ic,
        operation_profile_id: formOperationProfile,
        qty: qty,
        qc_type_id: formQCType || null,
        qc_level: formQCLevel || null,
        computed_ops_per_piece: opsPerPiece,
        computed_ops_total: opsTotal,
        computed_qc_per_piece: qcPerPiece,
        computed_qc_total: qcTotal,
        computed_grand_total: grandTotal
      };
    });

    createScheduledMutation.mutate(records);
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    const data = {
      bundle_id: bundle.id,
      template_name: templateName.trim(),
      date: selectedDate,
      item_codes: selectedItemCodes,
      operation_profile_id: formOperationProfile,
      qc_type_id: formQCType || null,
      qc_level: formQCLevel || null,
      item_quantities: itemQuantities
    };

    saveTemplateMutation.mutate(data);
  };

  const handleLoadTemplate = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) {
      toast.error('Template not found');
      return;
    }

    setFormOperationProfile(template.operation_profile_id);
    setFormQCType(template.qc_type_id || '');
    setFormQCLevel(template.qc_level || '');
    setSelectedItemCodes(template.item_codes || []);
    setItemQuantities(template.item_quantities || {});
    setSelectedDate(template.date || selectedDate);
    
    toast.success('Template loaded - review and edit before saving');
    setShowTemplateDialog(false);
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
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <Label className="text-sm text-slate-500">Bundle Target Minutes</Label>
              <p className="text-2xl font-bold text-blue-600">{bundleTargetMinutes.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm text-slate-500">Scheduled Total Minutes</Label>
              <p className="text-2xl font-bold text-green-600">{scheduledTotalMinutes.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm text-slate-500">Difference</Label>
              <p className={`text-2xl font-bold ${difference >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                {difference >= 0 ? '+' : ''}{difference.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Scheduled Data
            <div className="flex gap-2">
              {isEditable && (
                <>
                  <Button onClick={() => setShowTemplateDialog(true)} variant="outline" size="sm">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Load Template
                  </Button>
                  <Button onClick={() => setShowAddDialog(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Schedule
                  </Button>
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Item Code</Label>
              <Input
                placeholder="Search item..."
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
              />
            </div>
            <div>
              <Label>Operation Profile</Label>
              <Select value={filterProfile} onValueChange={setFilterProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All</SelectItem>
                  {operationProfiles.map(op => (
                    <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {scheduledLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Operation Profile</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Ops Per-piece (min)</TableHead>
                    <TableHead>Ops Total (min)</TableHead>
                    <TableHead>QC Per-piece (min)</TableHead>
                    <TableHead>QC Total (min)</TableHead>
                    <TableHead>Grand Total (min)</TableHead>
                    {isEditable && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScheduledData.map(sd => {
                    const profile = operationProfiles.find(p => p.id === sd.operation_profile_id);
                    return (
                      <TableRow key={sd.id}>
                        <TableCell className="font-medium">{sd.item_code}</TableCell>
                        <TableCell>{profile?.name || '—'}</TableCell>
                        <TableCell>{sd.qty}</TableCell>
                        <TableCell>{sd.computed_ops_per_piece?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>{sd.computed_ops_total?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>{sd.computed_qc_per_piece?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>{sd.computed_qc_total?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="font-bold">{sd.computed_grand_total?.toFixed(2) || '0.00'}</TableCell>
                        {isEditable && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Delete this schedule?')) {
                                  deleteScheduledMutation.mutate(sd.id);
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
                  {filteredScheduledData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isEditable ? 9 : 8} className="text-center text-slate-500 py-8">
                        No scheduled data found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Scheduled Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Scheduled Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>QC Type (Optional)</Label>
                <Select value={formQCType} onValueChange={setFormQCType}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {qcTypes.map(qc => (
                      <SelectItem key={qc.id} value={qc.id}>{qc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>QC Level (Optional)</Label>
                <Select value={formQCLevel} onValueChange={setFormQCLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {qcLevels.map(qc => (
                      <SelectItem key={qc.id} value={qc.name}>{qc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Item Codes (Multi-Select) *</Label>
              <Select onValueChange={handleAddItemCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Type to search and select items..." />
                </SelectTrigger>
                <SelectContent>
                  {itemCodesFromData
                    .filter(ic => !selectedItemCodes.includes(ic))
                    .map(ic => (
                      <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Items with Quantities */}
            {selectedItemCodes.length > 0 && (
              <div className="border rounded-lg p-4 space-y-2 max-h-[300px] overflow-y-auto">
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(true)} disabled={selectedItemCodes.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleAddScheduled} disabled={selectedItemCodes.length === 0}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Schedule Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
            <Button onClick={handleLoadTemplate} disabled={!selectedTemplate}>Load</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., Weekly Standard Schedule"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAsTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}