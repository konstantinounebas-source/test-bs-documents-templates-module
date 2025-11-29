
import React, { useState, useEffect, useCallback } from 'react';
import { TemplateCategory } from "@/entities/TemplateCategory";
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

// Helper to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function CategoryManagement({ onStatsUpdate, accessLevel }) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    color_code: '#3B82F6',
    is_active: true,
  });
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    color_code: '#3B82F6',
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      // Add delay to prevent rate limiting
      await delay(400);
      const data = await TemplateCategory.list("-created_date");
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
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
      await TemplateCategory.create(newCategoryData);
      setNewCategoryData({ name: '', description: '', color_code: '#3B82F6', is_active: true });
      loadCategories();
      if(onStatsUpdate) onStatsUpdate();
    } catch (error) {
      console.error("Error creating category:", error);
    }
    setIsSubmitting(false);
  };
  
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await TemplateCategory.update(editingCategory.id, editFormData);
      setShowEditDialog(false);
      setEditingCategory(null);
      loadCategories();
      if(onStatsUpdate) onStatsUpdate();
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setEditFormData({
      name: category.name,
      description: category.description || '',
      color_code: category.color_code || '#3B82F6',
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
      await TemplateCategory.delete(categoryToDelete.id);
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
      loadCategories();
      if(onStatsUpdate) onStatsUpdate();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
    setIsDeleting(false);
  };

  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'];

  return (
    <>
      <div className="space-y-4">
        <div>
            <h3 className="text-lg font-semibold">Template Categories</h3>
            <p className="text-sm text-slate-600">Manage categories for organizing templates</p>
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
                    <Label htmlFor="new-name">Name *</Label>
                    <Input id="new-name" value={newCategoryData.name} onChange={(e) => setNewCategoryData(prev => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-description">Description</Label>
                    <Input id="new-description" value={newCategoryData.description} onChange={(e) => setNewCategoryData(prev => ({ ...prev, description: e.target.value }))} />
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
                  {accessLevel === 'full_access' && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEditDialog} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setEditingCategory(null);
          }
          setShowEditDialog(isOpen);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
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
