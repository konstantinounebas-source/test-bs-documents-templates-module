import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';

export default function DailyFixedCostsSection({
  dailyCostsRecords,
  selectedDate,
  fixedDailyTotal,
  onUpdate
}) {
  const records = dailyCostsRecords.filter(r => r.date === selectedDate && r.cost_type === 'fixed');
  const totalCost = records.reduce((sum, r) => sum + (r.total_cost || 0), 0);

  const handleAdd = () => {
    const newRecord = {
      id: `fixed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: selectedDate,
      cost_type: 'fixed',
      multiplier_days: 1,
      unit_cost: fixedDailyTotal,
      total_cost: fixedDailyTotal
    };
    onUpdate([...dailyCostsRecords, newRecord]);
  };

  const handleUpdateMultiplier = (recordId, newMultiplier) => {
    const updated = dailyCostsRecords.map(r => {
      if (r.id === recordId) {
        return { ...r, multiplier_days: newMultiplier, total_cost: newMultiplier * r.unit_cost };
      }
      return r;
    });
    onUpdate(updated);
  };

  const handleRemove = (recordId) => {
    onUpdate(dailyCostsRecords.filter(r => r.id !== recordId));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Σταθερά Κόστη</span>
          <span className="text-sm font-normal text-slate-600">Σύνολο: €{totalCost.toFixed(2)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {records.length > 0 ? (
            records.map((record) => (
              <div key={record.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-600 block mb-1">Ημέρες</label>
                  <Input
                    type="number"
                    min="1"
                    value={record.multiplier_days || 1}
                    onChange={(e) => handleUpdateMultiplier(record.id, parseFloat(e.target.value) || 1)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-600 block mb-1">Ημερήσιο Κόστος</label>
                  <div className="h-8 px-3 bg-slate-50 border border-input rounded-md flex items-center text-sm">
                    €{record.unit_cost?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-600 block mb-1">Σύνολο</label>
                  <div className="h-8 px-3 bg-slate-50 border border-input rounded-md flex items-center text-sm font-semibold">
                    €{record.total_cost?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(record.id)}
                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Δεν υπάρχουν εγγραφές για αυτήν την ημερομηνία</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="w-full mt-3"
          >
            <Plus className="w-4 h-4 mr-2" />
            Προσθήκη
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}