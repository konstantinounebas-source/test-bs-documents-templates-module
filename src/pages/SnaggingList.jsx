
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye, AlertTriangle, Loader2, CheckCircle, XCircle, Upload, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePageAccess } from "@/components/lib/usePageAccess";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CreateEditSnagDialog from "@/components/delivery/CreateEditSnagDialog";
import ImportSnagsDialog from "@/components/delivery/ImportSnagsDialog";
import ViewSnagDialog from "@/components/delivery/ViewSnagDialog";
import DataTableFilter from "@/components/delivery/DataTableFilter";
import PaginationControls from "@/components/warehouse/PaginationControls";

export default function SnaggingListPage() {
  const { hasAccess, isLoading: accessLoading } = usePageAccess('SnaggingList');
  
  const [snags, setSnags] = useState([]);
  const [busStops, setBusStops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("open");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingSnag, setEditingSnag] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedSnag, setSelectedSnag] = useState(null);

  const [columnFilters, setColumnFilters] = useState({});
  const [columnSorts, setColumnSorts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (hasAccess) {
      loadAllData();
    }
  }, [hasAccess]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [snagsData, busStopsData] = await Promise.all([
        base44.entities.SnaggingList.list("-created_date"),
        base44.entities.BusStop.list()
      ]);
      
      setSnags(snagsData);
      setBusStops(busStopsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleCreateSnag = () => {
    setEditingSnag(null);
    setShowCreateDialog(true);
  };

  const handleViewSnag = (snag) => {
    setSelectedSnag(snag);
    setShowViewDialog(true);
  };

  const handleSnagSaved = () => {
    loadAllData();
    setShowCreateDialog(false);
    setEditingSnag(null);
  };

  const handleImported = () => {
    loadAllData();
    setShowImportDialog(false);
  };

  const handleSnagUpdated = () => {
    loadAllData();
  };

  const getBusStopInfo = (busStopId) => {
    return busStops.find(bs => bs.id === busStopId);
  };

  const handleColumnFilter = (column, filters, sortOrder) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: filters
    }));
    if (sortOrder) {
      setColumnSorts(prev => ({
        ...prev,
        [column]: sortOrder
      }));
    } else {
      // If sortOrder is not provided, remove previous sort for this column
      setColumnSorts(prev => {
        const newSorts = { ...prev };
        delete newSorts[column];
        return newSorts;
      });
    }
    setCurrentPage(1);
  };

  const exportToCsv = () => {
    if (filteredSnags.length === 0) return;
    
    // Use technical field names that match the import schema
    const headers = ['bus_stop_id', 'snag_type', 'snag_category', 'element_category', 'work_type', 'work_description', 'comments'];
    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '';
      let stringField = String(field);
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return '"' + stringField.replace(/"/g, '""') + '"';
      }
      return stringField;
    };

    const csvContent = [
      headers.join(','),
      ...filteredSnags.map(snag => {
        const busStop = getBusStopInfo(snag.bus_stop_id);
        return [
          escapeCsvField(busStop?.bus_stop_id || ''),
          escapeCsvField(snag.snag_type || ''),
          escapeCsvField(snag.snag_category || ''),
          escapeCsvField(snag.element_category || ''),
          escapeCsvField(snag.work_type || ''),
          escapeCsvField(snag.work_description || ''),
          escapeCsvField(snag.comments || '')
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'snagging_list_' + format(new Date(), 'yyyy-MM-dd') + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const applyFiltersAndSort = (snagsToProcess) => {
    let result = [...snagsToProcess];

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, filters]) => {
      if (filters && filters.length > 0) {
        result = result.filter(snag => {
          let value;
          if (column === 'bus_stop') {
            const busStop = getBusStopInfo(snag.bus_stop_id);
            value = busStop?.bus_stop_id || '';
          } else {
            value = snag[column] || '';
          }
          
          const stringValue = String(value);
          if (stringValue === '' && filters.includes('(Blanks)')) return true;
          return filters.includes(stringValue);
        });
      }
    });

    // Apply sorting
    Object.entries(columnSorts).forEach(([column, order]) => {
      result.sort((a, b) => {
        let aVal, bVal;
        
        if (column === 'bus_stop') {
          const busStopA = getBusStopInfo(a.bus_stop_id);
          const busStopB = getBusStopInfo(b.bus_stop_id);
          aVal = busStopA?.bus_stop_id || '';
          bVal = busStopB?.bus_stop_id || '';
        } else {
          aVal = a[column] || '';
          bVal = b[column] || '';
        }

        if (order === 'asc') {
          return String(aVal).localeCompare(String(bVal));
        } else {
          return String(bVal).localeCompare(String(aVal));
        }
      });
    });

    return result;
  };

  const filteredSnags = snags.filter(snag => {
    const busStop = getBusStopInfo(snag.bus_stop_id);
    const matchesSearch = 
      snag.work_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snag.snag_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snag.element_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      busStop?.bus_stop_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" ? true :
      activeTab === "open" ? !snag.closed :
      activeTab === "closed" ? snag.closed :
      activeTab === "internal" ? snag.snag_category === 'internal' && !snag.closed :
      activeTab === "external" ? snag.snag_category === 'external' && !snag.closed :
      activeTab === "ready" ? snag.ready_for_submission : true;
    
    return matchesSearch && matchesTab;
  });

  const filteredAndSortedSnags = applyFiltersAndSort(filteredSnags);

  // Pagination
  const totalItems = filteredAndSortedSnags.length;
  const startIndex = itemsPerPage === "all" ? 0 : (currentPage - 1) * parseInt(itemsPerPage);
  const endIndex = itemsPerPage === "all" ? totalItems : startIndex + parseInt(itemsPerPage);
  const paginatedSnags = itemsPerPage === "all" ? filteredAndSortedSnags : filteredAndSortedSnags.slice(startIndex, endIndex);

  const totalSnags = snags.length;
  const openSnags = snags.filter(s => !s.closed).length;
  const closedSnags = snags.filter(s => s.closed).length;
  const internalSnags = snags.filter(s => s.snag_category === 'internal' && !s.closed).length;
  const externalSnags = snags.filter(s => s.snag_category === 'external' && !s.closed).length;
  const readyForSubmission = snags.filter(s => s.ready_for_submission && !s.closed).length;

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Snagging List</h1>
          <p className="text-slate-600 mt-1">Διαχείριση εκκρεμοτήτων στάσεων λεωφορείου</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Σύνολο</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{totalSnags}</p>
                </div>
                <div className="p-3 rounded-full bg-slate-500">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Ανοιχτές</p>
                  <p className="text-2xl font-bold text-orange-600 mt-2">{openSnags}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-500">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Εσωτερικά</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{internalSnags}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Εξωτερικά</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">{externalSnags}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-500">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Κλειστές</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{closedSnags}</p>
                </div>
                <div className="p-3 rounded-full bg-green-500">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Έτοιμες</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{readyForSubmission}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Εκκρεμότητες</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportToCsv} disabled={filteredSnags.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Εισαγωγή CSV
                </Button>
                <Button onClick={handleCreateSnag}>
                  <Plus className="w-4 h-4 mr-2" />
                  Νέα Εκκρεμότητα
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Αναζήτηση εκκρεμότητας..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="all">Όλες ({totalSnags})</TabsTrigger>
                  <TabsTrigger value="open">Ανοιχτές ({openSnags})</TabsTrigger>
                  <TabsTrigger value="internal">Εσωτερικά ({internalSnags})</TabsTrigger>
                  <TabsTrigger value="external">Εξωτερικά ({externalSnags})</TabsTrigger>
                  <TabsTrigger value="closed">Κλειστές ({closedSnags})</TabsTrigger>
                  <TabsTrigger value="ready">Έτοιμες ({readyForSubmission})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              Στάση
                              <DataTableFilter
                                column="bus_stop"
                                data={filteredSnags.map(s => ({
                                  ...s,
                                  bus_stop: getBusStopInfo(s.bus_stop_id)?.bus_stop_id || ''
                                }))}
                                onFilterChange={handleColumnFilter}
                                currentFilters={columnFilters['bus_stop'] || []}
                                currentSort={columnSorts['bus_stop']}
                              />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              Κατηγορία
                              <DataTableFilter
                                column="snag_category"
                                data={filteredSnags}
                                onFilterChange={handleColumnFilter}
                                currentFilters={columnFilters['snag_category'] || []}
                                currentSort={columnSorts['snag_category']}
                              />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              Τύπος
                              <DataTableFilter
                                column="snag_type"
                                data={filteredSnags}
                                onFilterChange={handleColumnFilter}
                                currentFilters={columnFilters['snag_type'] || []}
                                currentSort={columnSorts['snag_type']}
                              />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              Στοιχείο
                              <DataTableFilter
                                column="element_category"
                                data={filteredSnags}
                                onFilterChange={handleColumnFilter}
                                currentFilters={columnFilters['element_category'] || []}
                                currentSort={columnSorts['element_category']}
                              />
                            </div>
                          </TableHead>
                          <TableHead>Περιγραφή</TableHead>
                          <TableHead>Φωτογραφία</TableHead>
                          <TableHead>Τεχνικός</TableHead>
                          <TableHead>Κατάσταση</TableHead>
                          <TableHead className="text-right">Ενέργειες</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : paginatedSnags.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                              Δεν βρέθηκαν εκκρεμότητες
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedSnags.map((snag) => {
                            const busStop = getBusStopInfo(snag.bus_stop_id);
                            return (
                              <TableRow key={snag.id}>
                                <TableCell className="font-medium">
                                  {busStop?.bus_stop_id || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <Badge className={
                                    snag.snag_category === 'internal' ? 
                                      'bg-blue-100 text-blue-800' : 
                                      'bg-purple-100 text-purple-800'
                                  }>
                                    {snag.snag_category === 'internal' ? 'Εσωτερικό' : 'Εξωτερικό'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{snag.snag_type}</TableCell>
                                <TableCell>{snag.element_category}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {snag.work_description}
                                </TableCell>
                                <TableCell>
                                  {snag.photo_taken ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Ναι
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Όχι</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {snag.technician_completed ? (
                                    <Badge className="bg-blue-100 text-blue-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Ναι
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Όχι</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {snag.closed ? (
                                    <Badge className="bg-green-100 text-green-800">Κλειστή</Badge>
                                  ) : snag.ready_for_submission ? (
                                    <Badge className="bg-blue-100 text-blue-800">Έτοιμη</Badge>
                                  ) : snag.reopened ? (
                                    <Badge className="bg-red-100 text-red-800">Επανενεργοποιημένη</Badge>
                                  ) : (
                                    <Badge className="bg-orange-100 text-orange-800">Ανοιχτή</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => handleViewSnag(snag)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <PaginationControls
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(value) => {
                      setItemsPerPage(value);
                      setCurrentPage(1);
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateEditSnagDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingSnag(null);
        }}
        snag={editingSnag}
        onSaved={handleSnagSaved}
      />

      <ImportSnagsDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImported={handleImported}
      />

      <ViewSnagDialog
        open={showViewDialog}
        onClose={() => {
          setShowViewDialog(false);
          setSelectedSnag(null);
        }}
        snag={selectedSnag}
        busStop={selectedSnag ? getBusStopInfo(selectedSnag.bus_stop_id) : null}
        onUpdated={handleSnagUpdated}
      />
    </div>
  );
}
