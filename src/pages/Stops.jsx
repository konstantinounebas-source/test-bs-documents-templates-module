import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil } from "lucide-react";
import CreateEditStopDialog from "@/components/stickers/CreateEditStopDialog";

export default function StopsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);
  const queryClient = useQueryClient();

  const { data: stops = [], isLoading } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list('-created_date')
  });

  const { data: shelterTypes = [] } = useQuery({
    queryKey: ['shelterTypes'],
    queryFn: () => base44.entities.ShelterType.list()
  });

  const getShelterTypeName = (shelterTypeId) => {
    if (!shelterTypeId) return "-";
    const type = shelterTypes.find(t => t.id === shelterTypeId);
    return type ? type.shelter_type_id : "-";
  };

  const filteredStops = stops.filter(stop => {
    const term = searchTerm.toLowerCase();
    return (
      stop.stop_id?.toLowerCase().includes(term) ||
      stop.english_name?.toLowerCase().includes(term) ||
      stop.greek_name?.toLowerCase().includes(term)
    );
  });

  const handleCreate = () => {
    setSelectedStop(null);
    setDialogOpen(true);
  };

  const handleEdit = (stop) => {
    setSelectedStop(stop);
    setDialogOpen(true);
  };

  const handleStopSaved = () => {
    queryClient.invalidateQueries(['stops']);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Stops</span>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Stop
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Stop ID, English or Greek name..."
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
                  <TableHead>Stop ID</TableHead>
                  <TableHead>English Name</TableHead>
                  <TableHead>Greek Name</TableHead>
                  <TableHead>Initial Type</TableHead>
                  <TableHead>Approved Type</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Shelter Installed</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No stops found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStops.map((stop) => (
                    <TableRow key={stop.id}>
                      <TableCell className="font-medium">{stop.stop_id}</TableCell>
                      <TableCell>{stop.english_name}</TableCell>
                      <TableCell>{stop.greek_name}</TableCell>
                      <TableCell>{getShelterTypeName(stop.shelter_type_initial_id)}</TableCell>
                      <TableCell>{getShelterTypeName(stop.shelter_type_approved_id)}</TableCell>
                      <TableCell>{stop.current_planned_installation_date || "-"}</TableCell>
                      <TableCell>{stop.shelter_installed ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(stop)}
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
            Total: {filteredStops.length} stops
          </div>
        </CardContent>
      </Card>

      <CreateEditStopDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        stop={selectedStop}
        onStopSaved={handleStopSaved}
      />
    </div>
  );
}