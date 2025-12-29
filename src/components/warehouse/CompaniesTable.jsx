import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Edit, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CreateEditCompanyDialog from "./CreateEditCompanyDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CompaniesTable({ companies, isLoading, onCompanySaved }) {
  const [editingCompany, setEditingCompany] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleEdit = (company) => {
    setEditingCompany(company);
    setShowEditDialog(true);
  };

  const handleDialogClose = () => {
    setShowEditDialog(false);
    setEditingCompany(null);
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

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Δεν βρέθηκαν εταιρείες.</p>
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
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-semibold">{company.name}</TableCell>
              <TableCell className="text-slate-600">{company.description || '-'}</TableCell>
              <TableCell>
                <Badge className={company.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {company.is_active ? 'Ενεργή' : 'Ανενεργή'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(company)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreateEditCompanyDialog
        open={showEditDialog}
        onClose={handleDialogClose}
        onCompanySaved={onCompanySaved}
        company={editingCompany}
      />
    </>
  );
}