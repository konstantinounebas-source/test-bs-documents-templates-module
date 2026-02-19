import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Search, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useBundleItemCodes } from './useBundleItemCodes';

export default function ConsumablesTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [formData, setFormData] = useState({
    consumable: '',
    department: '',
    rate_type: 'unit',
    item_code: '',
    operation: '',
    rate_value: '',
    notes: ''
  });

  // Fetch departments
  const { data: allDepartments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list()
  });

  // Fetch reference data
  const { data: allConsumables = [] } = useQuery({
    queryKey: ['Consumable'],
    queryFn: () => base44.entities.Consumable.list()
  });

  const { data: allOperations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.list()
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['Product'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: allUnits = [] } = useQuery({
    queryKey: ['Unit'],
    queryFn: () => base44.entities.Unit.list()
  });

  const { data: allRateTypes = [] } = useQuery({
    queryKey: ['Rate_Type'],
    queryFn: () => base44.entities.Rate_Type.list()
  });
  const rateTypes = allRateTypes.filter(rt => rt.is_active).slice(0, 10);
  const units = allUnits.filter(u => u.is_active);

  // Fetch item codes from DATA tab
  const { data: itemCodes = [] } = useBundleItemCodes(bundle?.id);

  // Fetch lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['ConsumablesStandardsLines', bundle.id],
    queryFn: () => base44.entities.ConsumablesStandardsLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Filter consumables by department
  const filteredConsumables = useMemo(() => {
    if (!formData.department) return [];
    return allConsumables.filter(c => 
      c.is_active && 
      (!c.department_ids || c.department_ids.length === 0 || c.department_ids.includes(formData.department))
    ).slice(0, 10);
  }, [allConsumables, formData.department]);

  // Filter operations by department
  const filteredOperations = useMemo(() => {
    if (!formData.department) return [];
    return allOperations.filter(o =>
      o.is_active &&
      (!o.department_ids || o.department_ids.length === 0 || o.department_ids.includes(formData.department))
    ).slice(0, 10);
  }, [allOperations, formData.department]);

  // Get product details for selected consumable
  const selectedConsumableProduct = useMemo(() => {
    if (!formData.consumable) return null;
    return allProducts.find(p => p.name === formData.consumable);
  }, [formData.consumable, allProducts]);

  // Filtered lines
  const filteredLines = useMemo(() => {
    if (!searchFilter) return lines;
    const term = searchFilter.toLowerCase();
    return lines.filter(l => l.item_code?.toLowerCase().includes(term));
  }, [lines, searchFilter]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ConsumablesStandardsLines.create({
        bundle_id: bundle.id,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ConsumablesStandardsLines'] });
      setShowAddDialog(false);
      setFormData({
        consumable: '',
        department: '',
        rate_type: 'unit',
        item_code: '',
        operation: '',
        rate_value: '',
        notes: ''
      });
      toast.success('Consumable line added');
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ConsumablesStandardsLines.update(editingId, {
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ConsumablesStandardsLines'] });
      setShowAddDialog(false);
      setEditingId(null);
      setFormData({
        consumable: '',
        department: '',
        rate_type: 'unit',
        item_code: '',
        operation: '',
        rate_value: '',
        notes: ''
      });
      toast.success('Consumable line updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.ConsumablesStandardsLines.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ConsumablesStandardsLines'] });
      toast.success('Consumable line deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const handleSave = () => {
    if (!formData.consumable || !formData.department || !formData.rate_value) {
      toast.error('Please fill required fields');
      return;
    }
    const data = {
      ...formData,
      rate_value: parseFloat(formData.rate_value),
      unit: selectedConsumableProduct?.unit_of_measure || ''
    };
    if (editingId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (line) => {
    setEditingId(line.id);
    setFormData({
      consumable: line.consumable,
      department: line.department,
      rate_type: line.rate_type || 'unit',
      item_code: line.item_code || '',
      operation: line.operation || '',
      rate_value: line.rate_value.toString(),
      notes: line.notes || ''
    });
    setShowAddDialog(true);
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
      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">Consumables Standards</h3>
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
        {isEditable && (
          <Button onClick={() => { setEditingId(null); setFormData({ consumable: '', department: '', rate_type: 'unit', item_code: '', operation: '', rate_value: '', notes: '' }); setShowAddDialog(true); }} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Consumable
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consumable</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Rate Type (Unit/Percentage)</TableHead>
              <TableHead>Item Code</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Rate Value</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Notes</TableHead>
              {isEditable && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-slate-500">
                  {searchFilter ? 'No matching consumables found' : 'No consumables standards defined. Click "Add Consumable" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map(line => (
                <TableRow key={line.id}>
                  <TableCell>{line.consumable}</TableCell>
                  <TableCell>{line.department}</TableCell>
                  <TableCell>{line.rate_type}</TableCell>
                  <TableCell>{line.item_code || '-'}</TableCell>
                  <TableCell>{line.operation || '-'}</TableCell>
                  <TableCell>{line.rate_value}</TableCell>
                  <TableCell>{line.rate_type === 'percentage' ? '%' : line.unit}</TableCell>
                  <TableCell>{line.notes || '-'}</TableCell>
                  {isEditable && (
                    <TableCell className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(line)}
                        variant="ghost"
                        size="icon"
                        disabled={updateMutation.isPending}
                      >
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button
                        onClick={() => deleteMutation.mutate(line.id)}
                        variant="ghost"
                        size="icon"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  )}
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
            <DialogTitle>{editingId ? 'Edit Consumable Standard' : 'Add Consumable Standard'}</DialogTitle>
            <DialogDescription>{editingId ? 'Update consumable standard' : 'Define a consumable standard for this bundle'}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[500px] overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department *</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v, consumable: '', operation: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {allDepartments.filter(d => d.is_active).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Consumable *</Label>
                <Select value={formData.consumable} onValueChange={(v) => setFormData({ ...formData, consumable: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={formData.department ? "Select" : "Select department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredConsumables.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedConsumableProduct && (
                <>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900">Unit of Measure</p>
                    <p className="text-sm text-blue-800">{selectedConsumableProduct.unit_of_measure}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900">Unit Cost</p>
                    <p className="text-sm text-blue-800">{selectedConsumableProduct.unit_cost || 'N/A'}</p>
                  </div>
                </>
              )}

              <div>
                <Label>Operation</Label>
                <Select value={formData.operation} onValueChange={(v) => setFormData({ ...formData, operation: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={formData.department ? "Select from available" : "Select department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- None --</SelectItem>
                    {filteredOperations.map(op => (
                      <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Item Code (optional)</Label>
                <Select value={formData.item_code} onValueChange={(v) => setFormData({ ...formData, item_code: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional - from DATA tab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- None --</SelectItem>
                    {itemCodes.map(code => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Rate Type *</Label>
                <Select value={formData.rate_type} onValueChange={(v) => setFormData({ ...formData, rate_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unit">Unit {selectedConsumableProduct && `(${selectedConsumableProduct.unit_of_measure})`}</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Rate Value *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.rate_value}
                  onChange={(e) => setFormData({ ...formData, rate_value: e.target.value })}
                  placeholder={formData.rate_type === 'percentage' ? "e.g. 50" : "e.g. 1.5"}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (editingId ? null : <Plus className="w-4 h-4 mr-2" />)}
              {editingId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}