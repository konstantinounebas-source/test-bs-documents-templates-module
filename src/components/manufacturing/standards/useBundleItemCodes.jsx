import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook to fetch unique item codes from DATA tab (StdSetLines) for a bundle
 * This is the master list of item codes for the bundle
 */
export function useBundleItemCodes(bundleId) {
  return useQuery({
    queryKey: ['BundleItemCodes', bundleId],
    queryFn: async () => {
      if (!bundleId) return [];
      
      const lines = await base44.entities.StdSetLines.filter({ bundle_id: bundleId });
      
      // Get unique item codes
      const uniqueItemCodes = [...new Set(lines.map(l => l.item_code))].filter(Boolean);
      
      return uniqueItemCodes.sort();
    },
    enabled: !!bundleId,
    staleTime: 0
  });
}