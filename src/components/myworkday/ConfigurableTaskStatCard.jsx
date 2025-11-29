
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronDown, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const FIELD_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'is_recurring', label: 'Task Type' },
  // assigned_to_user_email is complex due to needing a user map, can add later
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ConfigurableTaskStatCard({ cardId, tasks, isLoading, onStatClick, activeFilter }) {
  const [selectedField, setSelectedField] = useState(() => {
    try {
      const saved = localStorage.getItem(`configurableTaskStatCard_${cardId}`);
      const field = JSON.parse(saved);
      return FIELD_OPTIONS.some(opt => opt.value === field) ? field : FIELD_OPTIONS[cardId % FIELD_OPTIONS.length]?.value;
    } catch {
      return FIELD_OPTIONS[cardId % FIELD_OPTIONS.length]?.value;
    }
  });

  useEffect(() => {
    localStorage.setItem(`configurableTaskStatCard_${cardId}`, JSON.stringify(selectedField));
  }, [selectedField, cardId]);

  const data = React.useMemo(() => {
    if (isLoading || !tasks || !tasks.length) return [];
    
    const counts = tasks.reduce((acc, task) => {
      let key = task[selectedField];
      if (selectedField === 'is_recurring') {
          key = key ? 'Regular' : 'Ad-Hoc';
      }
      if (key === null || key === undefined || key === '') {
        key = 'Not Set';
      }
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

  }, [tasks, isLoading, selectedField]);

  const selectedFieldLabel = FIELD_OPTIONS.find(f => f.value === selectedField)?.label || 'Statistic';
  const totalCount = data.reduce((sum, item) => sum + item.value, 0);

  const handleBarClick = (payload) => {
    if (payload && payload.name) {
      onStatClick(selectedField, payload.name);
    }
  };

  const isCardActive = activeFilter && activeFilter.field === selectedField;

  return (
    <Card className={`border-slate-200 transition-all duration-300 ${isCardActive ? 'shadow-lg ring-2 ring-blue-500' : 'hover:shadow-md'}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{selectedFieldLabel}</CardTitle>
        <Select value={selectedField} onValueChange={setSelectedField}>
          <SelectTrigger className="w-auto border-0 shadow-none h-auto p-1 text-slate-500 hover:text-slate-900">
            <Settings className="w-4 h-4" />
          </SelectTrigger>
          <SelectContent>
            {FIELD_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground mb-4">Total tasks counted</p>
            {data.length > 0 ? (
                <div style={{ width: '100%', height: 120 }}>
                    <ResponsiveContainer>
                        <BarChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={40} />
                            <YAxis allowDecimals={false} />
                            <Tooltip
                                cursor={{ fill: 'rgba(206, 212, 218, 0.4)' }}
                                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={handleBarClick} className="cursor-pointer">
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={activeFilter && activeFilter.value === entry.name ? '#0ea5e9' : COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="text-center text-slate-500 py-8">No data available.</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
