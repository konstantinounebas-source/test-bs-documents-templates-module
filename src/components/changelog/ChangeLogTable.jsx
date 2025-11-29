import React, { useState } from 'react';
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Paperclip } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import ViewChangeLogDialog from "./ViewChangeLogDialog";
import EditChangeLogDialog from "./EditChangeLogDialog";

export default function ChangeLogTable({ items, isLoading, onItemUpdated, statusColors, typeColors }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleView = (item) => {
    setSelectedItem(item);
    setShowViewDialog(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setShowEditDialog(true);
  };

  const handleEditFromView = (item) => {
    setSelectedItem(item);
    setShowViewDialog(false);
    setShowEditDialog(true);
  };

  const handleItemUpdated = () => {
    setShowEditDialog(false);
    setSelectedItem(null);
    onItemUpdated();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          📝
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Δεν βρέθηκαν καταχωρίσεις</h3>
        <p className="text-slate-600">Δοκιμάστε να προσαρμόσετε τα φίλτρα σας ή προσθέστε μια νέα καταχώριση.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">Τίτλος</TableHead>
              <TableHead className="font-semibold text-slate-700">Τύπος</TableHead>
              <TableHead className="font-semibold text-slate-700">Κατάσταση</TableHead>
              <TableHead className="font-semibold text-slate-700">Σχετική Σελίδα</TableHead>
              <TableHead className="font-semibold text-slate-700">Δημιουργός</TableHead>
              <TableHead className="font-semibold text-slate-700">Ημερομηνία</TableHead>
              <TableHead className="font-semibold text-slate-700">Έκδοση</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow 
                key={item.id} 
                className="hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => handleView(item)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    {item.file_urls && item.file_urls.length > 0 && (
                      <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2 max-w-96">
                      {item.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={typeColors[item.type] || "bg-gray-100 text-gray-800"}>
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[item.status] || "bg-gray-100 text-gray-800"}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600">
                    {item.related_page || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600">
                    {item.created_by_full_name || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600">
                    {item.created_date ? format(new Date(item.created_date), "dd/MM/yyyy") : '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600">
                    {item.implemented_in_release || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(item); }}>
                        <Eye className="w-4 h-4 mr-2" />
                        Προβολή
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Επεξεργασία
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <ViewChangeLogDialog
        open={showViewDialog}
        onClose={() => setShowViewDialog(false)}
        item={selectedItem}
        onEdit={handleEditFromView}
        statusColors={statusColors}
        typeColors={typeColors}
      />

      <EditChangeLogDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        item={selectedItem}
        onItemUpdated={handleItemUpdated}
      />
    </>
  );
}