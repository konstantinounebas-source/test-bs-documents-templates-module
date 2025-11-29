
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye, Package, Loader2, AlertTriangle, CheckCircle, Upload, Download, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePageAccess } from "@/components/lib/usePageAccess";
import { format } from "date-fns";
import CreateEditBusStopDialog from "@/components/delivery/CreateEditBusStopDialog";
import ViewBusStopDialog from "@/components/delivery/ViewBusStopDialog";
import ImportBusStopsDialog from "@/components/delivery/ImportBusStopsDialog";
import BulkEditDeliveryStatusDialog from "@/components/delivery/BulkEditDeliveryStatusDialog";

export default function BusStopDeliveryPage() {
  const { hasAccess, isLoading: accessLoading } = usePageAccess('BusStopDelivery');
  
  const [busStops, setBusStops] = useState([]);
  const [statesOfDelivery, setStatesOfDelivery] = useState([]);
  const [snaggingLists, setSnaggingLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingBusStop, setEditingBusStop] = useState(null);
  const [selectedBusStop, setSelectedBusStop] = useState(null);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);

  useEffect(() => {
    if (hasAccess) {
      loadAllData();
    }
  }, [hasAccess]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [busStopsData, statesData, snagsData] = await Promise.all([
        base44.entities.BusStop.list(),
        base44.entities.StateOfDelivery.list(),
        base44.entities.SnaggingList.list()
      ]);
      
      setBusStops(busStopsData);
      setStatesOfDelivery(statesData);
      setSnaggingLists(snagsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const getDeliveryState = (busStopId) => {
    return statesOfDelivery.find(s => s.bus_stop_id === busStopId);
  };

  const getOpenSnags = (busStopId) => {
    return snaggingLists.filter(s => s.bus_stop_id === busStopId && !s.closed);
  };

  const getOpenInternalSnags = (busStopId) => {
    return snaggingLists.filter(s => s.bus_stop_id === busStopId && !s.closed && s.snag_category === 'internal');
  };

  const getOpenExternalSnags = (busStopId) => {
    return snaggingLists.filter(s => s.bus_stop_id === busStopId && !s.closed && s.snag_category === 'external');
  };

  const getCurrentStageLabel = (state) => {
    if (!state) return 'Εκκρεμεί';
    if (state.closed) return 'Ολοκληρωμένη';
    if (state.ready_for_final_delivery) return 'Έτοιμη για τελική παράδοση';
    if (state.external_snag_list_pending) return 'Εξωτερικά snags εκκρεμούν';
    if (state.approved_with_snag_list) return 'Εγκρίθηκε με snag list';
    if (state.declined_by_CA) return 'Απορρίφθηκε από Αρχή';
    if (state.documents_sent_to_CA) return 'Έντυπα στάλθηκαν στην Αρχή';
    if (state.ready_for_delivery) return 'Έτοιμη για παράδοση';
    if (state.internal_snag_list_pending) return 'Εσωτερικά snags εκκρεμούν';
    if (state.inspected_by_engineer) return 'Επιθεωρήθηκε από μηχανικό';
    if (state.inspected_by_foreman) return 'Επιθεωρήθηκε από επιστάτη';
    if (state.installed) return 'Εγκαταστάθηκε';
    return 'Εκκρεμεί';
  };

  const getProgressPercentage = (busStopId) => {
    const openSnags = getOpenSnags(busStopId);
    const state = getDeliveryState(busStopId);
    
    if (!state) return 0;
    if (state.closed) return 100;
    
    if (openSnags.length > 0) {
      let stageProgress = 0;
      if (state.installed) stageProgress = 10;
      if (state.inspected_by_foreman) stageProgress = 20;
      if (state.inspected_by_engineer) stageProgress = 30;
      if (state.ready_for_delivery) stageProgress = 40;
      if (state.documents_sent_to_CA) stageProgress = 50;
      if (state.approved_with_snag_list) stageProgress = 60;
      if (state.ready_for_final_delivery) stageProgress = 80;
      
      return stageProgress;
    } else {
      let stageProgress = 0;
      if (state.installed) stageProgress = 15;
      if (state.inspected_by_foreman) stageProgress = 30;
      if (state.inspected_by_engineer) stageProgress = 45;
      if (state.ready_for_delivery) stageProgress = 60;
      if (state.documents_sent_to_CA) stageProgress = 75;
      if (state.accepted_by_CA) stageProgress = 100;
      
      return stageProgress;
    }
  };

  const handleCreateBusStop = () => {
    setEditingBusStop(null);
    setShowCreateDialog(true);
  };

  const handleViewBusStop = (busStop) => {
    setSelectedBusStop(busStop);
    setShowViewDialog(true);
  };

  const handleBusStopSaved = () => {
    loadAllData();
    setShowCreateDialog(false);
    setEditingBusStop(null);
  };

  const handleImported = () => {
    loadAllData();
    setShowImportDialog(false);
  };

  const exportToCsv = () => {
    if (filteredBusStops.length === 0) return;
    
    // Extended headers with all delivery states
    const headers = [
      'bus_stop_id', 
      'city', 
      'shelter_type', 
      'field_1', 
      'field_2', 
      'latitude', 
      'longitude',
      'overall_status',
      'progress_percentage',
      'installed',
      'installed_date',
      'inspected_by_foreman',
      'inspected_by_foreman_date',
      'inspected_by_engineer',
      'inspected_by_engineer_date',
      'internal_snag_list_pending',
      'internal_snag_list_completed',
      'internal_snag_list_completed_date',
      'ready_for_delivery',
      'ready_for_delivery_date',
      'documents_sent_to_CA',
      'documents_sent_to_CA_date',
      'accepted_by_CA',
      'accepted_by_CA_date',
      'declined_by_CA',
      'declined_by_CA_date',
      'approved_with_snag_list',
      'approved_with_snag_list_date',
      'external_snag_list_pending',
      'external_snag_list_completed',
      'external_snag_list_completed_date',
      'ready_for_final_delivery',
      'ready_for_final_delivery_date',
      'closed',
      'closed_date',
      'comments'
    ];
    
    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '';
      let stringField = String(field);
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return '"' + stringField.replace(/"/g, '""') + '"';
      }
      return stringField;
    };

    const boolToGreek = (value) => {
      if (value === true) return 'Ναι';
      if (value === false) return 'Όχι';
      return '';
    };

    const formatDate = (date) => {
      if (!date) return '';
      return format(new Date(date), 'dd/MM/yyyy');
    };

    const csvContent = [
      headers.join(','),
      ...filteredBusStops.map(bs => {
        const deliveryState = getDeliveryState(bs.id);
        const currentStage = getCurrentStageLabel(deliveryState);
        const progress = getProgressPercentage(bs.id);
        
        return [
          escapeCsvField(bs.bus_stop_id),
          escapeCsvField(bs.city),
          escapeCsvField(bs.shelter_type),
          escapeCsvField(bs.field_1 || ''),
          escapeCsvField(bs.field_2 || ''),
          escapeCsvField(bs.latitude || ''),
          escapeCsvField(bs.longitude || ''),
          escapeCsvField(currentStage),
          escapeCsvField(progress),
          boolToGreek(deliveryState?.installed),
          formatDate(deliveryState?.installed_date),
          boolToGreek(deliveryState?.inspected_by_foreman),
          formatDate(deliveryState?.inspected_by_foreman_date),
          boolToGreek(deliveryState?.inspected_by_engineer),
          formatDate(deliveryState?.inspected_by_engineer_date),
          boolToGreek(deliveryState?.internal_snag_list_pending),
          boolToGreek(deliveryState?.internal_snag_list_completed),
          formatDate(deliveryState?.internal_snag_list_completed_date),
          boolToGreek(deliveryState?.ready_for_delivery),
          formatDate(deliveryState?.ready_for_delivery_date),
          boolToGreek(deliveryState?.documents_sent_to_CA),
          formatDate(deliveryState?.documents_sent_to_CA_date),
          boolToGreek(deliveryState?.accepted_by_CA),
          formatDate(deliveryState?.accepted_by_CA_date),
          boolToGreek(deliveryState?.declined_by_CA),
          formatDate(deliveryState?.declined_by_CA_date),
          boolToGreek(deliveryState?.approved_with_snag_list),
          formatDate(deliveryState?.approved_with_snag_list_date),
          boolToGreek(deliveryState?.external_snag_list_pending),
          boolToGreek(deliveryState?.external_snag_list_completed),
          formatDate(deliveryState?.external_snag_list_completed_date),
          boolToGreek(deliveryState?.ready_for_final_delivery),
          formatDate(deliveryState?.ready_for_final_delivery_date),
          boolToGreek(deliveryState?.closed),
          formatDate(deliveryState?.closed_date),
          escapeCsvField(bs.comments || '')
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bus_stop_delivery_' + format(new Date(), 'yyyy-MM-dd') + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredBusStops = busStops.filter(bs => 
    bs.bus_stop_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bs.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bs.shelter_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStops = busStops.length;
  const closedStops = statesOfDelivery.filter(s => s.closed).length;
  const inProgressStops = statesOfDelivery.filter(s => !s.closed && s.installed).length;
  const totalOpenInternalSnags = snaggingLists.filter(s => !s.closed && s.snag_category === 'internal').length;
  const totalOpenExternalSnags = snaggingLists.filter(s => !s.closed && s.snag_category === 'external').length;

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
          <h1 className="text-3xl font-bold text-slate-900">Bus Stop Delivery Management</h1>
          <p className="text-slate-600 mt-1">Διαχείριση παραδόσεων και εκκρεμοτήτων στάσεων</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Σύνολο Στάσεων</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{totalStops}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500">
                  <Package className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Ολοκληρωμένες</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{closedStops}</p>
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
                  <p className="text-sm font-medium text-slate-600">Σε Εξέλιξη</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{inProgressStops}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500">
                  <Loader2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Εσωτερικά Snags</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{totalOpenInternalSnags}</p>
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
                  <p className="text-sm font-medium text-slate-600">Εξωτερικά Snags</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">{totalOpenExternalSnags}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-500">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Στάσεις Λεωφορείου</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Αναζήτηση με κωδικό, πόλη, τύπο..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowBulkEditDialog(true)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Μαζική Επεξεργασία
              </Button>
              <Button variant="outline" onClick={exportToCsv} disabled={filteredBusStops.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Εισαγωγή CSV
              </Button>
              <Button onClick={handleCreateBusStop}>
                <Plus className="w-4 h-4 mr-2" />
                Νέα Στάση
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Κωδικός</TableHead>
                    <TableHead>Πόλη</TableHead>
                    <TableHead>Τύπος</TableHead>
                    <TableHead>Πρόοδος</TableHead>
                    <TableHead>Εσωτερικά Snags</TableHead>
                    <TableHead>Εξωτερικά Snags</TableHead>
                    <TableHead>Κατάσταση</TableHead>
                    <TableHead className="text-right">Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredBusStops.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        Δεν βρέθηκαν στάσεις
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBusStops.map((busStop) => {
                      const deliveryState = getDeliveryState(busStop.id);
                      const openInternalSnags = getOpenInternalSnags(busStop.id);
                      const openExternalSnags = getOpenExternalSnags(busStop.id);
                      const progress = getProgressPercentage(busStop.id);
                      const currentStage = getCurrentStageLabel(deliveryState);

                      return (
                        <TableRow key={busStop.id}>
                          <TableCell className="font-medium">{busStop.bus_stop_id}</TableCell>
                          <TableCell>{busStop.city}</TableCell>
                          <TableCell>{busStop.shelter_type}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    progress === 100 ? 'bg-green-500' : 
                                    progress > 0 ? 'bg-blue-500' : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {openInternalSnags.length > 0 ? (
                              <Badge className="bg-blue-100 text-blue-800">{openInternalSnags.length}</Badge>
                            ) : (
                              <Badge variant="outline">0</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {openExternalSnags.length > 0 ? (
                              <Badge className="bg-purple-100 text-purple-800">{openExternalSnags.length}</Badge>
                            ) : (
                              <Badge variant="outline">0</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              deliveryState?.closed ? 'bg-green-100 text-green-800' :
                              deliveryState?.installed ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-800'
                            }>
                              {currentStage}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewBusStop(busStop)}>
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
          </CardContent>
        </Card>
      </div>

      <CreateEditBusStopDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingBusStop(null);
        }}
        busStop={editingBusStop}
        onSaved={handleBusStopSaved}
      />

      <ViewBusStopDialog
        open={showViewDialog}
        onClose={() => {
          setShowViewDialog(false);
          setSelectedBusStop(null);
        }}
        busStop={selectedBusStop}
        onUpdated={loadAllData}
      />

      <ImportBusStopsDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImported={handleImported}
      />

      <BulkEditDeliveryStatusDialog
        open={showBulkEditDialog}
        onClose={() => setShowBulkEditDialog(false)}
        busStops={busStops}
        statesOfDelivery={statesOfDelivery}
        onSaved={loadAllData}
      />
    </div>
  );
}
