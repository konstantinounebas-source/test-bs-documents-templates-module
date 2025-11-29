import React, { useState, useEffect, useCallback } from 'react';
import { UserTaskCategory } from "@/entities/UserTaskCategory";
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

export default function UserTaskCategoryManagement({ onStatsUpdate, accessLevel }) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    color_code: '#A8A29E',
    is_active: true,
  });
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    color_code: '#A8A29E',
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await UserTaskCategory.list("-created_date");
      setCategories(data);
    } catch (error) {
      console.error("Error loading task categories:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await UserTaskCategory.create(newCategoryData);
      setNewCategoryData({ name: '', description: '', color_code: '#A8A29E', is_active: true });
      await loadCategories();
      if(onStatsUpdate) onStatsUpdate();
    } catch (error) {
      console.error("Error creating task category:", error);
    }
    setIsSubmitting(false);
  };
  
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await UserTaskCategory.update(editingCategory.id, editFormData);
      setShowEditDialog(false);
      setEditingCategory(null);
      await loadCategories();
      if(onStatsUpdate) onStatsUpdate();
    } catch (error) {
      console.error("Error updating task category:", error);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setEditFormData({
      name: category.name,
      description: category.description || '',
      color_code: category.color_code || '#A8A29E',
      is_active: category.is_active !== false,
    });
    setShowEditDialog(true);
  };

  const confirmDelete = (category) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await UserTaskCategory.delete(categoryToDelete.id);
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
      await loadCategories();
      if(onStatsUpdate) onStatsUpdate();
    } catch (error) {
      console.error("Error deleting task category:", error);
    }
    setIsDeleting(false);
  };

  const colors = ['#A8A29E', '#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6'];

  return (
    <>
      <div className="space-y-4">
        <div>
            <h3 className="text-lg font-semibold">Task Categories</h3>
            <p className="text-sm text-slate-600">Manage categories for organizing personal and team tasks</p>
        </div>

        {accessLevel === 'full_access' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add New Category</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-task-name">Name *</Label>
                    <Input id="new-task-name" value={newCategoryData.name} onChange={(e) => setNewCategoryData(prev => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-task-description">Description</Label>
                    <Input id="new-task-description" value={newCategoryData.description} onChange={(e) => setNewCategoryData(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {colors.map(color => (
                      <button key={color} type="button" className={`w-8 h-8 rounded-full border-2 ${newCategoryData.color_code === color ? 'border-slate-400' : 'border-slate-200'}`} style={{ backgroundColor: color }} onClick={() => setNewCategoryData(prev => ({ ...prev, color_code: color }))} />
                    ))}
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Category
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Categories</CardTitle>
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
                ) : categories.length > 0 ? (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: category.color_code }}
                              />
                              {category.name}
                          </div>
                      </TableCell>
                      <TableCell>{category.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {category.created_date ? format(new Date(category.created_date), 'MMM d, yyyy') : 'Unknown'}
                      </TableCell>
                      {accessLevel === 'full_access' && (
                          <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                              <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(category)}
                              >
                              <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(category)}
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
                        <p className="text-slate-500">No categories found.</p>
                        {accessLevel === 'full_access' && (
                          <p className="text-sm text-slate-400">Add your first category to get started.</p>
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
          if (!isOpen) setEditingCategory(null);
          setShowEditDialog(isOpen);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-name">Name *</Label>
              <Input
                id="edit-task-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-task-description">Description</Label>
              <Input
                id="edit-task-description"
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
              This action cannot be undone. This will permanently delete the category "{categoryToDelete?.name}".
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