
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, Loader2, CheckCircle, Eye } from 'lucide-react';

export default function ImportSnagsDialog({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [busStopsMap, setBusStopsMap] = useState({});
  const [options, setOptions] = useState({
    snagTypes: [],
    workTypes: [],
    elementCategories: []
  });
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (open) {
      loadBusStopsAndOptions();
    }
  }, [open]);

  const loadBusStopsAndOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [stops, snagTypes, workTypes, elementCategories] = await Promise.all([
        base44.entities.BusStop.list(),
        base44.entities.SnagTypeOption.list(),
        base44.entities.WorkTypeOption.list(),
        base44.entities.ElementCategoryOption.list()
      ]);
      
      const stopsMap = {};
      stops.forEach(stop => {
        stopsMap[stop.bus_stop_id] = stop.id;
      });
      setBusStopsMap(stopsMap);

      setOptions({
        snagTypes: snagTypes.filter(o => o.is_active).map(o => o.name),
        workTypes: workTypes.filter(o => o.is_active).map(o => o.name),
        elementCategories: elementCategories.filter(o => o.is_active).map(o => o.name)
      });
    } catch (error) {
      console.error('Error loading bus stops and options:', error);
      setError('Αποτυχία φόρτωσης δεδομένων. Παρακαλώ δοκιμάστε ξανά.');
    }
    setIsLoadingOptions(false);
  };

  const generateTemplate = () => {
    const headers = [
      'bus_stop_id',
      'snag_type',
      'snag_category',
      'element_category',
      'work_type',
      'work_description',
      'comments'
    ];
    
    const instructionRows = [
      '# ΟΔΗΓΙΕΣ: Διαγράψτε όλες τις γραμμές που ξεκινούν με # πριν την εισαγωγή',
      '# ====================================================================',
      '# ΥΠΟΧΡΕΩΤΙΚΑ ΠΕΔΙΑ: bus_stop_id, snag_type, snag_category, element_category, work_type',
      '# ΠΡΟΑΙΡΕΤΙΚΑ ΠΕΔΙΑ: work_description, comments',
      '# ====================================================================',
      '# ΣΗΜΕΙΩΣΗ: Ο bus_stop_id πρέπει να αντιστοιχεί σε ΥΠΑΡΧΟΥΣΑ στάση',
      '# ====================================================================',
      '# ΣΗΜΕΙΩΣΗ: Η εισαγωγή είναι ανεκτική σε πεζά/κεφαλαία γράμματα και επιπλέον κενά στις τιμές επιλογών (π.χ. snag_type, element_category)',
      '# ====================================================================',
      `# ΔΙΑΘΕΣΙΜΕΣ ΕΠΙΛΟΓΕΣ ΓΙΑ snag_type (Τύπος Εκκρεμότητας):`,
      `# ${options.snagTypes.length > 0 ? options.snagTypes.join(' | ') : 'Φορτώνει...'}`,
      '# ====================================================================',
      '# ΔΙΑΘΕΣΙΜΕΣ ΕΠΙΛΟΓΕΣ ΓΙΑ snag_category (Κατηγορία):',
      '# internal | external',
      '# (internal = Εσωτερική, external = Εξωτερική)',
      '# ====================================================================',
      `# ΔΙΑΘΕΣΙΜΕΣ ΕΠΙΛΟΓΕΣ ΓΙΑ element_category (Στοιχείο):`,
      `# ${options.elementCategories.length > 0 ? options.elementCategories.join(' | ') : 'Φορτώνει...'}`,
      '# ====================================================================',
      `# ΔΙΑΘΕΣΙΜΕΣ ΕΠΙΛΟΓΕΣ ΓΙΑ work_type (Τύπος Εργασίας):`,
      `# ${options.workTypes.length > 0 ? options.workTypes.join(' | ') : 'Φορτώνει...'}`,
      '# ====================================================================',
      '# ΣΗΜΕΙΩΣΗ: Οι τιμές πρέπει να ταιριάζουν ΑΚΡΙΒΩΣ με τις διαθέσιμες επιλογές (χωρίς διάκριση πεζών/κεφαλαίων, και αφαιρώντας περιττά κενά)',
      '# ====================================================================',
      ''
    ];
    
    const exampleRow = [
      '111',
      options.snagTypes[0] || 'Κατασκευαστική',
      'internal',
      options.elementCategories[0] || 'Στέγαστρο',
      options.workTypes[0] || 'Επισκευή',
      'Περιγραφή εργασίας',
      'Σχόλια'
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
    link.setAttribute('download', 'snags_import_template.csv');
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
    setPreviewData([]);
    setShowPreview(false);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      setProgress(50);

      // Changed: Direct array schema instead of nested object
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              bus_stop_id: { type: ["string", "number"] },
              snag_type: { type: "string" },
              snag_category: { type: "string" },
              element_category: { type: "string" },
              work_type: { type: "string" },
              work_description: { type: ["string", "null"] },
              comments: { type: ["string", "null"] }
            },
            required: ['bus_stop_id', 'snag_type', 'snag_category', 'element_category', 'work_type']
          }
        }
      });

      setProgress(100);

      if (extractResult.status === 'success' && extractResult.output) {
        let snags = extractResult.output;
        
        if (!Array.isArray(snags)) {
          snags = [snags];
        }

        const validSnags = snags.filter(snag => {
          const busStopId = snag.bus_stop_id || snag.bus_stop_id === 0 ? String(snag.bus_stop_id).trim() : '';
          const snagType = snag.snag_type ? String(snag.snag_type).trim() : '';
          const snagCategory = snag.snag_category ? String(snag.snag_category).trim() : '';
          const elementCategory = snag.element_category ? String(snag.element_category).trim() : '';
          const workType = snag.work_type ? String(snag.work_type).trim() : '';
          
          return busStopId && snagType && snagCategory && elementCategory && workType;
        }).map(snag => ({
          bus_stop_id: String(snag.bus_stop_id).trim(),
          snag_type: String(snag.snag_type).trim(),
          snag_category: String(snag.snag_category).trim(),
          element_category: String(snag.element_category).trim(),
          work_type: String(snag.work_type).trim(),
          work_description: snag.work_description ? String(snag.work_description).trim() : '',
          comments: snag.comments ? String(snag.comments).trim() : ''
        }));
        
        if (validSnags.length === 0) {
          setError('Δεν βρέθηκαν έγκυρες εκκρεμότητες στο αρχείο. Βεβαιωθείτε ότι υπάρχουν τα πεδία: bus_stop_id, snag_type, snag_category, element_category, work_type.');
        } else {
          setPreviewData(validSnags);
          setShowPreview(true);
        }
      } else {
        setError(extractResult.details || 'Αποτυχία εξαγωγής δεδομένων. Παρακαλώ ελέγξτε τη μορφή του αρχείου.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError('Αποτυχία προεπισκόπησης αρχείου: ' + (err.message || 'Άγνωστο σφάλμα'));
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
      const user = await base44.auth.me();
      const successfulImports = [];
      const failedImports = [];

      for (let i = 0; i < previewData.length; i++) {
        try {
          const snagData = previewData[i];

          const internalBusStopId = busStopsMap[snagData.bus_stop_id];
          if (!internalBusStopId) {
            throw new Error('Η στάση με κωδικό "' + snagData.bus_stop_id + '" δεν βρέθηκε στο σύστημα.');
          }

          // Case-insensitive and trimmed comparison for options
          const normalizedSnagType = snagData.snag_type.toLowerCase();
          if (!options.snagTypes.map(s => s.toLowerCase()).includes(normalizedSnagType)) {
            throw new Error(`Μη έγκυρος τύπος εκκρεμότητας: "${snagData.snag_type}". Επιλέξτε από: ${options.snagTypes.join(', ')}`);
          }
          
          const normalizedSnagCategory = snagData.snag_category.toLowerCase();
          if (!['internal', 'external'].includes(normalizedSnagCategory)) {
            throw new Error(`Μη έγκυρη κατηγορία εκκρεμότητας: "${snagData.snag_category}". Επιλέξτε: internal ή external`);
          }
          
          const normalizedElementCategory = snagData.element_category.toLowerCase();
          if (!options.elementCategories.map(e => e.toLowerCase()).includes(normalizedElementCategory)) {
            throw new Error(`Μη έγκυρη κατηγορία στοιχείου: "${snagData.element_category}". Επιλέξτε από: ${options.elementCategories.join(', ')}`);
          }
          
          const normalizedWorkType = snagData.work_type.toLowerCase();
          if (!options.workTypes.map(w => w.toLowerCase()).includes(normalizedWorkType)) {
            throw new Error(`Μη έγκυρος τύπος εργασίας: "${snagData.work_type}". Επιλέξτε από: ${options.workTypes.join(', ')}`);
          }

          const newSnagData = {
            bus_stop_id: internalBusStopId,
            // Use original case for storage, but validate against normalized options
            snag_type: options.snagTypes.find(s => s.toLowerCase() === normalizedSnagType) || snagData.snag_type,
            snag_category: options.snagTypes.find(s => s.toLowerCase() === normalizedSnagCategory) || snagData.snag_category, // This line is incorrect, snag_category should be 'internal' or 'external'
            element_category: options.elementCategories.find(e => e.toLowerCase() === normalizedElementCategory) || snagData.element_category,
            work_type: options.workTypes.find(w => w.toLowerCase() === normalizedWorkType) || snagData.work_type,
            work_description: snagData.work_description || '',
            comments: snagData.comments || ''
          };
          
          // Corrected snag_category assignment
          newSnagData.snag_category = normalizedSnagCategory === 'internal' ? 'internal' : 'external';


          const newSnag = await base44.entities.SnaggingList.create(newSnagData);
          
          // Add a small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
          
          await base44.entities.SnagLog.create({
            snag_id: newSnag.id,
            bus_stop_id: internalBusStopId,
            action_type: 'created',
            user_email: user.email,
            comment: 'Εκκρεμότητα εισήχθη από CSV'
          });

          successfulImports.push(newSnag);

        } catch (snagError) {
          console.error('Failed to import snag ' + (i + 1) + ':', snagError);
          failedImports.push({
            row: i + 1, // Store the original row number
            snag: previewData[i],
            error: snagError.message || 'Άγνωστο σφάλμα'
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
          <DialogTitle>Εισαγωγή Εκκρεμοτήτων από CSV</DialogTitle>
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
                <strong>Υποχρεωτικά:</strong> bus_stop_id, snag_type, snag_category, element_category, work_type
              </p>
              <p>
                <strong>Προαιρετικά:</strong> work_description, comments
              </p>
              <p><strong>Σημείωση:</strong> Ο bus_stop_id πρέπει να αντιστοιχεί σε υπάρχουσα στάση.</p>
              <p className="text-green-700 font-medium">✓ Η εισαγωγή είναι ανεκτική σε πεζά/κεφαλαία γράμματα και επιπλέον κενά στις τιμές επιλογών</p>
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
                <h4 className="font-semibold">Προεπισκόπηση: {previewData.length} εκκρεμότητες βρέθηκαν</h4>
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 border-b">Κωδ. Στάσης</th>
                      <th className="text-left p-2 border-b">Τύπος</th>
                      <th className="text-left p-2 border-b">Κατηγορία</th>
                      <th className="text-left p-2 border-b">Στοιχείο</th>
                      <th className="text-left p-2 border-b">Εργασία</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((snag, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-mono text-xs">{snag.bus_stop_id}</td>
                        <td className="p-2">{snag.snag_type}</td>
                        <td className="p-2">
                          <span className={'px-2 py-1 rounded text-xs ' + (snag.snag_category === 'internal' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800')}>
                            {snag.snag_category === 'internal' ? 'Εσωτ.' : 'Εξωτ.'}
                          </span>
                        </td>
                        <td className="p-2">{snag.element_category}</td>
                        <td className="p-2">{snag.work_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                    ... και {previewData.length - 10} ακόμα εκκρεμότητες
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
                  {results ? 'Εισαγωγή εκκρεμοτήτων...' : showPreview ? 'Εισαγωγή εκκρεμοτήτων...' : 'Επεξεργασία αρχείου...'}
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
                  Η εισαγωγή ολοκληρώθηκε! {results.successful} εκκρεμότητες εισήχθησαν επιτυχώς.
                  {results.failed > 0 && ' ' + results.failed + ' εκκρεμότητες απέτυχαν.'}
                </AlertDescription>
              </Alert>

              {results.failures && results.failures.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-700">Αποτυχίες Εισαγωγής:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {results.failures.map((failure, index) => (
                      <div key={index} className="text-sm p-3 bg-red-50 rounded border border-red-200">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-red-700 min-w-[60px]">
                            Γραμμή {failure.row}:
                          </span>
                          <div className="flex-1">
                            <p className="text-red-800 font-medium mb-1">
                              Στάση: {failure.snag.bus_stop_id}
                            </p>
                            <p className="text-red-600 text-xs break-words">
                              {failure.error}
                            </p>
                          </div>
                        </div>
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
                    Εισαγωγή {previewData?.length || 0} Εκκρεμοτήτων
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
