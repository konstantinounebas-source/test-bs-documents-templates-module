import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ConsumablesActualTab({ batchId }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    department: '',
    consumable: '',
    actual_qty: '',
    unit: ''
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list(),
    staleTime: Infinity
  });

  const { data: consumables = [] } = useQuery({
    queryKey: ['Consumable'],
    queryFn: () => base44.entities.Consumable.list(),
    staleTime: Infinity
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['Consumables_Actual', batchId],
    queryFn: () => base44.entities.Consumables_Actual.filter({ batch_header_id: batchId }),
    enabled: !!batchId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Consumables_Actual.create({
      batch_header_id: batchId,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['Consumables_Actual']);
      setShowAddDialog(false);
      setFormData({ department: '', consumable: '', actual_qty: '', unit: '' });
      toast.success('Consumable actual added');
    },
    onError: () => toast.error('Failed to add consumable actual')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Consumables_Actual.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['Consumables_Actual']);
      toast.success('Consumable actual deleted');
    },
    onError: () => toast.error('Failed to delete consumable actual')
  });

  const handleAdd = () => {
    if (!formData.department || !formData.consumable || !formData.actual_qty || !formData.unit) {
      toast.error('All fields are required');
      return;
    }
    createMutation.mutate({
      ...formData,
      actual_qty: parseFloat(formData.actual_qty)
    });
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Consumables Actual</h3>
        <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Consumable
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Consumable</TableHead>
              <TableHead>Actual Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  No consumable actuals defined.
                </TableCell>
              </TableRow>
            ) : (
              lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.department}</TableCell>
                  <TableCell>{line.consumable}</TableCell>
                  <TableCell>{line.actual_qty}</TableCell>
                  <TableCell>{line.unit}</TableCell>
                  <TableCell>
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Consumable Actual</DialogTitle>
            <DialogDescription>Record actual consumable usage</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Department *</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Consumable *</Label>
              <Select value={formData.consumable} onValueChange={(v) => setFormData({ ...formData, consumable: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consumable" />
                </SelectTrigger>
                <SelectContent>
                  {consumables.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Actual Qty *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.actual_qty}
                  onChange={(e) => setFormData({ ...formData, actual_qty: e.target.value })}
                />
              </div>
              <div>
                <Label>Unit *</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., kg, L"
                />
              </div>
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
    </div>
  );
}