import React, { useState } from 'react';
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, FileText, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ViewOfficialOrderDialog from './ViewOfficialOrderDialog';

export default function OfficialOrderTable({ items, isLoading, onEdit }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  const handleView = (item) => {
    setSelectedItem(item);
    setShowViewDialog(true);
  };
  
  const handleEditFromView = (item) => {
    setShowViewDialog(false);
    onEdit(item);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full mb-2" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead>Order Reference</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Order Type</TableHead>
            <TableHead>Implementation Schedule</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleView(item)}>
              <TableCell className="font-mono text-sm font-medium">{item.main_order_reference}</TableCell>
              <TableCell className="font-medium text-slate-900">{item.title}</TableCell>
              <TableCell>{item.order_date ? format(new Date(item.order_date), 'dd/MM/yyyy') : '-'}</TableCell>
              <TableCell>{item.order_type || '-'}</TableCell>
              <TableCell>{item.implementation_schedule ? format(new Date(item.implementation_schedule), 'dd/MM/yyyy') : '-'}</TableCell>
              <TableCell>{item.client_name || '-'}</TableCell>
              <TableCell>
                <Badge variant={item.is_active ? "default" : "secondary"}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(item); }}>
                      <Eye className="w-4 h-4 mr-2" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ViewOfficialOrderDialog 
        open={showViewDialog}
        onClose={() => setShowViewDialog(false)}
        item={selectedItem}
        onEdit={handleEditFromView}
      />
    </>
  );
}