
import React, { useState, useCallback, useEffect } from 'react';
import { PlatformChangeLog } from "@/entities/PlatformChangeLog";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, AlertTriangle, X, Paperclip, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

export default function EditChangeLogDialog({ open, onClose, item, onItemUpdated }) {
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState([]); // For new files to be uploaded
  const [existingFiles, setExistingFiles] = useState([]); // For existing files
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (open && item) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        type: item.type || 'Εισήγηση',
        status: item.status || 'Εκκρεμεί',
        related_page: item.related_page || '',
        implemented_in_release: item.implemented_in_release || '',
        implemented_in_release_date: item.implemented_in_release_date ? item.implemented_in_release_date.split('T')[0] : '',
        assigned_to: item.assigned_to || '',
        due_date: item.due_date ? item.due_date.split('T')[0] : '',
        notes: item.notes || ''
      });
      
      // Migrate existing files to new object format on load
      const migratedFiles = (item.file_urls || []).map(file => {
        if (typeof file === 'string') {
          return {
            url: file,
            filename: file.split('/').pop()?.split('?')[0] || 'unknown_file',
            uploaded_by: 'System', // Default or placeholder if not available
            uploaded_date: item.created_date || new Date().toISOString()
          };
        }
        return file;
      });
      setExistingFiles(migratedFiles);

      setFiles([]);
      setError('');
      setValidationErrors({});
    }
  }, [open, item]);

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

  const handleDownloadFile = (fileUrl) => {
    window.open(fileUrl, '_blank');
  };

  const handleRemoveExistingFile = (fileIndex) => {
    setExistingFiles(prev => prev.filter((_, index) => index !== fileIndex));
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
    if (!formData.title?.trim()) errors.title = "Ο τίτλος είναι υποχρεωτικός.";
    if (!formData.description?.trim()) errors.description = "Η περιγραφή είναι υποχρεωτική.";
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item) return;

    setError('');

    if (!validateForm()) {
      setError("Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία.");
      return;
    }

    setIsProcessing(true);

    try {
      const user = await User.me();
      const currentDateTime = new Date().toISOString();

      // Upload new files if any
      const newFileData = [];
      for (const file of files) {
        try {
          const uploadResult = await UploadFile({ file });
          newFileData.push({
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

      // Combine existing files (that were not removed) with newly uploaded ones
      const allFileUrls = [...existingFiles, ...newFileData];

      // Update the change log item
      const updateData = {
        ...formData,
        file_urls: allFileUrls,
        last_updated_by_full_name: user.full_name || user.email,
      };

      await PlatformChangeLog.update(item.id, updateData);
      
      onItemUpdated();
      onClose(); // Close dialog on successful update
    } catch (error) {
      setError('Αποτυχία ενημέρωσης καταχώρισης. Παρακαλώ δοκιμάστε ξανά.');
      console.error('Error updating change log item:', error);
    }

    setIsProcessing(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Επεξεργασία Καταχώρισης</DialogTitle>
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
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={validationErrors.title ? 'border-red-500' : ''}
              />
              {validationErrors.title && <p className="text-xs text-red-600">{validationErrors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Τύπος</Label>
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
                <Label>Κατάσταση</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Εκκρεμεί">Εκκρεμεί</SelectItem>
                    <SelectItem value="Υλοποιήθηκε">Υλοποιήθηκε</SelectItem>
                    <SelectItem value="Προγραμματισμένο">Προγραμματισμένο</SelectItem>
                    <SelectItem value="Απορρίφθηκε">Απορρίφθηκε</SelectItem>
                    <SelectItem value="Μελλοντική Επέκταση">Μελλοντική Επέκταση</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="related_page">Σχετική Σελίδα</Label>
              <Input
                id="related_page"
                value={formData.related_page || ''}
                onChange={(e) => handleInputChange('related_page', e.target.value)}
                placeholder="π.χ. Templates, Users, Dashboard"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή *</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className={validationErrors.description ? 'border-red-500' : ''}
              />
              {validationErrors.description && <p className="text-xs text-red-600">{validationErrors.description}</p>}
            </div>

            {/* Implementation Details */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-md font-semibold text-slate-700">Λεπτομέρειες Υλοποίησης</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="implemented_in_release">Έκδοση Υλοποίησης</Label>
                  <Input
                    id="implemented_in_release"
                    value={formData.implemented_in_release || ''}
                    onChange={(e) => handleInputChange('implemented_in_release', e.target.value)}
                    placeholder="π.χ. v1.2.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="implemented_in_release_date">Ημερομηνία Υλοποίησης</Label>
                  <Input
                    id="implemented_in_release_date"
                    type="date"
                    value={formData.implemented_in_release_date || ''}
                    onChange={(e) => handleInputChange('implemented_in_release_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Ανατέθηκε σε</Label>
                  <Input
                    id="assigned_to"
                    value={formData.assigned_to || ''}
                    onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                    placeholder="Όνομα υπευθύνου"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Προθεσμία</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Existing Files */}
            {existingFiles && existingFiles.length > 0 && (
              <div className="space-y-3">
                <Label>Υπάρχοντα Αρχεία</Label>
                <div className="space-y-2">
                  {existingFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-2 flex-1">
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        <div className="flex-1">
                          <span className="text-sm text-slate-700 font-medium">{file.filename || 'Άγνωστο αρχείο'}</span>
                          {file.uploaded_by && file.uploaded_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              Ανέβηκε από {file.uploaded_by} στις {format(new Date(file.uploaded_date), "dd/MM/yyyy HH:mm")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFile(file.url)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExistingFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New File Upload */}
            <div className="space-y-3">
              <Label>Προσθήκη Νέων Αρχείων</Label>
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
                  id="file-upload-edit"
                />
                <label htmlFor="file-upload-edit" className="cursor-pointer">
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

              {/* New Files List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">Νέα αρχεία προς ανέβασμα:</Label>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-blue-500" />
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
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                placeholder="Επιπλέον σημειώσεις ή παρατηρήσεις"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ενημέρωση...
                </>
              ) : (
                'Ενημέρωση Καταχώρισης'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
