import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const FREQUENCY_LABELS = {
  daily: 'Ημερήσιο',
  monthly: 'Μηνιαίο',
  yearly: 'Ετήσιο'
};

export default function FixedCostsTab({ factoryFinancialDataId, totalWorkingDays, formatCurrency }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [saveTimeout, setSaveTimeout] = useState(null);

  // Load fixed cost items
  useEffect(() => {
    if (!factoryFinancialDataId) return;
    loadItems();
  }, [factoryFinancialDataId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.FixedCostItem.filter({
        factory_financial_data_id: factoryFinancialDataId
      });
      setItems(data.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      calculateDailyTotal(data);
    } catch (error) {
      console.error('Failed to load fixed costs:', error);
      toast.error('Failed to load fixed costs');
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyTotal = (itemsList) => {
    const total = itemsList.reduce((sum, item) => {
      const daily = convertToDaily(item.amount, item.frequency_type, item.conversion_factor);
      return sum + daily;
    }, 0);
    setDailyTotal(total);
  };

  const convertToDaily = (amount, frequencyType, customFactor) => {
    if (!amount) return 0;
    
    switch (frequencyType) {
      case 'daily':
        return amount;
      case 'monthly':
        const monthFactor = customFactor || 22;
        return amount / monthFactor;
      case 'yearly':
        return amount / 365;
      default:
        return 0;
    }
  };

  const handleAddItem = async () => {
    try {
      const newItem = await base44.entities.FixedCostItem.create({
        factory_financial_data_id: factoryFinancialDataId,
        description: 'Νέο κόστος',
        amount: 0,
        frequency_type: 'monthly',
        conversion_factor: null,
        notes: '',
        display_order: items.length
      });
      setItems([...items, newItem]);
      toast.success('Σειρά προστέθηκε');
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Αποτυχία προσθήκης');
    }
  };

  const handleUpdateItem = (id, field, value) => {
    // Update local state immediately
    const updated = items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setItems(updated);
    calculateDailyTotal(updated);

    // Clear existing timeout
    if (saveTimeout) clearTimeout(saveTimeout);

    // Save to DB after 500ms of inactivity
    const timeout = setTimeout(async () => {
      try {
        await base44.entities.FixedCostItem.update(id, { [field]: value });
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
      await base44.entities.FixedCostItem.delete(id);
      const updated = items.filter(item => item.id !== id);
      setItems(updated);
      calculateDailyTotal(updated);
      toast.success('Σειρά διαγράφηκε');
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Αποτυχία διαγραφής');
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-500">Φόρτωση...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Σταθερά Κόστη</CardTitle>
          <div className="text-lg font-bold text-slate-900">
            Ημερήσιο Σύνολο: {formatCurrency(dailyTotal)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
           const daily = convertToDaily(item.amount, item.frequency_type, item.conversion_factor);
           return (
             <div key={item.id} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
               <div className="grid grid-cols-12 gap-2 items-end">
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
                   <SelectTrigger className="col-span-2 h-8 text-sm">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="daily">Ημερήσιο</SelectItem>
                     <SelectItem value="monthly">Μηνιαίο</SelectItem>
                     <SelectItem value="yearly">Ετήσιο</SelectItem>
                   </SelectContent>
                 </Select>
                 <Input
                   type="number"
                   placeholder="Factor"
                   value={item.conversion_factor || ''}
                   onChange={(e) => handleUpdateItem(item.id, 'conversion_factor', e.target.value ? parseFloat(e.target.value) : null)}
                   className="col-span-1 h-8 text-sm"
                 />
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
         })}

        <Button onClick={handleAddItem} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Προσθήκη Κόστους
        </Button>
      </CardContent>
    </Card>
  );
}