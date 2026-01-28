import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package, CheckCircle, MapPin, XCircle, ShoppingCart, Repeat, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DashboardPage() {
  const [activeDialog, setActiveDialog] = useState(null);

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

  // 5. Αυτοκόλλητα που είναι παραγγελμένα με προειδοποίηση (< 14 ημέρες)
  const orderedWithWarning = stickerItems.filter(item => {
    if (item.status !== "Ordered") return false;
    const stop = stops.find(s => s.id === item.stop_id);
    if (!stop?.current_planned_installation_date) return false;
    const daysBeforeInstall = Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysBeforeInstall < 14;
  });

  // 6. Ordered σε εγκατεστημένες στάσεις αλλά δεν έχουν παραληφθεί
  const orderedOnInstalledNotReceived = stickerItems.filter(item => {
    if (item.status !== "Ordered") return false;
    const stop = stops.find(s => s.id === item.stop_id);
    return stop && stop.shelter_installed;
  });

  // 7. Εγκατεστημένες στάσεις χωρίς εγκατεστημένα stickers
  const installedWithoutStickerInstall = stickerItems.filter(item => {
    const stop = stops.find(s => s.id === item.stop_id);
    return stop && stop.shelter_installed && item.status !== "Installed";
  });

  // 8. Εγκατεστημένες στάσεις χωρίς παραγγελία (ΚΡΙΣΙΜΟ)
  const installedWithoutOrder = stickerItems.filter(item => {
    const stop = stops.find(s => s.id === item.stop_id);
    return stop && stop.shelter_installed && item.status === "Needed";
  });

  // 9. Εγκατεστημένες στάσεις με Ordered αλλά δεν έχουν παραληφθεί
  const orderedNotReceivedOnInstalled = stickerItems.filter(item => {
    const stop = stops.find(s => s.id === item.stop_id);
    return stop && stop.shelter_installed && item.status === "Ordered";
  });

  // 10. Αυτοκόλλητα υψηλού κινδύνου (Needed + < bufferDays)
  const [bufferDays, setBufferDays] = React.useState(30);
  const highRiskStickers = stickerItems.filter(item => {
    if (item.status !== "Needed") return false;
    const stop = stops.find(s => s.id === item.stop_id);
    if (!stop?.current_planned_installation_date) return false;
    const daysUntil = Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil < bufferDays && daysUntil >= 0;
  });

  // 11. Αυτοκόλλητα που είναι παραγγελμένα και ενδέχεται να μην παραληφθούν εγκαίρως
  const stickersAtRisk = stickerItems.filter(item => {
    if (item.status !== "Ordered") return false;
    
    const stop = stops.find(s => s.id === item.stop_id);
    if (!stop?.current_planned_installation_date) return false;
    
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    if (!template) return false;
    
    const plannedDate = new Date(stop.current_planned_installation_date);
    const daysBeforeNeeded = template.days_before_installation_to_receive || 7;
    const neededByDate = new Date(plannedDate);
    neededByDate.setDate(neededByDate.getDate() - daysBeforeNeeded);
    
    // Check if we're past the needed date and still not received
    return new Date() > neededByDate;
  });

  // 6. Πόσα αυτοκόλλητα έχουν παραγγελθεί πάνω από μία φορά
  const stickersOrderedMultipleTimes = stickerItems.filter(item => {
    return (item.total_ordered_quantity || 0) > 1;
  });

  // 7. Στάσεις εγκατεστημένες - υπολειπόμενα αυτοκόλλητα ανά κατηγορία
  const installedStopsWithRemainingStickers = stops.filter(stop => {
    if (!stop.shelter_installed) return false;
    const stopStickers = stickerItems.filter(item => item.stop_id === stop.id);
    if (stopStickers.length === 0) return false;
    return stopStickers.some(item => item.status !== "Installed");
  });

  const remainingStickersByCategory = {};
  installedStopsWithRemainingStickers.forEach(stop => {
    const stopStickers = stickerItems.filter(item => 
      item.stop_id === stop.id && item.status !== "Installed"
    );
    stopStickers.forEach(item => {
      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
      const category = template?.sticker_name_category || "Unknown";
      if (!remainingStickersByCategory[category]) remainingStickersByCategory[category] = 0;
      remainingStickersByCategory[category]++;
    });
  });

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
    if (!shelterTypeId) return "-";
    const shelterType = shelterTypes.find(st => 
      st.shelter_type_id === shelterTypeId || st.id === shelterTypeId
    );
    return shelterType?.description || shelterTypeId;
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

      {/* Summary Cards - Row 1 */}
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
                <p className="text-sm font-medium text-gray-700 mb-1">Χωρίς Δημιουργημένα Stickers</p>
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
                <p className="text-sm font-medium text-gray-700 mb-1">Στέγαστρα Installed - Stickers Pending</p>
                <p className="text-3xl font-bold text-red-600">{criticalStops.length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('atrisk')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                <p className="text-sm font-medium text-gray-700 mb-1">Stickers σε Κίνδυνο Καθυστέρησης</p>
                <p className="text-3xl font-bold text-orange-600">{stickersAtRisk.length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buffer Days */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="buffer" className="text-sm font-medium">Περιθώριο Ασφάλειας (ημέρες)</Label>
              <Input id="buffer" type="number" value={bufferDays} onChange={(e) => setBufferDays(parseInt(e.target.value) || 30)} min="1" className="mt-2" />
            </div>
            <div className="text-xs text-gray-600">Για κρίσιμα stickers χωρίς παραγγελία</div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Row 2: Order Tracking */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Παρακολούθηση Παραγγελιών</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('orderedwarn')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">⚠️ Ordered με Προειδοποίηση</p>
                  <p className="text-3xl font-bold text-orange-600">{orderedWithWarning.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('orderedinstalled')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">⚠️ Ordered σε Εγκατεστημένες</p>
                  <p className="text-3xl font-bold text-orange-600">{orderedOnInstalledNotReceived.length}</p>
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
                  <p className="text-sm font-medium text-gray-700 mb-1">🔍 Πολλαπλές Παραγγελίες</p>
                  <p className="text-3xl font-bold text-blue-500">{stickersOrderedMultipleTimes.length}</p>
                </div>
                <Repeat className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('highrisk')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">🔴 Υψηλού Κινδύνου</p>
                  <p className="text-3xl font-bold text-red-600">{highRiskStickers.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Cards - Row 3: Operational Mismatches */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Επιχειρησιακές Ασυμφωνίες</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('installed_no_sticker')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">⚠️ Εγκατεστημένες χωρίς Τοποθέτηση</p>
                  <p className="text-3xl font-bold text-red-600">{installedWithoutStickerInstall.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('installed_no_order')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">🔴 Εγκατεστημένες χωρίς Παραγγελία</p>
                  <p className="text-3xl font-bold text-red-600">{installedWithoutOrder.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('ordered_not_received')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">⚠️ Παραγγελμένα χωρίς Παραλαβή</p>
                  <p className="text-3xl font-bold text-orange-600">{orderedNotReceivedOnInstalled.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('remaining')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">Υπολειπόμενα Stickers</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {Object.values(remainingStickersByCategory).reduce((sum, count) => sum + count, 0)}
                  </p>
                </div>
                <Building2 className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Cards - Row 4: Summary */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Σύνοψη</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('remaining')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">Υπολειπόμενα Stickers (Installed Stops)</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {Object.values(remainingStickersByCategory).reduce((sum, count) => sum + count, 0)}
                  </p>
                </div>
                <Building2 className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('installed')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">Εγκατεστημένα Stickers</p>
                  <p className="text-3xl font-bold text-green-600">
                    {Object.values(installedStickersByCategory).reduce((sum, count) => sum + count, 0)}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('ordered')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">Στάσεις με Παραγγελθέντα Stickers</p>
                  <p className="text-3xl font-bold text-teal-600">{stopsWithOrderedStickers.length}</p>
                </div>
                <ShoppingCart className="w-10 h-10 text-teal-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>









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

      <Dialog open={activeDialog === 'atrisk'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stickers σε Κίνδυνο Καθυστέρησης - Παραγγελθέντα αλλά μη Παραληφθέντα ({stickersAtRisk.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = stickersAtRisk.map(item => {
              const stop = stops.find(s => s.id === item.stop_id);
              const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
              return {
                'Stop ID': stop?.stop_id || '-',
                'English Name': stop?.english_name || '-',
                'Greek Name': stop?.greek_name || '-',
                'Sticker Type': template?.sticker_name_category || '-',
                'Status': item.status,
                'Planned Date': stop?.current_planned_installation_date || '-'
              };
            });
            exportToExcel(data, 'stickers-at-risk');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Greek Name</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stickersAtRisk.map(item => {
                const stop = stops.find(s => s.id === item.stop_id);
                const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
                return (
                  <TableRow key={item.id} className="bg-orange-50">
                    <TableCell className="font-medium">{stop?.stop_id || '-'}</TableCell>
                    <TableCell>{stop?.english_name || '-'}</TableCell>
                    <TableCell>{stop?.greek_name || '-'}</TableCell>
                    <TableCell>{template?.sticker_name_category || '-'}</TableCell>
                    <TableCell><Badge className="bg-orange-600">{item.status}</Badge></TableCell>
                    <TableCell>{stop?.current_planned_installation_date || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'remaining'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Υπολειπόμενα Stickers σε Εγκατεστημένες Στάσεις - Ανά Κατηγορία</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const remainingItems = [];
            installedStopsWithRemainingStickers.forEach(stop => {
              const stopStickers = stickerItems.filter(item => 
                item.stop_id === stop.id && item.status !== "Installed"
              );
              stopStickers.forEach(item => {
                const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
                remainingItems.push({
                  'Stop ID': stop.stop_id,
                  'English Name': stop.english_name,
                  'Greek Name': stop.greek_name,
                  'Shelter Type': getShelterTypeDisplay(stop.shelter_type_approved_id),
                  'Sticker Type': template?.sticker_name_category || '-',
                  'Status': item.status,
                  'Planned Date': stop.current_planned_installation_date || '-'
                });
              });
            });
            exportToExcel(remainingItems, 'remaining-stickers-installed-stops');
          }} className="mb-4">Export to Excel</Button>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(remainingStickersByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <Card key={category}>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">{category}</p>
                      <p className="text-2xl font-bold text-purple-600">{count}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Greek Name</TableHead>
                <TableHead>Shelter Type</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installedStopsWithRemainingStickers.flatMap(stop => {
                const stopStickers = stickerItems.filter(item => 
                  item.stop_id === stop.id && item.status !== "Installed"
                );
                return stopStickers.map(item => {
                  const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{stop.stop_id}</TableCell>
                      <TableCell>{stop.english_name}</TableCell>
                      <TableCell>{stop.greek_name}</TableCell>
                      <TableCell>{getShelterTypeDisplay(stop.shelter_type_approved_id)}</TableCell>
                      <TableCell>{template?.sticker_name_category || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
                      <TableCell>{stop.current_planned_installation_date || '-'}</TableCell>
                    </TableRow>
                  );
                });
              })}
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