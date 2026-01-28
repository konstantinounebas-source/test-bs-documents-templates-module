import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, CheckCircle, MapPin, XCircle, ShoppingCart, Repeat, Building2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const [activeDialog, setActiveDialog] = useState(null);
  const [bufferDays, setBufferDays] = useState(30);

  // Fetch data
  const { data: stops = [] } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list(),
    initialData: [],
  });

  const { data: stickerItems = [] } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list(),
    initialData: [],
  });

  const { data: stickerTemplates = [] } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list(),
    initialData: [],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list(),
    initialData: [],
  });

  const { data: orderLines = [] } = useQuery({
    queryKey: ['orderLines'],
    queryFn: () => base44.entities.OrderLine.list(),
    initialData: [],
  });

  const { data: shelterTypes = [] } = useQuery({
    queryKey: ['shelterTypes'],
    queryFn: () => base44.entities.ShelterType.list(),
    initialData: [],
  });

  // Calculate statistics
  const stats = {
    totalStops: stops.length,
    stopsWithoutStickers: stops.filter(s => !stickerItems.some(si => si.stop_id === s.id)),
    criticalWithoutStickers: stops.filter(s => {
      const hasStickers = stickerItems.some(si => si.stop_id === s.id);
      if (hasStickers) return false;
      const plannedDate = new Date(s.current_planned_installation_date || new Date());
      const daysUntilInstall = Math.floor((plannedDate - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilInstall < bufferDays && daysUntilInstall >= 0;
    }),
    stopsWithStickersNoOrder: stops.filter(s => {
      const stopStickers = stickerItems.filter(si => si.stop_id === s.id);
      return stopStickers.length > 0 && stopStickers.some(si => si.status === "Needed");
    }),
    delayedOrders: stops.filter(s => {
      const stopStickers = stickerItems.filter(si => si.stop_id === s.id);
      return stopStickers.some(si => {
        const order = orders.find(o => orderLines.some(ol => ol.order_id === o.id && ol.sticker_item_id === si.id));
        if (!order) return false;
        const plannedDate = new Date(s.current_planned_installation_date || new Date());
        const estimatedDelivery = new Date(order.estimated_delivery || new Date());
        return plannedDate < estimatedDelivery;
      });
    }),
    orderedWithWarning: stickerItems.filter(si => {
      if (si.status !== "Ordered") return false;
      const stop = stops.find(s => s.id === si.stop_id);
      if (!stop?.current_planned_installation_date) return false;
      const daysBeforeInstall = Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysBeforeInstall < 14;
    }),
    orderedOnInstalledStopsNotReceived: stickerItems.filter(si => {
      if (si.status !== "Ordered") return false;
      const stop = stops.find(s => s.id === si.stop_id);
      return stop && stop.shelter_installed;
    }),
    installedWithoutStickerInstall: stickerItems.filter(si => {
      const stop = stops.find(s => s.id === si.stop_id);
      return stop && stop.shelter_installed && si.status !== "Installed";
    }),
    installedWithoutOrder: stickerItems.filter(si => {
      const stop = stops.find(s => s.id === si.stop_id);
      return stop && stop.shelter_installed && si.status === "Needed";
    }),
    orderedNotReceivedOnInstalled: stickerItems.filter(si => {
      const stop = stops.find(s => s.id === si.stop_id);
      return stop && stop.shelter_installed && si.status === "Ordered";
    }),
    highRiskStickers: stickerItems.filter(si => {
      if (si.status !== "Needed") return false;
      const stop = stops.find(s => s.id === si.stop_id);
      if (!stop?.current_planned_installation_date) return false;
      const daysUntil = Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntil < bufferDays && daysUntil >= 0;
    }),
    stickersWithMultipleOrders: stickerItems.filter(si => {
      return orderLines.filter(ol => ol.sticker_item_id === si.id).length > 1;
    }),
  };

  const getShelterTypeDisplay = (shelterTypeId) => {
    if (!shelterTypeId) return "-";
    const shelterType = shelterTypes.find(st => st.shelter_type_id === shelterTypeId || st.id === shelterTypeId);
    return shelterType?.description || shelterTypeId;
  };

  const getStopDisplay = (item) => {
    const stop = stops.find(s => s.id === item.stop_id);
    return stop?.stop_id || "-";
  };

  const getTemplateDisplay = (item) => {
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    return template?.sticker_name_category || "-";
  };

  const StatCard = ({ value, label, description, warning = false, icon: Icon, onClick }) => (
    <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${warning ? "border-red-300 bg-red-50" : ""}`} onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className={`text-3xl font-bold ${warning ? "text-red-600" : "text-blue-600"}`}>
              {Array.isArray(value) ? value.length : value}
            </div>
            <p className="text-sm font-medium text-gray-700 mt-2 flex items-center gap-2">
              {label}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    {description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>
          {Icon && <Icon className={`w-8 h-8 ${warning ? "text-red-600" : "text-blue-600"}`} />}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Operational Dashboard</h1>
        <p className="text-gray-600">Πλήρης επισκόπηση στάσεων και αυτοκόλλητων</p>
      </div>

      {/* Buffer Configuration */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">Ρυθμίσεις Παρακολούθησης</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="buffer" className="text-sm">Περιθώριο Ασφάλειας (ημέρες)</Label>
              <Input id="buffer" type="number" value={bufferDays} onChange={(e) => setBufferDays(parseInt(e.target.value) || 30)} min="1" className="mt-2" />
            </div>
            <div className="text-xs text-gray-600 pt-6">Χρησιμοποιείται για τον υπολογισμό των κρίσιμων στοιχείων</div>
          </div>
        </CardContent>
      </Card>

      {/* Row 1: Creation */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Δημιουργία Αυτοκόλλητων</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard value={stats.totalStops} label="Σύνολο Στάσεων" description="Ο συνολικός αριθμός όλων των στάσεων στο σύστημα" icon={MapPin} onClick={() => setActiveDialog('total')} />
          <StatCard value={stats.stopsWithoutStickers} label="Χωρίς Δημιουργημένα Stickers" description="Στάσεις που δεν έχουν καμία εγγραφή αυτοκόλλητου (StickerItem) στο σύστημα" icon={XCircle} onClick={() => setActiveDialog('without')} />
          <StatCard value={stats.criticalWithoutStickers} label="⚠️ Κρίσιμες χωρίς Stickers" description={`Στάσεις χωρίς stickers όπου η προγραμματισμένη ημερομηνία εγκατάστασης είναι σε λιγότερο από ${bufferDays} ημέρες`} warning icon={AlertTriangle} onClick={() => setActiveDialog('critical')} />
        </div>
      </div>

      {/* Row 2: Ordering */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Διαδικασία Παραγγελίας</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard value={stats.stopsWithStickersNoOrder} label="Με Stickers αλλά χωρίς Παραγγελία" description="Στάσεις που έχουν δημιουργηθεί τα είδη αυτοκόλλητων (StickerItem) αλλά δεν έχουν ακόμα μπει σε κάποια παραγγελία (Order)" icon={ShoppingCart} onClick={() => setActiveDialog('noorder')} />
          <StatCard value={stats.delayedOrders} label="⚠️ Καθυστερημένη Παραγγελία" description="Περιπτώσεις όπου η προγραμματισμένη ημερομηνία εγκατάστασης είναι μικρότερη από την εκτιμώμενη ημερομηνία παράδοσης της παραγγελίας" warning icon={AlertTriangle} onClick={() => setActiveDialog('delayed')} />
          <StatCard value={stats.highRiskStickers} label="🔴 Αυτοκόλλητα Υψηλού Κινδύνου" description={`Αυτοκόλλητα που είναι ακόμα στο στάδιο 'Needed' και η προγραμματισμένη εγκατάσταση είναι σε λιγότερο από ${bufferDays} ημέρες`} warning icon={AlertTriangle} onClick={() => setActiveDialog('highrisk')} />
        </div>
      </div>

      {/* Row 3: Order Tracking */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Παρακολούθηση Παραγγελιών</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard value={stats.orderedWithWarning} label="⚠️ Ordered με Προειδοποίηση" description="Αυτοκόλλητα που έχουν παραγγελθεί (status='Ordered') αλλά η προγραμματισμένη εγκατάσταση είναι σε λιγότερο από 14 ημέρες" warning icon={AlertTriangle} onClick={() => setActiveDialog('orderedwarn')} />
          <StatCard value={stats.orderedOnInstalledStopsNotReceived} label="⚠️ Ordered σε Εγκατεστημένες χωρίς Παραλαβή" description="Αυτοκόλλητα που είναι σε παραγγελία (status='Ordered') για στάσεις που έχουν ήδη εγκατασταθεί (shelter_installed=true), αλλά δεν έχουν ακόμα παραληφθεί" warning icon={AlertTriangle} onClick={() => setActiveDialog('orderedinstalled')} />
          <StatCard value={stats.stickersWithMultipleOrders} label="🔍 Πολλαπλές Παραγγελίες" description="Αυτοκόλλητα που εμφανίζονται σε περισσότερες από μία παραγγελίες (>1 OrderLine record)" icon={Repeat} onClick={() => setActiveDialog('multiple')} />
        </div>
      </div>

      {/* Row 4: Operational Mismatches */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Επιχειρησιακές Ασυμφωνίες</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard value={stats.installedWithoutStickerInstall} label="⚠️ Εγκατεστημένες χωρίς Τοποθέτηση" description="Στάσεις με shelter_installed=true αλλά τα αυτοκόλλητα δεν έχουν status='Installed'" warning icon={AlertTriangle} onClick={() => setActiveDialog('installed_no_sticker')} />
          <StatCard value={stats.installedWithoutOrder} label="🔴 Εγκατεστημένες χωρίς Παραγγελία" description="ΚΡΙΣΙΜΟ: Στάσεις με shelter_installed=true αλλά αυτοκόλλητα με status='Needed' (δεν έχει γίνει καν παραγγελία)" warning icon={AlertTriangle} onClick={() => setActiveDialog('installed_no_order')} />
          <StatCard value={stats.orderedNotReceivedOnInstalled} label="⚠️ Παραγγελμένα χωρίς Παραλαβή" description="Στάσεις με shelter_installed=true αλλά αυτοκόλλητα με status='Ordered' (εκκρεμούν στην παραγγελία)" warning icon={AlertTriangle} onClick={() => setActiveDialog('ordered_not_received')} />
        </div>
      </div>

      {/* Dialogs */}
      {/* Total Stops */}
      <Dialog open={activeDialog === 'total'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Όλες οι Στάσεις ({stats.totalStops})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Shelter Type</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stops.map(stop => (
                <TableRow key={stop.id}>
                  <TableCell className="font-medium">{stop.stop_id}</TableCell>
                  <TableCell>{stop.english_name}</TableCell>
                  <TableCell>{getShelterTypeDisplay(stop.shelter_type_approved_id)}</TableCell>
                  <TableCell>{stop.current_planned_installation_date || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Without Stickers */}
      <Dialog open={activeDialog === 'without'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Στάσεις χωρίς Αυτοκόλλητα ({stats.stopsWithoutStickers.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Planned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.stopsWithoutStickers.map(stop => (
                <TableRow key={stop.id}>
                  <TableCell className="font-medium">{stop.stop_id}</TableCell>
                  <TableCell>{stop.english_name}</TableCell>
                  <TableCell>{stop.current_planned_installation_date || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Critical Without Stickers */}
      <Dialog open={activeDialog === 'critical'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Κρίσιμες Στάσεις χωρίς Stickers ({stats.criticalWithoutStickers.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Planned Date</TableHead>
                <TableHead>Days Until Install</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.criticalWithoutStickers.map(stop => {
                const daysUntil = Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <TableRow key={stop.id} className="bg-red-50">
                    <TableCell className="font-medium">{stop.stop_id}</TableCell>
                    <TableCell>{stop.english_name}</TableCell>
                    <TableCell>{stop.current_planned_installation_date}</TableCell>
                    <TableCell><Badge variant="destructive">{daysUntil} days</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* No Order */}
      <Dialog open={activeDialog === 'noorder'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Με Stickers αλλά χωρίς Παραγγελία ({stats.stopsWithStickersNoOrder.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Pending Stickers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.stopsWithStickersNoOrder.map(stop => {
                const pendingCount = stickerItems.filter(si => si.stop_id === stop.id && si.status === "Needed").length;
                return (
                  <TableRow key={stop.id}>
                    <TableCell className="font-medium">{stop.stop_id}</TableCell>
                    <TableCell>{stop.english_name}</TableCell>
                    <TableCell><Badge>{pendingCount}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Delayed Orders */}
      <Dialog open={activeDialog === 'delayed'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Καθυστερημένες Παραγγελίες ({stats.delayedOrders.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Planned Date</TableHead>
                <TableHead>Est. Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.delayedOrders.map(stop => {
                const stickers = stickerItems.filter(si => si.stop_id === stop.id);
                return stickers.map((si, idx) => {
                  const order = orders.find(o => orderLines.some(ol => ol.order_id === o.id && ol.sticker_item_id === si.id));
                  return (
                    <TableRow key={`${stop.id}-${idx}`} className="bg-red-50">
                      <TableCell className="font-medium">{stop.stop_id}</TableCell>
                      <TableCell>{stop.current_planned_installation_date}</TableCell>
                      <TableCell>{order?.estimated_delivery || '-'}</TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* High Risk */}
      <Dialog open={activeDialog === 'highrisk'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Αυτοκόλλητα Υψηλού Κινδύνου ({stats.highRiskStickers.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Planned Date</TableHead>
                <TableHead>Days Until Install</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.highRiskStickers.map(si => {
                const stop = stops.find(s => s.id === si.stop_id);
                const daysUntil = stop?.current_planned_installation_date ? Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24)) : -1;
                return (
                  <TableRow key={si.id} className="bg-red-50">
                    <TableCell className="font-medium">{getStopDisplay(si)}</TableCell>
                    <TableCell>{getTemplateDisplay(si)}</TableCell>
                    <TableCell>{stop?.current_planned_installation_date || '-'}</TableCell>
                    <TableCell><Badge variant="destructive">{daysUntil} days</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Ordered with Warning */}
      <Dialog open={activeDialog === 'orderedwarn'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ordered με Προειδοποίηση ({stats.orderedWithWarning.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Planned Date</TableHead>
                <TableHead>Days Until Install</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.orderedWithWarning.map(si => {
                const stop = stops.find(s => s.id === si.stop_id);
                const daysUntil = stop?.current_planned_installation_date ? Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24)) : -1;
                return (
                  <TableRow key={si.id} className="bg-orange-50">
                    <TableCell className="font-medium">{getStopDisplay(si)}</TableCell>
                    <TableCell>{getTemplateDisplay(si)}</TableCell>
                    <TableCell>{stop?.current_planned_installation_date || '-'}</TableCell>
                    <TableCell><Badge className="bg-orange-600">{daysUntil} days</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Ordered on Installed */}
      <Dialog open={activeDialog === 'orderedinstalled'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ordered σε Εγκατεστημένες χωρίς Παραλαβή ({stats.orderedOnInstalledStopsNotReceived.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.orderedOnInstalledStopsNotReceived.map(si => (
                <TableRow key={si.id} className="bg-red-50">
                  <TableCell className="font-medium">{getStopDisplay(si)}</TableCell>
                  <TableCell>{getTemplateDisplay(si)}</TableCell>
                  <TableCell><Badge className="bg-red-600">{si.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Multiple Orders */}
      <Dialog open={activeDialog === 'multiple'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Πολλαπλές Παραγγελίες ({stats.stickersWithMultipleOrders.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Order Count</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.stickersWithMultipleOrders.map(si => {
                const count = orderLines.filter(ol => ol.sticker_item_id === si.id).length;
                return (
                  <TableRow key={si.id}>
                    <TableCell className="font-medium">{getStopDisplay(si)}</TableCell>
                    <TableCell>{getTemplateDisplay(si)}</TableCell>
                    <TableCell><Badge className="bg-blue-600">{count}x</Badge></TableCell>
                    <TableCell>{si.status}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Installed without Sticker Install */}
      <Dialog open={activeDialog === 'installed_no_sticker'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Εγκατεστημένες χωρίς Τοποθέτηση Stickers ({stats.installedWithoutStickerInstall.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.installedWithoutStickerInstall.map(si => (
                <TableRow key={si.id} className="bg-red-50">
                  <TableCell className="font-medium">{getStopDisplay(si)}</TableCell>
                  <TableCell>{getTemplateDisplay(si)}</TableCell>
                  <TableCell><Badge variant="outline">{si.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Installed without Order */}
      <Dialog open={activeDialog === 'installed_no_order'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🔴 ΚΡΙΣΙΜΟ: Εγκατεστημένες χωρίς Παραγγελία ({stats.installedWithoutOrder.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.installedWithoutOrder.map(si => (
                <TableRow key={si.id} className="bg-red-100">
                  <TableCell className="font-medium font-bold">{getStopDisplay(si)}</TableCell>
                  <TableCell>{getTemplateDisplay(si)}</TableCell>
                  <TableCell><Badge className="bg-red-600">{si.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Ordered not Received on Installed */}
      <Dialog open={activeDialog === 'ordered_not_received'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Παραγγελμένα χωρίς Παραλαβή σε Εγκατεστημένες ({stats.orderedNotReceivedOnInstalled.length})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stop ID</TableHead>
                <TableHead>Sticker Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.orderedNotReceivedOnInstalled.map(si => (
                <TableRow key={si.id} className="bg-orange-50">
                  <TableCell className="font-medium">{getStopDisplay(si)}</TableCell>
                  <TableCell>{getTemplateDisplay(si)}</TableCell>
                  <TableCell><Badge className="bg-orange-600">{si.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}