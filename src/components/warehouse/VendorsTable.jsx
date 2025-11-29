
import React, { useState } from "react";
import { Vendor } from "@/entities/Vendor";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Star } from "lucide-react";
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

import CreateEditVendorDialog from "./CreateEditVendorDialog";

export default function VendorsTable({ vendors, isLoading, onVendorSaved }) {
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  const handleEdit = (vendor) => {
    setSelectedVendor(vendor);
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!vendorToDelete) return;
    try {
      await Vendor.delete(vendorToDelete.id);
      onVendorSaved();
      setShowDeleteDialog(false);
      setVendorToDelete(null);
    } catch (error) {
      console.error("Error deleting vendor:", error);
    }
  };

  const getPhoneDisplay = (vendor) => {
    if (vendor.phone && vendor.mobile) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-sm">{vendor.phone}</span>
          <span className="text-xs text-slate-500">{vendor.mobile} (Mobile)</span>
        </div>
      );
    }
    if (vendor.phone) return vendor.phone;
    if (vendor.mobile) return `${vendor.mobile} (Mobile)`;
    return '-';
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

  if (vendors.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500">No vendors found. Add your first vendor to get started.</p>
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
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id} className="hover:bg-slate-50">
                <TableCell className="font-mono text-sm">{vendor.code}</TableCell>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell>{vendor.contact_person || '-'}</TableCell>
                <TableCell className="text-sm">{vendor.email || '-'}</TableCell>
                <TableCell className="text-sm">{getPhoneDisplay(vendor)}</TableCell>
                <TableCell>{vendor.lead_time_days || 0} days</TableCell>
                <TableCell>
                  {vendor.rating ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{vendor.rating}/5</span>
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Badge className={vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {vendor.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(vendor)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setVendorToDelete(vendor);
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

      <CreateEditVendorDialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedVendor(null);
        }}
        onVendorSaved={onVendorSaved}
        vendor={selectedVendor}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{vendorToDelete?.name}"? This action cannot be undone.
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
