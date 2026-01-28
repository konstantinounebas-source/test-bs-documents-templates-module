import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, CheckCircle, MapPin, XCircle, ShoppingCart, Repeat, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DashboardPage() {
  const [activeDialog, setActiveDialog] = React.useState(null);

  const { data: stops = [], isLoading: stopsLoading } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list()
  });

  const { data: stickerItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list()
  });

  const { data: stickerTemplates = [] } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list()
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list()
  });

  const { data: orderLines = [] } = useQuery({
    queryKey: ['orderLines'],
    queryFn: () => base44.entities.OrderLine.list()
  });

  const { data: shelterTypes = [] } = useQuery({
    queryKey: ['shelterTypes'],
    queryFn: () => base44.entities.ShelterType.list()
  });

  // 1. Συνολικός αριθμός στάσεων
  const totalStops = stops.length;

  // 2. Πόσες δεν έχουν δημιουργηθεί αυτοκόλλητα
  const stopsWithoutStickers = stops.filter(stop => {
    const stopStickers = stickerItems.filter(item => item.stop_id === stop.id);
    return stopStickers.length === 0;
  });

  // 3. Πόσες είναι critical (έχουν εγκατασταθεί τα στέγαστρα αλλά δεν έχουν εγκατασταθεί όλα τα αυτοκόλλητα)
  const criticalStops = stops.filter(stop => {
    if (!stop.shelter_installed) return false;
    const stopStickers = stickerItems.filter(item => item.stop_id === stop.id);
    if (stopStickers.length === 0) return false;
    const allInstalled = stopStickers.every(item => item.status === "Installed");
    return !allInstalled;
  });

  // 4. Πόσες έχουν παραγγελθεί τα αυτοκόλλητα (έχουν έστω ένα sticker με status Ordered ή Received ή Installed)
  const stopsWithOrderedStickers = stops.filter(stop => {
    const stopStickers = stickerItems.filter(item => item.stop_id === stop.id);
    return stopStickers.some(item => ["Ordered", "Received", "Installed"].includes(item.status));
  });

  // 5. Παραγγελίες με warning (critical based on date)
  const checkOrderCritical = (order) => {
    const lines = orderLines.filter(line => line.order_id === order.id);
    return lines.some(line => {
      const stickerItem = stickerItems.find(item => item.id === line.sticker_item_id);
      if (!stickerItem) return false;
      const stop = stops.find(s => s.id === stickerItem.stop_id);
      if (!stop?.current_planned_installation_date) return false;
      
      const template = stickerTemplates.find(t => t.id === stickerItem.sticker_template_id);
      if (!template) return false;
      
      const plannedDate = new Date(stop.current_planned_installation_date);
      const daysBeforeNeeded = template.days_before_installation_to_receive || 7;
      const neededByDate = new Date(plannedDate);
      neededByDate.setDate(neededByDate.getDate() - daysBeforeNeeded);
      
      const estimatedDeliveryDays = template.estimated_delivery_days || 10;
      const orderDate = new Date(order.order_date);
      const estimatedReceiptDate = new Date(orderDate);
      estimatedReceiptDate.setDate(estimatedReceiptDate.getDate() + estimatedDeliveryDays);
      
      return estimatedReceiptDate > neededByDate;
    });
  };

  const ordersWithWarning = orders.filter(order => 
    order.status !== "Closed" && checkOrderCritical(order)
  );

  // 6. Πόσα αυτοκόλλητα έχουν παραγγελθεί πάνω από μία φορά
  const stickersOrderedMultipleTimes = stickerItems.filter(item => {
    return (item.total_ordered_quantity || 0) > 1;
  });

  // 7. Στάσεις με εγκατεστημένα στέγαστρα αλλά όχι όλα τα αυτοκόλλητα (ίδιο με critical)
  const sheltersInstalledNotAllStickers = criticalStops.length;

  // 8. Αυτοκόλλητα installed ανά κατηγορία (sticker template)
  const installedStickersByCategory = stickerItems
    .filter(item => item.status === "Installed")
    .reduce((acc, item) => {
      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
      const category = template?.sticker_name_category || "Unknown";
      if (!acc[category]) acc[category] = 0;
      acc[category]++;
      return acc;
    }, {});

  const getStopDisplay = (item) => {
    const stop = stops.find(s => s.id === item.stop_id);
    return stop?.stop_id || "-";
  };

  const getTemplateDisplay = (item) => {
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    return template?.sticker_name_category || "-";
  };

  const getShelterTypeDisplay = (shelterTypeId) => {
    const shelterType = shelterTypes.find(st => st.shelter_type_id === shelterTypeId);
    return shelterType?.description || shelterTypeId || "-";
  };

  const exportToExcel = async (data, filename) => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);
      data.forEach(row => {
        worksheet.addRow(Object.values(row));
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (stopsLoading || itemsLoading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Operational Dashboard</h1>
        <p className="text-gray-600">Πλήρης επισκόπηση στάσεων και αυτοκόλλητων</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('total')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                <p className="text-sm font-medium text-gray-700 mb-1">Συνολικές Στάσεις</p>
                <p className="text-3xl font-bold text-blue-600">{totalStops}</p>
              </div>
              <MapPin className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('without')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                <p className="text-sm font-medium text-gray-700 mb-1">Στάσεις χωρίς Αυτοκόλλητα</p>
                <p className="text-3xl font-bold text-gray-600">{stopsWithoutStickers.length}</p>
              </div>
              <XCircle className="w-10 h-10 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('critical')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                <p className="text-sm font-medium text-gray-700 mb-1">Critical - Στέγαστρα OK, Stickers ΌΧΙ</p>
                <p className="text-3xl font-bold text-red-600">{criticalStops.length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('ordered')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                <p className="text-sm font-medium text-gray-700 mb-1">Στάσεις με Παραγγελθέντα Stickers</p>
                <p className="text-3xl font-bold text-green-600">{stopsWithOrderedStickers.length}</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row of Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('warnings')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                <p className="text-sm font-medium text-gray-700 mb-1">Παραγγελίες με Καθυστέρηση</p>
                <p className="text-3xl font-bold text-orange-600">{ordersWithWarning.length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('multiple')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                <p className="text-sm font-medium text-gray-700 mb-1">Stickers με Πολλαπλές Παραγγελίες</p>
                <p className="text-3xl font-bold text-purple-600">{stickersOrderedMultipleTimes.length}</p>
              </div>
              <Repeat className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('shelters')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                <p className="text-sm font-medium text-gray-700 mb-1">Στέγαστρα Installed - Stickers Missing</p>
                <p className="text-3xl font-bold text-red-600">{sheltersInstalledNotAllStickers}</p>
              </div>
              <Building2 className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('installed')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                <p className="text-sm font-medium text-gray-700 mb-1">Εγκατεστημένα Αυτοκόλλητα</p>
                <p className="text-3xl font-bold text-green-600">
                  {Object.values(installedStickersByCategory).reduce((sum, count) => sum + count, 0)}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Stops */}
      <Card>
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            Critical Stops - Στέγαστρα Εγκατεστημένα αλλά όχι όλα τα Αυτοκόλλητα
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criticalStops.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Δεν υπάρχουν critical στάσεις</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stop ID</TableHead>
                    <TableHead>English Name</TableHead>
                    <TableHead>Greek Name</TableHead>
                    <TableHead>Planned Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalStops.map(stop => (
                    <TableRow key={stop.id}>
                      <TableCell className="font-medium">{stop.stop_id}</TableCell>
                      <TableCell>{stop.english_name}</TableCell>
                      <TableCell>{stop.greek_name}</TableCell>
                      <TableCell>{stop.current_planned_installation_date || "-"}</TableCell>
                      <TableCell>
                        <Link to={createPageUrl("Stops")}>
                          <Badge className="bg-blue-600 hover:bg-blue-700 cursor-pointer">View</Badge>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Στάσεις χωρίς αυτοκόλλητα */}
      <Card>
        <CardHeader className="bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <XCircle className="w-5 h-5" />
            Στάσεις χωρίς Δημιουργημένα Αυτοκόλλητα ({stopsWithoutStickers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stopsWithoutStickers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Όλες οι στάσεις έχουν αυτοκόλλητα</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stop ID</TableHead>
                    <TableHead>English Name</TableHead>
                    <TableHead>Greek Name</TableHead>
                    <TableHead>Shelter Type</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stopsWithoutStickers.slice(0, 20).map(stop => (
                    <TableRow key={stop.id}>
                      <TableCell className="font-medium">{stop.stop_id}</TableCell>
                      <TableCell>{stop.english_name}</TableCell>
                      <TableCell>{stop.greek_name}</TableCell>
                      <TableCell>{stop.shelter_type_approved_id || "-"}</TableCell>
                      <TableCell>
                        <Link to={createPageUrl("Stops")}>
                          <Badge className="bg-blue-600 hover:bg-blue-700 cursor-pointer">View</Badge>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {stopsWithoutStickers.length > 20 && (
                <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 border-t">
                  Showing 20 of {stopsWithoutStickers.length} stops. <Link to={createPageUrl("Stops")} className="text-blue-600 hover:underline">View all</Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Παραγγελίες με Warning */}
        <Card>
          <CardHeader className="bg-orange-50">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              Παραγγελίες με Warning ({ordersWithWarning.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersWithWarning.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Δεν υπάρχουν παραγγελίες με warning</p>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersWithWarning.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_id}</TableCell>
                        <TableCell>{order.vendor}</TableCell>
                        <TableCell>{order.order_date}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Warning</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Αυτοκόλλητα με Πολλαπλές Παραγγελίες */}
        <Card>
          <CardHeader className="bg-purple-50">
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Repeat className="w-5 h-5" />
              Πολλαπλές Παραγγελίες ({stickersOrderedMultipleTimes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stickersOrderedMultipleTimes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Δεν υπάρχουν αυτοκόλλητα με πολλαπλές παραγγελίες</p>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stop ID</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Times Ordered</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stickersOrderedMultipleTimes.slice(0, 15).map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                        <TableCell>{getTemplateDisplay(item)}</TableCell>
                        <TableCell>
                          <Badge className="bg-purple-100 text-purple-800">
                            {item.total_ordered_quantity || 0}x
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {stickersOrderedMultipleTimes.length > 15 && (
                  <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 border-t">
                    Showing 15 of {stickersOrderedMultipleTimes.length} items
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Installed Stickers ανά Κατηγορία */}
      <Card>
        <CardHeader className="bg-green-50">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            Εγκατεστημένα Αυτοκόλλητα ανά Κατηγορία
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(installedStickersByCategory).length === 0 ? (
            <p className="text-center text-gray-500 py-8">Δεν υπάρχουν εγκατεστημένα αυτοκόλλητα</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(installedStickersByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <Card key={category}>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">{category}</p>
                        <p className="text-2xl font-bold text-green-600">{count}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={activeDialog === 'total'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Όλες οι Στάσεις ({totalStops})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = stops.map(s => ({
              'Stop ID': s.stop_id,
              'English Name': s.english_name,
              'Greek Name': s.greek_name,
              'Shelter Type': getShelterTypeDisplay(s.shelter_type_approved_id),
              'Planned Date': s.current_planned_installation_date || '-',
              'Shelter Installed': s.shelter_installed ? 'Yes' : 'No'
            }));
            exportToExcel(data, 'all-stops');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Greek Name</TableHead>
                <TableHead>Shelter Type</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stops.map(stop => (
                <TableRow key={stop.id}>
                  <TableCell className="font-medium">{stop.stop_id}</TableCell>
                  <TableCell>{stop.english_name}</TableCell>
                  <TableCell>{stop.greek_name}</TableCell>
                  <TableCell>{getShelterTypeDisplay(stop.shelter_type_approved_id)}</TableCell>
                  <TableCell>{stop.current_planned_installation_date || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'without'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Στάσεις χωρίς Αυτοκόλλητα ({stopsWithoutStickers.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = stopsWithoutStickers.map(s => ({
              'Stop ID': s.stop_id,
              'English Name': s.english_name,
              'Greek Name': s.greek_name,
              'Shelter Type': getShelterTypeDisplay(s.shelter_type_approved_id),
              'Planned Date': s.current_planned_installation_date || '-'
            }));
            exportToExcel(data, 'stops-without-stickers');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Greek Name</TableHead>
                <TableHead>Shelter Type</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stopsWithoutStickers.map(stop => (
                <TableRow key={stop.id}>
                  <TableCell className="font-medium">{stop.stop_id}</TableCell>
                  <TableCell>{stop.english_name}</TableCell>
                  <TableCell>{stop.greek_name}</TableCell>
                  <TableCell>{getShelterTypeDisplay(stop.shelter_type_approved_id)}</TableCell>
                  <TableCell>{stop.current_planned_installation_date || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'critical'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Critical Στάσεις - Στέγαστρα Installed αλλά Stickers Missing ({criticalStops.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = criticalStops.map(s => ({
              'Stop ID': s.stop_id,
              'English Name': s.english_name,
              'Greek Name': s.greek_name,
              'Shelter Type': getShelterTypeDisplay(s.shelter_type_approved_id),
              'Planned Date': s.current_planned_installation_date || '-'
            }));
            exportToExcel(data, 'critical-stops');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Greek Name</TableHead>
                <TableHead>Shelter Type</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criticalStops.map(stop => (
                <TableRow key={stop.id}>
                  <TableCell className="font-medium">{stop.stop_id}</TableCell>
                  <TableCell>{stop.english_name}</TableCell>
                  <TableCell>{stop.greek_name}</TableCell>
                  <TableCell>{getShelterTypeDisplay(stop.shelter_type_approved_id)}</TableCell>
                  <TableCell>{stop.current_planned_installation_date || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'ordered'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Στάσεις με Παραγγελθέντα Stickers ({stopsWithOrderedStickers.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = stopsWithOrderedStickers.map(s => ({
              'Stop ID': s.stop_id,
              'English Name': s.english_name,
              'Greek Name': s.greek_name,
              'Shelter Type': getShelterTypeDisplay(s.shelter_type_approved_id),
              'Planned Date': s.current_planned_installation_date || '-'
            }));
            exportToExcel(data, 'stops-with-ordered-stickers');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Greek Name</TableHead>
                <TableHead>Shelter Type</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stopsWithOrderedStickers.map(stop => (
                <TableRow key={stop.id}>
                  <TableCell className="font-medium">{stop.stop_id}</TableCell>
                  <TableCell>{stop.english_name}</TableCell>
                  <TableCell>{stop.greek_name}</TableCell>
                  <TableCell>{getShelterTypeDisplay(stop.shelter_type_approved_id)}</TableCell>
                  <TableCell>{stop.current_planned_installation_date || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'warnings'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Παραγγελίες με Καθυστέρηση - Ενδέχεται να μην παραληφθούν εγκαίρως ({ordersWithWarning.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = ordersWithWarning.map(o => ({
              'Order ID': o.order_id,
              'Vendor': o.vendor,
              'Order Date': o.order_date,
              'Status': o.status,
              'Comments': o.comments || '-'
            }));
            exportToExcel(data, 'orders-with-warnings');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersWithWarning.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_id}</TableCell>
                  <TableCell>{order.vendor}</TableCell>
                  <TableCell>{order.order_date}</TableCell>
                  <TableCell><Badge variant="destructive">Warning</Badge></TableCell>
                  <TableCell className="text-sm">{order.comments || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'multiple'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stickers με Πολλαπλές Παραγγελίες ({stickersOrderedMultipleTimes.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = stickersOrderedMultipleTimes.map(item => ({
              'Stop ID': getStopDisplay(item),
              'Template': getTemplateDisplay(item),
              'Times Ordered': item.total_ordered_quantity || 0,
              'Status': item.status,
              'Print Line 1': item.print_line_1,
              'Print Line 2': item.print_line_2,
              'Print Line 3': item.print_line_3
            }));
            exportToExcel(data, 'multiple-orders');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Times Ordered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Print Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stickersOrderedMultipleTimes.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                  <TableCell>{getTemplateDisplay(item)}</TableCell>
                  <TableCell>
                    <Badge className="bg-purple-100 text-purple-800">{item.total_ordered_quantity || 0}x</Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
                  <TableCell className="text-sm">{item.print_line_1} / {item.print_line_2} / {item.print_line_3}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'shelters'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Στέγαστρα Installed - Stickers Missing ({sheltersInstalledNotAllStickers})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = criticalStops.map(s => ({
              'Stop ID': s.stop_id,
              'English Name': s.english_name,
              'Greek Name': s.greek_name,
              'Shelter Type': getShelterTypeDisplay(s.shelter_type_approved_id),
              'Planned Date': s.current_planned_installation_date || '-'
            }));
            exportToExcel(data, 'shelters-installed-stickers-missing');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Greek Name</TableHead>
                <TableHead>Shelter Type</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criticalStops.map(stop => (
                <TableRow key={stop.id}>
                  <TableCell className="font-medium">{stop.stop_id}</TableCell>
                  <TableCell>{stop.english_name}</TableCell>
                  <TableCell>{stop.greek_name}</TableCell>
                  <TableCell>{getShelterTypeDisplay(stop.shelter_type_approved_id)}</TableCell>
                  <TableCell>{stop.current_planned_installation_date || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'installed'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Εγκατεστημένα Αυτοκόλλητα ανά Κατηγορία</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const installedItems = stickerItems.filter(item => item.status === "Installed");
            const data = installedItems.map(item => ({
              'Stop ID': getStopDisplay(item),
              'Template': getTemplateDisplay(item),
              'Print Line 1': item.print_line_1,
              'Print Line 2': item.print_line_2,
              'Print Line 3': item.print_line_3,
              'Installed Date': item.installed_date || '-',
              'Installed By': item.installed_by || '-'
            }));
            exportToExcel(data, 'installed-stickers');
          }} className="mb-4">Export to Excel</Button>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(installedStickersByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <Card key={category}>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">{category}</p>
                      <p className="text-2xl font-bold text-green-600">{count}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Print Lines</TableHead>
                <TableHead>Installed Date</TableHead>
                <TableHead>Installed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stickerItems
                .filter(item => item.status === "Installed")
                .map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                    <TableCell>{getTemplateDisplay(item)}</TableCell>
                    <TableCell className="text-sm">{item.print_line_1} / {item.print_line_2} / {item.print_line_3}</TableCell>
                    <TableCell>{item.installed_date || '-'}</TableCell>
                    <TableCell>{item.installed_by || '-'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}