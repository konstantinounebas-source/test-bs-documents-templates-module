import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil } from "lucide-react";
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

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sticker Templates</span>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Sticker Template
            </Button>
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
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No sticker templates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.sticker_template_id}</TableCell>
                      <TableCell>{template.sticker_name_category}</TableCell>
                      <TableCell>{template.default_vendor || "-"}</TableCell>
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