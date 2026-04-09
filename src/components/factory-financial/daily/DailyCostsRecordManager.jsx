import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, Trash2, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { calculateTotalSupervisorDailyCost } from '../utils/labourModuleCalculations';

export default function DailyCostsRecordManager({
     selectedDate,
     factoryFinancialDataId,
     supervisorDailyAllocations,
     labourPersonnel,
     formatCurrency,
     fixedDailyTotal,
     operationalDailyTotal,
}) {
     const [records, setRecords] = useState([]);
     const [isLoading, setIsLoading] = useState(false);
     const [fixedCosts, setFixedCosts] = useState(false);
     const [operationalCosts, setOperationalCosts] = useState(false);
     const [supervisorCosts, setSupervisorCosts] = useState(false);
     const [isSaving, setIsSaving] = useState(false);
     const [error, setError] = useState(null);

     // Load records for selected date
     useEffect(() => {
          if (!selectedDate || !factoryFinancialDataId) {
               setRecords([]);
               return;
          }
          loadRecords();
     }, [selectedDate, factoryFinancialDataId]);

     const loadRecords = async () => {
          try {
               setIsLoading(true);
               setError(null);

               // Use list with a fresh query to avoid caching issues
               const allData = await base44.entities.FactoryFinancialData.list('-updated_date');
               const record = allData.find(r => r.id === factoryFinancialDataId);

               if (record) {
                    const allRecords = record.daily_costs_records || [];
                    console.log('📊 All cost records in DB:', allRecords.length);
                    console.log('📊 Looking for date:', selectedDate);

                    // Normalize date comparison to handle format differences
                    const normalizeDate = (dateStr) => {
                         if (!dateStr) return '';
                         // Handle both YYYY-MM-DD and DD/MM/YYYY formats
                         if (dateStr.includes('/')) {
                              const parts = dateStr.split('/');
                              return `${parts[2]}-${parts[1]}-${parts[0]}`;
                         }
                         return dateStr;
                    };

                    const targetDate = normalizeDate(selectedDate);
                    const todayRecords = allRecords.filter(r => {
                         const recordDate = normalizeDate(r.date);
                         const match = recordDate === targetDate;
                         console.log(`  - Comparing: ${recordDate} vs ${targetDate} = ${match}`);
                         return match;
                    });

                    console.log('✅ Found records for date:', todayRecords.length);
                    setRecords(todayRecords);
               } else {
                    console.warn('⚠️ FactoryFinancialData record not found:', factoryFinancialDataId);
                    setRecords([]);
               }
          } catch (err) {
               console.error('❌ Failed to load cost records:', err);
               setError('Σφάλμα φόρτωσης δεδομένων');
          } finally {
               setIsLoading(false);
          }
     };

     const getFixedCostsTotal = () => parseFloat(fixedDailyTotal) || 0;
     const getOperationalCostsTotal = () => parseFloat(operationalDailyTotal) || 0;
     const getSupervisorTotalCost = () => {
          if (!supervisorCosts || !supervisorDailyAllocations || !labourPersonnel) return 0;
          return calculateTotalSupervisorDailyCost(supervisorDailyAllocations, labourPersonnel);
     };

     const handleAddRecord = async () => {
          if (!fixedCosts && !operationalCosts && !supervisorCosts) return;
          if (!factoryFinancialDataId) {
               setError('Δεν έχει επιλεγεί εγγραφή εργοστασίου');
               return;
          }

          try {
               setIsSaving(true);
               setError(null);

               const fixedCost = fixedCosts ? getFixedCostsTotal() : 0;
               const operationalCost = operationalCosts ? getOperationalCostsTotal() : 0;
               const supervisorCost = supervisorCosts ? getSupervisorTotalCost() : 0;

               const newRecord = {
                    date: selectedDate,
                    hasFixedCosts: fixedCosts,
                    hasOperationalCosts: operationalCosts,
                    hasSupervisorCosts: supervisorCosts,
                    fixedCost: parseFloat(fixedCost || 0),
                    operationalCost: parseFloat(operationalCost || 0),
                    supervisorCost: parseFloat(supervisorCost || 0),
                    totalCost: parseFloat(fixedCost || 0) + parseFloat(operationalCost || 0) + parseFloat(supervisorCost || 0),
                    timestamp: new Date().toISOString(),
                    id: `cost-${selectedDate}-${Date.now()}`
               };

               // Get current financial data
               const currentData = await base44.entities.FactoryFinancialData.filter({
                    id: factoryFinancialDataId
               });

               if (currentData.length === 0) {
                    setError('Η εγγραφή εργοστασίου δεν βρέθηκε');
                    return;
               }

               // Update with new record
               const allRecords = currentData[0].daily_costs_records || [];
               const updatedRecords = [...allRecords, newRecord];

               await base44.entities.FactoryFinancialData.update(factoryFinancialDataId, {
                    daily_costs_records: updatedRecords
               });

               console.log('✅ Cost record saved successfully:', newRecord);
               console.log('✅ All records in DB:', updatedRecords);

               // Reload records from DB to ensure consistency
               await loadRecords();

               setFixedCosts(false);
               setOperationalCosts(false);
               setSupervisorCosts(false);
               } catch (err) {
               console.error('❌ Failed to save record:', err);
               console.error('❌ Error details:', JSON.stringify(err, null, 2));
               setError('Σφάλμα αποθήκευσης καταχώρησης');
               } finally {
               setIsSaving(false);
               }
               };

     const handleRemoveRecord = async (recordId) => {
          try {
               setIsSaving(true);
               setError(null);

               // Get current financial data
               const currentData = await base44.entities.FactoryFinancialData.filter({
                    id: factoryFinancialDataId
               });

               if (currentData.length === 0) return;

               // Remove record
               const allRecords = currentData[0].daily_costs_records || [];
               const updatedRecords = allRecords.filter(r => r.id !== recordId);

               await base44.entities.FactoryFinancialData.update(factoryFinancialDataId, {
                    daily_costs_records: updatedRecords
               });

               console.log('✅ Cost record removed successfully:', recordId);

               // Reload records from DB to ensure consistency
               await loadRecords();
               } catch (err) {
               console.error('❌ Failed to remove record:', err);
               console.error('❌ Error details:', JSON.stringify(err, null, 2));
               setError('Σφάλμα διαγραφής καταχώρησης');
               } finally {
               setIsSaving(false);
               }
               };

     return (
          <Card className="border-slate-200 bg-white">
               <CardHeader className="py-3 px-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                         <DollarSign className="w-4 h-4 text-blue-600" />
                         <CardTitle className="text-sm font-semibold text-slate-900">Καταχώρηση Κοστών</CardTitle>
                    </div>
               </CardHeader>
               <CardContent className="pt-3 px-4 pb-3">
                    {error && (
                         <div className="mb-3 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {error}
                         </div>
                    )}

                    {/* Selection Section */}
                    <div className="flex items-center gap-3 flex-wrap">
                         <div 
                              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded"
                              onClick={() => setFixedCosts(!fixedCosts)}
                         >
                              <input
                                   type="checkbox"
                                   checked={fixedCosts}
                                   onChange={(e) => setFixedCosts(e.target.checked)}
                                   className="w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs font-medium text-slate-900">Σταθερά</span>
                         </div>

                         <div 
                              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded"
                              onClick={() => setOperationalCosts(!operationalCosts)}
                         >
                              <input
                                   type="checkbox"
                                   checked={operationalCosts}
                                   onChange={(e) => setOperationalCosts(e.target.checked)}
                                   className="w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs font-medium text-slate-900">Λειτουργικά</span>
                         </div>

                         <div 
                              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded"
                              onClick={() => setSupervisorCosts(!supervisorCosts)}
                         >
                              <input
                                   type="checkbox"
                                   checked={supervisorCosts}
                                   onChange={(e) => setSupervisorCosts(e.target.checked)}
                                   className="w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs font-medium text-slate-900">Ημερήσιο Κόστος Επιστάρχη</span>
                         </div>

                         <Button
                              onClick={handleAddRecord}
                              disabled={(!fixedCosts && !operationalCosts && !supervisorCosts) || isSaving || isLoading}
                              size="sm"
                              className={`text-white text-xs py-1 h-auto px-2 ml-auto ${
                                   isSaving ? 'bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'
                              }`}
                         >
                              {isSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                              {!isSaving && <Plus className="w-3 h-3 mr-1" />}
                              {isSaving ? 'Αποθήκευση...' : 'Προσθήκη'}
                         </Button>
                    </div>

                    {/* Records List */}
                    {isLoading ? (
                         <div className="mt-3 flex items-center justify-center p-3 text-slate-500">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              <span className="text-xs">Φόρτωση δεδομένων...</span>
                         </div>
                    ) : records.length > 0 && (
                         <div className="mt-3 pt-3 border-t border-slate-100">
                              <div className="space-y-1">
                                   {records.map((record) => (
                                        <div
                                             key={record.id}
                                             className="flex items-center justify-between p-2 rounded bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                                        >
                                             <div className="flex items-center gap-2 flex-1">
                                                  <CheckCircle2 className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                                  <div className="flex flex-col gap-1">
                                                       <span className="text-xs text-slate-700 font-medium">
                                                            {record.hasFixedCosts && record.hasOperationalCosts && record.hasSupervisorCosts
                                                                 ? 'Σ. & Λ. & Επιστάρχη'
                                                                 : record.hasFixedCosts && record.hasOperationalCosts
                                                                 ? 'Σ. & Λ. Κόστη'
                                                                 : record.hasFixedCosts && record.hasSupervisorCosts
                                                                 ? 'Σ. & Επιστάρχη'
                                                                 : record.hasOperationalCosts && record.hasSupervisorCosts
                                                                 ? 'Λ. & Επιστάρχη'
                                                                 : record.hasFixedCosts
                                                                 ? 'Σ. Κόστη'
                                                                 : record.hasOperationalCosts
                                                                 ? 'Λ. Κόστη'
                                                                 : 'Επιστάρχη'}
                                                       </span>
                                                       <div className="text-xs text-slate-600 space-y-0.5">
                                                            {record.hasFixedCosts && (
                                                                 <div>Σταθερά: {formatCurrency(record.fixedCost)}</div>
                                                            )}
                                                            {record.hasOperationalCosts && (
                                                                 <div>Λειτουργικά: {formatCurrency(record.operationalCost)}</div>
                                                            )}
                                                            {record.hasSupervisorCosts && (
                                                                 <div className="text-purple-700 font-medium">Επιστάρχη: {formatCurrency(record.supervisorCost)}</div>
                                                            )}
                                                       </div>
                                                  </div>
                                             </div>
                                             <button
                                                  onClick={() => handleRemoveRecord(record.id)}
                                                  disabled={isSaving}
                                                  className="text-red-600 hover:text-red-800 p-1 rounded transition-colors disabled:opacity-50"
                                                  title="Διαγραφή"
                                             >
                                                  <Trash2 className="w-3 h-3" />
                                             </button>
                                        </div>
                                   ))}
                              </div>

                              {/* Summary */}
                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                   {records.some(r => r.hasFixedCosts) && (
                                        <div className="flex justify-between text-sm">
                                             <span className="text-slate-600">Σύνολο Σταθερών:</span>
                                             <span className="font-semibold text-slate-900">
                                                  {formatCurrency(records.reduce((sum, r) => sum + (r.fixedCost || 0), 0))}
                                             </span>
                                        </div>
                                   )}
                                   {records.some(r => r.hasOperationalCosts) && (
                                        <div className="flex justify-between text-sm">
                                             <span className="text-slate-600">Σύνολο Λειτουργικών:</span>
                                             <span className="font-semibold text-slate-900">
                                                  {formatCurrency(records.reduce((sum, r) => sum + (r.operationalCost || 0), 0))}
                                             </span>
                                        </div>
                                   )}
                                   {records.some(r => r.hasSupervisorCosts) && (
                                        <div className="flex justify-between text-sm">
                                             <span className="text-slate-600">Σύνολο Επιστάρχη:</span>
                                             <span className="font-semibold text-purple-700">
                                                  {formatCurrency(records.reduce((sum, r) => sum + (r.supervisorCost || 0), 0))}
                                             </span>
                                        </div>
                                   )}
                                   <div className="flex justify-between text-sm border-t border-slate-200 pt-2 font-bold">
                                        <span className="text-slate-900">Σύνολο Ημερήσιων Κοστών:</span>
                                        <span className="text-blue-700">
                                             {formatCurrency(records.reduce((sum, r) => sum + (r.totalCost || 0), 0))}
                                        </span>
                                   </div>
                              </div>
                         </div>
                    )}
               </CardContent>
          </Card>
     );
}