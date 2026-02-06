import { useState, useEffect, useMemo } from 'react';

/**
 * Lazy pagination hook - loads first batch, then loads rest after delay
 * @param items - Full array of items
 * @param defaultPageSize - Initial page size (20, 50, 100, etc)
 */
export function useLazyPagination(items = [], defaultPageSize = 20) {
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [isLoadingRest, setIsLoadingRest] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Load first batch immediately
  const currentBatch = useMemo(() => {
    return items.slice(0, pageSize);
  }, [items, pageSize]);

  // Load rest after 2 seconds
  useEffect(() => {
    if (pageSize < items.length && !showAll) {
      setIsLoadingRest(true);
      const timer = setTimeout(() => {
        setShowAll(true);
        setIsLoadingRest(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pageSize, items.length, showAll]);

  const displayedItems = showAll ? items : currentBatch;
  const hasMore = displayedItems.length < items.length;

  return {
    displayedItems,
    pageSize,
    setPageSize,
    hasMore,
    isLoadingRest,
    total: items.length,
    shown: displayedItems.length
  };
}