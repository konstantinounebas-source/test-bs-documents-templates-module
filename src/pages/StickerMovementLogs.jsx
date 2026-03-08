import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function StickerMovementLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const { data: movementLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['allStickerMovementLogs'],
    queryFn: () => base44.entities.StickerMovementLog.list('-created_date', 500)
  });

  const { data: stickerItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list()
  });

  const { data: stops = [], isLoading: stopsLoading } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const getStickerInfo = (stickerItemId) => {
    const item = stickerItems.find(i => i.id === stickerItemId);
    if (!item) return "-";
    const stop = stops.find(s => s.id === item.stop_id);
    return stop ? `${stop.stop_id} - ${item.print_line_2}` : item.print_line_1;
  };

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user ? user.full_name : email;
  };

  const getTechnicianName = (technicianId) => {
    if (!technicianId) return null;
    const user = users.find(u => u.id === technicianId);
    return user ? user.full_name : null;
  };

  const filteredLogs = movementLogs.filter(log => {
    const term = searchTerm.toLowerCase();
    const stickerInfo = getStickerInfo(log.sticker_item_id).toLowerCase();
    const userName = getUserName(log.user_email).toLowerCase();
    
    const matchesSearch = (
      stickerInfo.includes(term) ||
      userName.includes(term) ||
      log.action_type?.toLowerCase().includes(term) ||
      log.notes?.toLowerCase().includes(term)
    );

    const matchesAction = filterAction === "all" || log.action_type === filterAction;

    return matchesSearch && matchesAction;
  });

  const isLoading = logsLoading || itemsLoading || stopsLoading;

  const handleExportToExcel = async () => {
    alert('Excel export is not available');
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sticker Movement Logs</span>
            <div className="flex items-center gap-4">
              <div className="text-sm font-normal text-gray-600">
                Total: {filteredLogs.length} movements
              </div>
              <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                <FileDown className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by sticker, user, action, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="Created">Created</SelectItem>
                <SelectItem value="Ordered">Ordered</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
                <SelectItem value="Handover">Handover</SelectItem>
                <SelectItem value="Installed">Installed</SelectItem>
                <SelectItem value="Reorder">Reorder</SelectItem>
                <SelectItem value="Status Change">Status Change</SelectItem>
                <SelectItem value="Custody Change">Custody Change</SelectItem>
                <SelectItem value="Updated">Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Sticker Item</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No movement logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(log.created_date), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getStickerInfo(log.sticker_item_id)}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-blue-600">{log.action_type}</span>
                      </TableCell>
                      <TableCell className="text-sm max-w-md">
                        {log.old_status && log.new_status && (
                          <div>Status: <span className="text-orange-600">{log.old_status}</span> → <span className="text-green-600">{log.new_status}</span></div>
                        )}
                        {log.old_custody_status && log.new_custody_status && (
                          <div>Custody: <span className="text-orange-600">{log.old_custody_status}</span> → <span className="text-green-600">{log.new_custody_status}</span></div>
                        )}
                        {log.technician_id && getTechnicianName(log.technician_id) && (
                          <div className="text-blue-600 font-medium">Technician: {getTechnicianName(log.technician_id)}</div>
                        )}
                        {log.reorder_reason && (
                          <div className="text-red-600 font-medium">Reason: {log.reorder_reason}</div>
                        )}
                        {log.notes && (
                          <div className="text-gray-600 italic mt-1">{log.notes}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{getUserName(log.user_email)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}