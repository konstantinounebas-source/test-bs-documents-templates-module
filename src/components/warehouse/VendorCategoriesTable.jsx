import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Tag } from "lucide-react";
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

import CreateEditVendorCategoryDialog from "./CreateEditVendorCategoryDialog";

export default function VendorCategoriesTable({ vendorCategories, isLoading, onVendorCategorySaved }) {
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
      await base44.entities.VendorCategory.delete(categoryToDelete.id);
      onVendorCategorySaved();
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting vendor category:", error);
    }
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

  if (vendorCategories.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500">No vendor categories found. Add your first vendor category to get started.</p>
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendorCategories.map((category) => (
              <TableRow key={category.id} className="hover:bg-slate-50">
                <TableCell className="font-mono text-sm">{category.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{category.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-600">{category.description || '-'}</TableCell>
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

      <CreateEditVendorCategoryDialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedCategory(null);
        }}
        onVendorCategorySaved={onVendorCategorySaved}
        vendorCategory={selectedCategory}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor Category</AlertDialogTitle>
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