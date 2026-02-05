import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CalculatorIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MetricCalculationEngine() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list()
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['BatchHeader', selectedDate, selectedDept],
    queryFn: () => base44.entities.BatchHeader.filter({
      date: selectedDate,
      department: selectedDept
    }),
    enabled: !!selectedDept && !!selectedDate
  });

  const { data: teamTimePersons = [] } = useQuery({
    queryKey: ['Team_Time_Persons', selectedDate, selectedDept],
    queryFn: async () => {
      const batchHeader = batches[0];
      if (!batchHeader) return [];
      return await base44.entities.Team_Time_Persons.filter({
        batch_header_id: batchHeader.id
      });
    },
    enabled: !!batches?.[0]?.id
  });

  const { data: breakTimes = [] } = useQuery({
    queryKey: ['BreakTime'],
    queryFn: () => base44.entities.BreakTime.list()
  });

  const calculateTimeInMinutes = (fromTime, toTime) => {
    if (!fromTime || !toTime) return 0;
    const [fromH, fromM] = fromTime.split(':').map(Number);
    const [toH, toM] = toTime.split(':').map(Number);
    const fromTotalMin = fromH * 60 + fromM;
    const toTotalMin = toH * 60 + toM;
    return toTotalMin - fromTotalMin;
  };

  const calculateMetrics = async () => {
    if (!selectedDate || !selectedDept) {
      toast.error('Please select date and department');
      return;
    }

    setIsCalculating(true);
    try {
      const batchHeader = batches[0];
      if (!batchHeader) {
        toast.error('No batch found for this date and department');
        setIsCalculating(false);
        return;
      }

      // Calculate total team time from all persons
      const totalTeamTime = teamTimePersons.reduce((sum, record) => {
        const timeMinutes = calculateTimeInMinutes(record.from_time, record.to_time);
        return sum + timeMinutes;
      }, 0);
      
      // Calculate total break time
      const totalBreakTime = breakTimes.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);
      
      // Gross Team Time = Total Team Time - Total Break Time
      const grossTeamTime = totalTeamTime - totalBreakTime;

      // Create the metric value
      await base44.entities.DailyMetricValue.create({
        metric_code: 'GT_TIME',
        date: selectedDate,
        department: selectedDept,
        bundle_id: batchHeader.bundle_id,
        value: grossTeamTime
      });

      toast.success(`Metric calculated: ${grossTeamTime.toFixed(2)} minutes`);
      queryClient.invalidateQueries({ queryKey: ['DailyMetricValue'] });
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Failed to calculate metric');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalculatorIcon className="w-5 h-5" />
          Calculate Daily Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="department">Department *</Label>
            <select
              id="department"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-white"
            >
              <option value="">Select department...</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold">Calculation Formula</p>
            <p>Gross Team Time = SUM(Team Time) - SUM(Break Times)</p>
          </div>
        </div>

        <Button 
          onClick={calculateMetrics}
          disabled={isCalculating || !selectedDate || !selectedDept}
          className="w-full"
        >
          {isCalculating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <CalculatorIcon className="w-4 h-4 mr-2" />
              Calculate Metrics
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}