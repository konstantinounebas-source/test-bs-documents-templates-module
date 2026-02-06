import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function PaginationSelector({ pageSize, onPageSizeChange, total, shown, isLoading }) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-xs text-gray-600">Items per page:</Label>
      <Select value={pageSize.toString()} onValueChange={(val) => onPageSizeChange(val === 'all' ? total : parseInt(val))}>
        <SelectTrigger className="w-32 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="20">20</SelectItem>
          <SelectItem value="50">50</SelectItem>
          <SelectItem value="100">100</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
      <span className="text-xs text-gray-500">
        {shown} of {total}
      </span>
      {isLoading && (
        <div className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      )}
    </div>
  );
}