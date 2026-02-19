import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export default function DailyKPIValuesViewer() {
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDept, setSelectedDept] = useState('ALL');

  const { data: kpiDefinitions = [], isLoading: definitionsLoading } = useQuery({
    queryKey: ['KPIDefinition'],
    queryFn: () => base44.entities.KPIDefinition.list()
  });

  const { data: metricValues = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['DailyMetricValue'],
    queryFn: () => base44.entities.DailyMetricValue.list()
  });

  const kpiNameMap = useMemo(() => {
    const map = {};
    kpiDefinitions.forEach(kd => {
      map[kd.kpi_code] = kd.kpi_name || kd.kpi_code;
    });
    return map;
  }, [kpiDefinitions]);

  const isLoading = definitionsLoading || metricsLoading;

  // Calculate KPI values from metrics
  const calculateKPIValue = (formula, metrics) => {
    try {
      let expression = formula;
      metrics.forEach(m => {
        expression = expression.replace(new RegExp(`\\b${m.metric_code}\\b`, 'g'), m.value);
      });
      // eslint-disable-next-line no-eval
      return eval(expression);
    } catch {
      return null;
    }
  };

  const kpiValues = useMemo(() => {
    const calculated = [];
    const metricsByDateDept = {};
    
    // Group metrics by date and department
    metricValues.forEach(mv => {
      const key = `${mv.date}_${mv.department}`;
      if (!metricsByDateDept[key]) {
        metricsByDateDept[key] = [];
      }
      metricsByDateDept[key].push(mv);
    });

    // Calculate KPIs
    Object.entries(metricsByDateDept).forEach(([key, metrics]) => {
      const [date, department] = key.split('_');
      
      kpiDefinitions.forEach(kpiDef => {
        const value = calculateKPIValue(kpiDef.formula, metrics);
        if (value !== null) {
          calculated.push({
            id: `${kpiDef.kpi_code}_${date}_${department}`,
            date,
            department,
            kpi_code: kpiDef.kpi_code,
            value
          });
        }
      });
    });

    return calculated;
  }, [metricValues, kpiDefinitions]);

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
    return kpiValues.filter(kv => {
      const dateMatch = dateRange.includes(kv.date);
      const deptMatch = viewMode === 'daily' ? (!searchDept || kv.department?.toLowerCase().includes(searchDept.toLowerCase())) : true;
      return dateMatch && deptMatch;
    });
  }, [kpiValues, dateRange, searchDept, viewMode]);

  const pivotData = useMemo(() => {
    if (viewMode === 'daily') return null;

    const pivot = {};
    filteredValues.forEach(kv => {
      const key = `${kv.kpi_code}_${kv.department}`;
      if (!pivot[key]) {
        pivot[key] = {
          kpi_code: kv.kpi_code,
          department: kv.department,
          values: {}
        };
      }
      pivot[key].values[kv.date] = kv.value;
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
        <h3 className="text-lg font-semibold">Daily KPI Values</h3>
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

          {viewMode === 'daily' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Filter by department..."
                value={searchDept}
                onChange={(e) => setSearchDept(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        {viewMode === 'daily' ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">KPI Name</TableHead>
                <TableHead className="font-semibold text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredValues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500 py-8">
                    No KPI values for this date
                  </TableCell>
                </TableRow>
              ) : (
                filteredValues.map(kv => (
                  <TableRow key={kv.id} className="hover:bg-slate-50">
                    <TableCell>{kv.department}</TableCell>
                    <TableCell>
                      <div className="font-mono font-semibold text-blue-700">{kv.kpi_code}</div>
                      <div className="text-xs text-slate-600">{kpiNameMap[kv.kpi_code] || '-'}</div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{kv.value?.toFixed(2)}%</TableCell>
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
                  <TableHead className="font-semibold sticky left-0 bg-slate-50 z-10 min-w-[200px]">KPI Name</TableHead>
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
                    <TableCell colSpan={dateRange.length + 1} className="text-center text-slate-500 py-8">
                      No KPI values for this period
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
                          <div className="font-mono font-semibold text-blue-700">{row.kpi_code}</div>
                          <div className="text-xs text-slate-600">{kpiNameMap[row.kpi_code] || '-'}</div>
                        </TableCell>
                        {dateRange.map(date => (
                          <TableCell key={date} className="text-center font-semibold">
                            {row.values[date] !== undefined ? `${row.values[date].toFixed(2)}%` : '-'}
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
    </div>
  );
}