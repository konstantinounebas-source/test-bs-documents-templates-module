
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, Loader2, CheckCircle, Eye } from 'lucide-react';

export default function ImportBusStopsDialog({ open, onClose, onImported }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [options, setOptions] = useState({
    shelterTypes: [],
    field1Options: [],
    field2Options: [],
    cities: []
  });
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (open) {
      loadOptions();
    }
  }, [open]);

  const loadOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [shelterTypes, field1Opts, field2Opts, cities] = await Promise.all([
        base44.entities.ShelterTypeDeliveryOption.list(),
        base44.entities.BusStopField1Option.list(),
        base44.entities.BusStopField2Option.list(),
        base44.entities.CityMunicipalityOption.list()
      ]);
      
      setOptions({
        shelterTypes: shelterTypes.filter(o => o.is_active).map(o => o.name),
        field1Options: field1Opts.filter(o => o.is_active).map(o => o.name),
        field2Options: field2Opts.filter(o => o.is_active).map(o => o.name),
        cities: cities.filter(o => o.is_active).map(o => o.name)
      });
    } catch (error) {
      console.error('Error loading options:', error);
      setError('Αποτυχία φόρτωσης επιλογών. Παρακαλώ δοκιμάστε ξανά.');
    }
    setIsLoadingOptions(false);
  };

  const generateTemplate = () => {
    const headers = [
      'bus_stop_id',
      'city',
      'shelter_type',
      'field_1',
      'field_2',
      'latitude',
      'longitude',
      'comments'
    ];
    
    const instructionRows = [
      '# ΟΔΗΓΙΕΣ: Διαγράψτε όλες τις γραμμές που ξεκινούν με # πριν την εισαγωγή',
      '# ====================================================================',
      '# ΥΠΟΧΡΕΩΤΙΚΑ ΠΕΔΙΑ: bus_stop_id, city, shelter_type',
      '# ΠΡΟΑΙΡΕΤΙΚΑ ΠΕΔΙΑ: field_1, field_2, latitude, longitude, comments',
      '# ====================================================================',
      `# ΔΙΑΘΕΣΙΜΕΣ ΕΠΙΛΟΓΕΣ ΓΙΑ city (Πόλη/Δήμος):`,
      `# ${options.cities.length > 0 ? options.cities.join(' | ') : 'Φορτώνει...'}`,
      '# ====================================================================',
      `# ΔΙΑΘΕΣΙΜΕΣ ΕΠΙΛΟΓΕΣ ΓΙΑ shelter_type (Τύπος Στεγάστρου):`,
      `# ${options.shelterTypes.length > 0 ? options.shelterTypes.join(' | ') : 'Φορτώνει...'}`,
      '# ====================================================================',
      `# ΔΙΑΘΕΣΙΜΕΣ ΕΠΙΛΟΓΕΣ ΓΙΑ field_1 (Πρόσθετο Πεδίο 1):`,
      `# ${options.field1Options.length > 0 ? options.field1Options.join(' | ') : 'Προαιρετικό - Αφήστε κενό αν δεν χρειάζεται'}`,
      '# ====================================================================',
      `# ΔΙΑΘΕΣΙΜΕΣ ΕΠΙΛΟΓΕΣ ΓΙΑ field_2 (Πρόσθετο Πεδίο 2):`,
      `# ${options.field2Options.length > 0 ? options.field2Options.join(' | ') : 'Προαιρετικό - Αφήστε κενό αν δεν χρειάζεται'}`,
      '# ====================================================================',
      '# ΣΗΜΕΙΩΣΗ: Ο bus_stop_id πρέπει να είναι ΜΟΝΑΔΙΚΟΣ για κάθε στάση',
      '# ΣΗΜΕΙΩΣΗ: Οι τιμές πρέπει να ταιριάζουν ΑΚΡΙΒΩΣ με τις διαθέσιμες επιλογές',
      '# ====================================================================',
      ''
    ];
    
    const exampleRow = [
      '29-s',
      options.cities[0] || 'Λευκωσία',
      options.shelterTypes[0] || 'Standard',
      options.field1Options[0] || '',
      options.field2Options[0] || '',
      '35.1264',
      '33.4299',
      'Παράδειγμα σχολίου'
    ];
    
    const csvContent = [
      ...instructionRows,
      headers.join(','),
      exampleRow.map(cell => {
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      }).join(',')
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bus_stops_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Παρακαλώ επιλέξτε αρχείο CSV.');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResults(null);
      setPreviewData([]);
      setShowPreview(false);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Παρακαλώ επιλέξτε αρχείο πρώτα.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress(25);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      setProgress(50);

      console.log('Extracting data from file...');
      
      // Changed: Direct array schema instead of nested object
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              bus_stop_id: { type: ["string", "number"] },
              city: { type: "string" },
              shelter_type: { type: "string" },
              field_1: { type: ["string", "null"] },
              field_2: { type: ["string", "null"] },
              latitude: { type: ["number", "string", "null"] },
              longitude: { type: ["number", "string", "null"] },
              comments: { type: ["string", "null"] }
            },
            required: ['bus_stop_id', 'city', 'shelter_type']
          }
        }
      });

      setProgress(100);

      console.log('Extract result:', extractResult);

      if (extractResult.status === 'success' && extractResult.output) {
        let stops = extractResult.output; // Changed from extractResult.output.data || extractResult.output
        
        // Make sure it's an array
        if (!Array.isArray(stops)) {
          stops = [stops];
        }

        console.log('Parsed stops:', stops);

        if (stops.length === 0) {
          setError('Το αρχείο δεν περιέχει δεδομένα. Παρακαλώ ελέγξτε το περιεχόμενο του CSV.');
          setIsProcessing(false);
          return;
        }

        const validStops = [];
        const invalidStops = [];

        stops.forEach((stop, index) => {
          const issues = [];
          
          // Check required fields - more flexible checking
          const busStopId = (stop.bus_stop_id || stop.bus_stop_id === 0) ? String(stop.bus_stop_id).trim() : '';
          const city = stop.city ? String(stop.city).trim() : '';
          const shelterType = stop.shelter_type ? String(stop.shelter_type).trim() : '';
          
          if (!busStopId) {
            issues.push('bus_stop_id λείπει ή είναι κενό');
          }
          if (!city) {
            issues.push('city λείπει ή είναι κενή');
          }
          if (!shelterType) {
            issues.push('shelter_type λείπει ή είναι κενός');
          }

          if (issues.length > 0) {
            invalidStops.push({
              row: index + 1,
              data: stop,
              issues: issues.join(', ')
            });
          } else {
            // Clean and validate the data
            const cleanStop = {
              bus_stop_id: busStopId,
              city: city,
              shelter_type: shelterType,
              field_1: stop.field_1 && String(stop.field_1).trim() !== '' ? String(stop.field_1).trim() : '',
              field_2: stop.field_2 && String(stop.field_2).trim() !== '' ? String(stop.field_2).trim() : '',
              latitude: stop.latitude && stop.latitude !== '' && stop.latitude !== null ? stop.latitude : '',
              longitude: stop.longitude && stop.longitude !== '' && stop.longitude !== null ? stop.longitude : '',
              comments: stop.comments && String(stop.comments).trim() !== '' ? String(stop.comments).trim() : ''
            };
            validStops.push(cleanStop);
          }
        });

        console.log('Valid stops:', validStops);
        console.log('Invalid stops:', invalidStops);
        
        if (validStops.length === 0) {
          let errorMsg = 'Δεν βρέθηκαν έγκυρες στάσεις στο αρχείο.\n\n';
          if (invalidStops.length > 0) {
            errorMsg += 'Προβλήματα που εντοπίστηκαν:\n';
            invalidStops.slice(0, 5).forEach(inv => {
              errorMsg += `Γραμμή ${inv.row}: ${inv.issues}\n`;
            });
            if (invalidStops.length > 5) {
              errorMsg += `...και ${invalidStops.length - 5} ακόμα γραμμές με προβλήματα.`;
            }
          }
          errorMsg += '\n\nΒεβαιωθείτε ότι το CSV περιέχει:\n- bus_stop_id (υποχρεωτικό)\n- city (υποχρεωτικό)\n- shelter_type (υποχρεωτικό)';
          setError(errorMsg);
        } else {
          if (invalidStops.length > 0) {
            setError(`Προσοχή: ${invalidStops.length} γραμμές αγνοήθηκαν λόγω ελλείψεων. Θα εισαχθούν ${validStops.length} έγκυρες στάσεις.`);
          }
          setPreviewData(validStops);
          setShowPreview(true);
        }
      } else {
        console.error('Extraction failed:', extractResult);
        setError(extractResult.details || 'Αποτυχία εξαγωγής δεδομένων από το αρχείο. Παρακαλώ βεβαιωθείτε ότι το αρχείο είναι έγκυρο CSV με τα σωστά πεδία.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError('Αποτυχία προεπισκόπησης αρχείου: ' + (err.message || 'Άγνωστο σφάλμα. Παρακαλώ ελέγξτε ότι το αρχείο είναι έγκυρο CSV.'));
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleImport = async () => {
    if (!previewData || previewData.length === 0) {
      setError('Δεν υπάρχουν δεδομένα για εισαγωγή.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress(0);

    try {
      // First, check for duplicate bus_stop_ids in the existing database
      const existingStops = await base44.entities.BusStop.list();
      const existingStopIds = new Set(existingStops.map(s => s.bus_stop_id));
      
      const successfulImports = [];
      const failedImports = [];

      for (let i = 0; i < previewData.length; i++) {
        try {
          const stopData = previewData[i];

          // Check if bus_stop_id already exists
          if (existingStopIds.has(stopData.bus_stop_id)) {
            throw new Error(`Η στάση με κωδικό "${stopData.bus_stop_id}" υπάρχει ήδη στο σύστημα.`);
          }

          // Validate that required options exist
          if (!options.cities.includes(stopData.city)) {
            throw new Error(`Μη έγκυρη πόλη: "${stopData.city}". Επιλέξτε από: ${options.cities.join(', ')}`);
          }
          
          if (!options.shelterTypes.includes(stopData.shelter_type)) {
            throw new Error(`Μη έγκυρος τύπος στεγάστρου: "${stopData.shelter_type}". Επιλέξτε από: ${options.shelterTypes.join(', ')}`);
          }

          // Validate optional fields if provided
          if (stopData.field_1 && !options.field1Options.includes(stopData.field_1)) {
            throw new Error(`Μη έγκυρη τιμή για Πεδίο 1: "${stopData.field_1}"`);
          }
          
          if (stopData.field_2 && !options.field2Options.includes(stopData.field_2)) {
            throw new Error(`Μη έγκυρη τιμή για Πεδίο 2: "${stopData.field_2}"`);
          }

          const newStopData = {
            bus_stop_id: stopData.bus_stop_id,
            city: stopData.city,
            shelter_type: stopData.shelter_type,
            field_1: stopData.field_1 || undefined,
            field_2: stopData.field_2 || undefined,
            latitude: stopData.latitude ? Number(stopData.latitude) : undefined,
            longitude: stopData.longitude ? Number(stopData.longitude) : undefined,
            comments: stopData.comments || ''
          };

          // Remove undefined values
          Object.keys(newStopData).forEach(key => {
            if (newStopData[key] === undefined) {
              delete newStopData[key];
            }
          });

          const newStop = await base44.entities.BusStop.create(newStopData);
          
          // Add a small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
          
          await base44.entities.StateOfDelivery.create({
            bus_stop_id: newStop.id
          });

          successfulImports.push(newStop);
          existingStopIds.add(stopData.bus_stop_id); // Add to set to catch duplicates within the import

        } catch (stopError) {
          console.error('Failed to import bus stop ' + (i + 1) + ':', stopError);
          failedImports.push({
            stop: previewData[i],
            error: stopError.message || 'Άγνωστο σφάλμα'
          });
        }

        setProgress(Math.round(((i + 1) / previewData.length) * 100));
      }

      setResults({
        successful: successfulImports.length,
        failed: failedImports.length,
        failures: failedImports
      });

      if (successfulImports.length > 0) {
        onImported();
      }

    } catch (err) {
      console.error('Import error:', err);
      setError('Αποτυχία εισαγωγής: ' + (err.message || 'Άγνωστο σφάλμα'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    setResults(null);
    setPreviewData([]);
    setShowPreview(false);
    setProgress(0);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Εισαγωγή Στάσεων από CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Απαιτήσεις Μορφής CSV</h4>
            <p className="text-sm text-blue-800 mb-3">
              Κατεβάστε το template παρακάτω για να ξεκινήσετε με τη σωστή μορφή.
            </p>

            <Button 
              onClick={generateTemplate} 
              variant="outline" 
              className="mb-3"
              disabled={isLoadingOptions}
            >
              <Download className="w-4 h-4 mr-2" />
              {isLoadingOptions ? 'Φόρτωση...' : 'Λήψη CSV Template'}
            </Button>

            <div className="text-xs text-blue-700 space-y-1">
              <p>
                <strong>Υποχρεωτικά:</strong> bus_stop_id, city, shelter_type
              </p>
              <p>
                <strong>Προαιρετικά:</strong> field_1, field_2, latitude, longitude, comments
              </p>
            </div>
          </div>

          {!showPreview && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Επιλογή Αρχείου CSV</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="mt-2"
                />
              </div>

              {file && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          )}

          {showPreview && previewData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold">Προεπισκόπηση: {previewData.length} στάσεις βρέθηκαν</h4>
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 border-b">Κωδικός</th>
                      <th className="text-left p-2 border-b">Πόλη</th>
                      <th className="text-left p-2 border-b">Τύπος</th>
                      <th className="text-left p-2 border-b">Lat</th>
                      <th className="text-left p-2 border-b">Lon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((stop, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-mono text-xs">{stop.bus_stop_id}</td>
                        <td className="p-2">{stop.city}</td>
                        <td className="p-2">{stop.shelter_type}</td>
                        <td className="p-2 text-xs">{stop.latitude || '-'}</td>
                        <td className="p-2 text-xs">{stop.longitude || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                    ... και {previewData.length - 10} ακόμα στάσεις
                  </div>
                )}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  {results ? 'Εισαγωγή στάσεων...' : showPreview ? 'Εισαγωγή στάσεων...' : 'Επεξεργασία αρχείου...'}
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Η εισαγωγή ολοκληρώθηκε! {results.successful} στάσεις εισήχθησαν επιτυχώς.
                  {results.failed > 0 && ' ' + results.failed + ' στάσεις απέτυχαν.'}
                </AlertDescription>
              </Alert>

              {results.failures && results.failures.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-700">Αποτυχίες Εισαγωγής:</h4>
                  <div className="max-h-32 overflow-y-auto">
                    {results.failures.map((failure, index) => (
                      <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                        <strong>{failure.stop.bus_stop_id || 'N/A'}:</strong> {failure.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              {results ? 'Κλείσιμο' : 'Ακύρωση'}
            </Button>

            {!showPreview && !results && (
              <Button onClick={handlePreview} disabled={!file || isProcessing || isLoadingOptions}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Επεξεργασία...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Προεπισκόπηση
                  </>
                )}
              </Button>
            )}

            {showPreview && !results && (
              <Button
                onClick={handleImport}
                disabled={isProcessing || !previewData || previewData.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Εισαγωγή...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Εισαγωγή {previewData?.length || 0} Στάσεων
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
