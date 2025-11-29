import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle, Download, X } from "lucide-react";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { BusStopOrder } from "@/entities/BusStopOrder";
import { OfficialOrderDocument } from "@/entities/OfficialOrderDocument";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EXPECTED_COLUMNS = [
  'stop_code', 'stop_name', 'municipality_community', 'district', 
  'latitude', 'longitude', 'existing_element', 'pavement', 
  'crossing', 'shelter_type', 'proposed_shelter_type', 'shelter_upgrade',
  'order_date', 'order_type', 'implementation_schedule', 
  'instruction_for_completion_on_date', 'instruction_completion_date', 
  'instruction_date', 'is_urgent', 'comments', 'main_order_reference'
];

export default function ImportOrdersDialog({ open, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setIsProcessing(false);
    setProgress(0);
    setResults(null);
    setError('');
    setDragActive(false);
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Παρακαλώ επιλέξτε ένα έγκυρο αρχείο Excel (.xlsx, .xls) ή CSV (.csv).');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Το αρχείο είναι πολύ μεγάλο. Το μέγιστο επιτρεπόμενο μέγεθος είναι 10MB.');
      return;
    }
    
    setFile(selectedFile);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const processImport = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProgress(0);
    setError('');
    
    try {
      const user = await User.me();
      
      // Step 1: Upload the file
      setProgress(10);
      const uploadResult = await UploadFile({ file });
      
      // Step 2: Extract data from file
      setProgress(20);
      const extractionResult = await ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              stop_code: { type: "string" },
              stop_name: { type: "string" },
              municipality_community: { type: "string" },
              district: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
              existing_element: { type: "string" },
              pavement: { type: "string" },
              crossing: { type: "string" },
              shelter_type: { type: "string" },
              proposed_shelter_type: { type: "string" },
              shelter_upgrade: { type: "string" },
              order_date: { type: "string" },
              order_type: { type: "string" },
              implementation_schedule: { type: "string" },
              instruction_for_completion_on_date: { type: "boolean" },
              instruction_completion_date: { type: "string" },
              instruction_date: { type: "string" },
              is_urgent: { type: "boolean" },
              comments: { type: "string" },
              main_order_reference: { type: "string" }
            },
            required: ["stop_code", "stop_name"]
          }
        }
      });
      
      if (extractionResult.status === 'error') {
        throw new Error(extractionResult.details || 'Σφάλμα κατά την ανάλυση του αρχείου');
      }
      
      const extractedData = extractionResult.output || [];
      
      if (extractedData.length === 0) {
        throw new Error('Δεν βρέθηκαν δεδομένα στο αρχείο');
      }
      
      setProgress(30);
      
      // Step 3: Process and create records
      const results = {
        total: extractedData.length,
        successful: 0,
        failed: 0,
        errors: [],
        duplicates: [],
        officialOrders: new Set()
      };
      
      // Group by main_order_reference to handle official documents
      const groupedByOrder = extractedData.reduce((acc, item) => {
        const ref = item.main_order_reference || 'NO_REFERENCE';
        if (!acc[ref]) acc[ref] = [];
        acc[ref].push(item);
        return acc;
      }, {});
      
      const orderGroups = Object.keys(groupedByOrder);
      let processedGroups = 0;
      
      for (const orderRef of orderGroups) {
        const orderItems = groupedByOrder[orderRef];
        let officialOrderId = null;
        
        // Create official order document if there's a reference
        if (orderRef !== 'NO_REFERENCE') {
          try {
            // Check if official order already exists
            const existingOrders = await OfficialOrderDocument.list();
            const existingOrder = existingOrders.find(o => o.main_order_reference === orderRef);
            
            if (existingOrder) {
              officialOrderId = existingOrder.id;
            } else {
              // Create new official order document
              const newOrder = await OfficialOrderDocument.create({
                main_order_reference: orderRef,
                title: `Επίσημη Παραγγελία ${orderRef}`,
                description: `Αυτόματη δημιουργία από import - ${orderItems.length} στάσεις`,
                order_date: orderItems[0].order_date || new Date().toISOString().split('T')[0],
                total_stops_count: orderItems.length
              });
              officialOrderId = newOrder.id;
            }
            results.officialOrders.add(orderRef);
          } catch (error) {
            console.warn(`Failed to create official order for ${orderRef}:`, error);
          }
        }
        
        // Process each item in this order group
        for (const item of orderItems) {
          try {
            // Check for duplicates by stop_code
            const existingOrders = await BusStopOrder.filter({ stop_code: item.stop_code });
            if (existingOrders.length > 0) {
              results.duplicates.push({
                stop_code: item.stop_code,
                stop_name: item.stop_name,
                existing_count: existingOrders.length
              });
            }
            
            // Prepare data for creation
            const orderData = {
              ...item,
              official_order_document_id: officialOrderId,
              is_active: true, // Default to active
              // Convert string boolean values
              instruction_for_completion_on_date: item.instruction_for_completion_on_date === true || item.instruction_for_completion_on_date === 'true' || item.instruction_for_completion_on_date === 'ΝΑΙ',
              is_urgent: item.is_urgent === true || item.is_urgent === 'true' || item.is_urgent === 'ΝΑΙ',
              // Handle coordinates
              latitude: item.latitude ? parseFloat(item.latitude) : undefined,
              longitude: item.longitude ? parseFloat(item.longitude) : undefined
            };
            
            // Create the bus stop order
            await BusStopOrder.create(orderData);
            results.successful++;
            
          } catch (error) {
            results.failed++;
            results.errors.push({
              stop_code: item.stop_code || 'N/A',
              stop_name: item.stop_name || 'N/A',
              error: error.message || 'Άγνωστο σφάλμα'
            });
          }
        }
        
        processedGroups++;
        setProgress(30 + (processedGroups / orderGroups.length) * 60);
      }
      
      setProgress(100);
      setResults(results);
      
    } catch (error) {
      setError(`Σφάλμα κατά την επεξεργασία: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const headers = EXPECTED_COLUMNS.join(',');
    const sampleRow = [
      'ST001', 'Στάση Κεντρικής Πλατείας', 'Λευκωσία', 'Λευκωσία',
      '35.1264', '33.4299', 'Πινακίδα', 'ΝΑΙ',
      'ΟΧΙ', 'Τύπος Α', 'Τύπος Β', 'Αναβάθμιση',
      '2024-01-15', 'Έκτακτη', '2024-02-15',
      'false', '', '', 'false', 'Δείγμα σχολίου', 'ORDER_2024_001'
    ].map(cell => `"${cell}"`).join(',');
    
    const csvContent = [headers, sampleRow].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bus_stop_orders_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleImportComplete = () => {
    if (onImportComplete) {
      onImportComplete();
    }
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Παραγγελιών Στάσεων από Excel/CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!results && (
            <>
              {/* Template Download */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Template Αρχείου
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">
                    Κατεβάστε το template για να δείτε τη σωστή μορφή των δεδομένων που πρέπει να περιέχει το αρχείο σας.
                  </p>
                  <Button onClick={downloadTemplate} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Κατέβασμα Template CSV
                  </Button>
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Επιλογή Αρχείου
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-700 mb-2">
                      {file ? file.name : 'Σύρετε το αρχείο εδώ ή κάντε κλικ για επιλογή'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Υποστηρίζονται αρχεία: Excel (.xlsx, .xls), CSV (.csv) - Μέγιστο μέγεθος: 10MB
                    </p>
                    {file && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm font-medium text-slate-700">Επιλεγμένο αρχείο:</p>
                        <p className="text-sm text-slate-600">{file.name}</p>
                        <p className="text-xs text-slate-500">Μέγεθος: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                </CardContent>
              </Card>

              {/* Processing */}
              {isProcessing && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Επεξεργασία αρχείου...</span>
                        <span className="text-sm text-slate-600">{progress}%</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                      <p className="text-xs text-slate-500 text-center">
                        Παρακαλώ περιμένετε. Η διαδικασία μπορεί να διαρκέσει μερικά λεπτά για μεγάλα αρχεία.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Results */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Αποτελέσματα Import
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">{results.total}</div>
                    <div className="text-sm text-slate-600">Συνολικά</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{results.successful}</div>
                    <div className="text-sm text-green-600">Επιτυχημένα</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">{results.failed}</div>
                    <div className="text-sm text-red-600">Αποτυχημένα</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-700">{results.duplicates.length}</div>
                    <div className="text-sm text-yellow-600">Διπλότυπα</div>
                  </div>
                </div>

                {results.officialOrders.size > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Επίσημες Παραγγελίες που Δημιουργήθηκαν:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(results.officialOrders).map(ref => (
                        <Badge key={ref} className="bg-blue-100 text-blue-800">{ref}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {results.duplicates.length > 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Διπλότυπα που Εντοπίστηκαν:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.duplicates.map((dup, index) => (
                        <div key={index} className="text-sm text-yellow-800">
                          {dup.stop_code} - {dup.stop_name} (υπάρχουν ήδη {dup.existing_count} καταχωρίσεις)
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.errors.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">Σφάλματα που Προέκυψαν:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.errors.map((err, index) => (
                        <div key={index} className="text-sm text-red-800">
                          {err.stop_code} - {err.stop_name}: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-3">
          {!results && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Ακύρωση
              </Button>
              <Button 
                onClick={processImport} 
                disabled={!file || isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? 'Επεξεργασία...' : 'Έναρξη Import'}
              </Button>
            </>
          )}
          {results && (
            <Button onClick={handleImportComplete} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Ολοκλήρωση
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}