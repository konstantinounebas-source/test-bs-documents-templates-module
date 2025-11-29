import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

export default function DateRangeFilter({ columnKey, onFilterApply, currentFilter }) {
  const [dateRange, setDateRange] = useState({
    startDate: currentFilter?.startDate || null,
    endDate: currentFilter?.endDate || null
  });
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    onFilterApply(columnKey, dateRange);
    setIsOpen(false);
  };

  const handleClear = () => {
    const clearedRange = { startDate: null, endDate: null };
    setDateRange(clearedRange);
    onFilterApply(columnKey, null);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return `${format(new Date(dateRange.startDate), 'dd/MM')} - ${format(new Date(dateRange.endDate), 'dd/MM')}`;
    }
    if (dateRange.startDate) {
      return `Από ${format(new Date(dateRange.startDate), 'dd/MM/yyyy')}`;
    }
    if (dateRange.endDate) {
      return `Έως ${format(new Date(dateRange.endDate), 'dd/MM/yyyy')}`;
    }
    return '';
  };

  const hasFilter = currentFilter && (currentFilter.startDate || currentFilter.endDate);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant={hasFilter ? "default" : "ghost"} 
          size="sm" 
          className={`h-6 w-6 p-0 ${hasFilter ? 'bg-blue-100 text-blue-700' : ''}`}
        >
          <CalendarIcon className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Φίλτρο Ημερομηνίας</h4>
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 w-6 p-0">
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">Από</label>
              <input
                type="date"
                value={dateRange.startDate || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">Έως</label>
              <input
                type="date"
                value={dateRange.endDate || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>
          </div>

          {formatDateRange() && (
            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
              Επιλεγμένη περίοδος: {formatDateRange()}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Ακύρωση
            </Button>
            <Button size="sm" onClick={handleApply}>
              Εφαρμογή
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}