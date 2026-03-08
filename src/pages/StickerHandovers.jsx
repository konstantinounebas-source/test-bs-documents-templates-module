import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save, Users, FileDown } from "lucide-react";
import ExcelJS from 'npm:exceljs';
import ExportHandoverTemplateDialog from "@/components/stickers/ExportHandoverTemplateDialog";
import ImportHandoverFromFileDialog from "@/components/stickers/ImportHandoverFromFileDialog";
import { Loader2 } from "lucide-react";

export default function StickerHandoversPage() {
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [givenDate, setGivenDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stickerTypeFilter, setStickerTypeFilter] = useState("all");
  const [sortField, setSortField] = useState("stop_id");
  const [sortDirection, setSortDirection] = useState("asc");
  const queryClient = useQueryClient();

  const { data: appUsers = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.AppUser.list()
  });

  const { data: stickerItems = [] } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list()
  });

  const { data: stops = [] } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list()
  });

  const { data: stickerTemplates = [] } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list()
  });

  const getStickerItemDisplay = (item) => {
    const stop = stops.find(s => s.id === item.stop_id);
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    return `${stop?.stop_id || "?"} - ${template?.sticker_name_category || "?"}`;
  };

  // Only show items that are In Stock (not with technician)
  const inStockItems = stickerItems.filter(item => 
    item.status === "Received" && 
    item.custody_status === "In Stock"
  );

  // Get unique sticker types for filter
  const stickerTypes = Array.from(new Set(
    inStockItems.map(item => {
      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
      return template?.sticker_name_category;
    }).filter(Boolean)
  )).sort();

  // Filter and sort items
  const filteredAndSortedItems = inStockItems
    .filter(item => {
      const stop = stops.find(s => s.id === item.stop_id);
      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        stop?.stop_id?.toLowerCase().includes(searchLower) ||
        template?.sticker_name_category?.toLowerCase().includes(searchLower);
      
      const matchesStickerType = stickerTypeFilter === "all" || 
        template?.sticker_name_category === stickerTypeFilter;
      
      return matchesSearch && matchesStickerType;
    })
    .sort((a, b) => {
      const stopA = stops.find(s => s.id === a.stop_id);
      const stopB = stops.find(s => s.id === b.stop_id);
      const templateA = stickerTemplates.find(t => t.id === a.sticker_template_id);
      const templateB = stickerTemplates.find(t => t.id === b.sticker_template_id);

      let compareValue = 0;
      if (sortField === "stop_id") {
        compareValue = (stopA?.stop_id || "").localeCompare(stopB?.stop_id || "");
      } else if (sortField === "sticker_type") {
        compareValue = (templateA?.sticker_name_category || "").localeCompare(templateB?.sticker_name_category || "");
      }

      return sortDirection === "asc" ? compareValue : -compareValue;
    });

  const availableItems = inStockItems;

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleExportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Available Sticker Items');

    worksheet.columns = [
      { header: 'Stop ID', key: 'stop_id', width: 15 },
      { header: 'Sticker Template', key: 'sticker_template', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Custody Status', key: 'custody_status', width: 20 }
    ];

    availableItems.forEach(item => {
      const stop = stops.find(s => s.id === item.stop_id);
      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
      
      worksheet.addRow({
        stop_id: stop?.stop_id || '-',
        sticker_template: template?.sticker_name_category || '-',
        status: item.status,
        custody_status: item.custody_status
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
    link.download = `available_sticker_items_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTechnician) return;

    const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    if (selectedItemIds.length === 0) {
      alert("Please select at least one sticker item");
      return;
    }

    setLoading(true);

    try {
      const user = await base44.auth.me();

      // Create handover
      const handover = await base44.entities.StickerHandover.create({
        technician_id: selectedTechnician,
        given_by: user.email,
        given_date: givenDate,
        notes: notes
      });

      // Create handover lines and update sticker items
      for (const itemId of selectedItemIds) {
        await base44.entities.HandoverLine.create({
          handover_id: handover.id,
          sticker_item_id: itemId,
          quantity: 1
        });

        await base44.entities.StickerItem.update(itemId, {
          current_custodian_id: selectedTechnician,
          custody_status: "With Technician"
        });
      }

      queryClient.invalidateQueries(['stickerItems']);

      // Reset form
      setSelectedTechnician("");
      setGivenDate(new Date().toISOString().slice(0, 16));
      setNotes("");
      setSelectedItems({});

      alert("Handover created successfully!");
    } catch (error) {
      console.error("Error creating handover:", error);
    }

    setLoading(false);
  };

  const handleImportItems = async (itemsToImport) => {
    if (!selectedTechnician) {
      alert("Please select a technician first");
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();

      // Create handover
      const handover = await base44.entities.StickerHandover.create({
        technician_id: selectedTechnician,
        given_by: user.email,
        given_date: new Date().toISOString(),
        notes: "Imported from file"
      });

      // Create handover lines and update sticker items
      for (const item of itemsToImport) {
        await base44.entities.HandoverLine.create({
          handover_id: handover.id,
          sticker_item_id: item.stickerId,
          quantity: item.quantity
        });

        await base44.entities.StickerItem.update(item.stickerId, {
          current_custodian_id: selectedTechnician,
          custody_status: "With Technician"
        });
      }

      queryClient.invalidateQueries(['stickerItems']);

      alert("Handover created successfully from imported data!");
    } catch (error) {
      console.error("Error creating handover from import:", error);
      alert("Error creating handover");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold">Handover Stickers to Technician</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Handover Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="technician">Technician *</Label>
                <Select
                  value={selectedTechnician}
                  onValueChange={setSelectedTechnician}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                     {appUsers.map((user) => (
                       <SelectItem key={user.id} value={user.id}>
                         {user.full_name || user.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="given_date">Handover Date & Time *</Label>
                <Input
                  id="given_date"
                  type="datetime-local"
                  value={givenDate}
                  onChange={(e) => setGivenDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Sticker Items (In Stock Only - {Object.values(selectedItems).filter(Boolean).length} selected)</span>
              <div className="flex gap-2">
                <ExportHandoverTemplateDialog 
                  availableItems={availableItems}
                  stops={stops}
                  stickerTemplates={stickerTemplates}
                />
                <ImportHandoverFromFileDialog 
                  onClose={() => {}}
                  onItemsImported={handleImportItems}
                  stops={stops}
                  stickerItems={availableItems}
                  stickerTemplates={stickerTemplates}
                />
                <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Search</Label>
                  <Input
                    placeholder="Search by Stop ID or Sticker Type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Sticker Type</Label>
                  <Select value={stickerTypeFilter} onValueChange={setStickerTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {stickerTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sort By</Label>
                  <div className="flex gap-2">
                    <Select value={sortField} onValueChange={setSortField}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stop_id">Stop ID</SelectItem>
                        <SelectItem value="sticker_type">Sticker Type</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
                    >
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </Button>
                  </div>
                </div>
              </div>

              {filteredAndSortedItems.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No sticker items found matching filters
                </p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={filteredAndSortedItems.every(item => selectedItems[item.id])}
                            onCheckedChange={(checked) => {
                              const newSelected = {};
                              if (checked) {
                                filteredAndSortedItems.forEach(item => {
                                  newSelected[item.id] = true;
                                });
                              }
                              setSelectedItems(newSelected);
                            }}
                          />
                        </TableHead>
                        <TableHead>Stop ID</TableHead>
                        <TableHead>Sticker Template</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedItems.map((item) => {
                        const stop = stops.find(s => s.id === item.stop_id);
                        const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedItems[item.id] || false}
                                onCheckedChange={() => toggleItemSelection(item.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{stop?.stop_id || "-"}</TableCell>
                            <TableCell>{template?.sticker_name_category || "-"}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">In Stock</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedTechnician && (
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Creating..." : "Create Handover"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}