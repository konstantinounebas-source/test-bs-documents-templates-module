import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Edit, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CreateEditInvoiceCategoryDialog from "./CreateEditInvoiceCategoryDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function InvoiceCategoriesTable({ invoiceCategories, isLoading, onInvoiceCategorySaved }) {
  const [editingCategory, setEditingCategory] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowEditDialog(true);
  };

  const handleDialogClose = () => {
    setShowEditDialog(false);
    setEditingCategory(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (invoiceCategories.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Δεν βρέθηκαν κατηγορίες τιμολόγησης.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Όνομα</TableHead>
            <TableHead>Περιγραφή</TableHead>
            <TableHead>Κατάσταση</TableHead>
            <TableHead className="text-right">Ενέργειες</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoiceCategories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-semibold">{category.name}</TableCell>
              <TableCell className="text-slate-600">{category.description || '-'}</TableCell>
              <TableCell>
                <Badge className={category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {category.is_active ? 'Ενεργή' : 'Ανενεργή'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(category)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreateEditInvoiceCategoryDialog
        open={showEditDialog}
        onClose={handleDialogClose}
        onInvoiceCategorySaved={onInvoiceCategorySaved}
        invoiceCategory={editingCategory}
      />
    </>
  );
}