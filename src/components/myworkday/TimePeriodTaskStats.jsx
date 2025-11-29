
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { ListChecks, Clock, AlertTriangle, CheckSquare, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isPast, isToday, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, subWeeks, subMonths, format, eachDayOfInterval, eachWeekOfInterval, isFuture } from 'date-fns';

const TIME_PERIODS = [
  { value: 'this_week', label: 'Αυτή την εβδομάδα' },
  { value: 'prev_week', label: 'Προηγούμενη εβδομάδα' },
  { value: 'this_month', label: 'Αυτό τον μήνα' },
  { value: 'prev_month', label: 'Προηγούμενος μήνας' },
  { value: 'prev_3_months', label: 'Τελευταίους 3 μήνες' },
  { value: 'prev_6_months', label: 'Τελευταίους 6 μήνες' },
];

export default function TimePeriodTaskStats({ tasks, isLoading, onStatClick, taskTypeLabel }) {
  const [selectedPeriod, setSelectedPeriod] = useState('this_week');

  const getDateRange = (period) => {
    const today = new Date();
    
    switch (period) {
      case 'this_week':
        return {
          start: startOfWeek(today, { weekStartsOn: 1 }), // Monday
          end: endOfWeek(today, { weekStartsOn: 1 }) // Sunday - complete week
        };
      case 'prev_week':
        const prevWeek = subWeeks(today, 1);
        return {
          start: startOfWeek(prevWeek, { weekStartsOn: 1 }),
          end: endOfWeek(prevWeek, { weekStartsOn: 1 })
        };
      case 'this_month':
        return {
          start: startOfMonth(today),
          end: endOfMonth(today)
        };
      case 'prev_month':
        const prevMonth = subMonths(today, 1);
        return {
          start: startOfMonth(prevMonth),
          end: endOfMonth(prevMonth)
        };
      case 'prev_3_months':
        return {
          start: startOfMonth(subMonths(today, 2)),
          end: endOfMonth(today)
        };
      case 'prev_6_months':
        return {
          start: startOfMonth(subMonths(today, 5)),
          end: endOfMonth(today)
        };
      default:
        return { start: today, end: today };
    }
  };

  const breakdownData = useMemo(() => {
    if (isLoading || !tasks || tasks.length === 0) return [];
    
    const { start: periodStart, end: periodEnd } = getDateRange(selectedPeriod);
    const today = new Date();
    
    const processInterval = (intervalStart, intervalEnd) => {
        // For future intervals, return zero stats but still show the date
        // Compare startOfDay(intervalStart) directly with today to check if the interval is in the future relative to "today"
        if (startOfDay(intervalStart) > today && startOfDay(intervalEnd) > today) {
            return {
                totalActive: 0,
                overdue: 0,
                reportPending: 0,
                completed: 0,
            };
        }

        // Define the snapshotDate: the end of the current interval, or today, whichever is earlier.
        const snapshotDate = new Date(Math.min(endOfDay(intervalEnd).getTime(), today.getTime()));

        // Filter for tasks that existed by the snapshotDate and were not completed *before* this interval started.
        const relevantTasks = tasks.filter(task => {
            const created = new Date(task.created_date);
            // Task must have been created by the snapshotDate
            if (created > snapshotDate) return false;
            
            const completedOn = task.completion_date ? startOfDay(new Date(task.completion_date)) : null;
            // Task must NOT have been completed *before* the start of the current interval
            if (completedOn && completedOn < startOfDay(intervalStart)) return false; 
            
            return true;
        });

        // Completed: Tasks completed *within* this specific interval (start of interval to snapshot date).
        const completed = relevantTasks.filter(task => {
            if (!task.completion_date) return false;
            const completionDate = new Date(task.completion_date);
            // Count tasks completed strictly within the interval [startOfDay(intervalStart), snapshotDate]
            return completionDate >= startOfDay(intervalStart) && completionDate <= snapshotDate;
        }).length;
        
        // Active: Tasks that were not completed by the end of the snapshot for that day/interval.
        const totalActive = relevantTasks.filter(t => {
             const completedOn = t.completion_date ? new Date(t.completion_date) : null;
             return !completedOn || completedOn > snapshotDate;
        }).length;

        const overdue = relevantTasks.filter(t => {
            if (!t.due_date) return false;
            const dueDate = startOfDay(new Date(t.due_date));
            
            const completedOn = t.completion_date ? new Date(t.completion_date) : null;
            // Task is overdue if its due date is in the past relative to the snapshotDate, and it wasn't completed yet
            if (completedOn && completedOn <= snapshotDate) return false;

            return dueDate < snapshotDate;
        }).length;

        const reportPending = relevantTasks.filter(t => {
            // Only count tasks that would realistically need reporting (Pending/In Progress status)
            if (!['Pending', 'In Progress'].includes(t.status)) return false; 
            
            const completedOn = t.completion_date ? new Date(t.completion_date) : null;
            // If completed by snapshotDate, it doesn't need reporting as of snapshotDate
            if (completedOn && completedOn <= snapshotDate) return false;

            // If task has never been reported, it's pending if created before snapshotDate
            if (!t.last_reported_date) {
                const createdDate = new Date(t.created_date);
                return createdDate < snapshotDate;
            }
            
            // If last report was before this interval started, it's pending
            const lastReportDate = new Date(t.last_reported_date);
            return lastReportDate < startOfDay(intervalStart);
        }).length;
        
        return {
            totalActive,
            overdue,
            reportPending,
            completed,
        };
    };

    if (selectedPeriod === 'this_week' || selectedPeriod === 'prev_week') {
        const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
        return days.map(day => {
                const stats = processInterval(day, day); // For daily breakdown, intervalStart and intervalEnd are the same day
                return {
                    label: format(day, 'EEE dd/MM'),
                    date: format(day, 'yyyy-MM-dd'),
                    ...stats,
                };
            });
    }
    
    // For monthly periods, breakdown into weeks
    if (selectedPeriod.includes('month')) {
        const weeks = eachWeekOfInterval({ start: periodStart, end: periodEnd }, { weekStartsOn: 1 });
        return weeks
            .map((weekStart, index) => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                
                // Clamp the actual interval to be processed to the selected period bounds
                // This ensures we only count tasks strictly within the month, even if the week spills over
                const clampedIntervalStart = new Date(Math.max(weekStart.getTime(), periodStart.getTime()));
                const clampedIntervalEnd = new Date(Math.min(weekEnd.getTime(), periodEnd.getTime()));

                // If the clamped interval is invalid (start after end), return zero stats
                // This can happen if a week barely touches the period, but after clamping it becomes empty.
                if (startOfDay(clampedIntervalStart) > endOfDay(clampedIntervalEnd)) {
                    return {
                        label: `Εβδ. ${index + 1} (${format(weekStart, 'dd/MM')})`, // Label still based on original weekStart
                        date: format(weekStart, 'yyyy-MM-dd'),
                        totalActive: 0,
                        overdue: 0,
                        reportPending: 0,
                        completed: 0,
                    };
                }

                const stats = processInterval(clampedIntervalStart, clampedIntervalEnd);
                return {
                    label: `Εβδ. ${index + 1} (${format(weekStart, 'dd/MM')})`,
                    date: format(weekStart, 'yyyy-MM-dd'),
                    ...stats
                };
            });
    }
    
    return [];
  }, [tasks, selectedPeriod, isLoading]);

  const handleBarClick = (filterField, filterValue, date) => {
    // For daily breakdown (weekly periods), the clicked date is the exact day
    // For weekly breakdown (monthly periods), we need to get the full week range
    let startDate = date; // 'date' comes from breakdownData.date which is already 'yyyy-MM-dd' for the specific day or week start
    let endDate = date;
    
    if (selectedPeriod.includes('month')) {
        // If it's a weekly breakdown, the range is the whole week
        const weekStart = startOfWeek(new Date(date), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(new Date(date), { weekStartsOn: 1 });
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(weekEnd, 'yyyy-MM-dd');
    }
    
    const newFilter = {
        field: filterField,
        value: filterValue,
        dateRange: {
            startDate: startDate,
            endDate: endDate
        }
    };
    
    onStatClick(newFilter);
  };

  const ChartCard = ({ title, dataKey, color, icon: Icon, filterField, filterValue }) => (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : breakdownData.length > 0 ? (
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart 
                data={breakdownData} 
                margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
                onClick={(e) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                        const clickedBarData = e.activePayload[0].payload;
                        handleBarClick(filterField, filterValue, clickedBarData.date);
                    }
                }}
                className="cursor-pointer"
              >
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11 }} 
                  interval={0} 
                  angle={-40} 
                  textAnchor="end" 
                  height={60} 
                />
                <YAxis 
                    allowDecimals={false} 
                    width={30} 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(206, 212, 218, 0.4)' }}
                  contentStyle={{ fontSize: '13px', padding: '6px 10px', borderRadius: '6px' }}
                />
                <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]}>
                  <LabelList 
                    dataKey={dataKey} 
                    position="top" 
                    style={{ fill: '#334155', fontSize: 11, fontWeight: 'bold' }}
                    formatter={(value) => value > 0 ? value : null} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center text-slate-500 py-12 text-sm h-[200px] flex items-center justify-center">Δεν υπάρχουν δεδομένα</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 border-t border-slate-200 pt-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 text-slate-600" />
        <h3 className="text-xl font-semibold text-slate-900">Στατιστικά ανά Περίοδο για {taskTypeLabel}</h3>
      </div>
      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Επιλογή περιόδου" />
        </SelectTrigger>
        <SelectContent>
          {TIME_PERIODS.map(period => (
            <SelectItem key={period.value} value={period.value}>
              {period.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Ενεργές Εργασίες"
          dataKey="totalActive"
          color="#3b82f6"
          icon={ListChecks}
          filterField="status"
          filterValue="active"
        />
        <ChartCard
          title="Εκπρόθεσμες"
          dataKey="overdue"
          color="#ef4444"
          icon={Clock}
          filterField="overdue"
          filterValue="true"
        />
        <ChartCard
          title="Εκκρεμεί Αναφορά"
          dataKey="reportPending"
          color="#f59e0b"
          icon={AlertTriangle}
          filterField="report_pending"
          filterValue="true"
        />
        <ChartCard
          title="Ολοκληρωμένες"
          dataKey="completed"
          color="#10b981"
          icon={CheckSquare}
          filterField="status"
          filterValue="Completed"
        />
      </div>
    </div>
  );
}
