import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, ArrowUpAZ, ArrowDownAZ, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DataTableFilter({ 
  column, 
  data, 
  onFilterChange, 
  currentFilters = [] 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState(new Set(currentFilters));
  const [sortOrder, setSortOrder] = useState(null); // 'asc' or 'desc'

  // Get unique values from the data for this column
  const uniqueValues = React.useMemo(() => {
    const values = new Set();
    data.forEach(item => {
      const value = item[column];
      if (value !== null && value !== undefined && value !== '') {
        values.add(String(value));
      } else {
        values.add('(Blanks)');
      }
    });
    return Array.from(values).sort();
  }, [data, column]);

  // Filter unique values based on search
  const filteredValues = uniqueValues.filter(value =>
    value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setSelectedValues(new Set(currentFilters));
  }, [currentFilters]);

  const handleSelectAll = () => {
    if (selectedValues.size === uniqueValues.length) {
      setSelectedValues(new Set());
    } else {
      setSelectedValues(new Set(uniqueValues));
    }
  };

  const handleValueToggle = (value) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setSelectedValues(newSelected);
  };

  const handleApply = () => {
    const filters = Array.from(selectedValues);
    onFilterChange(column, filters, sortOrder);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedValues(new Set(uniqueValues));
    setSortOrder(null);
    onFilterChange(column, [], null);
    setIsOpen(false);
  };

  const handleSort = (order) => {
    setSortOrder(order);
    onFilterChange(column, Array.from(selectedValues), order);
    setIsOpen(false);
  };

  const isFiltered = currentFilters.length > 0 && currentFilters.length < uniqueValues.length;
  const hasSort = sortOrder !== null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 px-2 ${(isFiltered || hasSort) ? 'text-blue-600' : ''}`}
        >
          <Filter className={`w-4 h-4 ${(isFiltered || hasSort) ? 'fill-blue-600' : ''}`} />
          {isFiltered && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-blue-100 text-blue-700">
              {currentFilters.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b p-2 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => handleSort('asc')}
          >
            <ArrowUpAZ className="w-4 h-4 mr-2" />
            Sort A to Z
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => handleSort('desc')}
          >
            <ArrowDownAZ className="w-4 h-4 mr-2" />
            Sort Z to A
          </Button>
          {(isFiltered || hasSort) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={handleClear}
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filter
            </Button>
          )}
        </div>

        <div className="p-3 space-y-3">
          <div>
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-2">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="select-all"
                checked={selectedValues.size === uniqueValues.length}
                onCheckedChange={handleSelectAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer"
              >
                (Select All)
              </label>
            </div>

            {filteredValues.map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`filter-${value}`}
                  checked={selectedValues.has(value)}
                  onCheckedChange={() => handleValueToggle(value)}
                />
                <label
                  htmlFor={`filter-${value}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {value}
                </label>
              </div>
            ))}

            {filteredValues.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-2">
                No results found
              </p>
            )}
          </div>
        </div>

        <div className="border-t p-3 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
          >
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}