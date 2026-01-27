import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CreateEditShelterTypeDialog from "@/components/stickers/CreateEditShelterTypeDialog";
import ViewShelterTypeDialog from "@/components/stickers/ViewShelterTypeDialog";

export default function ShelterTypesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedShelterType, setSelectedShelterType] = useState(null);
  const queryClient = useQueryClient();

  const { data: shelterTypes = [], isLoading } = useQuery({
    queryKey: ['shelterTypes'],
    queryFn: () => base44.entities.ShelterType.list('-created_date')
  });

  const filteredShelterTypes = shelterTypes.filter(type => {
    const term = searchTerm.toLowerCase();
    return (
      type.shelter_type_id?.toLowerCase().includes(term) ||
      type.description?.toLowerCase().includes(term)
    );
  });

  const handleCreate = () => {
    setSelectedShelterType(null);
    setDialogOpen(true);
  };

  const handleEdit = (shelterType) => {
    setSelectedShelterType(shelterType);
    setDialogOpen(true);
  };

  const handleView = (shelterType) => {
    setSelectedShelterType(shelterType);
    setViewDialogOpen(true);
  };

  const handleShelterTypeSaved = () => {
    queryClient.invalidateQueries(['shelterTypes']);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Shelter Types</span>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Shelter Type
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Shelter Type ID or description..."
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
                  <TableHead>Shelter Type ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShelterTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No shelter types found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShelterTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.shelter_type_id}</TableCell>
                      <TableCell>{type.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={type.active ? "default" : "secondary"}>
                          {type.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(type)}
                            title="View sticker requirements"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(type)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Total: {filteredShelterTypes.length} shelter types
          </div>
        </CardContent>
      </Card>

      <CreateEditShelterTypeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        shelterType={selectedShelterType}
        onShelterTypeSaved={handleShelterTypeSaved}
      />

      <ViewShelterTypeDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        shelterType={selectedShelterType}
      />
    </div>
  );
}