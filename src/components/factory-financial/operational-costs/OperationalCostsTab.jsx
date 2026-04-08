import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function OperationalCostsTab({ factoryFinancialDataId, totalWorkingDays, formatCurrency }) {
  const [items, setItems] = useState([]);
  const [busStopTypes, setBusStopTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [saveTimeout, setSaveTimeout] = useState(null);

  useEffect(() => {
    if (!factoryFinancialDataId) return;
    loadItems();
    loadBusStopTypes();
  }, [factoryFinancialDataId]);

  const loadItems = async () => {
    if (!factoryFinancialDataId) return;
    try {
      setLoading(true);
      const records = await base44.entities.OperationalCostItem.filter({
        factory_financial_data_id: factoryFinancialDataId
      });
      setItems(records);
      calculateDailyTotal(records);
    } catch (error) {
      console.error('Failed to load items:', error);
      toast.error('Αποτυχία φόρτωσης δεδομένων');
    } finally {
      setLoading(false);
    }
  };

  const loadBusStopTypes = async () => {
    try {
      const data = await base44.entities.BusStopType.list();
      setBusStopTypes(data);
    } catch (error) {
      console.error('Failed to load bus stop types:', error);
    }
  };

  const calculateDailyTotal = (itemsList) => {
    const total = itemsList.reduce((sum, item) => {
      return sum + convertToDaily(item.amount, item.frequency_type, item.conversion_factor);
    }, 0);
    setDailyTotal(total);
  };

  const convertToDaily = (amount, frequencyType, customFactor) => {
    const amountNum = parseFloat(amount) || 0;
    if (frequencyType === 'daily') return amountNum;
    if (frequencyType === 'monthly') {
      const factor = customFactor || (totalWorkingDays ? totalWorkingDays / 22 : 1);
      return amountNum / factor;
    }
    if (frequencyType === 'yearly') {
      const factor = customFactor || (totalWorkingDays || 260);
      return amountNum / factor;
    }
    return 0;
  };

  const handleAddItem = async () => {
    try {
      await base44.entities.OperationalCostItem.create({
        factory_financial_data_id: factoryFinancialDataId,
        description: '',
        amount: 0,
        frequency_type: 'monthly',
        conversion_factor: null,
        notes: ''
      });
      await loadItems();
      toast.success('Νέο κόστος προστέθηκε');
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Αποτυχία προσθήκης κόστους');
    }
  };

  const handleUpdateItem = (id, field, value) => {
    const updated = items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setItems(updated);
    calculateDailyTotal(updated);

    if (saveTimeout) clearTimeout(saveTimeout);

    const timeout = setTimeout(async () => {
      try {
        await base44.entities.OperationalCostItem.update(id, { [field]: value });
        toast.success('Ενημέρωση αποθηκεύτηκε');
      } catch (error) {
        console.error('Failed to update item:', error);
        toast.error('Αποτυχία ενημέρωσης');
      }
    }, 500);
    
    setSaveTimeout(timeout);
  };

  const handleDeleteItem = async (id) => {
    try {
      await base44.entities.OperationalCostItem.delete(id);
      const updated = items.filter(item => item.id !== id);
      setItems(updated);
      calculateDailyTotal(updated);
      toast.success('Κόστος διαγράφηκε');
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Αποτυχία διαγραφής');
    }
  };

  if (loading) {
    return <div className="p-4 text-slate-500">Φόρτωση...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Λειτουργικά Κόστη</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Σύνολο ημερήσιου κόστους: {formatCurrency(dailyTotal)}</p>
          </div>
          <Button
            onClick={handleAddItem}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Προσθήκη
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Δεν υπάρχουν κόστη</p>
        ) : (
          items.map((item) => {
            const daily = convertToDaily(item.amount, item.frequency_type, item.conversion_factor);
            return (
              <div key={item.id} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <Select value={item.bus_stop_type_id || ''} onValueChange={(v) => handleUpdateItem(item.id, 'bus_stop_type_id', v)}>
                    <SelectTrigger className="col-span-2 h-8 text-sm">
                      <SelectValue placeholder="Bus Stop Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {busStopTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Περιγραφή"
                    value={item.description}
                    onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                    className="col-span-3 h-8 text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Ποσό"
                    value={item.amount || ''}
                    onChange={(e) => handleUpdateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                    className="col-span-2 h-8 text-sm"
                  />
                  <Select value={item.frequency_type} onValueChange={(v) => handleUpdateItem(item.id, 'frequency_type', v)}>
                    <SelectTrigger className="col-span-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Ημερ.</SelectItem>
                      <SelectItem value="monthly">Μήν.</SelectItem>
                      <SelectItem value="yearly">Ετ.</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="col-span-2 text-right font-medium text-slate-900 bg-blue-50 p-2 rounded">
                    {formatCurrency(daily)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteItem(item.id)}
                    className="col-span-1 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Σχόλια"
                  value={item.notes || ''}
                  onChange={(e) => handleUpdateItem(item.id, 'notes', e.target.value)}
                  className="h-16 text-sm"
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}