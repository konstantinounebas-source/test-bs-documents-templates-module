import React, { useState, useMemo } from "react";
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
    queryFn: () => base44.entities.Stop.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: stickerItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list(),
    staleTime: 2 * 60 * 1000
  });

  const { data: stickerTemplates = [] } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list(),
    staleTime: Infinity
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: orderLines = [] } = useQuery({
    queryKey: ['orderLines'],
    queryFn: () => base44.entities.OrderLine.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: shelterTypes = [] } = useQuery({
    queryKey: ['shelterTypes'],
    queryFn: () => base44.entities.ShelterType.list(),
    staleTime: Infinity
  });

  // 1. Συνολικός αριθμός στάσεων
  const totalStops = stops.length;

  // Memoized sticker lookups for performance
  const stickersByStop = useMemo(() => {
    const map = {};
    stickerItems.forEach(item => {
      if (!map[item.stop_id]) map[item.stop_id] = [];
      map[item.stop_id].push(item);
    });
    return map;
  }, [stickerItems]);

  // 2. Πόσες δεν έχουν δημιουργηθεί αυτοκόλλητα
  const stopsWithoutStickers = useMemo(() => 
    stops.filter(stop => !stickersByStop[stop.id] || stickersByStop[stop.id].length === 0),
    [stops, stickersByStop]
  );

  // 3. Πόσες είναι critical
  const criticalStops = useMemo(() => 
    stops.filter(stop => {
      if (!stop.shelter_installed) return false;
      const stopStickers = stickersByStop[stop.id];
      if (!stopStickers || stopStickers.length === 0) return false;
      return !stopStickers.every(item => item.status === "Installed");
    }),
    [stops, stickersByStop]
  );

  // 4. Πόσες έχουν παραγγελθεί τα αυτοκόλλητα
  const stopsWithOrderedStickers = useMemo(() =>
    stops.filter(stop => {
      const stopStickers = stickersByStop[stop.id];
      return stopStickers && stopStickers.some(item => ["Ordered", "Received", "Installed"].includes(item.status));
    }),
    [stops, stickersByStop]
  );



  const [bufferDays, setBufferDays] = React.useState(30);

  // 1η ΣΕΙΡΑ: Δημιουργία Αυτοκόλλητων (Needs Assessment)
  const stopsWithoutStickersCreated = stopsWithoutStickers;

  const criticalStopsWarning = useMemo(() =>
    stops.filter(stop => {
      if (stickersByStop[stop.id]) return false;
      if (!stop.current_planned_installation_date) return false;
      const daysUntil = Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntil < bufferDays && daysUntil >= 0;
    }),
    [stops, stickersByStop, bufferDays]
  );

  // 2η ΣΕΙΡΑ: Διαδικασία Παραγγελίας (Ordering Flow)
  
  // Create template lookup for performance
  const templatesMap = useMemo(() => {
    const map = {};
    stickerTemplates.forEach(t => map[t.id] = t);
    return map;
  }, [stickerTemplates]);

  const stopsMap = useMemo(() => {
    const map = {};
    stops.forEach(s => map[s.id] = s);
    return map;
  }, [stops]);

  const stopsWithStickersNoOrder = useMemo(() =>
    stops.filter(stop => {
      const stopStickers = stickersByStop[stop.id];
      return stopStickers && stopStickers.some(item => item.status === "Needed");
    }),
    [stops, stickersByStop]
  );

  const delayedOrderingRisk = useMemo(() =>
    stickerItems.filter(item => {
      if (item.status !== "Needed") return false;
      const stop = stopsMap[item.stop_id];
      if (!stop?.current_planned_installation_date) return false;
      const template = templatesMap[item.sticker_template_id];
      if (!template?.estimated_delivery_days) return false;
      const plannedDate = new Date(stop.current_planned_installation_date);
      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + template.estimated_delivery_days);
      return estimatedDeliveryDate > plannedDate;
    }),
    [stickerItems, stopsMap, templatesMap]
  );

  // 3η ΣΕΙΡΑ: Παρακολούθηση Παραγγελιών (Order Tracking)
  
  const orderedWithWarning = useMemo(() =>
    stickerItems.filter(item => {
      if (item.status !== "Ordered") return false;
      const stop = stopsMap[item.stop_id];
      if (!stop?.current_planned_installation_date) return false;
      const template = templatesMap[item.sticker_template_id];
      if (!template) return false;
      const plannedDate = new Date(stop.current_planned_installation_date);
      const daysBeforeNeeded = template.days_before_installation_to_receive || 7;
      const neededByDate = new Date(plannedDate);
      neededByDate.setDate(neededByDate.getDate() - daysBeforeNeeded);
      return new Date() > neededByDate;
    }),
    [stickerItems, stopsMap, templatesMap]
  );

  const orderedOnInstalledNotReceived = useMemo(() =>
    stickerItems.filter(item => {
      if (item.status !== "Ordered") return false;
      const stop = stopsMap[item.stop_id];
      return stop && stop.shelter_installed;
    }),
    [stickerItems, stopsMap]
  );

  // 4η ΣΕΙΡΑ: Επιχειρησιακές Ασυμφωνίες (Mismatches)
  
  const installedWithoutStickerInstall = useMemo(() =>
    stickerItems.filter(item => {
      const stop = stopsMap[item.stop_id];
      return stop && stop.shelter_installed && item.status !== "Installed";
    }),
    [stickerItems, stopsMap]
  );

  const installedWithoutOrder = useMemo(() =>
    stickerItems.filter(item => {
      const stop = stopsMap[item.stop_id];
      return stop && stop.shelter_installed && item.status === "Needed";
    }),
    [stickerItems, stopsMap]
  );

  const orderedNotReceivedOnInstalled = useMemo(() =>
    stickerItems.filter(item => {
      const stop = stopsMap[item.stop_id];
      return stop && stop.shelter_installed && item.status === "Ordered";
    }),
    [stickerItems, stopsMap]
  );

  const stickersOrderedMultipleTimes = useMemo(() =>
    stickerItems.filter(item => (item.total_ordered_quantity || 0) > 1),
    [stickerItems]
  );

  // 7. Στάσεις εγκατεστημένες - υπολειπόμενα αυτοκόλλητα ανά κατηγορία
  const installedStopsWithRemainingStickers = useMemo(() =>
    stops.filter(stop => {
      if (!stop.shelter_installed) return false;
      const stopStickers = stickersByStop[stop.id];
      if (!stopStickers || stopStickers.length === 0) return false;
      return stopStickers.some(item => item.status !== "Installed");
    }),
    [stops, stickersByStop]
  );

  const remainingStickersByCategory = useMemo(() => {
    const map = {};
    installedStopsWithRemainingStickers.forEach(stop => {
      const stopStickers = (stickersByStop[stop.id] || []).filter(item => item.status !== "Installed");
      stopStickers.forEach(item => {
        const template = templatesMap[item.sticker_template_id];
        const category = template?.sticker_name_category || "Unknown";
        map[category] = (map[category] || 0) + 1;
      });
    });
    return map;
  }, [installedStopsWithRemainingStickers, stickersByStop, templatesMap]);

  // 8. Αυτοκόλλητα installed ανά κατηγορία
  const installedStickersByCategory = useMemo(() => {
    const map = {};
    stickerItems.forEach(item => {
      if (item.status === "Installed") {
        const template = templatesMap[item.sticker_template_id];
        const category = template?.sticker_name_category || "Unknown";
        map[category] = (map[category] || 0) + 1;
      }
    });
    return map;
  }, [stickerItems, templatesMap]);

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
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [headers, ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
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

      {/* Summary Cards - Row 1: Δημιουργία Αυτοκόλλητων (Needs Assessment) */}
       <div>
         <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Δημιουργία Αυτοκόλλητων (Needs Assessment)</h2>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
           <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('total')}>
             <CardContent className="pt-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                   <p className="text-sm font-medium text-gray-700 mb-1">Σύνολο Στάσεων</p>
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
                   <p className="text-sm font-medium text-gray-700 mb-1">Χωρίς Stickers</p>
                   <p className="text-3xl font-bold text-gray-600">{stopsWithoutStickersCreated.length}</p>
                 </div>
                 <XCircle className="w-10 h-10 text-gray-600" />
               </div>
             </CardContent>
           </Card>
           <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('warning1')}>
             <CardContent className="pt-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                   <p className="text-sm font-medium text-gray-700 mb-1">⚠️ Κρίσιμες χωρίς Stickers</p>
                   <p className="text-3xl font-bold text-red-600">{criticalStopsWarning.length}</p>
                 </div>
                 <AlertTriangle className="w-10 h-10 text-red-600" />
               </div>
             </CardContent>
           </Card>
         </div>
       </div>

       {/* Summary Cards - Row 2: Διαδικασία Παραγγελίας (Ordering Flow) */}
       <div>
         <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Διαδικασία Παραγγελίας (Ordering Flow)</h2>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
           <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('noorder')}>
             <CardContent className="pt-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                   <p className="text-sm font-medium text-gray-700 mb-1">Stickers χωρίς Παραγγελία</p>
                   <p className="text-3xl font-bold text-yellow-600">{stopsWithStickersNoOrder.length}</p>
                 </div>
                 <Package className="w-10 h-10 text-yellow-600" />
               </div>
             </CardContent>
           </Card>
           <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('delayed')}>
             <CardContent className="pt-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                   <p className="text-sm font-medium text-gray-700 mb-1">⚠️ Καθυστερημένη Παραγγελία</p>
                   <p className="text-3xl font-bold text-orange-600">{delayedOrderingRisk.length}</p>
                 </div>
                 <AlertTriangle className="w-10 h-10 text-orange-600" />
               </div>
             </CardContent>
           </Card>
           <Card className="bg-blue-50 border-blue-200">
             <CardContent className="pt-6">
               <div className="flex items-center gap-3">
                 <div className="flex-1 max-w-xs">
                   <Label htmlFor="buffer" className="text-sm font-medium">Περιθώριο (ημέρες)</Label>
                   <Input id="buffer" type="number" value={bufferDays} onChange={(e) => setBufferDays(parseInt(e.target.value) || 30)} min="1" className="mt-2 h-8" />
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>
       </div>



      {/* Summary Cards - Row 3: Παρακολούθηση Παραγγελιών (Order Tracking) */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Παρακολούθηση Παραγγελιών (Order Tracking)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('orderedwarn')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">⚠️ Ordered με Warning</p>
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
                  <p className="text-sm font-medium text-gray-700 mb-1">Ordered σε Εγκατ. (χωρίς Παραλαβή)</p>
                  <p className="text-3xl font-bold text-orange-600">{orderedOnInstalledNotReceived.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Cards - Row 4: Επιχειρησιακές Ασυμφωνίες (Mismatches) */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Επιχειρησιακές Ασυμφωνίες (Mismatches)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('installed_no_sticker')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">Εγκατεστημένες χωρίς Εγκατ. Stickers</p>
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
                  <p className="text-sm font-medium text-gray-700 mb-1">🔴 ΚΡΙΣΙΜΟ: χωρίς Παραγγελία</p>
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
                  <p className="text-sm font-medium text-gray-700 mb-1">Ordered vs Received</p>
                  <p className="text-3xl font-bold text-orange-600">{orderedNotReceivedOnInstalled.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Cards - Row 5 & 6: Ανάλυση & Έλεγχος (Analysis & Control) */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Ανάλυση & Έλεγχος (Analysis & Control)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('remaining')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">Υπολειπόμενα ανά Κατηγορία</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {Object.values(remainingStickersByCategory).reduce((sum, count) => sum + count, 0)}
                  </p>
                </div>
                <Building2 className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveDialog('multiple')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Κλικ για λεπτομέρειες</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">Πολλαπλές Παραγγελίες</p>
                  <p className="text-3xl font-bold text-blue-500">{stickersOrderedMultipleTimes.length}</p>
                </div>
                <Repeat className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>









      {/* Dialogs */}

      {/* Row 1 Dialogs */}
      <Dialog open={activeDialog === 'warning1'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>⚠️ Κρίσιμες Στάσεις χωρίς Stickers - Planned Date &lt; {bufferDays} ημέρες ({criticalStopsWarning.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = criticalStopsWarning.map(s => ({
              'Stop ID': s.stop_id,
              'English Name': s.english_name,
              'Greek Name': s.greek_name,
              'Planned Date': s.current_planned_installation_date || '-',
              'Days Until': Math.floor((new Date(s.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24))
            }));
            exportToExcel(data, 'critical-stops-warning');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Greek Name</TableHead>
                <TableHead>Planned Date</TableHead>
                <TableHead>Days Until</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criticalStopsWarning.map(stop => (
                <TableRow key={stop.id} className="bg-red-50">
                  <TableCell className="font-medium">{stop.stop_id}</TableCell>
                  <TableCell>{stop.english_name}</TableCell>
                  <TableCell>{stop.greek_name}</TableCell>
                  <TableCell>{stop.current_planned_installation_date || '-'}</TableCell>
                  <TableCell><Badge className="bg-red-600">{Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24))}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Row 2 Dialogs */}
      <Dialog open={activeDialog === 'noorder'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Στάσεις με Stickers αλλά χωρίς Παραγγελία ({stopsWithStickersNoOrder.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = stopsWithStickersNoOrder.map(s => ({
              'Stop ID': s.stop_id,
              'English Name': s.english_name,
              'Greek Name': s.greek_name,
              'Planned Date': s.current_planned_installation_date || '-'
            }));
            exportToExcel(data, 'stickers-no-order');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Greek Name</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stopsWithStickersNoOrder.map(stop => (
                <TableRow key={stop.id} className="bg-yellow-50">
                  <TableCell className="font-medium">{stop.stop_id}</TableCell>
                  <TableCell>{stop.english_name}</TableCell>
                  <TableCell>{stop.greek_name}</TableCell>
                  <TableCell>{stop.current_planned_installation_date || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'delayed'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>⚠️ Καθυστερημένη Παραγγελία - Planned Date &lt; Estimated Delivery ({delayedOrderingRisk.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = delayedOrderingRisk.map(item => {
              const stop = stops.find(s => s.id === item.stop_id);
              const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
              return {
                'Stop ID': getStopDisplay(item),
                'Sticker Type': getTemplateDisplay(item),
                'Planned Date': stop?.current_planned_installation_date || '-',
                'Est. Delivery Days': template?.estimated_delivery_days || '-'
              };
            });
            exportToExcel(data, 'delayed-ordering');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Planned Date</TableHead>
                <TableHead>Est. Delivery Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delayedOrderingRisk.map(item => {
                const stop = stops.find(s => s.id === item.stop_id);
                const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
                return (
                  <TableRow key={item.id} className="bg-orange-50">
                    <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                    <TableCell>{getTemplateDisplay(item)}</TableCell>
                    <TableCell>{stop?.current_planned_installation_date || '-'}</TableCell>
                    <TableCell><Badge className="bg-orange-600">{template?.estimated_delivery_days || '-'}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

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

      <Dialog open={activeDialog === 'orderedwarn'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ordered με Προειδοποίηση ({orderedWithWarning.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = orderedWithWarning.map(item => {
              const stop = stops.find(s => s.id === item.stop_id);
              return {
                'Stop ID': getStopDisplay(item),
                'Sticker Type': getTemplateDisplay(item),
                'Status': item.status,
                'Planned Date': stop?.current_planned_installation_date || '-'
              };
            });
            exportToExcel(data, 'ordered-warning');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedWithWarning.map(item => {
                const stop = stops.find(s => s.id === item.stop_id);
                return (
                  <TableRow key={item.id} className="bg-orange-50">
                    <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                    <TableCell>{getTemplateDisplay(item)}</TableCell>
                    <TableCell><Badge className="bg-orange-600">{item.status}</Badge></TableCell>
                    <TableCell>{stop?.current_planned_installation_date || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'orderedinstalled'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ordered σε Εγκατεστημένες χωρίς Παραλαβή ({orderedOnInstalledNotReceived.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = orderedOnInstalledNotReceived.map(item => ({
              'Stop ID': getStopDisplay(item),
              'Sticker Type': getTemplateDisplay(item),
              'Status': item.status
            }));
            exportToExcel(data, 'ordered-installed');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedOnInstalledNotReceived.map(item => (
                <TableRow key={item.id} className="bg-red-50">
                  <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                  <TableCell>{getTemplateDisplay(item)}</TableCell>
                  <TableCell><Badge className="bg-red-600">{item.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'installed_no_sticker'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Εγκατεστημένες χωρίς Τοποθέτηση Stickers ({installedWithoutStickerInstall.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = installedWithoutStickerInstall.map(item => ({
              'Stop ID': getStopDisplay(item),
              'Sticker Type': getTemplateDisplay(item),
              'Status': item.status
            }));
            exportToExcel(data, 'installed-no-sticker');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installedWithoutStickerInstall.map(item => (
                <TableRow key={item.id} className="bg-red-50">
                  <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                  <TableCell>{getTemplateDisplay(item)}</TableCell>
                  <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'installed_no_order'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🔴 ΚΡΙΣΙΜΟ: Εγκατεστημένες χωρίς Παραγγελία ({installedWithoutOrder.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = installedWithoutOrder.map(item => ({
              'Stop ID': getStopDisplay(item),
              'Sticker Type': getTemplateDisplay(item),
              'Status': item.status
            }));
            exportToExcel(data, 'installed-no-order');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installedWithoutOrder.map(item => (
                <TableRow key={item.id} className="bg-red-100">
                  <TableCell className="font-medium font-bold">{getStopDisplay(item)}</TableCell>
                  <TableCell>{getTemplateDisplay(item)}</TableCell>
                  <TableCell><Badge className="bg-red-600">{item.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'ordered_not_received'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Παραγγελμένα χωρίς Παραλαβή σε Εγκατεστημένες ({orderedNotReceivedOnInstalled.length})</DialogTitle>
          </DialogHeader>
          <Button onClick={() => {
            const data = orderedNotReceivedOnInstalled.map(item => ({
              'Stop ID': getStopDisplay(item),
              'Sticker Type': getTemplateDisplay(item),
              'Status': item.status
            }));
            exportToExcel(data, 'ordered-not-received');
          }} className="mb-4">Export to Excel</Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedNotReceivedOnInstalled.map(item => (
                <TableRow key={item.id} className="bg-orange-50">
                  <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                  <TableCell>{getTemplateDisplay(item)}</TableCell>
                  <TableCell><Badge className="bg-orange-600">{item.status}</Badge></TableCell>
                </TableRow>
              ))}
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