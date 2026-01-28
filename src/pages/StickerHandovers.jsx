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
import ExcelJS from 'exceljs';

export default function StickerHandoversPage() {
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [givenDate, setGivenDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState({});
  const [loading, setLoading] = useState(false);
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

  const availableItems = stickerItems.filter(item => 
    item.status === "Received" && 
    (item.custody_status === "In Stock" || item.custody_status === "With Technician")
  );

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
              <span>Select Sticker Items ({Object.values(selectedItems).filter(Boolean).length} selected)</span>
              <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                <FileDown className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableItems.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No available sticker items to handover
              </p>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Stop</TableHead>
                      <TableHead>Sticker Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Custody</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems[item.id] || false}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell>{getStickerItemDisplay(item)}</TableCell>
                        <TableCell>
                          {stickerTemplates.find(t => t.id === item.sticker_template_id)?.sticker_name_category || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">{item.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.custody_status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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