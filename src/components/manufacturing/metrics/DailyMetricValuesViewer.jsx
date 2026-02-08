import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export default function DailyMetricValuesViewer() {
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchDept, setSearchDept] = useState('');

  const { data: metricValues = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['DailyMetricValue'],
    queryFn: () => base44.entities.DailyMetricValue.list()
  });

  const { data: metricDefinitions = [], isLoading: definitionsLoading } = useQuery({
    queryKey: ['MetricDefinition'],
    queryFn: () => base44.entities.MetricDefinition.list()
  });

  const metricNameMap = useMemo(() => {
    const map = {};
    metricDefinitions.forEach(md => {
      map[md.metric_code] = md.name || md.metric_code;
    });
    return map;
  }, [metricDefinitions]);

  const isLoading = metricsLoading || definitionsLoading;

  const dateRange = useMemo(() => {
    if (viewMode === 'daily') {
      return [format(selectedDate, 'yyyy-MM-dd')];
    } else if (viewMode === 'weekly') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
    } else {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
    }
  }, [viewMode, selectedDate]);

  const filteredValues = useMemo(() => {
    return metricValues.filter(mv => {
      const dateMatch = dateRange.includes(mv.date);
      const deptMatch = viewMode === 'daily' ? (!searchDept || mv.department?.toLowerCase().includes(searchDept.toLowerCase())) : true;
      return dateMatch && deptMatch;
    });
  }, [metricValues, dateRange, searchDept, viewMode]);

  const pivotData = useMemo(() => {
    if (viewMode === 'daily') return null;

    const pivot = {};
    filteredValues.forEach(mv => {
      const key = `${mv.metric_code}_${mv.department}`;
      if (!pivot[key]) {
        pivot[key] = {
          metric_code: mv.metric_code,
          department: mv.department,
          values: {}
        };
      }
      pivot[key].values[mv.date] = mv.value;
    });

    return Object.values(pivot);
  }, [viewMode, filteredValues]);

  const handlePrevious = () => {
    if (viewMode === 'daily') {
      setSelectedDate(prev => subDays(prev, 1));
    } else if (viewMode === 'weekly') {
      setSelectedDate(prev => subDays(prev, 7));
    } else {
      setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'daily') {
      setSelectedDate(prev => addDays(prev, 1));
    } else if (viewMode === 'weekly') {
      setSelectedDate(prev => addDays(prev, 7));
    } else {
      setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const getDateRangeLabel = () => {
    if (viewMode === 'daily') {
      return format(selectedDate, 'dd/MM/yyyy');
    } else if (viewMode === 'weekly') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM/yyyy')}`;
    } else {
      return format(selectedDate, 'MMMM yyyy');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h3 className="text-lg font-semibold">Daily Metric Values</h3>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-[180px] text-center font-semibold text-sm">
              {getDateRangeLabel()}
            </div>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by department..."
              value={searchDept}
              onChange={(e) => setSearchDept(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        {viewMode === 'daily' ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Metric Code</TableHead>
                <TableHead className="font-semibold">Bundle ID</TableHead>
                <TableHead className="font-semibold text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredValues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                    No metric values for this date
                  </TableCell>
                </TableRow>
              ) : (
                filteredValues.map(mv => (
                  <TableRow key={mv.id} className="hover:bg-slate-50">
                    <TableCell>{mv.department}</TableCell>
                    <TableCell className="font-mono font-semibold text-blue-700">{mv.metric_code}</TableCell>
                    <TableCell className="text-sm text-slate-600 font-mono">{mv.bundle_id || '-'}</TableCell>
                    <TableCell className="text-right font-semibold">{mv.value?.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold sticky left-0 bg-slate-50 z-10 min-w-[150px]">Metric Code</TableHead>
                  <TableHead className="font-semibold sticky left-[150px] bg-slate-50 z-10 min-w-[120px]">Department</TableHead>
                  {dateRange.map(date => (
                    <TableHead key={date} className="text-center font-semibold min-w-[80px]">
                      {format(new Date(date), 'dd/MM')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!pivotData || pivotData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={dateRange.length + 2} className="text-center text-slate-500 py-8">
                      No metric values for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  pivotData.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50">
                      <TableCell className="sticky left-0 bg-white font-mono font-semibold text-blue-700">{row.metric_code}</TableCell>
                      <TableCell className="sticky left-[150px] bg-white">{row.department}</TableCell>
                      {dateRange.map(date => (
                        <TableCell key={date} className="text-center font-semibold">
                          {row.values[date] !== undefined ? row.values[date].toFixed(2) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}