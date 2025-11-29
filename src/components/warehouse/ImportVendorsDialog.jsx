import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function ImportVendorsDialog({ open, onClose, onVendorsImported }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStep, setUploadStep] = useState('select'); // select, preview, processing, complete
  const [extractedData, setExtractedData] = useState([]);
  const [importResults, setImportResults] = useState({ successful: [], failed: [] });
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Όνομα Προμηθευτή,Κατηγορία,Υπηρεσίες (χωρισμένες με ;),Υπεύθυνος Επικοινωνίας,Email,Τηλέφωνο,Διεύθυνση,ΑΦΜ,Όροι Πληρωμής,Μέσος Χρόνος Παράδοσης (ημέρες),Αξιολόγηση (1-5),Σημειώσεις
Παράδειγμα Εταιρεία ΑΕ,Κατασκευαστής,Κατασκευή Στεγάστρων;Εγκατάσταση,Γιάννης Παπαδόπουλος,info@example.com,+357 22 123456,"Λεωφόρος Μακαρίου 123, Λευκωσία",12345678K,30 days,14,4.5,Αξιόπιστος προμηθευτής με καλές τιμές
Δεύτερος Προμηθευτής ΛΤΔ,Διανομέας,Μεταφορές;Αποθήκευση,Μαρία Γεωργίου,contact@second.com,+357 25 987654,"Οδός Αθηνών 45, Λεμεσός",87654321K,Cash,7,4,Γρήγορη εξυπηρέτηση`;

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'vendor_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length > 0 && values[0]) {
        const row = {};
        headers.forEach((header, idx) => {
          const value = values[idx] || '';
          
          // Map Greek headers to English keys
          if (header.includes('Όνομα')) row.name = value;
          else if (header.includes('Κατηγορία')) row.category = value;
          else if (header.includes('Υπηρεσίες')) row.services = value;
          else if (header.includes('Υπεύθυνος')) row.contact_person = value;
          else if (header.includes('Email')) row.email = value;
          else if (header.includes('Τηλέφωνο')) row.phone = value;
          else if (header.includes('Διεύθυνση')) row.address = value;
          else if (header.includes('ΑΦΜ')) row.tax_id = value;
          else if (header.includes('Όροι Πληρωμής')) row.payment_terms = value;
          else if (header.includes('Χρόνος Παράδοσης')) row.lead_time_days = parseInt(value) || 14;
          else if (header.includes('Αξιολόγηση')) row.rating = parseFloat(value) || 0;
          else if (header.includes('Σημειώσεις')) row.notes = value;
        });
        
        if (row.name) {
          data.push(row);
        }
      }
    }

    return data;
  };

  const handleExtractData = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError('');
    setUploadStep('preview');

    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const data = parseCSV(text);
          
          if (data.length === 0) {
            setError('Δεν βρέθηκαν δεδομένα στο αρχείο. Βεβαιωθείτε ότι το αρχείο ακολουθεί το format του template.');
            setUploadStep('select');
            setIsProcessing(false);
            return;
          }
          
          setExtractedData(data);
          setIsProcessing(false);
        } catch (err) {
          console.error('Error parsing CSV:', err);
          setError(`Σφάλμα κατά την ανάλυση του αρχείου: ${err.message}`);
          setUploadStep('select');
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setError('Σφάλμα κατά την ανάγνωση του αρχείου');
        setUploadStep('select');
        setIsProcessing(false);
      };

      reader.readAsText(file, 'UTF-8');
    } catch (err) {
      console.error('Error reading file:', err);
      setError(`Σφάλμα: ${err.message}`);
      setUploadStep('select');
      setIsProcessing(false);
    }
  };

  const generateVendorCode = async (name) => {
    const existingVendors = await base44.entities.Vendor.list();
    const existingCodes = existingVendors.map(v => v.code);
    
    let counter = 1;
    let code = `VEND-${String(counter).padStart(3, '0')}`;
    
    while (existingCodes.includes(code)) {
      counter++;
      code = `VEND-${String(counter).padStart(3, '0')}`;
    }
    
    return code;
  };

  const findOrCreateCategory = async (categoryName) => {
    if (!categoryName) return null;
    
    try {
      const categories = await base44.entities.VendorCategory.list();
      let category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      
      if (!category) {
        const categoryCode = `CAT-${categoryName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`;
        category = await base44.entities.VendorCategory.create({
          name: categoryName,
          code: categoryCode,
          is_active: true
        });
      }
      
      return category.id;
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  };

  const findOrCreateService = async (serviceName) => {
    if (!serviceName) return null;
    
    try {
      const services = await base44.entities.VendorService.list();
      let service = services.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
      
      if (!service) {
        const serviceCode = `SRV-${serviceName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`;
        service = await base44.entities.VendorService.create({
          name: serviceName,
          code: serviceCode,
          is_active: true
        });
      }
      
      return service.id;
    } catch (error) {
      console.error('Error creating service:', error);
      return null;
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setUploadStep('processing');
    setError('');
    
    const successful = [];
    const failed = [];

    for (const vendorData of extractedData) {
      try {
        const code = await generateVendorCode(vendorData.name);
        
        const vendor_category_id = await findOrCreateCategory(vendorData.category);
        
        let vendor_service_id = null;
        if (vendorData.services) {
          const firstService = vendorData.services.split(';')[0].trim();
          if (firstService) {
            vendor_service_id = await findOrCreateService(firstService);
          }
        }
        
        await base44.entities.Vendor.create({
          name: vendorData.name,
          code: code,
          vendor_category_id: vendor_category_id,
          vendor_service_id: vendor_service_id,
          contact_person: vendorData.contact_person || '',
          email: vendorData.email || '',
          phone: vendorData.phone || '',
          mobile: '',
          address: vendorData.address || '',
          city: '',
          postal_code: '',
          country: 'Greece',
          tax_id: vendorData.tax_id || '',
          doy: '',
          website: '',
          payment_terms: vendorData.payment_terms || '30 days',
          lead_time_days: vendorData.lead_time_days || 14,
          rating: vendorData.rating || 0,
          bank_account: '',
          notes: vendorData.notes || '',
          is_active: true
        });
        
        successful.push({ name: vendorData.name, code: code });
      } catch (err) {
        console.error('Error importing vendor:', vendorData.name, err);
        failed.push({ 
          name: vendorData.name, 
          error: err.message || 'Unknown error' 
        });
      }
    }

    setImportResults({ successful, failed });
    setUploadStep('complete');
    setIsProcessing(false);
  };

  const handleClose = () => {
    setFile(null);
    setUploadStep('select');
    setExtractedData([]);
    setImportResults({ successful: [], failed: [] });
    setError('');
    if (uploadStep === 'complete' && importResults.successful.length > 0) {
      onVendorsImported();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Εισαγωγή Προμηθευτών από CSV</DialogTitle>
          <DialogDescription>
            Ανεβάστε ένα CSV αρχείο με τη λίστα των προμηθευτών σας
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {uploadStep === 'select' && (
            <>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Κατεβάστε το Template</p>
                    <p className="text-sm text-blue-700">Χρησιμοποιήστε το template με παραδείγματα</p>
                  </div>
                </div>
                <Button onClick={downloadTemplate} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="vendor-file-upload"
                />
                <label htmlFor="vendor-file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-lg font-medium text-slate-900 mb-1">
                    Κάντε κλικ για ανέβασμα
                  </p>
                  <p className="text-sm text-slate-500">
                    Υποστηρίζεται μόνο CSV
                  </p>
                </label>
              </div>

              {file && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Αρχείο: <strong>{file.name}</strong>
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Ακύρωση
                </Button>
                <Button 
                  onClick={handleExtractData} 
                  disabled={!file || isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Επεξεργασία...
                    </>
                  ) : (
                    'Επόμενο'
                  )}
                </Button>
              </div>
            </>
          )}

          {uploadStep === 'preview' && (
            <>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Βρέθηκαν <strong>{extractedData.length}</strong> προμηθευτές
                </AlertDescription>
              </Alert>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 border-b">Όνομα</th>
                      <th className="text-left p-2 border-b">Κατηγορία</th>
                      <th className="text-left p-2 border-b">Email</th>
                      <th className="text-left p-2 border-b">Τηλέφωνο</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedData.map((vendor, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2">{vendor.name}</td>
                        <td className="p-2">{vendor.category || '-'}</td>
                        <td className="p-2">{vendor.email || '-'}</td>
                        <td className="p-2">{vendor.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setUploadStep('select')}>
                  Πίσω
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Εισαγωγή {extractedData.length} Προμηθευτών
                </Button>
              </div>
            </>
          )}

          {uploadStep === 'processing' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-900">Εισαγωγή σε εξέλιξη...</p>
              <p className="text-sm text-slate-600 mt-2">Παρακαλώ περιμένετε</p>
            </div>
          )}

          {uploadStep === 'complete' && (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Ολοκληρώθηκε!</strong>
                  <div className="mt-2">
                    <p>✓ Επιτυχής εισαγωγή: {importResults.successful.length}</p>
                    {importResults.failed.length > 0 && (
                      <p>✗ Αποτυχία: {importResults.failed.length}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {importResults.successful.length > 0 && (
                <div className="border rounded-lg">
                  <div className="bg-green-50 p-3 border-b">
                    <h4 className="font-semibold text-green-800">✓ Επιτυχείς Εισαγωγές</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {importResults.successful.map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 font-mono text-xs">{item.code}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importResults.failed.length > 0 && (
                <div className="border border-red-200 rounded-lg">
                  <div className="bg-red-50 p-3 border-b border-red-200">
                    <h4 className="font-semibold text-red-800">✗ Αποτυχίες</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {importResults.failed.map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 text-red-600 text-xs">{item.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700">
                  Ολοκλήρωση
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}