import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function DailyProductionCalendarSelector({ 
  selectedDepartment, 
  selectedDate, 
  onDateSelect,
  onCreateBatch,
  batchHeaders: propBatchHeaders
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch batch headers to mark days with existing batches
  const { data: fetchedBatchHeaders = [] } = useQuery({
    queryKey: ['BatchHeader', selectedDepartment],
    queryFn: () => base44.entities.BatchHeader.filter({ department: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Fetch scheduled data to mark days with planning
  const { data: scheduledData = [] } = useQuery({
    queryKey: ['ScheduledData', selectedDepartment],
    queryFn: () => base44.entities.ScheduledData.filter({ department_id: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Fetch daily targets to mark days with targets assigned
  const { data: dailyTargets = [] } = useQuery({
    queryKey: ['TargetDaily', selectedDepartment],
    queryFn: () => base44.entities.TargetDaily.filter({ department: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Fetch daily standards assignments to mark days with bundle assigned
  const { data: dailyAssignments = [] } = useQuery({
    queryKey: ['DailyStandardsAssignment', selectedDepartment],
    queryFn: () => base44.entities.DailyStandardsAssignment.filter({ department_id: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Use prop or fetched data
  const batchHeaders = propBatchHeaders || fetchedBatchHeaders;

  // Get dates with batch records
  const datesWithBatches = useMemo(() => {
    if (!batchHeaders || batchHeaders.length === 0) return new Set();
    return new Set(batchHeaders.map(b => b.date).filter(Boolean));
  }, [batchHeaders]);

  // Get dates with planning (scheduled data)
  const datesWithPlanning = useMemo(() => {
    if (!scheduledData || scheduledData.length === 0) return new Set();
    return new Set(scheduledData.map(s => s.date).filter(Boolean));
  }, [scheduledData]);

  // Get dates with targets (TargetDaily) OR daily standards assignment
  const datesWithTargets = useMemo(() => {
    const targetDates = new Set(dailyTargets.map(t => t.date).filter(Boolean));
    dailyAssignments.forEach(a => { if (a.assignment_date) targetDates.add(a.assignment_date); });
    return targetDates;
  }, [dailyTargets, dailyAssignments]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Handle day click
  const handleDayClick = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    onDateSelect(dateStr);
  };

  if (!selectedDepartment) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Please select a Department first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-slate-600 py-2">
                {day}
              </div>
            ))}
            
            {calendarDays.map((day, index) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasBatch = datesWithBatches.has(dateStr);
              const hasPlanning = datesWithPlanning.has(dateStr);
              const hasTargets = datesWithTargets.has(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = isSameDay(day, new Date());
              
              return (
                <div key={index} className="relative">
                  <button
                    onClick={() => handleDayClick(day)}
                    className={`
                      w-full p-3 text-center rounded-lg border transition-all
                      ${isSelected ? 'bg-blue-100 border-blue-500 font-semibold' : 'border-slate-200 hover:bg-slate-50'}
                      ${isToday ? 'ring-2 ring-blue-300' : ''}
                      ${!isSameMonth(day, currentMonth) ? 'text-slate-300' : 'text-slate-900'}
                    `}
                  >
                    <div className="text-sm">{format(day, 'd')}</div>
                    {(hasBatch || hasPlanning) && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {hasPlanning && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                        {hasBatch && <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card className="bg-slate-50">
          <CardContent className="pt-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">
              Selected Date: <span className="text-base text-slate-900">{selectedDate}</span>
            </p>
            {datesWithBatches.has(selectedDate) ? (
              <Button
                onClick={() => {
                  const batch = batchHeaders.find(b => b.date === selectedDate);
                  if (batch) onDateSelect(selectedDate);
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Open Batch for {selectedDate}
              </Button>
            ) : (
              <Button onClick={() => onCreateBatch(selectedDate)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create Batch for {selectedDate}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}