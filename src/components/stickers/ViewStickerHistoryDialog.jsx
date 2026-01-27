import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Clock } from "lucide-react";

export default function ViewStickerHistoryDialog({ open, onClose, stickerItem }) {
  const { data: movementLogs = [], isLoading } = useQuery({
    queryKey: ['stickerMovementLogs', stickerItem?.id],
    queryFn: () => base44.entities.StickerMovementLog.filter({ sticker_item_id: stickerItem.id }, '-created_date'),
    enabled: !!stickerItem?.id && open
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user ? user.full_name : email;
  };

  const getTechnicianName = (technicianId) => {
    if (!technicianId) return null;
    const user = users.find(u => u.id === technicianId);
    return user ? user.full_name : null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            History for Sticker Item
          </DialogTitle>
        </DialogHeader>
        
        {stickerItem && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm"><strong>Stop:</strong> {stickerItem.print_line_1}</p>
            <p className="text-sm"><strong>Print Lines:</strong> {stickerItem.print_line_2} / {stickerItem.print_line_3}</p>
          </div>
        )}

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : movementLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No history records found
                  </TableCell>
                </TableRow>
              ) : (
                movementLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_date), 'dd MMM yyyy, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{log.action_type}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.old_status && log.new_status && (
                        <div>Status: {log.old_status} → {log.new_status}</div>
                      )}
                      {log.old_custody_status && log.new_custody_status && (
                        <div>Custody: {log.old_custody_status} → {log.new_custody_status}</div>
                      )}
                      {log.technician_id && getTechnicianName(log.technician_id) && (
                        <div className="text-blue-600 font-medium">Technician: {getTechnicianName(log.technician_id)}</div>
                      )}
                      {log.reorder_reason && (
                        <div className="text-orange-600">Reason: {log.reorder_reason}</div>
                      )}
                      {log.notes && (
                        <div className="text-gray-600 italic">{log.notes}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{getUserName(log.user_email)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}