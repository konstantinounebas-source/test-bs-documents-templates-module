import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function DailySupervisorCostsSection({
  dailyCostsRecords,
  selectedDate,
  supervisorDailyCost,
  onAddCost,
  onRemoveCost,
  onUpdateCost
}) {
  const supervisorRows = dailyCostsRecords.filter(r => r.date === selectedDate && r.cost_type === 'supervisor');

  const handleMultiplierChange = (idx, newMultiplier) => {
    const updated = [...dailyCostsRecords];
    updated[idx].multiplier_days = parseFloat(newMultiplier) || 1;
    updated[idx].total_cost = updated[idx].unit_cost * updated[idx].multiplier_days;
    onUpdateCost(updated);
  };

  const handleAdd = () => {
    const newRow = {
      id: `cost_${Date.now()}`,
      date: selectedDate,
      cost_type: 'supervisor',
      multiplier_days: 1,
      unit_cost: supervisorDailyCost,
      total_cost: supervisorDailyCost
    };
    onAddCost(newRow);
  };

  const handleRemove = (realIdx) => {
    onRemoveCost(realIdx);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Κόστος Επιστάρχης ({supervisorRows.length})</CardTitle>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Προσθήκη
        </Button>
      </CardHeader>
      <CardContent>
        {supervisorRows.length === 0 ? (
          <p className="text-sm text-slate-500">Δεν υπάρχουν εγγραφές</p>
        ) : (
          <div className="space-y-2">
            {supervisorRows.map((row) => {
              const realIdx = dailyCostsRecords.findIndex(r => r.id === row.id);
              return (
                <div key={row.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <div className="flex-1 text-sm">
                    <label className="block text-slate-600 mb-1">Πολ/της</label>
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={row.multiplier_days}
                      onChange={(e) => handleMultiplierChange(realIdx, e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="flex-1 text-sm">
                    <label className="block text-slate-600 mb-1">Unit Cost</label>
                    <div className="h-8 flex items-center bg-white border rounded px-2 text-slate-700">
                      {row.unit_cost.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex-1 text-sm">
                    <label className="block text-slate-600 mb-1">Σύνολο</label>
                    <div className="h-8 flex items-center bg-blue-50 border border-blue-200 rounded px-2 font-semibold text-blue-700">
                      {row.total_cost.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(realIdx)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}