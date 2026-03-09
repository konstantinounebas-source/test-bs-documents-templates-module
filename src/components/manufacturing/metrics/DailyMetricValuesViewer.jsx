import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { checkMetricsDataValidity } from '@/functions/checkMetricsDataValidity';

export default function DailyMetricValuesViewer() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [validityCheck, setValidityCheck] = useState({});

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

  const { data: metricValuesByDate = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['DailyMetricValue', viewMode, dateRange[0], dateRange[dateRange.length - 1]],
    queryFn: async () => {
      if (viewMode === 'daily') {
        return base44.entities.DailyMetricValue.filter({ date: dateRange[0] });
      } else {
        const results = await Promise.all(
          dateRange.map(d => base44.entities.DailyMetricValue.filter({ date: d }))
        );
        return results.flat();
      }
    }
  });

  const { data: metricDefinitions = [], isLoading: definitionsLoading } = useQuery({
    queryKey: ['MetricDefinition'],
    queryFn: () => base44.entities.MetricDefinition.list()
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list(),
    staleTime: Infinity
  });

  const metricNameMap = useMemo(() => {
    const map = {};
    metricDefinitions.forEach(md => {
      map[md.metric_code] = md.metric_name || md.metric_code;
    });
    return map;
  }, [metricDefinitions]);

  const isLoading = metricsLoading || definitionsLoading;

  const filteredValues = useMemo(() => {
    return metricValuesByDate.filter(mv => {
      const deptMatch = selectedDept === 'ALL' || mv.department === selectedDept;
      return deptMatch;
    });
  }, [metricValuesByDate, selectedDept]);

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

  // Check data validity once per unique date+department combination (sequential to avoid rate limit)
  useEffect(() => {
    if (filteredValues.length === 0) return;

    const checkAll = async () => {
      const combos = [...new Set(filteredValues.map(mv => `${mv.date}__${mv.department}`))];
      const checks = {};
      for (const combo of combos) {
        const [date, department] = combo.split('__');
        try {
          const result = await checkMetricsDataValidity({ date, department });
          checks[combo] = result.data;
        } catch (error) {
          console.error('Validity check error:', error);
          checks[combo] = { isValid: true };
        }
        // small delay between calls to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }
      setValidityCheck(checks);
    };

    checkAll();
  }, [filteredValues]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-0">
      {/* Expandable Header */}
      <div
        className="flex justify-between items-center flex-wrap gap-4 cursor-pointer select-none bg-slate-50 border rounded-lg px-4 py-3 hover:bg-slate-100 transition-colors"
        onClick={() => setIsExpanded(p => !p)}
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          Daily Metric Values
        </h3>
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
        </div>
      </div>

      {isExpanded && <div className="space-y-3 mt-3">
      {/* Department tabs */}
      <div className="flex gap-1 flex-wrap border-b pb-2 mt-3">
        <button
          onClick={() => setSelectedDept('ALL')}
          className={`px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${selectedDept === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          All Departments
        </button>
        {departments.map(d => (
          <button
            key={d.id}
            onClick={() => setSelectedDept(d.name)}
            className={`px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${selectedDept === d.name ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        {viewMode === 'daily' ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Metric Name</TableHead>
                <TableHead className="font-semibold text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredValues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500 py-8">
                    No metric values for this date
                  </TableCell>
                </TableRow>
              ) : (
                filteredValues.map(mv => {
                  const checkKey = `${mv.date}__${mv.department}`;
                  const isStale = validityCheck[checkKey]?.isValid === false;
                  return (
                    <TableRow key={mv.id} className={`hover:bg-slate-50 ${isStale ? 'bg-orange-50' : ''}`}>
                      <TableCell>{mv.department}</TableCell>
                      <TableCell>
                        <div className="font-mono font-semibold text-blue-700">{mv.metric_code}</div>
                        <div className="text-xs text-slate-600">{metricNameMap[mv.metric_code] || '-'}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold">{mv.value?.toFixed(2)}</span>
                          {isStale && (
                            <AlertCircle
                              className="w-4 h-4 text-orange-500 cursor-help"
                              title={`Data changed after last calculation in: ${validityCheck[checkKey]?.changedTables?.join(', ')}`}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold sticky left-0 bg-slate-50 z-10 min-w-[200px]">Metric Name</TableHead>
                  {dateRange.map(date => {
                    // Check if any dept has stale data for this date
                    const isStaleDate = Object.entries(validityCheck).some(
                      ([key, val]) => key.startsWith(date + '__') && val?.isValid === false
                    );
                    const staleDepts = Object.entries(validityCheck)
                      .filter(([key, val]) => key.startsWith(date + '__') && val?.isValid === false)
                      .map(([key, val]) => `${key.split('__')[1]}: ${val?.changedTables?.join(', ')}`);
                    return (
                      <TableHead key={date} className="text-center font-semibold min-w-[80px]">
                        <div className="flex items-center justify-center gap-1">
                          {format(new Date(date), 'dd/MM')}
                          {isStaleDate && (
                            <AlertCircle
                              className="w-3.5 h-3.5 text-orange-500 cursor-help flex-shrink-0"
                              title={`Data changed after last calculation:\n${staleDepts.join('\n')}`}
                            />
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!pivotData || pivotData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={dateRange.length + 1} className="text-center text-slate-500 py-8">
                      No metric values for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    <TableRow className="bg-blue-50">
                      <TableCell colSpan={dateRange.length + 1} className="font-semibold text-sm text-slate-700 py-2">
                        Department: {pivotData[0]?.department || '-'}
                      </TableCell>
                    </TableRow>
                    {pivotData.map((row, idx) => (
                       <TableRow key={idx} className="hover:bg-slate-50">
                         <TableCell className="sticky left-0 bg-white">
                           <div className="font-mono font-semibold text-blue-700">{row.metric_code}</div>
                           <div className="text-xs text-slate-600">{metricNameMap[row.metric_code] || '-'}</div>
                         </TableCell>
                         {dateRange.map(date => (
                           <TableCell key={date} className="text-center font-semibold">
                             {row.values[date] !== undefined ? row.values[date].toFixed(2) : '-'}
                           </TableCell>
                         ))}
                       </TableRow>
                     ))}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      </div>}
    </div>
  );
}