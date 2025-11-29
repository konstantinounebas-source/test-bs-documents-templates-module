import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'On Hold', 'Completed'];

export default function StatusFilter({ columnKey, columnLabel, onApplyFilter, currentFilterValue }) {
  const handleSelectChange = (value) => {
    onApplyFilter(columnKey, value === 'all' ? '' : value);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Filter className={`w-3 h-3 ${currentFilterValue ? 'text-blue-600' : 'opacity-30'}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <Select value={currentFilterValue || 'all'} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full text-sm h-8">
            <SelectValue placeholder={`Filter ${columnLabel}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUS_OPTIONS.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  );
}