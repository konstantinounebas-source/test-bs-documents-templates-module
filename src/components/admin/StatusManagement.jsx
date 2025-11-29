import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { format } from 'date-fns';

export default function StatusManagement({ entity, title, description, onUpdate, accessLevel }) {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    color_code: '#888888',
    is_active: true,
  });
  const [newOptionData, setNewOptionData] = useState({
    name: '',
    description: '',
    color_code: '#888888',
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState(null);

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      if (entity) {
        const data = await entity.list("-created_date");
        setOptions(data);
      }
    } catch (error) {
      console.error(`Error loading options for ${title}:`, error);
    }
    setIsLoading(false);
  }, [entity, title]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await entity.create(newOptionData);
      setNewOptionData({ name: '', description: '', color_code: '#888888', is_active: true });
      loadOptions();
      if(onUpdate) onUpdate();
    } catch (error) {
      console.error(`Error creating option for ${title}:`, error);
    }
    setIsSubmitting(false);
  };
  
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingOption) return;
    try {
      await entity.update(editingOption.id, editFormData);
      setShowEditDialog(false);
      setEditingOption(null);
      loadOptions();
      if(onUpdate) onUpdate();
    } catch (error) {
      console.error(`Error updating option for ${title}:`, error);
    }
  };

  const handleEdit = (option) => {
    setEditingOption(option);
    setEditFormData({
      name: option.name,
      description: option.description || '',
      color_code: option.color_code || '#888888',
      is_active: option.is_active !== false,
    });
    setShowEditDialog(true);
  };

  const confirmDelete = (option) => {
    setOptionToDelete(option);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!optionToDelete) return;
    setIsDeleting(true);
    try {
      await entity.delete(optionToDelete.id);
      setShowDeleteDialog(false);
      setOptionToDelete(null);
      loadOptions();
      if(onUpdate) onUpdate();
    } catch (error) {
      console.error(`Error deleting option for ${title}:`, error);
    }
    setIsDeleting(false);
  };

  const colors = ['#888888', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'];

  return (
    <>
      <div className="space-y-4">
        <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-slate-600">{description}</p>
        </div>

        {accessLevel === 'full_access' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add New Option</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-name">Name *</Label>
                    <Input id="new-name" value={newOptionData.name} onChange={(e) => setNewOptionData(prev => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-description">Description</Label>
                    <Input id="new-description" value={newOptionData.description} onChange={(e) => setNewOptionData(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {colors.map(color => (
                      <button key={color} type="button" className={`w-8 h-8 rounded-full border-2 ${newOptionData.color_code === color ? 'border-slate-400' : 'border-slate-200'}`} style={{ backgroundColor: color }} onClick={() => setNewOptionData(prev => ({ ...prev, color_code: color }))} />
                    ))}
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Option
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Options</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {accessLevel === 'full_access' && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={accessLevel === 'full_access' ? 5 : 4} className="h-24 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : options.length > 0 ? (
                  options.map((option) => (
                    <TableRow key={option.id}>
                      <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: option.color_code }}
                              />
                              {option.name}
                          </div>
                      </TableCell>
                      <TableCell>{option.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={option.is_active ? "default" : "secondary"}>
                          {option.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {option.created_date ? format(new Date(option.created_date), 'MMM d, yyyy') : 'Unknown'}
                      </TableCell>
                      {accessLevel === 'full_access' && (
                          <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                              <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(option)}
                              >
                              <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(option)}
                              >
                              <Trash2 className="w-4 h-4" />
                              </Button>
                          </div>
                          </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={accessLevel === 'full_access' ? 5 : 4} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-slate-500">No options found.</p>
                        {accessLevel === 'full_access' && (
                          <p className="text-sm text-slate-400">Add your first option to get started.</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEditDialog} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setEditingOption(null);
          }
          setShowEditDialog(isOpen);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Option</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      editFormData.color_code === color ? 'border-slate-400' : 'border-slate-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditFormData(prev => ({ ...prev, color_code: color }))}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the option "{optionToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}