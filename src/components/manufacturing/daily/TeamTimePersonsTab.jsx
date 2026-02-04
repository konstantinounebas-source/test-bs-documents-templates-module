import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamTimePersonsTab({ batchId }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [formData, setFormData] = useState({
    person_name: '',
    from_time: '',
    to_time: '',
    notes: ''
  });

  const { data: persons = [] } = useQuery({
    queryKey: ['Person'],
    queryFn: () => base44.entities.Person.filter({ is_active: true })
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['Team_Time_Persons', batchId],
    queryFn: () => base44.entities.Team_Time_Persons.filter({ batch_header_id: batchId }),
    enabled: !!batchId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Team_Time_Persons.create({
      batch_header_id: batchId,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['Team_Time_Persons']);
      setFormData({ person_name: '', from_time: '', to_time: '', notes: '' });
      toast.success('Team time added');
    },
    onError: () => toast.error('Failed to add team time')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Team_Time_Persons.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['Team_Time_Persons']);
      setEditingLine(null);
      setFormData({ person_name: '', from_time: '', to_time: '', notes: '' });
      setShowAddDialog(false);
      toast.success('Team time updated');
    },
    onError: () => toast.error('Failed to update team time')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Team_Time_Persons.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['Team_Time_Persons']);
      toast.success('Team time deleted');
    },
    onError: () => toast.error('Failed to delete team time')
  });

  const handleAdd = () => {
    if (!formData.person_name || !formData.from_time || !formData.to_time) {
      toast.error('Person name and time range are required');
      return;
    }

    if (editingLine) {
      updateMutation.mutate({ id: editingLine.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (line) => {
    setEditingLine(line);
    setFormData({
      person_name: line.person_name,
      from_time: line.from_time,
      to_time: line.to_time,
      notes: line.notes || ''
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({ person_name: '', from_time: '', to_time: '', notes: '' });
    setEditingLine(null);
    setShowAddDialog(false);
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
        <h3 className="text-lg font-semibold">Team Time - Persons</h3>
        <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Person Time
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person Name</TableHead>
              <TableHead>From Time</TableHead>
              <TableHead>To Time</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  No team time records defined.
                </TableCell>
              </TableRow>
            ) : (
              lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.person_name}</TableCell>
                  <TableCell>{line.from_time}</TableCell>
                  <TableCell>{line.to_time}</TableCell>
                  <TableCell>{line.notes || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(line)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deleteMutation.mutate(line.id)}
                        variant="ghost"
                        size="icon"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowAddDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Edit Team Time - Person' : 'Add Team Time - Person'}</DialogTitle>
            <DialogDescription>
              {editingLine ? 'Update time worked by a team member' : 'Record time worked by a team member'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Person Name *</Label>
              <Select value={formData.person_name} onValueChange={(v) => setFormData({ ...formData, person_name: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {persons.map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Time *</Label>
                <Select value={formData.from_time} onValueChange={(v) => setFormData({ ...formData, from_time: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 35 }, (_, i) => {
                      const hours = 7 + Math.floor(i / 2);
                      const minutes = i % 2 === 0 ? '00' : '30';
                      if (hours > 15 || (hours === 15 && minutes === '30')) return null;
                      const time = `${String(hours).padStart(2, '0')}:${minutes}`;
                      return <SelectItem key={time} value={time}>{time}</SelectItem>;
                    }).filter(Boolean)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Time *</Label>
                <Select value={formData.to_time} onValueChange={(v) => setFormData({ ...formData, to_time: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 35 }, (_, i) => {
                      const hours = 7 + Math.floor(i / 2);
                      const minutes = i % 2 === 0 ? '00' : '30';
                      if (hours > 15 || (hours === 15 && minutes === '30')) return null;
                      const time = `${String(hours).padStart(2, '0')}:${minutes}`;
                      return <SelectItem key={time} value={time}>{time}</SelectItem>;
                    }).filter(Boolean)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : editingLine ? (
                <Edit2 className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {editingLine ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}