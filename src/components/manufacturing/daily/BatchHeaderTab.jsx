import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, Edit2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BatchHeaderTab({ batchHeaders, selectedBatch, onBatchSelect, onBatchCreated }) {
  const queryClient = useQueryClient();
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    department: '',
    bundle_id: '',
    notes: ''
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list()
  });

  const { data: bundles = [] } = useQuery({
    queryKey: ['StandardsBundle', formData.department],
    queryFn: () => base44.entities.StandardsBundle.filter({ department: formData.department }),
    enabled: !!formData.department
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Batch_Header.create(data),
    onSuccess: (newBatch) => {
      queryClient.invalidateQueries(['Batch_Header']);
      resetForm();
      toast.success('Batch header created');
      onBatchCreated(newBatch);
    },
    onError: () => toast.error('Failed to create batch header')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Batch_Header.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['Batch_Header']);
      resetForm();
      toast.success('Batch header updated');
    },
    onError: () => toast.error('Failed to update batch header')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Batch_Header.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['Batch_Header']);
      toast.success('Batch header deleted');
    },
    onError: () => toast.error('Failed to delete batch header')
  });

  const resetForm = () => {
    setFormData({ date: '', department: '', bundle_id: '', notes: '' });
    setEditingBatch(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date || !formData.department || !formData.bundle_id) {
      toast.error('Date, department and standards bundle are required');
      return;
    }

    if (editingBatch) {
      updateMutation.mutate({ id: editingBatch.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setFormData({
      date: batch.date,
      department: batch.department,
      bundle_id: batch.bundle_id || '',
      notes: batch.notes || ''
    });
  };

  const handleDelete = (id) => {
    if (confirm('Delete this batch header? This will also delete all related production data.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {editingBatch ? 'Edit Batch Header' : 'Add / Edit Batch Header'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => {
                  setFormData({ ...formData, department: value, bundle_id: '' });
                }}
              >
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
              <Label>Standards Bundle *</Label>
              <Select
                value={formData.bundle_id}
                onValueChange={(value) => setFormData({ ...formData, bundle_id: value })}
                disabled={!formData.department}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.department ? "Select bundle version" : "Select department first"} />
                </SelectTrigger>
                <SelectContent>
                  {bundles.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.version_no} {b.status === 'ACTIVE' ? '- ACTIVE' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              {editingBatch && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingBatch ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Batch Headers</CardTitle>
        </CardHeader>
        <CardContent>
          {batchHeaders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No batch headers found. Create one to start.
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchHeaders.map(batch => (
                    <TableRow 
                      key={batch.id}
                      className={selectedBatch?.id === batch.id ? 'bg-blue-50' : ''}
                    >
                      <TableCell>{batch.date}</TableCell>
                      <TableCell>{batch.department}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onBatchSelect(batch)}
                            disabled={selectedBatch?.id === batch.id}
                          >
                            Select
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(batch)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(batch.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}