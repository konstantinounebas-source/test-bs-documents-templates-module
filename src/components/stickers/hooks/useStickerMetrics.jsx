import { useMemo } from 'react';

/**
 * Compute all sticker metrics once - shared across all pages
 * Prevents duplicate calculations in Dashboard, Stops, OrdersManagement
 */
export function useStickerMetrics(stops = [], stickerItems = [], stickerTemplates = []) {
  return useMemo(() => {
    const metrics = {
      // Indexed lookups for O(1) access
      stickersByStop: {},
      stickersByStatus: {},
      criticalStops: new Set(),
      installedStops: new Set(),
      
      // Group calculations
      get: {
        itemsByStop: (stopId) => metrics.stickersByStop[stopId] || [],
        itemsByStatus: (status) => metrics.stickersByStatus[status] || [],
        isCritical: (stopId, itemId) => {
          const stop = stops.find(s => s.id === stopId);
          const item = stickerItems.find(i => i.id === itemId);
          if (!stop || !item) return false;

          const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
          const daysBeforeInstall = template?.days_before_installation_to_receive || 0;
          
          if (item.status === "Needed" && stop.current_planned_installation_date) {
            const daysUntil = Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24));
            return daysUntil < daysBeforeInstall;
          }
          
          if (item.status === "Ordered" && stop.current_planned_installation_date) {
            const receiveByDate = new Date(stop.current_planned_installation_date);
            receiveByDate.setDate(receiveByDate.getDate() - daysBeforeInstall);
            return new Date() > receiveByDate;
          }
          
          return false;
        },
        stickerCounts: (stopId) => {
          const items = metrics.stickersByStop[stopId] || [];
          return {
            needed: items.filter(i => i.status === "Needed").length,
            ordered: items.filter(i => i.status === "Ordered").length,
            received: items.filter(i => i.status === "Received").length,
            installed: items.filter(i => i.status === "Installed").length
          };
        }
      }
    };

    // Build indices
    stickerItems.forEach(item => {
      // Index by stop
      if (!metrics.stickersByStop[item.stop_id]) {
        metrics.stickersByStop[item.stop_id] = [];
      }
      metrics.stickersByStop[item.stop_id].push(item);

      // Index by status
      if (!metrics.stickersByStatus[item.status]) {
        metrics.stickersByStatus[item.status] = [];
      }
      metrics.stickersByStatus[item.status].push(item);
    });

    // Pre-compute critical stops and installed stops
    stops.forEach(stop => {
      const items = metrics.stickersByStop[stop.id] || [];
      
      // Check if critical
      if (items.some(item => metrics.get.isCritical(stop.id, item.id))) {
        metrics.criticalStops.add(stop.id);
      }
      
      // Check if all installed
      if (items.length > 0 && items.every(i => i.status === "Installed")) {
        metrics.installedStops.add(stop.id);
      }
    });

    return metrics;
  }, [stops.length, stickerItems.length, stickerTemplates.length]);
}