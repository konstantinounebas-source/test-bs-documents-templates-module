import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Download, Upload, ArrowUpDown, ArrowUp, ArrowDown, Eye, AlertCircle } from "lucide-react";
import CreateEditStopDialog from "@/components/stickers/CreateEditStopDialog";
import ImportStopsDialog from "@/components/stickers/ImportStopsDialog";
import ViewStopDialog from "@/components/stickers/ViewStopDialog";
import ExcelJS from "exceljs";

export default function StopsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);
  const [filterShelterType, setFilterShelterType] = useState("all");
  const [filterInstalled, setFilterInstalled] = useState("all");
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const queryClient = useQueryClient();

  const { data: stops = [], isLoading } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list('-created_date')
  });

  const { data: shelterTypes = [] } = useQuery({
    queryKey: ['shelterTypes'],
    queryFn: () => base44.entities.ShelterType.list()
  });

  const { data: stickerItems = [] } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list()
  });

  const getShelterTypeName = (shelterTypeId) => {
    if (!shelterTypeId) return "-";
    const type = shelterTypes.find(t => t.id === shelterTypeId);
    return type ? type.shelter_type_id : "-";
  };

  const checkNameLengthExceeded = (stop) => {
    if (!stop.shelter_type_approved_id) return null;
    const shelterType = shelterTypes.find(t => t.id === stop.shelter_type_approved_id);
    if (!shelterType) return null;

    const warnings = [];
    if (shelterType.greek_name_max_chars && stop.greek_name && stop.greek_name.length > shelterType.greek_name_max_chars) {
      warnings.push(`Greek name exceeds ${shelterType.greek_name_max_chars} chars (${stop.greek_name.length})`);
    }
    if (shelterType.english_name_max_chars && stop.english_name && stop.english_name.length > shelterType.english_name_max_chars) {
      warnings.push(`English name exceeds ${shelterType.english_name_max_chars} chars (${stop.english_name.length})`);
    }
    
    return warnings.length > 0 ? warnings : null;
  };

  const checkStickersMismatch = (stop) => {
    if (!stop.shelter_type_approved_id) return false;
    
    // Get active (non-obsolete) stickers for this stop
    const activeStickers = stickerItems.filter(s => s.stop_id === stop.id && s.status !== "Obsolete");
    
    // Get the requirements for this shelter type
    const requirements = stickerItems
      .filter(s => s.stop_id === stop.id)
      .reduce((acc, sticker) => {
        const key = sticker.sticker_template_id;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    
    // Count active stickers by template
    const activeCounts = {};
    activeStickers.forEach(s => {
      const key = s.sticker_template_id;
      activeCounts[key] = (activeCounts[key] || 0) + 1;
    });
    
    // If we have obsolete stickers but they don't match current active ones, show warning
    const obsoleteStickers = stickerItems.filter(s => s.stop_id === stop.id && s.status === "Obsolete");
    if (obsoleteStickers.length > 0) {
      // Check if the count/templates have changed
      const obsoleteCounts = {};
      obsoleteStickers.forEach(s => {
        const key = s.sticker_template_id;
        obsoleteCounts[key] = (obsoleteCounts[key] || 0) + 1;
      });
      
      // Compare active vs obsolete counts - if different, templates changed
      const templatesChanged = Object.keys(obsoleteCounts).some(
        key => activeCounts[key] !== obsoleteCounts[key]
      );
      return templatesChanged;
    }
    
    return false;
  };

  const checkAllStickersInstalled = (stop) => {
    if (!stop.shelter_type_approved_id) return false;

    // Get all active stickers for this stop
    const stopStickers = stickerItems.filter(s => s.stop_id === stop.id && s.status !== "Obsolete");
    if (stopStickers.length === 0) return false;

    // Check if all active stickers have Installed = true or truthy value
    const allInstalled = stopStickers.every(s => s.installed);
    return allInstalled;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    return sortDirection === "asc" ? 
      <ArrowUp className="w-4 h-4 ml-1 inline" /> : 
      <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const filteredStops = stops.filter(stop => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      stop.stop_id?.toLowerCase().includes(term) ||
      stop.english_name?.toLowerCase().includes(term) ||
      stop.greek_name?.toLowerCase().includes(term)
    );

    const matchesShelterType = filterShelterType === "all" || 
      stop.shelter_type_initial_id === filterShelterType ||
      stop.shelter_type_approved_id === filterShelterType;

    const matchesInstalled = filterInstalled === "all" ||
      (filterInstalled === "yes" && stop.shelter_installed) ||
      (filterInstalled === "no" && !stop.shelter_installed);

    return matchesSearch && matchesShelterType && matchesInstalled;
  });

  const sortedStops = [...filteredStops].sort((a, b) => {
    if (!sortField) return 0;

    let aValue, bValue;

    if (sortField === "shelter_type_initial_id" || sortField === "shelter_type_approved_id") {
      aValue = getShelterTypeName(a[sortField]);
      bValue = getShelterTypeName(b[sortField]);
    } else if (sortField === "current_planned_installation_date") {
      aValue = a[sortField] || "";
      bValue = b[sortField] || "";
    } else if (sortField === "shelter_installed") {
      aValue = a[sortField] ? 1 : 0;
      bValue = b[sortField] ? 1 : 0;
    } else {
      aValue = a[sortField] || "";
      bValue = b[sortField] || "";
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleCreate = () => {
    setSelectedStop(null);
    setDialogOpen(true);
  };

  const handleEdit = (stop) => {
    setSelectedStop(stop);
    setDialogOpen(true);
  };

  const handleView = (stop) => {
    setSelectedStop(stop);
    setViewDialogOpen(true);
  };

  const handleStopSaved = () => {
    queryClient.invalidateQueries(['stops']);
  };

  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Stops");

    worksheet.columns = [
      { header: "Stop ID", key: "stop_id", width: 15 },
      { header: "English Name", key: "english_name", width: 30 },
      { header: "Greek Name", key: "greek_name", width: 30 },
      { header: "Shelter Type Initial", key: "shelter_type_initial", width: 20 },
      { header: "Shelter Type Approved", key: "shelter_type_approved", width: 20 },
      { header: "Planned Installation Date", key: "current_planned_installation_date", width: 25 },
      { header: "Shelter Installed", key: "shelter_installed", width: 18 },
      { header: "Comments", key: "comments", width: 40 }
    ];

    sortedStops.forEach(stop => {
      worksheet.addRow({
        stop_id: stop.stop_id,
        english_name: stop.english_name,
        greek_name: stop.greek_name,
        shelter_type_initial: getShelterTypeName(stop.shelter_type_initial_id),
        shelter_type_approved: getShelterTypeName(stop.shelter_type_approved_id),
        current_planned_installation_date: formatDateToDDMMYYYY(stop.current_planned_installation_date),
        shelter_installed: stop.shelter_installed ? "Yes" : "No",
        comments: stop.comments || ""
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stops_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
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
            <span>Stops</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                New Stop
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Stop ID, English or Greek name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={filterShelterType} onValueChange={setFilterShelterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Shelter Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shelter Types</SelectItem>
                  {shelterTypes.filter(t => t.active).map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.shelter_type_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterInstalled} onValueChange={setFilterInstalled}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Installation Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="yes">Installed</SelectItem>
                  <SelectItem value="no">Not Installed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stop ID</TableHead>
                  <TableHead>English Name</TableHead>
                  <TableHead>Greek Name</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("shelter_type_initial_id")}
                  >
                    Initial Type {getSortIcon("shelter_type_initial_id")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("shelter_type_approved_id")}
                  >
                    Approved Type {getSortIcon("shelter_type_approved_id")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("current_planned_installation_date")}
                  >
                    Planned Date {getSortIcon("current_planned_installation_date")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("shelter_installed")}
                  >
                    Shelter Installed {getSortIcon("shelter_installed")}
                  </TableHead>
                  <TableHead>All Stickers Installed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No stops found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedStops.map((stop) => (
                    <TableRow key={stop.id}>
                        <TableCell className="font-medium">{stop.stop_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {stop.english_name}
                            {stop.shelter_type_approved_id && (() => {
                              const shelterType = shelterTypes.find(t => t.id === stop.shelter_type_approved_id);
                              return shelterType?.english_name_max_chars && stop.english_name?.length > shelterType.english_name_max_chars ? (
                                <AlertCircle className="w-4 h-4 text-orange-500" title={`Exceeds ${shelterType.english_name_max_chars} chars (${stop.english_name.length})`} />
                              ) : null;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {stop.greek_name}
                            {stop.shelter_type_approved_id && (() => {
                              const shelterType = shelterTypes.find(t => t.id === stop.shelter_type_approved_id);
                              return shelterType?.greek_name_max_chars && stop.greek_name?.length > shelterType.greek_name_max_chars ? (
                                <AlertCircle className="w-4 h-4 text-orange-500" title={`Exceeds ${shelterType.greek_name_max_chars} chars (${stop.greek_name.length})`} />
                              ) : null;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleView(stop)}
                              title="View sticker items"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(stop)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{getShelterTypeName(stop.shelter_type_initial_id)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getShelterTypeName(stop.shelter_type_approved_id)}
                            {checkStickersMismatch(stop) && (
                              <AlertCircle className="w-4 h-4 text-red-500" title="Stickers may not match the approved type" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{stop.current_planned_installation_date || "-"}</TableCell>
                        <TableCell>{stop.shelter_installed ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          {checkAllStickersInstalled(stop) ? (
                            <span className="text-green-600 font-semibold">✓ Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </TableCell>
                      </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Total: {sortedStops.length} stops
          </div>
        </CardContent>
      </Card>

      <CreateEditStopDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        stop={selectedStop}
        onStopSaved={handleStopSaved}
      />

      <ImportStopsDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportComplete={handleStopSaved}
      />

      <ViewStopDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        stop={selectedStop}
      />
    </div>
  );
}