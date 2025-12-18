import React, { useState } from "react";
import { ProductCategory } from "@/entities/ProductCategory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, FolderTree } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

import CreateEditCategoryDialog from "./CreateEditCategoryDialog";

export default function CategoriesTable({ categories, allCategories, isLoading, onCategorySaved }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await ProductCategory.delete(categoryToDelete.id);
      onCategorySaved();
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const getParentCategoryName = (parentId) => {
    if (!parentId) return '-';
    const parent = allCategories?.find(c => c.id === parentId) || categories.find(c => c.id === parentId);
    return parent?.name || 'N/A';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500">No categories found. Add your first category to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Parent Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id} className="hover:bg-slate-50">
                <TableCell className="font-mono text-sm">{category.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{category.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-600">{category.description || '-'}</TableCell>
                <TableCell className="text-sm">{getParentCategoryName(category.parent_category_id)}</TableCell>
                <TableCell>
                  <Badge className={category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setCategoryToDelete(category);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateEditCategoryDialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedCategory(null);
        }}
        onCategorySaved={onCategorySaved}
        category={selectedCategory}
        categories={allCategories || categories}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}