import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import CreateEditMaterialCategoryDialog from "./CreateEditMaterialCategoryDialog";

export default function MaterialCategoriesTable({ materialCategories, isLoading, onMaterialCategorySaved }) {
  const [editingMaterialCategory, setEditingMaterialCategory] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleEdit = (materialCategory) => {
    setEditingMaterialCategory(materialCategory);
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την κατηγορία υλικού;")) return;
    
    setDeletingId(id);
    try {
      await base44.entities.MaterialCategory.delete(id);
      onMaterialCategorySaved();
    } catch (error) {
      console.error("Error deleting material category:", error);
      alert("Σφάλμα κατά τη διαγραφή της κατηγορίας υλικού");
    }
    setDeletingId(null);
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    setEditingMaterialCategory(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (materialCategories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Δεν βρέθηκαν κατηγορίες υλικών</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Κατηγορία Υλικού</TableHead>
              <TableHead className="font-semibold">Κωδικός</TableHead>
              <TableHead className="font-semibold">Περιγραφή</TableHead>
              <TableHead className="font-semibold">Χρώμα</TableHead>
              <TableHead className="font-semibold">Κατάσταση</TableHead>
              <TableHead className="text-right font-semibold">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materialCategories.map((materialCategory) => (
              <TableRow key={materialCategory.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">{materialCategory.name}</TableCell>
                <TableCell className="text-slate-600">{materialCategory.code || '-'}</TableCell>
                <TableCell className="text-slate-600">{materialCategory.description || '-'}</TableCell>
                <TableCell>
                  {materialCategory.color_code && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border border-slate-300"
                        style={{ backgroundColor: materialCategory.color_code }}
                      />
                      <span className="text-xs text-slate-500">{materialCategory.color_code}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={materialCategory.is_active ? "default" : "secondary"}>
                    {materialCategory.is_active ? "Ενεργή" : "Ανενεργή"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(materialCategory)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(materialCategory.id)}
                      disabled={deletingId === materialCategory.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === materialCategory.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateEditMaterialCategoryDialog
        open={showDialog}
        onClose={handleDialogClose}
        onMaterialCategorySaved={onMaterialCategorySaved}
        materialCategory={editingMaterialCategory}
      />
    </>
  );
}