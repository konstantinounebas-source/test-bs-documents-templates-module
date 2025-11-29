
import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpDown, Eye, Edit, MessageSquare, Paperclip, Calendar, User, Tag, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import EditChangeLogDialog from './EditChangeLogDialog';
import ViewChangeLogDialog from './ViewChangeLogDialog'; // New import for view dialog

export default function AdvancedChangeLogTable({ items, isLoading, onItemUpdated, statusColors, typeColors, accessLevel }) {
  // Removed: sortConfig state, expandedRows state, editingItem state
  
  // New state for controlling dialogs and selected item
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Removed: sortedItems useMemo, requestSort function, toggleRow function

  const handleEdit = (item) => {
    setSelectedItem(item);
    setShowEditDialog(true);
  };

  // New function to handle viewing an item
  const handleView = (item) => {
    setSelectedItem(item);
    setShowViewDialog(true);
  };

  // Modified handleUpdate to close edit dialog and trigger parent update
  const handleUpdate = () => {
    setShowEditDialog(false);
    onItemUpdated();
  };

  // Removed: renderSortableHeader function

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              {/* Updated TableHeaders as per outline */}
              <TableHead className="w-[200px]">Τίτλος</TableHead>
              <TableHead className="w-[120px]">Κατάσταση</TableHead>
              <TableHead className="w-[100px]">Τύπος</TableHead>
              <TableHead className="w-[120px]">Σχετική Σελίδα</TableHead>
              <TableHead className="w-[100px]">Δημιουργός</TableHead>
              <TableHead className="w-[100px]">Ημερομηνία</TableHead>
              <TableHead className="text-right w-[120px]">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                </TableCell>
              </TableRow>
            ) : items.length > 0 ? ( // Iterating directly over items, no longer sortedItems
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="max-w-[180px]">
                      <p className="font-medium truncate" title={item.title}>{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-slate-500 truncate mt-1" title={item.description}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {/* Badge classes applied directly */}
                    <Badge className={statusColors[item.status] || 'bg-gray-100 text-gray-800'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={typeColors[item.type] || 'bg-gray-100 text-gray-800'}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">{item.related_page || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600 truncate max-w-[80px]" title={item.created_by_full_name}>
                        {item.created_by_full_name || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {format(new Date(item.created_date), 'dd/MM/yy')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      {/* View Button */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleView(item)}
                        title="Προβολή λεπτομερειών"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {accessLevel === 'full_access' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(item)}
                          title="Επεξεργασία"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                // Removed expanded row details
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {/* Updated empty state message */}
                  <div className="flex flex-col items-center gap-2">
                    <MessageSquare className="w-8 h-8 text-slate-400" />
                    <p className="text-slate-500">Δεν βρέθηκαν καταχωρήσεις.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <ViewChangeLogDialog 
        open={showViewDialog} 
        onClose={() => setShowViewDialog(false)} 
        item={selectedItem}
        statusColors={statusColors}
        typeColors={typeColors}
        onEdit={accessLevel === 'full_access' ? handleEdit : undefined}
      />

      {/* Edit Dialog */}
      {accessLevel === 'full_access' && (
        <EditChangeLogDialog 
          open={showEditDialog} 
          onClose={() => setShowEditDialog(false)} 
          item={selectedItem}
          onItemUpdated={() => {
            setShowEditDialog(false);
            onItemUpdated();
          }}
        />
      )}
    </>
  );
}

// InfoField component is preserved as it might be used within ViewChangeLogDialog
const InfoField = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <Icon className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  </div>
);
