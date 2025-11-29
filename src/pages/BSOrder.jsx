
import React, { useState, useEffect, useMemo } from "react";
import { BusStopOrder } from "@/entities/BusStopOrder";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Plus, Search, Download, X, ClipboardList, AlertTriangle, ImageIcon, FileText, Upload, CheckCircle2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

import CreateEditOrderDialog from "../components/bsorder/CreateEditOrderDialog";
import ImportOrdersDialog from "../components/bsorder/ImportOrdersDialog";
import OrderTable from "../components/bsorder/OrderTable";

export default function BSOrderPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statFilter, setStatFilter] = useState(null);
  const [usersCache, setUsersCache] = useState({});

  useEffect(() => {
    loadOrders();
    loadUsersCache();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await BusStopOrder.list("-updated_date");
      setOrders(data);
    } catch (error) {
      console.error("Error loading bus stop orders:", error);
    }
    setIsLoading(false);
  };

  const loadUsersCache = async () => {
    try {
      const users = await User.list();
      const cache = {};
      users.forEach(user => {
        if (user.id) cache[user.id] = user.full_name;
        if (user.email) cache[user.email] = user.full_name;
      });
      setUsersCache(cache);
    } catch (error) {
      console.warn("Could not load users cache:", error);
      setUsersCache({});
    }
  };

  const handleStatClick = (field, value) => {
    setStatFilter(currentFilter => {
      if (currentFilter && currentFilter.field === field && currentFilter.value === value) {
        return null; // Remove filter if clicking the same stat
      }
      return { field, value };
    });
  };

  const getStatFilterLabel = () => {
    if (!statFilter) return '';
    const fieldLabels = {
      'is_active': 'Κατάσταση',
      'is_urgent': 'Επείγον',
      'photos': 'Φωτογραφίες',
      'official_order_document_id': 'Επίσημη Παραγγελία',
      'location': 'Τοποθεσία'
    };
    const fieldLabel = fieldLabels[statFilter.field] || statFilter.field;
    return `${fieldLabel}: ${statFilter.value}`;
  };

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.stop_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.stop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.municipality_community?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.main_order_reference?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply stat filter from clickable cards
    if (statFilter) {
      filtered = filtered.filter(order => {
        switch (statFilter.field) {
          case 'is_active':
            return order.is_active === (statFilter.value === 'Ενεργές');
          case 'is_urgent':
            return order.is_urgent === (statFilter.value === 'Επείγουσες');
          case 'photos':
            return statFilter.value === 'Με Φωτογραφίες' 
              ? (order.photos && order.photos.length > 0)
              : (!order.photos || order.photos.length === 0);
          case 'official_order_document_id':
            return statFilter.value === 'Με Επίσημη Παραγγελία'
              ? !!order.official_order_document_id
              : !order.official_order_document_id;
          case 'location':
            return statFilter.value === 'Με Τοποθεσία'
              ? (order.latitude && order.longitude)
              : (!order.latitude || !order.longitude);
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [orders, searchTerm, statFilter]);

  const handleOrderSaved = () => {
    setShowCreateDialog(false);
    loadOrders();
  };

  const handleImportComplete = () => {
    setShowImportDialog(false);
    loadOrders();
  };

  const exportToCsv = () => {
    if (filteredOrders.length === 0) return;
    
    const headers = [
      'Κωδικός Στάσης', 'Ονομασία Στάσης', 'Δήμος/Κοινότητα', 'Επαρχία', 
      'Υφιστάμενο Στοιχείο', 'Πεζοδρόμιο', 'Διάβαση', 'Τύπος Στεγάστρου',
      'Προτεινόμενος Τύπος', 'Αναβάθμιση Στεγάστρου', 'Ημερομηνία Παραγγελίας',
      'Τύπος Παραγγελίας', 'Χρονοδιάγραμμα Υλοποίησης', 'Οδηγία για Ολοκλήρωση',
      'Ημερομηνία Ολοκλήρωσης', 'Ημερομηνία Οδηγίας', 'Επείγον', 'Σχόλια',
      'Αναφορά Παραγγελίας', 'Δημιουργός', 'Ημερομηνία Δημιουργίας'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredOrders.map(order => [
        `"${order.stop_code || ''}"`,
        `"${order.stop_name || ''}"`,
        `"${order.municipality_community || ''}"`,
        `"${order.district || ''}"`,
        `"${order.existing_element || ''}"`,
        `"${order.pavement || ''}"`,
        `"${order.crossing || ''}"`,
        `"${order.shelter_type || ''}"`,
        `"${order.proposed_shelter_type || ''}"`,
        `"${order.shelter_upgrade || ''}"`,
        `"${order.order_date ? format(new Date(order.order_date), 'dd/MM/yyyy') : ''}"`,
        `"${order.order_type || ''}"`,
        `"${order.implementation_schedule ? format(new Date(order.implementation_schedule), 'dd/MM/yyyy') : ''}"`,
        `"${order.instruction_for_completion_on_date ? 'ΝΑΙ' : 'ΟΧΙ'}"`,
        `"${order.instruction_completion_date ? format(new Date(order.instruction_completion_date), 'dd/MM/yyyy') : ''}"`,
        `"${order.instruction_date ? format(new Date(order.instruction_date), 'dd/MM/yyyy') : ''}"`,
        `"${order.is_urgent ? 'ΝΑΙ' : 'ΟΧΙ'}"`,
        `"${order.comments || ''}"`,
        `"${order.main_order_reference || ''}"`,
        `"${usersCache[order.created_by] || order.created_by || ''}"`,
        `"${order.created_date ? format(new Date(order.created_date), 'dd/MM/yyyy') : ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bus_stop_orders_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate stats
  const stats = {
    total: orders.length,
    urgent: orders.filter(order => order.is_urgent).length,
    withPhotos: orders.filter(order => order.photos && order.photos.length > 0).length,
    withOfficialOrder: orders.filter(order => order.official_order_document_id).length,
    active: orders.filter(order => order.is_active).length,
    withLocation: orders.filter(order => order.latitude && order.longitude).length
  };

  const StatCard = ({ icon: Icon, title, value, field, filterValue, color, onClick }) => (
    <Card 
      className={`border-slate-200 hover:shadow-md transition-all duration-200 cursor-pointer ${
        statFilter && statFilter.field === field && statFilter.value === filterValue 
          ? 'ring-2 ring-blue-500 bg-blue-50' 
          : ''
      }`}
      onClick={() => onClick(field, filterValue)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-600">{title}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <div className={`p-2 rounded-full ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Bus Stop Orders</h1>
            <p className="text-slate-600 mt-1">Manage and track orders for bus stops</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={exportToCsv}
              variant="outline" 
              className="shadow-sm"
              disabled={filteredOrders.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="shadow-sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Excel/CSV
            </Button>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Bus Stop Order
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard
            icon={ClipboardList}
            title="Συνολικές Στάσεις"
            value={stats.total}
            field={null}
            filterValue={null}
            color="bg-blue-500"
            onClick={() => setStatFilter(null)}
          />

          <StatCard
            icon={CheckCircle2}
            title="Ενεργές"
            value={stats.active}
            field="is_active"
            filterValue="Ενεργές"
            color="bg-green-500"
            onClick={handleStatClick}
          />

          <StatCard
            icon={AlertTriangle}
            title="Επείγουσες"
            value={stats.urgent}
            field="is_urgent"
            filterValue="Επείγουσες"
            color="bg-red-500"
            onClick={handleStatClick}
          />

          <StatCard
            icon={ImageIcon}
            title="Με Φωτογραφίες"
            value={stats.withPhotos}
            field="photos"
            filterValue="Με Φωτογραφίες"
            color="bg-green-500"
            onClick={handleStatClick}
          />

          <StatCard
            icon={FileText}
            title="Με Επίσημη Παραγγελία"
            value={stats.withOfficialOrder}
            field="official_order_document_id"
            filterValue="Με Επίσημη Παραγγελία"
            color="bg-purple-500"
            onClick={handleStatClick}
          />

          <StatCard
            icon={MapPin}
            title="Με Τοποθεσία"
            value={stats.withLocation}
            field="location"
            filterValue="Με Τοποθεσία"
            color="bg-indigo-500"
            onClick={handleStatClick}
          />
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Αναζήτηση σε κωδικό στάσης, ονομασία, δήμο, επαρχία, αναφορά παραγγελίας..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200 w-full"
              />
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              {statFilter && (
                <Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                  <span className="font-normal">Φίλτρο:</span> 
                  <span className="font-semibold">{getStatFilterLabel()}</span>
                  <button onClick={() => setStatFilter(null)} className="ml-1 rounded-full hover:bg-slate-300 p-0.5">
                    <X className="w-3 h-3"/>
                  </button>
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <OrderTable 
            items={filteredOrders} 
            isLoading={isLoading}
            onOrderSaved={handleOrderSaved}
            usersCache={usersCache}
          />
        </div>
      </div>

      <CreateEditOrderDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onItemSaved={handleOrderSaved}
      />

      <ImportOrdersDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
