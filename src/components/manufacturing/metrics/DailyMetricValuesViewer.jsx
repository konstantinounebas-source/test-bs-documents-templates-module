import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search } from 'lucide-react';

export default function DailyMetricValuesViewer() {
  const [searchDate, setSearchDate] = useState('');
  const [searchDept, setSearchDept] = useState('');

  const { data: metricValues = [], isLoading } = useQuery({
    queryKey: ['DailyMetricValue'],
    queryFn: () => base44.entities.DailyMetricValue.list()
  });

  const filteredValues = metricValues.filter(mv => {
    const dateMatch = !searchDate || mv.date?.includes(searchDate);
    const deptMatch = !searchDept || mv.department?.toLowerCase().includes(searchDept.toLowerCase());
    return dateMatch && deptMatch;
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Daily Metric Values</h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by date..."
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="pl-9 w-40"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by department..."
              value={searchDept}
              onChange={(e) => setSearchDept(e.target.value)}
              className="pl-9 w-40"
            />
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Department</TableHead>
              <TableHead className="font-semibold">Metric Code</TableHead>
              <TableHead className="font-semibold">Bundle ID</TableHead>
              <TableHead className="font-semibold text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredValues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  {metricValues.length === 0 ? 'No metric values recorded yet' : 'No matching results'}
                </TableCell>
              </TableRow>
            ) : (
              filteredValues.map(mv => (
                <TableRow key={mv.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{mv.date}</TableCell>
                  <TableCell>{mv.department}</TableCell>
                  <TableCell className="font-mono font-semibold text-blue-700">{mv.metric_code}</TableCell>
                  <TableCell className="text-sm text-slate-600 font-mono">{mv.bundle_id}</TableCell>
                  <TableCell className="text-right font-semibold">{mv.value?.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}