import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OperationalDashboard() {
  const [bufferDays, setBufferDays] = useState(30); // Default 1 month

  // Fetch all required data
  const { data: stops } = useQuery({
    queryKey: ["stops"],
    queryFn: () => base44.entities.Stop.list(),
    initialData: [],
  });

  const { data: stickerItems } = useQuery({
    queryKey: ["stickerItems"],
    queryFn: () => base44.entities.StickerItem.list(),
    initialData: [],
  });

  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list(),
    initialData: [],
  });

  const { data: orderLines } = useQuery({
    queryKey: ["orderLines"],
    queryFn: () => base44.entities.OrderLine.list(),
    initialData: [],
  });

  // Calculate statistics
  const stats = {
    // Row 1: Creation
    totalStops: stops.length,
    stopsWithoutStickers: stops.filter(s => !stickerItems.some(si => si.stop_id === s.id)).length,
    criticalWithoutStickers: stops.filter(s => {
      const hasStickers = stickerItems.some(si => si.stop_id === s.id);
      if (hasStickers) return false;
      const plannedDate = new Date(s.planned_date || new Date());
      const daysUntilInstall = Math.floor((plannedDate - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilInstall < bufferDays && daysUntilInstall >= 0;
    }).length,

    // Row 2: Ordering
    stopsWithStickersNoOrder: stops.filter(s => {
      const hasStickers = stickerItems.some(si => si.stop_id === s.id);
      if (!hasStickers) return false;
      const stickerItemsForStop = stickerItems.filter(si => si.stop_id === s.id);
      return stickerItemsForStop.some(si => si.status === "Needed");
    }).length,
    
    delayedOrders: stops.filter(s => {
      const stickersForStop = stickerItems.filter(si => si.stop_id === s.id);
      if (stickersForStop.length === 0) return false;
      const plannedDate = new Date(s.planned_date || new Date());
      return stickersForStop.some(si => {
        const orderForSticker = orders.find(o => 
          orderLines.some(ol => ol.order_id === o.id && ol.sticker_item_id === si.id)
        );
        if (!orderForSticker) return false;
        const estimatedDelivery = new Date(orderForSticker.estimated_delivery || new Date());
        return plannedDate < estimatedDelivery;
      });
    }).length,

    // Row 3: Order Tracking
    orderedWithWarning: stickerItems.filter(si => {
      if (si.status !== "Ordered") return false;
      const stop = stops.find(s => s.id === si.stop_id);
      if (!stop) return false;
      const plannedDate = new Date(stop.planned_date || new Date());
      const daysBeforeInstall = Math.floor((plannedDate - new Date()) / (1000 * 60 * 60 * 24));
      return daysBeforeInstall < 14; // 2 weeks warning
    }).length,

    orderedOnInstalledStopsNotReceived: stickerItems.filter(si => {
      if (si.status !== "Ordered") return false;
      const stop = stops.find(s => s.id === si.stop_id);
      if (!stop || stop.installation_status !== "Installed") return false;
      return true;
    }).length,

    // Row 4: Operational Mismatches
    installedWithoutStickerInstall: stickerItems.filter(si => {
      const stop = stops.find(s => s.id === si.stop_id);
      if (!stop || stop.installation_status !== "Installed") return false;
      return si.status !== "Installed";
    }).length,

    installedWithoutOrder: stickerItems.filter(si => {
      const stop = stops.find(s => s.id === si.stop_id);
      if (!stop || stop.installation_status !== "Installed") return false;
      return si.status === "Needed";
    }).length,

    orderedNotReceivedOnInstalled: stickerItems.filter(si => {
      const stop = stops.find(s => s.id === si.stop_id);
      if (!stop || stop.installation_status !== "Installed") return false;
      return si.status === "Ordered";
    }).length,

    // Row 5: High Risk
    highRiskStickers: stickerItems.filter(si => {
      if (si.status !== "Needed") return false;
      const stop = stops.find(s => s.id === si.stop_id);
      if (!stop) return false;
      const plannedDate = new Date(stop.planned_date || new Date());
      const daysUntil = Math.floor((plannedDate - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntil < bufferDays && daysUntil >= 0;
    }).length,

    // Row 6: Multiple Orders
    stickersWithMultipleOrders: stickerItems.filter(si => {
      const orderCount = orderLines.filter(ol => ol.sticker_item_id === si.id).length;
      return orderCount > 1;
    }).length,
  };

  const StatCard = ({ value, label, description, warning = false }) => (
    <Card className={warning ? "border-red-300 bg-red-50" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className={`text-3xl font-bold ${warning ? "text-red-600" : "text-blue-600"}`}>
              {value}
            </div>
            <p className="text-sm font-medium text-gray-700 mt-2">{label}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-5 h-5 text-gray-400 cursor-help flex-shrink-0 ml-2" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs">
                {description}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Operational Dashboard</h1>
          <p className="text-gray-600">Πλήρης επισκόπηση στάσεων και αυτοκόλλητων</p>
        </div>

        {/* Buffer Configuration */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Ρυθμίσεις Παρακολούθησης</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="buffer" className="text-sm">Περιθώριο Ασφάλειας (ημέρες)</Label>
                <Input
                  id="buffer"
                  type="number"
                  value={bufferDays}
                  onChange={(e) => setBufferDays(parseInt(e.target.value) || 30)}
                  min="1"
                  className="mt-2"
                />
              </div>
              <div className="text-xs text-gray-600 pt-6">
                Χρησιμοποιείται για τον υπολογισμό των κρίσιμων στοιχείων
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 1: Creation */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Δημιουργία Αυτοκόλλητων</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              value={stats.totalStops}
              label="Σύνολο Στάσεων"
              description="Ο συνολικός αριθμός όλων των στάσεων στο σύστημα"
            />
            <StatCard
              value={stats.stopsWithoutStickers}
              label="Χωρίς Δημιουργημένα Stickers"
              description="Στάσεις που δεν έχουν καμία εγγραφή αυτοκόλλητου (StickerItem) στο σύστημα"
            />
            <StatCard
              value={stats.criticalWithoutStickers}
              label="⚠️ Κρίσιμες χωρίς Stickers"
              description={`Στάσεις χωρίς stickers όπου η προγραμματισμένη ημερομηνία εγκατάστασης είναι σε λιγότερο από ${bufferDays} ημέρες`}
              warning
            />
          </div>
        </div>

        {/* Row 2: Ordering */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Διαδικασία Παραγγελίας</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              value={stats.stopsWithStickersNoOrder}
              label="Με Stickers αλλά χωρίς Παραγγελία"
              description="Στάσεις που έχουν δημιουργηθεί τα είδη αυτοκόλλητων (StickerItem) αλλά δεν έχουν ακόμα μπει σε κάποια παραγγελία (Order)"
            />
            <StatCard
              value={stats.delayedOrders}
              label="⚠️ Καθυστερημένη Παραγγελία"
              description="Περιπτώσεις όπου η προγραμματισμένη ημερομηνία εγκατάστασης είναι μικρότερη από την εκτιμώμενη ημερομηνία παράδοσης της παραγγελίας"
              warning
            />
            <StatCard
              value={stats.highRiskStickers}
              label="🔴 Αυτοκόλλητα Υψηλού Κινδύνου"
              description={`Αυτοκόλλητα που είναι ακόμα στο στάδιο 'Needed' και η προγραμματισμένη εγκατάσταση είναι σε λιγότερο από ${bufferDays} ημέρες`}
              warning
            />
          </div>
        </div>

        {/* Row 3: Order Tracking */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Παρακολούθηση Παραγγελιών</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              value={stats.orderedWithWarning}
              label="⚠️ Ordered με Προειδοποίηση"
              description="Αυτοκόλλητα που έχουν παραγγελθεί αλλά η προγραμματισμένη εγκατάσταση είναι σε λιγότερο από 14 ημέρες (κίνδυνος κοινής καθυστέρησης)"
              warning
            />
            <StatCard
              value={stats.orderedOnInstalledStopsNotReceived}
              label="⚠️ Ordered σε Εγκατεστημένες Χωρίς Παραλαβή"
              description="Αυτοκόλλητα που είναι σε παραγγελία για στάσεις που έχουν ήδη εγκατασταθεί, αλλά δεν έχουν ακόμα παραληφθεί"
              warning
            />
            <StatCard
              value={stats.stickersWithMultipleOrders}
              label="🔍 Πολλαπλές Παραγγελίες"
              description="Αυτοκόλλητα που εμφανίζονται σε περισσότερες από μία παραγγελίες (δυνητικά διπλοεγγραφές)"
            />
          </div>
        </div>

        {/* Row 4: Operational Mismatches */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Επιχειρησιακές Ασυμφωνίες</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              value={stats.installedWithoutStickerInstall}
              label="⚠️ Εγκατεστημένες χωρίς Τοποθέτηση"
              description="Στάσεις που έχουν εγκατασταθεί αλλά τα αυτοκόλλητα δεν έχουν ακόμα σημειωθεί ως εγκατεστημένα (status ≠ 'Installed')"
              warning
            />
            <StatCard
              value={stats.installedWithoutOrder}
              label="🔴 Εγκατεστημένες χωρίς Παραγγελία"
              description="Σοβαρό σφάλμα: Στάσεις που έχουν εγκατασταθεί αλλά δεν έχει γίνει καν παραγγελία για τα αυτοκόλλητα (status = 'Needed')"
              warning
            />
            <StatCard
              value={stats.orderedNotReceivedOnInstalled}
              label="⚠️ Παραγγελμένα χωρίς Παραλαβή"
              description="Στάσεις που έχουν εγκατασταθεί αλλά τα αυτοκόλλητα εξακολουθούν να βρίσκονται σε παραγγελία (status = 'Ordered')"
              warning
            />
          </div>
        </div>
      </div>
    </div>
  );
}