import React, { useState } from "react";
import { BusStopType } from "@/entities/BusStopType";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Settings, Clock } from "lucide-react";
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

import CreateEditBusStopTypeDialog from "./CreateEditBusStopTypeDialog";

export default function BusStopTypesTable({ busStopTypes, components, products, isLoading, onTypeSaved, onManageBOM }) {
  const [selectedType, setSelectedType] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);

  const handleEdit = (type) => {
    setSelectedType(type);
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;
    try {
      await BusStopType.delete(typeToDelete.id);
      onTypeSaved();
      setShowDeleteDialog(false);
      setTypeToDelete(null);
    } catch (error) {
      console.error("Error deleting bus stop type:", error);
    }
  };

  const getComponentCount = (typeId) => {
    return components.filter(c => c.bus_stop_type_id === typeId).length;
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

  if (busStopTypes.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500">No bus stop types found. Create your first type to get started.</p>
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
              <TableHead>Category</TableHead>
              <TableHead>Components</TableHead>
              <TableHead>Install Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busStopTypes.map((type) => (
              <TableRow key={type.id} className="hover:bg-slate-50">
                <TableCell className="font-mono text-sm">{type.code}</TableCell>
                <TableCell className="font-medium">{type.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{type.category || 'N/A'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{getComponentCount(type.id)} items</span>
                  </div>
                </TableCell>
                <TableCell>
                  {type.estimated_installation_time_hours ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {type.estimated_installation_time_hours}h
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Badge className={type.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {type.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onManageBOM(type)}
                      title="Manage BOM"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setTypeToDelete(type);
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

      <CreateEditBusStopTypeDialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedType(null);
        }}
        onTypeSaved={onTypeSaved}
        busStopType={selectedType}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bus Stop Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{typeToDelete?.name}"? This will also delete its BOM configuration.
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