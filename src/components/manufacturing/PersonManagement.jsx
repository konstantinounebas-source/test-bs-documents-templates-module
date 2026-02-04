import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

export default function PersonManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [formData, setFormData] = useState({ name: '', is_active: true });

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ['Person'],
    queryFn: () => base44.entities.Person.list(),
    staleTime: 0
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Person.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Person'] });
      setShowDialog(false);
      setFormData({ name: '', is_active: true });
      toast.success('Person created');
    },
    onError: (error) => {
      toast.error('Failed to create: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Person.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Person'] });
      setShowDialog(false);
      setEditingPerson(null);
      setFormData({ name: '', is_active: true });
      toast.success('Person updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Person.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Person'] });
      toast.success('Person deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (editingPerson) {
      updateMutation.mutate({ id: editingPerson.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (person) => {
    setEditingPerson(person);
    setFormData({ name: person.name, is_active: person.is_active });
    setShowDialog(true);
  };

  const handleAdd = () => {
    setEditingPerson(null);
    setFormData({ name: '', is_active: true });
    setShowDialog(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Persons (Team Members)</CardTitle>
          <Button onClick={handleAdd} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Person
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-slate-500 py-4">Loading...</p>
        ) : persons.length === 0 ? (
          <p className="text-center text-slate-500 py-4">No persons added yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {persons.map(person => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>
                    <Switch checked={person.is_active} disabled />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button onClick={() => handleEdit(person)} variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          if (confirm('Delete this person?')) {
                            deleteMutation.mutate(person.id);
                          }
                        }}
                        variant="ghost"
                        size="icon"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPerson ? 'Edit Person' : 'Add Person'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter person name"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>
                {editingPerson ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}