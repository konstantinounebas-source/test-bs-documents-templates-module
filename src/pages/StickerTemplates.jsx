import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil, FileDown } from "lucide-react";
import ExcelJS from 'exceljs';
import { Badge } from "@/components/ui/badge";
import CreateEditStickerTemplateDialog from "@/components/stickers/CreateEditStickerTemplateDialog";

export default function StickerTemplatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: stickerTemplates = [], isLoading } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list('-created_date')
  });

  const filteredTemplates = stickerTemplates.filter(template => {
    const term = searchTerm.toLowerCase();
    return (
      template.sticker_template_id?.toLowerCase().includes(term) ||
      template.sticker_name_category?.toLowerCase().includes(term) ||
      template.default_vendor?.toLowerCase().includes(term)
    );
  });

  const handleCreate = () => {
    setSelectedTemplate(null);
    setDialogOpen(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleTemplateSaved = () => {
    queryClient.invalidateQueries(['stickerTemplates']);
  };

  const handleExportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sticker Templates');

    worksheet.columns = [
      { header: 'Template ID', key: 'template_id', width: 20 },
      { header: 'Name / Category', key: 'name_category', width: 30 },
      { header: 'Default Vendor', key: 'vendor', width: 25 },
      { header: 'Est. Delivery (days)', key: 'delivery_days', width: 20 },
      { header: 'Days Before Install', key: 'days_before', width: 20 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    filteredTemplates.forEach(template => {
      worksheet.addRow({
        template_id: template.sticker_template_id,
        name_category: template.sticker_name_category,
        vendor: template.default_vendor || "-",
        delivery_days: template.estimated_delivery_days || "-",
        days_before: template.days_before_installation_to_receive || "-",
        status: template.active ? "Active" : "Inactive"
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
    link.download = `sticker_templates_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sticker Templates</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportToExcel}>
                <FileDown className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                New Sticker Template
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Template ID, name, or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Template ID</TableHead>
                    <TableHead>Name / Category</TableHead>
                    <TableHead>Default Vendor</TableHead>
                    <TableHead>Est. Delivery (days)</TableHead>
                    <TableHead>Days Before Install (days)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No sticker templates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.sticker_template_id}</TableCell>
                      <TableCell>{template.sticker_name_category}</TableCell>
                      <TableCell>{template.default_vendor || "-"}</TableCell>
                      <TableCell>{template.estimated_delivery_days || "-"}</TableCell>
                      <TableCell>{template.days_before_installation_to_receive || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={template.active ? "default" : "secondary"}>
                          {template.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(template)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Total: {filteredTemplates.length} sticker templates
          </div>
        </CardContent>
      </Card>

      <CreateEditStickerTemplateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        stickerTemplate={selectedTemplate}
        onStickerTemplateSaved={handleTemplateSaved}
      />
    </div>
  );
}