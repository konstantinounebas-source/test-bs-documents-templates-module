import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";
import { Search, Edit, PackageCheck, Users, AlertCircle, CheckCircle, History, FileDown } from "lucide-react";
import ExcelJS from 'exceljs';
import { Badge } from "@/components/ui/badge";
import EditStickerItemDialog from "@/components/stickers/EditStickerItemDialog";
import ReorderStickerDialog from "@/components/stickers/ReorderStickerDialog";
import HandoverStickerDialog from "@/components/stickers/HandoverStickerDialog";
import ViewStickerHistoryDialog from "@/components/stickers/ViewStickerHistoryDialog";

export default function StickerItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [filterCustodyStatuses, setFilterCustodyStatuses] = useState([]);
  const [filterTemplates, setFilterTemplates] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const queryClient = useQueryClient();

  const { data: stickerItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list('-created_date')
  });

  const { data: stops = [], isLoading: stopsLoading } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list()
  });

  const { data: stickerTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list()
  });

  const { data: appUsers = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.AppUser.list()
  });

  const getStopName = (stopId) => {
    const stop = stops.find(s => s.id === stopId);
    return stop ? stop.stop_id : "-";
  };

  const getStopGreekName = (stopId) => {
    const stop = stops.find(s => s.id === stopId);
    return stop ? stop.greek_name : "-";
  };

  const getStickerTemplateName = (templateId) => {
    const template = stickerTemplates.find(t => t.id === templateId);
    return template ? template.sticker_name_category : "-";
  };

  const getCustodianName = (custodianId) => {
     if (!custodianId) return "-";
     const user = appUsers.find(u => u.id === custodianId);
     return user ? (user.full_name || user.name) : "-";
   };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries(['stickerItems']);
  };

  const handleReceived = async (item) => {
    const user = await base44.auth.me();
    const oldStatus = item.status;
    const oldCustody = item.custody_status;
    
    await base44.entities.StickerItem.update(item.id, {
      status: "Received",
      custody_status: "In Stock",
      need_reorder: false
    });
    
    await base44.entities.StickerMovementLog.create({
      sticker_item_id: item.id,
      action_type: "Received",
      old_status: oldStatus,
      new_status: "Received",
      old_custody_status: oldCustody,
      new_custody_status: "In Stock",
      user_email: user.email
    });
    
    queryClient.invalidateQueries(['stickerItems']);
  };

  const handleHandover = (item) => {
    setSelectedItem(item);
    setHandoverDialogOpen(true);
  };

  const handleHandoverConfirm = async (data) => {
    const user = await base44.auth.me();
    const oldCustody = selectedItem.custody_status;
    
    await base44.entities.StickerItem.update(selectedItem.id, data);
    
    await base44.entities.StickerMovementLog.create({
      sticker_item_id: selectedItem.id,
      action_type: "Handover",
      old_custody_status: oldCustody,
      new_custody_status: data.custody_status,
      technician_id: data.current_custodian_id,
      user_email: user.email
    });
    
    queryClient.invalidateQueries(['stickerItems']);
  };

  const handleReorder = (item) => {
    setSelectedItem(item);
    setReorderDialogOpen(true);
  };

  const handleReorderConfirm = async (data) => {
    const user = await base44.auth.me();
    const oldStatus = selectedItem.status;
    
    await base44.entities.StickerItem.update(selectedItem.id, data);
    
    await base44.entities.StickerMovementLog.create({
      sticker_item_id: selectedItem.id,
      action_type: "Reorder",
      old_status: oldStatus,
      new_status: data.status,
      reorder_reason: data.reorder_reason,
      notes: data.comments,
      user_email: user.email
    });
    
    queryClient.invalidateQueries(['stickerItems']);
  };

  const handleInstalled = async (item) => {
    const user = await base44.auth.me();
    const oldStatus = item.status;
    const oldCustody = item.custody_status;
    
    await base44.entities.StickerItem.update(item.id, {
      status: "Installed",
      installed: true,
      installed_date: new Date().toISOString().split('T')[0],
      custody_status: "Installed"
    });
    
    await base44.entities.StickerMovementLog.create({
      sticker_item_id: item.id,
      action_type: "Installed",
      old_status: oldStatus,
      new_status: "Installed",
      old_custody_status: oldCustody,
      new_custody_status: "Installed",
      user_email: user.email
    });
    
    queryClient.invalidateQueries(['stickerItems']);
  };

  const handleExportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sticker Items');

    worksheet.columns = [
      { header: 'Stop ID', key: 'stop_id', width: 15 },
      { header: 'Greek Name', key: 'greek_name', width: 30 },
      { header: 'English Name', key: 'english_name', width: 30 },
      { header: 'Sticker Template', key: 'sticker_template', width: 25 },
      { header: 'Print Line 1', key: 'print_line_1', width: 20 },
      { header: 'Print Line 2', key: 'print_line_2', width: 20 },
      { header: 'Print Line 3', key: 'print_line_3', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Custody Status', key: 'custody_status', width: 20 },
      { header: 'Current Custodian', key: 'custodian', width: 25 },
      { header: 'Installed', key: 'installed', width: 10 },
      { header: 'Installed Date', key: 'installed_date', width: 15 },
      { header: 'Need Reorder', key: 'need_reorder', width: 15 },
      { header: 'Reorder Reason', key: 'reorder_reason', width: 20 }
    ];

    filteredItems.forEach(item => {
      worksheet.addRow({
        stop_id: getStopName(item.stop_id),
        greek_name: stops.find(s => s.id === item.stop_id)?.greek_name || '-',
        english_name: stops.find(s => s.id === item.stop_id)?.english_name || '-',
        sticker_template: getStickerTemplateName(item.sticker_template_id),
        print_line_1: item.print_line_1 || '-',
        print_line_2: item.print_line_2 || '-',
        print_line_3: item.print_line_3 || '-',
        status: item.status,
        custody_status: item.custody_status || '-',
        custodian: getCustodianName(item.current_custodian_id),
        installed: item.installed ? 'Yes' : 'No',
        installed_date: item.installed_date || '-',
        need_reorder: item.need_reorder ? 'Yes' : 'No',
        reorder_reason: item.reorder_reason || '-'
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sticker_items_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    const variants = {
      Needed: "secondary",
      Ordered: "outline",
      Received: "default",
      Installed: "default"
    };
    const colors = {
      Needed: "bg-yellow-100 text-yellow-800",
      Ordered: "bg-blue-100 text-blue-800",
      Received: "bg-green-100 text-green-800",
      Installed: "bg-gray-100 text-gray-800"
    };
    return <Badge className={colors[status]}>{status}</Badge>;
  };

  const filteredItems = stickerItems.filter(item => {
    const term = searchTerm.toLowerCase();
    const stopName = getStopName(item.stop_id).toLowerCase();
    const templateName = getStickerTemplateName(item.sticker_template_id).toLowerCase();
    
    const matchesSearch = (
      stopName.includes(term) ||
      templateName.includes(term) ||
      item.print_line_1?.toLowerCase().includes(term) ||
      item.print_line_2?.toLowerCase().includes(term) ||
      item.print_line_3?.toLowerCase().includes(term)
    );

    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(item.status);
    const matchesCustodyStatus = filterCustodyStatuses.length === 0 || filterCustodyStatuses.includes(item.custody_status);
    const matchesTemplate = filterTemplates.length === 0 || filterTemplates.includes(item.sticker_template_id);

    return matchesSearch && matchesStatus && matchesCustodyStatus && matchesTemplate;
  });

  const isLoading = itemsLoading || stopsLoading || templatesLoading;

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sticker Items</span>
            <div className="flex items-center gap-4">
              <div className="text-sm font-normal text-gray-600">
                Total: {filteredItems.length} items
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
                placeholder="Search by stop, template, or print lines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-600 mb-1">Status</Label>
                <MultiSelect
                  options={[
                    { value: "Needed", label: "Needed" },
                    { value: "Ordered", label: "Ordered" },
                    { value: "Received", label: "Received" },
                    { value: "Installed", label: "Installed" }
                  ]}
                  selected={filterStatuses}
                  onChange={setFilterStatuses}
                  placeholder="All Statuses"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1">Custody Status</Label>
                <MultiSelect
                  options={[
                    { value: "In Stock", label: "In Stock" },
                    { value: "With Technician", label: "With Technician" },
                    { value: "Installed", label: "Installed" },
                    { value: "Lost", label: "Lost" },
                    { value: "Damaged", label: "Damaged" }
                  ]}
                  selected={filterCustodyStatuses}
                  onChange={setFilterCustodyStatuses}
                  placeholder="All Custody Statuses"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1">Sticker Template</Label>
                <MultiSelect
                  options={stickerTemplates.map(t => ({
                    value: t.id,
                    label: t.sticker_name_category
                  }))}
                  selected={filterTemplates}
                  onChange={setFilterTemplates}
                  placeholder="All Templates"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stop</TableHead>
                  <TableHead>Ονομασία Στάσης</TableHead>
                  <TableHead>Ονομασία</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Custody</TableHead>
                  <TableHead>Current Custodian</TableHead>
                  <TableHead>Installed</TableHead>
                  <TableHead className="w-[280px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No sticker items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                       <TableCell className="font-medium">{getStopName(item.stop_id)}</TableCell>
                       <TableCell>{getStopGreekName(item.stop_id)}</TableCell>
                       <TableCell>{getStickerTemplateName(item.sticker_template_id)}</TableCell>
                       <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        {(() => {
                          if (item.status === "Obsolete") {
                            return <Badge variant="outline">{item.obsolete_reason || "Obsolete"}</Badge>;
                          }
                          const displayStatus = (item.status === "Needed" || item.status === "Ordered") ? item.status : item.custody_status;
                          return <Badge variant="outline">{displayStatus}</Badge>;
                        })()}
                      </TableCell>
                      <TableCell>{getCustodianName(item.current_custodian_id)}</TableCell>
                      <TableCell>
                        {item.installed ? (
                          <span className="text-green-600">✓ {item.installed_date || ""}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReceived(item)}
                            title="Mark as Received"
                            disabled={item.status === "Received" || item.status === "Installed"}
                          >
                            <PackageCheck className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleHandover(item)}
                            title="Handover to Technician"
                            disabled={item.custody_status === "With Technician" || item.status !== "Received"}
                          >
                            <Users className="w-4 h-4 text-blue-600" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleInstalled(item)}
                            title="Mark as Installed"
                            disabled={item.installed}
                          >
                            <CheckCircle className="w-4 h-4 text-purple-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedItem(item);
                              setHistoryDialogOpen(true);
                            }}
                            title="View History"
                          >
                            <History className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditStickerItemDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        stickerItem={selectedItem}
        onSaved={handleSaved}
      />

      <ReorderStickerDialog
        open={reorderDialogOpen}
        onClose={() => setReorderDialogOpen(false)}
        stickerItem={selectedItem}
        onConfirm={handleReorderConfirm}
      />

      <HandoverStickerDialog
        open={handoverDialogOpen}
        onClose={() => setHandoverDialogOpen(false)}
        stickerItem={selectedItem}
        onConfirm={handleHandoverConfirm}
      />

      <ViewStickerHistoryDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        stickerItem={selectedItem}
      />
    </div>
  );
}