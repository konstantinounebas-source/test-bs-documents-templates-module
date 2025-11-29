import React, { useState, useCallback } from 'react';
import { PlatformChangeLog } from "@/entities/PlatformChangeLog";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, AlertTriangle, X, Paperclip } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialFormData = {
  title: '',
  description: '',
  type: 'Εισήγηση',
  related_page: '',
  notes: ''
};

export default function CreateChangeLogDialog({ open, onClose, onItemCreated }) {
  const [formData, setFormData] = useState(initialFormData);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileChange = (newFiles) => {
    const selectedFiles = Array.from(newFiles);
    setFiles(prev => [...prev, ...selectedFiles]);
    setError('');
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = "Ο τίτλος είναι υποχρεωτικός.";
    if (!formData.description.trim()) errors.description = "Η περιγραφή είναι υποχρεωτική.";
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      setError("Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία.");
      return;
    }

    setIsProcessing(true);

    try {
      // Get current user info
      const user = await User.me();
      const currentDateTime = new Date().toISOString();
      
      // Upload files if any
      const fileData = [];
      for (const file of files) {
        try {
          const uploadResult = await UploadFile({ file });
          fileData.push({
            url: uploadResult.file_url,
            filename: file.name,
            uploaded_by: user.full_name || user.email,
            uploaded_date: currentDateTime
          });
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          setError(`Σφάλμα κατά το ανέβασμα αρχείου: ${file.name}`);
          setIsProcessing(false);
          return;
        }
      }

      // Create the change log item
      const itemData = {
        ...formData,
        file_urls: fileData,
        created_by_full_name: user.full_name || user.email,
        status: "Εκκρεμεί"
      };

      await PlatformChangeLog.create(itemData);
      
      // Reset form
      setFormData(initialFormData);
      setFiles([]);
      setValidationErrors({});
      
      onItemCreated();
    } catch (error) {
      setError('Αποτυχία δημιουργίας καταχώρισης. Παρακαλώ δοκιμάστε ξανά.');
      console.error('Error creating change log item:', error);
    }

    setIsProcessing(false);
  };

  const handleDialogClose = () => {
    if (!isProcessing) {
      setFormData(initialFormData);
      setFiles([]);
      setError('');
      setValidationErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Νέα Καταχώριση Change Log</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Τίτλος *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Σύντομος περιγραφικός τίτλος"
                className={validationErrors.title ? 'border-red-500' : ''}
              />
              {validationErrors.title && <p className="text-xs text-red-600">{validationErrors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Τύπος *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Εισήγηση">Εισήγηση</SelectItem>
                    <SelectItem value="Αλλαγή">Αλλαγή</SelectItem>
                    <SelectItem value="Σφάλμα">Σφάλμα</SelectItem>
                    <SelectItem value="Βελτιστοποίηση">Βελτιστοποίηση</SelectItem>
                    <SelectItem value="Άλλο">Άλλο</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="related_page">Σχετική Σελίδα</Label>
                <Input
                  id="related_page"
                  value={formData.related_page}
                  onChange={(e) => handleInputChange('related_page', e.target.value)}
                  placeholder="π.χ. Templates, Users, Dashboard"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                placeholder="Αναλυτική περιγραφή του προβλήματος, της πρότασης ή της αλλαγής"
                className={validationErrors.description ? 'border-red-500' : ''}
              />
              {validationErrors.description && <p className="text-xs text-red-600">{validationErrors.description}</p>}
            </div>

            {/* File Upload Area */}
            <div className="space-y-3">
              <Label>Αρχεία (προαιρετικό)</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif"
                  onChange={(e) => handleFileChange(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-900">
                      Κάντε κλικ για ανέβασμα ή σύρετε αρχεία εδώ
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF, Word, εικόνες - πολλαπλά αρχεία επιτρέπονται
                    </p>
                  </div>
                </label>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">Επιλεγμένα αρχεία:</Label>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700">{file.name}</span>
                        <span className="text-xs text-slate-500">({Math.round(file.size / 1024)} KB)</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Σημειώσεις</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={2}
                placeholder="Επιπλέον σημειώσεις ή παρατηρήσεις"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isProcessing}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Δημιουργία...
                </>
              ) : (
                'Δημιουργία Καταχώρισης'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}