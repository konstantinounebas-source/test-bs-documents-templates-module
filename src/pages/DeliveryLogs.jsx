import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, Loader2, FileText, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePageAccess } from "@/components/lib/usePageAccess";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DeliveryLogsPage() {
  const { hasAccess, isLoading: accessLoading } = usePageAccess('DeliveryLogs');
  
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [snagLogs, setSnagLogs] = useState([]);
  const [busStops, setBusStops] = useState([]);
  const [snags, setSnags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [logType, setLogType] = useState("all");

  useEffect(() => {
    if (hasAccess) {
      loadAllData();
    }
  }, [hasAccess]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [deliveryLogsData, snagLogsData, busStopsData, snagsData] = await Promise.all([
        base44.entities.DeliveryLog.list("-created_date"),
        base44.entities.SnagLog.list("-created_date"),
        base44.entities.BusStop.list(),
        base44.entities.SnaggingList.list()
      ]);
      
      setDeliveryLogs(deliveryLogsData);
      setSnagLogs(snagLogsData);
      setBusStops(busStopsData);
      setSnags(snagsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const getBusStopInfo = (busStopId) => {
    return busStops.find(bs => bs.id === busStopId);
  };

  const getSnagInfo = (snagId) => {
    return snags.find(s => s.id === snagId);
  };

  // Helper function to translate status field names to Greek
  const translateStatusField = (field) => {
    const translations = {
      'installed': 'Εγκαταστάθηκε',
      'installed_date': 'Ημερομηνία Εγκατάστασης',
      'inspected_by_foreman': 'Επιθεωρήθηκε από Επιστάτη',
      'inspected_by_foreman_date': 'Ημερομηνία Επιθεώρησης Επιστάτη',
      'inspected_by_engineer': 'Επιθεωρήθηκε από Μηχανικό',
      'inspected_by_engineer_date': 'Ημερομηνία Επιθεώρησης Μηχανικού',
      'internal_snag_list_pending': 'Εσωτερικό Snag List Εκκρεμεί',
      'internal_snag_list_completed': 'Εσωτερικό Snag List Ολοκληρώθηκε',
      'internal_snag_list_completed_date': 'Ημερομηνία Ολοκλήρωσης Εσωτερικών Snags',
      'ready_for_delivery': 'Έτοιμη για Παράδοση',
      'ready_for_delivery_date': 'Ημερομηνία Ετοιμότητας για Παράδοση',
      'documents_sent_to_CA': 'Έγγραφα Στάλθηκαν στην Αρχή',
      'documents_sent_to_CA_date': 'Ημερομηνία Αποστολής Εγγράφων',
      'accepted_by_CA': 'Έγινε Αποδεκτή από την Αρχή',
      'accepted_by_CA_date': 'Ημερομηνία Αποδοχής',
      'declined_by_CA': 'Απορρίφθηκε από την Αρχή',
      'declined_by_CA_date': 'Ημερομηνία Απόρριψης',
      'approved_with_snag_list': 'Εγκρίθηκε με Snag List',
      'approved_with_snag_list_date': 'Ημερομηνία Έγκρισης με Snag List',
      'external_snag_list_pending': 'Εξωτερικό Snag List Εκκρεμεί',
      'external_snag_list_completed': 'Εξωτερικό Snag List Ολοκληρώθηκε',
      'external_snag_list_completed_date': 'Ημερομηνία Ολοκλήρωσης Εξωτερικών Snags',
      'ready_for_final_delivery': 'Έτοιμη για Τελική Παράδοση',
      'ready_for_final_delivery_date': 'Ημερομηνία Ετοιμότητας για Τελική Παράδοση',
      'closed': 'Ολοκληρωμένη Παράδοση',
      'closed_date': 'Ημερομηνία Ολοκλήρωσης',
      'created': 'Δημιουργία'
    };
    return translations[field] || field;
  };

  // Helper to translate action types
  const translateActionType = (actionType) => {
    const translations = {
      'created': 'Δημιουργήθηκε',
      'updated': 'Ενημερώθηκε',
      'photo_taken': 'Λήψη Φωτογραφίας',
      'photo_taken_true': 'Λήφθηκε Φωτογραφία',
      'technician_completed': 'Ολοκληρώθηκε από Τεχνικό',
      'technician_completed_true': 'Ολοκληρώθηκε από Τεχνικό',
      'inspected_by': 'Επιθεωρήθηκε',
      'ready_for_submission': 'Έτοιμο για Υποβολή',
      'ready_for_submission_true': 'Έτοιμο για Υποβολή',
      'reopened': 'Επανενεργοποιήθηκε',
      'reopened_true': 'Επανενεργοποιήθηκε',
      'closed': 'Έκλεισε',
      'closed_true': 'Έκλεισε'
    };
    return translations[actionType] || actionType;
  };

  // Helper to format boolean values
  const formatBooleanValue = (value) => {
    if (value === 'true' || value === true) return 'Ναι';
    if (value === 'false' || value === false) return 'Όχι';
    if (value === '' || value === null || value === undefined) return '-';
    return value;
  };

  // Generate detailed description for logs
  const getLogDescription = (log) => {
    if (log.type === 'delivery') {
      const statusFieldGreek = translateStatusField(log.status_field);
      
      if (log.status_field === 'created') {
        return `Δημιουργήθηκε η στάση`;
      }
      
      if (log.old_value && log.new_value) {
        const oldVal = formatBooleanValue(log.old_value);
        const newVal = formatBooleanValue(log.new_value);
        return `${statusFieldGreek}: Άλλαξε από "${oldVal}" σε "${newVal}"`;
      }
      
      if (log.new_value) {
        const newVal = formatBooleanValue(log.new_value);
        return `${statusFieldGreek}: Ορίστηκε σε "${newVal}"`;
      }
      
      return `${statusFieldGreek}: Ενημερώθηκε`;
    } else if (log.type === 'snag') {
      const snag = getSnagInfo(log.snag_id);
      const actionGreek = translateActionType(log.action_type);
      
      if (log.action_type === 'created') {
        if (snag) {
          return `Δημιουργήθηκε εκκρεμότητα: ${snag.snag_type} - ${snag.element_category}`;
        }
        return `Δημιουργήθηκε εκκρεμότητα`;
      }
      
      if (log.action_type === 'updated') {
        if (snag) {
          return `Ενημερώθηκε εκκρεμότητα: ${snag.snag_type} - ${snag.element_category}`;
        }
        return `Ενημερώθηκε εκκρεμότητα`;
      }
      
      if (log.action_type.includes('_true')) {
        const baseAction = log.action_type.replace('_true', '');
        return `${translateActionType(baseAction)}: Ολοκληρώθηκε`;
      }
      
      return actionGreek;
    }
    
    return 'Ενέργεια';
  };

  const combinedLogs = [
    ...deliveryLogs.map(log => ({
      ...log,
      type: 'delivery',
      timestamp: log.created_date
    })),
    ...snagLogs.map(log => ({
      ...log,
      type: 'snag',
      timestamp: log.created_date
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filteredLogs = combinedLogs.filter(log => {
    const busStop = getBusStopInfo(log.bus_stop_id);
    const description = getLogDescription(log);
    const matchesSearch = 
      busStop?.bus_stop_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.comment?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = 
      logType === "all" ? true :
      log.type === logType;
    
    return matchesSearch && matchesType;
  });

  const exportToCsv = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ['Ημερομηνία', 'Τύπος', 'Στάση', 'Χρήστης', 'Περιγραφή', 'Σχόλιο'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => {
        const busStop = getBusStopInfo(log.bus_stop_id);
        const description = getLogDescription(log);
        return [
          `"${format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm')}"`,
          `"${log.type === 'delivery' ? 'Παράδοση' : 'Εκκρεμότητα'}"`,
          `"${busStop?.bus_stop_id || 'N/A'}"`,
          `"${log.user_email || ''}"`,
          `"${description}"`,
          `"${log.comment || ''}"`
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `delivery_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Delivery Logs</h1>
            <p className="text-slate-600 mt-1">Ιστορικό αλλαγών παραδόσεων και εκκρεμοτήτων</p>
          </div>
          <Button onClick={exportToCsv} disabled={filteredLogs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Σύνολο Logs</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{combinedLogs.length}</p>
                </div>
                <div className="p-3 rounded-full bg-slate-500">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Logs Παραδόσεων</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{deliveryLogs.length}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Logs Εκκρεμοτήτων</p>
                  <p className="text-2xl font-bold text-orange-600 mt-2">{snagLogs.length}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-500">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Αναζήτηση..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={logType} onValueChange={setLogType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Όλα τα Logs</SelectItem>
                    <SelectItem value="delivery">Παραδόσεις</SelectItem>
                    <SelectItem value="snag">Εκκρεμότητες</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ημερομηνία</TableHead>
                      <TableHead>Τύπος</TableHead>
                      <TableHead>Στάση</TableHead>
                      <TableHead>Χρήστης</TableHead>
                      <TableHead>Περιγραφή</TableHead>
                      <TableHead>Σχόλιο</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          Δεν βρέθηκαν logs
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log, index) => {
                        const busStop = getBusStopInfo(log.bus_stop_id);
                        const description = getLogDescription(log);
                        return (
                          <TableRow key={`${log.type}-${log.id || index}`}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              {log.type === 'delivery' ? (
                                <Badge className="bg-blue-100 text-blue-800">Παράδοση</Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-800">Εκκρεμότητα</Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {busStop?.bus_stop_id || 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {log.user_email}
                            </TableCell>
                            <TableCell className="max-w-md">
                              <span className="text-sm font-medium">{description}</span>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm">
                              {log.comment || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}