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
import DataTableFilter from "@/components/delivery/DataTableFilter";
import PaginationControls from "@/components/warehouse/PaginationControls";

export default function OptionManagement({ 
  entity, 
  title, 
  description, 
  onUpdate, 
  accessLevel,
  enableFiltering = false,
  enablePagination = false
}) {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [newOptionData, setNewOptionData] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState(null);
  
  const [columnFilters, setColumnFilters] = useState({});
  const [columnSorts, setColumnSorts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  const handleColumnFilter = (column, filters, sortOrder) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: filters
    }));
    if (sortOrder) {
      setColumnSorts(prev => ({
        ...prev,
        [column]: sortOrder
      }));
    }
    setCurrentPage(1);
  };

  const applyFiltersAndSort = (data) => {
    let result = [...data];

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, filters]) => {
      if (filters && filters.length > 0) {
        result = result.filter(item => {
          let value;
          if (column === 'is_active') {
            value = item.is_active ? 'Active' : 'Inactive';
          } else {
            value = item[column] || '';
          }
          const stringValue = String(value);
          if (stringValue === '' && filters.includes('(Blanks)')) return true;
          return filters.includes(stringValue);
        });
      }
    });

    // Apply sorting
    Object.entries(columnSorts).forEach(([column, order]) => {
      result.sort((a, b) => {
        const aVal = a[column] || '';
        const bVal = b[column] || '';
        if (order === 'asc') {
          return String(aVal).localeCompare(String(bVal));
        } else {
          return String(bVal).localeCompare(String(aVal));
        }
      });
    });

    return result;
  };

  const filteredAndSortedOptions = enableFiltering ? applyFiltersAndSort(options) : options;

  // Pagination
  const totalItems = filteredAndSortedOptions.length;
  const startIndex = itemsPerPage === "all" ? 0 : (currentPage - 1) * parseInt(itemsPerPage);
  const endIndex = itemsPerPage === "all" ? totalItems : startIndex + parseInt(itemsPerPage);
  const paginatedOptions = enablePagination 
    ? (itemsPerPage === "all" ? filteredAndSortedOptions : filteredAndSortedOptions.slice(startIndex, endIndex))
    : filteredAndSortedOptions;

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await entity.create(newOptionData);
      setNewOptionData({ name: '', description: '', is_active: true });
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
                  <TableHead>
                    {enableFiltering ? (
                      <div className="flex items-center gap-1">
                        Name
                        <DataTableFilter
                          column="name"
                          data={options}
                          onFilterChange={handleColumnFilter}
                          currentFilters={columnFilters['name'] || []}
                        />
                      </div>
                    ) : 'Name'}
                  </TableHead>
                  <TableHead>
                    {enableFiltering ? (
                      <div className="flex items-center gap-1">
                        Description
                        <DataTableFilter
                          column="description"
                          data={options}
                          onFilterChange={handleColumnFilter}
                          currentFilters={columnFilters['description'] || []}
                        />
                      </div>
                    ) : 'Description'}
                  </TableHead>
                  <TableHead>
                    {enableFiltering ? (
                      <div className="flex items-center gap-1">
                        Status
                        <DataTableFilter
                          column="is_active"
                          data={options.map(o => ({ ...o, is_active: o.is_active ? 'Active' : 'Inactive' }))}
                          onFilterChange={handleColumnFilter}
                          currentFilters={columnFilters['is_active'] || []}
                        />
                      </div>
                    ) : 'Status'}
                  </TableHead>
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
                ) : paginatedOptions.length > 0 ? (
                  paginatedOptions.map((option) => (
                    <TableRow key={option.id}>
                      <TableCell className="font-medium">{option.name}</TableCell>
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

            {enablePagination && paginatedOptions.length > 0 && (
              <div className="border-t">
                <PaginationControls
                  currentPage={currentPage}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
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