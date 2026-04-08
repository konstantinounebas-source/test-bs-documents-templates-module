import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Download } from 'lucide-react';
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

  const handleUpdateItem = async (id, field, value) => {
    let updatedValue = value;

    // If bus_stop_type_id is changed, fetch BOM cost
    if (field === 'bus_stop_type_id') {
      try {
        const bomCost = await calculateBOMCost(value);
        updatedValue = value;
        
        const updated = items.map(item => 
          item.id === id ? { ...item, bus_stop_type_id: value, amount: bomCost } : item
        );
        setItems(updated);
        calculateDailyTotal(updated);

        if (saveTimeout) clearTimeout(saveTimeout);

        const timeout = setTimeout(async () => {
          try {
            await base44.entities.OperationalCostItem.update(id, { 
              bus_stop_type_id: value, 
              amount: bomCost 
            });
            toast.success('BOM κόστος φορτώθηκε');
          } catch (error) {
            console.error('Failed to update item:', error);
            toast.error('Αποτυχία ενημέρωσης');
          }
        }, 500);
        
        setSaveTimeout(timeout);
        return;
      } catch (error) {
        console.error('Failed to get BOM cost:', error);
        toast.error('Αποτυχία φόρτωσης BOM κόστους');
        return;
      }
    }

    const updated = items.map(item => 
      item.id === id ? { ...item, [field]: updatedValue } : item
    );
    setItems(updated);
    calculateDailyTotal(updated);

    if (saveTimeout) clearTimeout(saveTimeout);

    const timeout = setTimeout(async () => {
      try {
        await base44.entities.OperationalCostItem.update(id, { [field]: updatedValue });
        toast.success('Ενημέρωση αποθηκεύτηκε');
      } catch (error) {
        console.error('Failed to update item:', error);
        toast.error('Αποτυχία ενημέρωσης');
      }
    }, 500);
    
    setSaveTimeout(timeout);
  };

  const calculateBOMCost = async (busStopTypeId) => {
    try {
      const components = await base44.entities.BusStopTypeComponent.filter({
        bus_stop_type_id: busStopTypeId
      });

      let totalCost = 0;
      for (const component of components) {
        if (component.product_id) {
          const products = await base44.entities.Product.filter({ 
            id: component.product_id 
          });
          if (products && products.length > 0) {
            const unitCost = products[0].unit_cost || 0;
            const quantity = component.quantity_required || 1;
            totalCost += unitCost * quantity;
          }
        }
      }
      return totalCost;
    } catch (error) {
      console.error('Error calculating BOM cost:', error);
      return 0;
    }
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

  const exportBOM = async (busStopTypeId) => {
    try {
      const components = await base44.entities.BusStopTypeComponent.filter({
        bus_stop_type_id: busStopTypeId
      });

      if (components.length === 0) {
        toast.error('Δεν υπάρχουν components για export');
        return;
      }

      // Fetch product info for each component
      const enrichedComponents = await Promise.all(
        components.map(async (comp) => {
          let productName = 'N/A';
          if (comp.product_id) {
            const products = await base44.entities.Product.filter({ id: comp.product_id });
            if (products.length > 0) {
              productName = products[0].name;
            }
          }
          return {
            ...comp,
            product_name: productName
          };
        })
      );

      // Create CSV content
      const headers = ['Product Name', 'Quantity Required', 'Unit of Measure', 'Installation Order', 'Optional', 'Notes'];
      const rows = enrichedComponents.map(comp => [
        comp.product_name,
        comp.quantity_required || '',
        comp.unit_of_measure || '',
        comp.installation_order || '',
        comp.is_optional ? 'Yes' : 'No',
        comp.notes || ''
      ]);

      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `BOM_Export_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();

      toast.success('BOM εξαγόμενο με επιτυχία');
    } catch (error) {
      console.error('Failed to export BOM:', error);
      toast.error('Αποτυχία εξαγωγής BOM');
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
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 grid grid-cols-11 gap-2 items-end">
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
                      className="col-span-2 h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Ποσό"
                      value={item.amount || ''}
                      onChange={(e) => handleUpdateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                      disabled={!!item.bus_stop_type_id}
                      className="col-span-2 h-8 text-sm disabled:bg-gray-200 disabled:cursor-not-allowed"
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
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.bus_stop_type_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportBOM(item.bus_stop_type_id)}
                        className="h-8 text-xs"
                        title="Export BOM to CSV"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
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