import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, AlertCircle, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { calculateMetrics } from '@/functions/calculateMetrics';
import { format } from 'date-fns';

export default function MetricsCalculator() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [departments, setDepartments] = React.useState([]);
  const [showDeptDropdown, setShowDeptDropdown] = React.useState(false);

  // Load departments on mount
  React.useEffect(() => {
    const loadDepartments = async () => {
      try {
        const depts = await base44.entities.Department.list();
        setDepartments(depts);
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };
    loadDepartments();
  }, []);

  const toggleDept = (deptName) => {
    setSelectedDepts(prev =>
      prev.includes(deptName)
        ? prev.filter(d => d !== deptName)
        : [...prev, deptName]
    );
  };

  const toggleAll = () => {
    if (selectedDepts.length === departments.length) {
      setSelectedDepts([]);
    } else {
      setSelectedDepts(departments.map(d => d.name));
    }
  };

  const handleCalculate = async () => {
    if (!selectedDate || selectedDepts.length === 0) {
      toast.error('Select date and at least one department');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const results = {};
      let totalMetrics = 0;

      // Calculate for each selected department
      for (const dept of selectedDepts) {
        const batches = await base44.entities.BatchHeader.filter({
          date: selectedDate,
          department: dept
        });

        if (!batches || batches.length === 0) {
          results[dept] = { error: 'No batch found' };
          continue;
        }

        try {
          const response = await calculateMetrics({
            date: selectedDate,
            department: dept,
            batch_header_id: batches[0].id,
            bundle_id: 'DEFAULT'
          });
          results[dept] = response.data;
          totalMetrics += response.data.metrics.length;
        } catch (err) {
          results[dept] = { error: err.message };
        }
      }

      setResult(results);
      toast.success(`${totalMetrics} metrics calculated for ${selectedDepts.length} departments`);

    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 bg-white border rounded-lg p-4">
      <h3 className="font-semibold text-lg">Calculate Metrics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-2">Date</label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600 block mb-2">Department</label>
          <Select value={selectedDept} onValueChange={setSelectedDept} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.name}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            onClick={handleCalculate}
            disabled={isLoading || !selectedDate || !selectedDept}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              'Calculate Metrics'
            )}
          </Button>
        </div>
      </div>

      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Metrics Calculated Successfully</p>
              <p className="text-sm text-green-800 mt-1">
                {result.metrics.length} metrics calculated on {result.calculatedAt}
              </p>
              <div className="mt-3 space-y-1">
                {result.metrics.slice(0, 5).map((m, idx) => (
                  <div key={idx} className="text-xs text-green-700">
                    <span className="font-mono font-medium">{m.metric_code}</span> = {m.value?.toFixed(2) || 'N/A'}
                    {m.error && <span className="text-red-600 ml-2">({m.error})</span>}
                  </div>
                ))}
                {result.metrics.length > 5 && (
                  <div className="text-xs text-green-700 font-medium">
                    ... and {result.metrics.length - 5} more
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}