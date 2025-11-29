
import React, { useState, useCallback, useEffect } from 'react';
import { FormTemplate } from "@/entities/FormTemplate";
import { User } from "@/entities/User";
import { AppUser } from "@/entities/AppUser";
import { 
    TemplateCategory, 
    TemplateAvailabilityOption, 
    SOPAvailabilityOption, 
    TemplateStatusOption,
    ActivityOption,
    CompletionFrequencyOption,
    ResponsibilityCompletionOption,
    ResponsibilityProcessingOption,
    ResponsibilityInternalOption,
    ResponsibilityExternalOption,
    ControlMechanismOption,
    CustomField1Option,
    CustomField2Option,
    CustomField3Option,
    CustomField4Option
} from "@/entities/all";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, BookOpen, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logAction } from "@/components/lib/logger";
import { getCustomFieldLabels } from "@/components/lib/customFieldLabels";

const CustomField = ({ label, value, onChange, options, error }) => (
    <div className="space-y-2">
        <Label>{label}</Label>
        <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className={error ? 'border-red-500' : ''}><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
            <SelectContent>
                <SelectItem value={null}>-- Clear Selection --</SelectItem> {/* Added for clearing custom field selection */}
                {(options || []).map(opt => (
                    <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
);

const ResponsibilityField = ({ label, value, onChange, systemUsers, appUsers, additionalOptions, error }) => {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select value={value || ''} onValueChange={onChange}>
                <SelectTrigger className={error ? 'border-red-500' : ''}><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
                <SelectContent>
                    <SelectItem value={null}>-- Clear Selection --</SelectItem> {/* Added for clearing responsibility selection */}
                    {(systemUsers || []).length > 0 && (
                        <>
                            <SelectItem disabled value="_users_header" className="font-semibold text-blue-600">
                                System Users
                            </SelectItem>
                            {systemUsers.filter(u => u.id).map(user => (
                                <SelectItem key={`user_${user.id}`} value={user.id}>
                                    {user.full_name}
                                </SelectItem>
                            ))}
                        </>
                    )}
                    {(appUsers || []).length > 0 && (
                        <>
                             <SelectItem disabled value="_app_users_header" className="font-semibold text-green-600">
                                Application Users
                            </SelectItem>
                            {appUsers.filter(u => u.id).map(user => (
                                <SelectItem key={`app_user_${user.id}`} value={user.id}>
                                    {user.full_name}
                                </SelectItem>
                            ))}
                        </>
                    )}
                    {(additionalOptions || []).length > 0 && (
                        <>
                            {((systemUsers || []).length > 0 || (appUsers || []).length > 0) && <SelectItem disabled value="_divider">---</SelectItem>}
                            <SelectItem disabled value="_additional_header" className="font-semibold text-purple-600">
                                Additional Options
                            </SelectItem>
                            {additionalOptions.filter(opt => opt.id && opt.name).map(opt => (
                                <SelectItem key={`option_${opt.id}`} value={opt.name}>
                                    {opt.name}
                                </SelectItem>
                            ))}
                        </>
                    )}
                </SelectContent>
            </Select>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
};

export default function EditTemplateDialog({ open, onClose, template, onTemplateUpdated }) {
  const [formData, setFormData] = useState({});
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [options, setOptions] = useState({
      categories: [],
      templateAvailability: [],
      sopAvailability: [],
      statusOptions: [],
      activityOptions: [],
      completionFrequencyOptions: [],
      controlMechanismOptions: [],
      customField1: [],
      customField2: [],
      customField3: [],
      customField4: [],
  });

  const [responsibilityOptions, setResponsibilityOptions] = useState({
      completion: [],
      processing: [],
      internal: [],
      external: []
  });

  const [systemUsers, setSystemUsers] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [customFieldLabels, setCustomFieldLabels] = useState({});
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  // Effect 1: Load options when dialog opens or template changes
  useEffect(() => {
    if (open && template) {
        setFile(null);
        setError('');
        setValidationErrors({});
        setOptionsLoaded(false); // Reset optionsLoaded when dialog opens or template changes
        setShowDeleteDialog(false); // Close delete dialog on new open

        async function loadAllData() {
          try {
            const [
                categories, templateAvailability, sopAvailability, statusOptions,
                activityOptions, completionFrequencyOptions, controlMechanismOptions,
                customField1, customField2, customField3, customField4, labels,
                respCompletion, respProcessing, respInternal, respExternal, appUsersData
            ] = await Promise.all([
                TemplateCategory.list(),
                TemplateAvailabilityOption.list(),
                SOPAvailabilityOption.list(),
                TemplateStatusOption.list(),
                ActivityOption.list(),
                CompletionFrequencyOption.list(),
                ControlMechanismOption.list(),
                CustomField1Option.list(),
                CustomField2Option.list(),
                CustomField3Option.list(),
                CustomField4Option.list(),
                getCustomFieldLabels(),
                ResponsibilityCompletionOption.list(),
                ResponsibilityProcessingOption.list(),
                ResponsibilityInternalOption.list(),
                ResponsibilityExternalOption.list(),
                AppUser.list()
            ]);

            setOptions({
                categories: (categories || []).filter(o => o.is_active),
                templateAvailability: (templateAvailability || []).filter(o => o.is_active),
                sopAvailability: (sopAvailability || []).filter(o => o.is_active),
                statusOptions: (statusOptions || []).filter(o => o.is_active),
                activityOptions: (activityOptions || []).filter(o => o.is_active),
                completionFrequencyOptions: (completionFrequencyOptions || []).filter(o => o.is_active),
                controlMechanismOptions: (controlMechanismOptions || []).filter(o => o.is_active),
                customField1: (customField1 || []).filter(o => o.is_active),
                customField2: (customField2 || []).filter(o => o.is_active),
                customField3: (customField3 || []).filter(o => o.is_active),
                customField4: (customField4 || []).filter(o => o.is_active),
            });

            setResponsibilityOptions({
                completion: (respCompletion || []).filter(o => o.is_active),
                processing: (respProcessing || []).filter(o => o.is_active),
                internal: (respInternal || []).filter(o => o.is_active),
                external: (respExternal || []).filter(o => o.is_active)
            });

            setCustomFieldLabels(labels || {});
            setAppUsers(appUsersData || []);

            try {
                const users = await User.list();
                setSystemUsers(users || []);
            } catch (userError) {
                console.warn("Could not load system users:", userError);
                setSystemUsers([]);
            }

            setOptionsLoaded(true); // Mark options as loaded
          } catch (err) {
            console.error("Failed to load options:", err);
            setError("Failed to load form options. Please refresh and try again.");
            setOptionsLoaded(false); // Ensure it's false on error
          }
        }
        loadAllData();
    }
  }, [open, template]);

  // Effect 2: Initialize form data AFTER options are loaded
  useEffect(() => {
    if (open && template && optionsLoaded) {
        const safeTemplate = {
            template_code: template.template_code || '',
            title_english: template.title_english || '',
            template_type: template.template_type || 'file_template',
            category: template.category || '',
            activity: template.activity || '',
            completion_frequency: template.completion_frequency || '',
            status: template.status || '',
            title_greek: template.title_greek || '',
            description: template.description || '',
            template_availability: template.template_availability || '',
            sop_reference_title: template.sop_reference_title || '',
            sop_availability: template.sop_availability || '',
            memo: template.memo || '',
            responsibility_completion: template.responsibility_completion || '',
            responsibility_processing: template.responsibility_processing || '',
            responsibility_internal: template.responsibility_internal || '',
            responsibility_external: template.responsibility_external || '',
            control_mechanism: template.control_mechanism || '',
            remarks: template.remarks || '',
            effective_date: template.effective_date ? template.effective_date.split('T')[0] : '',
            template_custom_field_1: template.template_custom_field_1 || '',
            template_custom_field_2: template.template_custom_field_2 || '',
            template_custom_field_3: template.template_custom_field_3 || '',
            template_custom_field_4: template.template_custom_field_4 || '',
            approver_id: template.approver_id || '',
            file_url: template.file_url || '',
        };

        setFormData(safeTemplate);
    }
  }, [open, template, optionsLoaded]);

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

  const handleFileChange = (files) => {
    const selectedFile = files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files);
    }
  }, []);

  const isFileTypeSupported = (file) => {
    if (!file) return false;
    const supportedTypes = ['.pdf', '.csv', '.png', '.jpg', '.jpeg'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    return supportedTypes.includes(fileExtension);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.template_code) errors.template_code = "Template Code is required.";
    if (!formData.title_english) errors.title_english = "Title (English) is required.";
    if (!formData.activity) errors.activity = "Activity is required.";
    if (!formData.completion_frequency) errors.completion_frequency = "Frequency is required.";
    if (!formData.status) errors.status = "Status is required.";

    // If status contains "approval", approver is required
    if (formData.status && formData.status.toLowerCase().includes('approval') && !formData.approver_id) {
      errors.approver_id = "Approver is required when status requires approval.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const incrementVersion = (version) => {
    const parts = version.split('.');
    if (parts.length >= 3) {
      parts[2] = String(parseInt(parts[2]) + 1);
      return parts.join('.');
    }
    return version;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!template) return;

    if (!validateForm()) {
        setError("Please fill in all required fields marked with *");
        return;
    }

    setIsProcessing(true);
    setError('');

    let dataToUpdate = { ...formData };

    // If the status is being changed to one that requires approval
    if (formData.status && formData.status.toLowerCase().includes('approval')) {
      // If it wasn't already pending, reset the approval process
      if (template.approval_status !== 'Pending') {
        dataToUpdate.approval_status = 'Pending';
        dataToUpdate.approved_by_id = null;
        dataToUpdate.approval_date = null;
        dataToUpdate.approval_notes = null;
      }
    } else { // If status is being changed to one that does NOT require approval
      // Only reset if it was previously in a state that needed a decision (Pending or Rejected)
      if (template.approval_status === 'Pending' || template.approval_status === 'Rejected') {
         dataToUpdate.approval_status = 'Not Applicable';
         dataToUpdate.approved_by_id = null;
         dataToUpdate.approval_date = null;
         dataToUpdate.approval_notes = null;
      }
      // If it was already 'Approved' or 'Not Applicable', we don't touch the approval_status
    }

    let newFileUrl = dataToUpdate.file_url;
    let newVersionTriggered = false;

    // Handle file upload if a new file is selected
    if (file instanceof File && file.name) {
      newVersionTriggered = true;
      try {
        const uploadResult = await UploadFile({ file });
        newFileUrl = uploadResult.file_url;
        dataToUpdate.file_url = newFileUrl;

        if (formData.template_type === 'interactive_form' && isFileTypeSupported(file)) {
          try {
            const extractResult = await ExtractDataFromUploadedFile({
              file_url: newFileUrl,
              json_schema: {
                type: "object",
                properties: {
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        type: { type: "string" },
                        label: { type: "string" },
                        required: { type: "boolean" },
                        options: { type: "array" }
                      }
                    }
                  }
                }
              }
            });

            if (extractResult.status === 'success' && extractResult.output) {
              let output = extractResult.output;
              if (Array.isArray(output) && output.length > 0) {
                output = output[0];
              }
              if (typeof output === 'object' && output !== null && !Array.isArray(output)) {
                dataToUpdate.form_schema = output;
              }
            }
          } catch (extractError) {
            console.warn('Could not extract form schema:', extractError);
          }
        }
      } catch (uploadError) {
        console.error('Error during file upload:', uploadError);
        let errorMessage = 'File upload failed. Please check your network connection and try again.';
        if (uploadError && uploadError.message) {
            errorMessage += ` (Details: ${uploadError.message})`;
        }
        setError(errorMessage);
        setIsProcessing(false);
        return;
      }
    }

    // Versioning and History
    if (newVersionTriggered) {
        try {
            const user = await User.me();
            const oldVersion = template.current_version || "1.0.0";
            const newRevision = {
                version: oldVersion,
                file_url: template.file_url || '',
                revision_date: new Date().toISOString(),
                revised_by: user.full_name || user.email,
                revision_notes: "New file uploaded."
            };

            // Safely handle revision_history - ensure it's always an array
            const currentHistory = Array.isArray(template.revision_history)
                ? [...template.revision_history]
                : [];

            dataToUpdate.revision_history = [...currentHistory, newRevision];
            dataToUpdate.current_version = incrementVersion(oldVersion);
        } catch (userError) {
            console.warn('Could not get user for revision history:', userError);
            // Continue without user info
            const oldVersion = template.current_version || "1.0.0";
            const newRevision = {
                version: oldVersion,
                file_url: template.file_url || '',
                revision_date: new Date().toISOString(),
                revised_by: "System",
                revision_notes: "New file uploaded."
            };

            const currentHistory = Array.isArray(template.revision_history)
                ? [...template.revision_history]
                : [];

            dataToUpdate.revision_history = [...currentHistory, newRevision];
            dataToUpdate.current_version = incrementVersion(oldVersion);
        }
    }

    try {
      await FormTemplate.update(template.id, dataToUpdate);

      logAction({
        action_type: 'UPDATE',
        target_entity: 'FormTemplate',
        target_id: template.id,
        details: {
          code: template.template_code,
          title: formData.title_english,
          file_changed: newVersionTriggered,
          new_version: newVersionTriggered ? dataToUpdate.current_version : null
        }
      });

      onTemplateUpdated();
    } catch (error) {
      setError('Failed to update template. Please try again.');
      console.error('Error updating template:', error);
    }

    setIsProcessing(false);
  };

  const handleDelete = async () => {
    if (!template || !template.id) return; // Kept robust check
    setIsDeleting(true);
    setError(''); // Clear any previous errors

    try {
      await FormTemplate.delete(template.id);
      
      logAction({
        action_type: 'DELETE',
        target_entity: 'FormTemplate',
        target_id: template.id,
        details: { 
          code: template.template_code, 
          title: template.title_english 
        }
      });

      setShowDeleteDialog(false);
      onClose(); // Close the edit dialog
      onTemplateUpdated(); // Notify parent to refresh data
    } catch (error) {
      console.error('Error deleting template:', error);
      setError('Failed to delete template. Please try again.');
    } finally {
      setIsDeleting(false); // Ensure loading state is reset
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template.template_type === "file_template" ? (
              <FileText className="w-5 h-5 text-blue-500" />
            ) : (
              <BookOpen className="w-5 h-5 text-purple-500" />
            )}
            Edit Template: {template.title_english}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900">Required Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_code">Template Code *</Label>
                <Input
                  id="template_code"
                  value={formData.template_code || ''}
                  onChange={(e) => handleInputChange('template_code', e.target.value)}
                  className={validationErrors.template_code ? 'border-red-500' : 'bg-white'}
                />
                {validationErrors.template_code && <p className="text-xs text-red-600">{validationErrors.template_code}</p>}
              </div>
              <div className="space-y-2">
                 <Label htmlFor="activity">Activity *</Label>
                  <Select 
                    value={formData.activity || 'no_activity'} 
                    onValueChange={(value) => handleInputChange('activity', value === 'no_activity' ? '' : value)}
                  >
                    <SelectTrigger className={validationErrors.activity ? 'border-red-500' : 'bg-white'}>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_activity">-- Select Activity --</SelectItem> {/* Added */}
                      {(options.activityOptions || []).map(opt => (
                        <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.activity && <p className="text-xs text-red-600">{validationErrors.activity}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title_english">Title (English) *</Label>
              <Input
                id="title_english"
                value={formData.title_english || ''}
                onChange={(e) => handleInputChange('title_english', e.target.value)}
                className={validationErrors.title_english ? 'border-red-500' : 'bg-white'}
              />
              {validationErrors.title_english && <p className="text-xs text-red-600">{validationErrors.title_english}</p>}
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select 
                    value={formData.completion_frequency || 'no_frequency'} 
                    onValueChange={(value) => handleInputChange('completion_frequency', value === 'no_frequency' ? '' : value)}
                  >
                    <SelectTrigger className={validationErrors.completion_frequency ? 'border-red-500' : 'bg-white'}>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_frequency">-- Select Frequency --</SelectItem> {/* Added */}
                      {(options.completionFrequencyOptions || []).map(opt => (
                        <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.completion_frequency && <p className="text-xs text-red-600">{validationErrors.completion_frequency}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select 
                    value={formData.status || 'no_status'} 
                    onValueChange={(value) => handleInputChange('status', value === 'no_status' ? '' : value)}
                  >
                    <SelectTrigger className={validationErrors.status ? 'border-red-500' : 'bg-white'}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_status">-- Select Status --</SelectItem> {/* Added */}
                      {(options.statusOptions || []).map(opt => (
                        <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.status && <p className="text-xs text-red-600">{validationErrors.status}</p>}
                </div>
              </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
            <Label className="text-base font-semibold">
              {file ? 'Replace File' : 'Current File'}
            </Label>
            {formData.file_url && !file && (
              <div className="text-sm text-slate-600 mb-2">
                Current file: <span className="font-mono">{formData.file_url.split('/').pop()}</span>
              </div>
            )}
            <div
              className={`border-2 border-dashed border-slate-300 rounded-lg p-6 bg-white transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-400'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
                onChange={(e) => handleFileChange(e.target.files)}
                className="hidden"
                id="file-upload-edit"
              />
              <label htmlFor="file-upload-edit" className="cursor-pointer">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900">
                    {file ? file.name : "Click to upload new file or drag and drop"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {file ? 'This will create a new version' : 'PDF, Word, Excel, CSV, or image files'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-6 p-4 bg-slate-50 rounded-lg border">
            <h3 className="text-lg font-semibold text-slate-700">Additional Information</h3>

            <div className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title_greek">Title (Greek)</Label>
                  <Input
                    id="title_greek"
                    value={formData.title_greek || ''}
                    onChange={(e) => handleInputChange('title_greek', e.target.value)}
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category || 'no_category'} 
                    onValueChange={(value) => handleInputChange('category', value === 'no_category' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_category">-- Select Category --</SelectItem> {/* Added */}
                      {(options.categories || []).map(opt => <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Availability</Label>
                  <Select 
                    value={formData.template_availability || 'no_template_availability'} 
                    onValueChange={(value) => handleInputChange('template_availability', value === 'no_template_availability' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_template_availability">-- Select Template Availability --</SelectItem> {/* Added */}
                      {(options.templateAvailability || []).map(opt => (
                        <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effective_date">Effective Date</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date || ''}
                  onChange={(e) => handleInputChange('effective_date', e.target.value)}
                />
              </div>
            </div>

            {/* SOP Information */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-md font-semibold text-slate-700">SOP Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sop_reference_title">SOP Reference Title</Label>
                  <Input
                    id="sop_reference_title"
                    value={formData.sop_reference_title || ''}
                    onChange={(e) => handleInputChange('sop_reference_title', e.target.value)}
                    placeholder="Enter SOP reference"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SOP Availability</Label>
                  <Select 
                    value={formData.sop_availability || 'no_sop_availability'} 
                    onValueChange={(value) => handleInputChange('sop_availability', value === 'no_sop_availability' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select SOP availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_sop_availability">-- Select SOP Availability --</SelectItem> {/* Added */}
                      {(options.sopAvailability || []).map(opt => (
                        <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Responsibilities & Approvals */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-md font-semibold text-slate-700">Responsibilities & Approvals</h4>
              <div className="space-y-2">
                  <Label>Approver {formData.status && formData.status.toLowerCase().includes('approval') ? '*' : ''}</Label>
                  <Select
                    value={formData.approver_id || ''}
                    onValueChange={(value) => handleInputChange('approver_id', value)}
                  >
                    <SelectTrigger className={validationErrors.approver_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select an approver for this template" />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value={null}>-- No Approver --</SelectItem> {/* Added for clearing approver selection */}
                       {(systemUsers || []).length > 0 && (
                          <>
                            <SelectItem disabled value="users_header" className="font-semibold text-blue-600">System Users</SelectItem>
                            {systemUsers.map(user => <SelectItem key={`user_${user.id}`} value={user.id}>{user.full_name}</SelectItem>)}
                          </>
                        )}
                        {(appUsers || []).length > 0 && (
                          <>
                            <SelectItem disabled value="app_users_header" className="font-semibold text-green-600">Application Users</SelectItem>
                            {appUsers.map(user => <SelectItem key={`app_user_${user.id}`} value={user.id}>{user.full_name}</SelectItem>)}
                          </>
                        )}
                    </SelectContent>
                  </Select>
                  {validationErrors.approver_id && <p className="text-xs text-red-600">{validationErrors.approver_id}</p>}
                  {formData.status && formData.status.toLowerCase().includes('approval') && (
                    <p className="text-xs text-blue-600">⚠️ Approver is required when status requires approval</p>
                  )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResponsibilityField
                  label="Responsibility Completion"
                  value={formData.responsibility_completion || ''}
                  onChange={(value) => handleInputChange('responsibility_completion', value)}
                  systemUsers={systemUsers}
                  appUsers={appUsers}
                  additionalOptions={responsibilityOptions.completion}
                />
                <ResponsibilityField
                  label="Responsibility Processing"
                  value={formData.responsibility_processing || ''}
                  onChange={(value) => handleInputChange('responsibility_processing', value)}
                  systemUsers={systemUsers}
                  appUsers={appUsers}
                  additionalOptions={responsibilityOptions.processing}
                />
                <ResponsibilityField
                  label="Responsibility Internal"
                  value={formData.responsibility_internal || ''}
                  onChange={(value) => handleInputChange('responsibility_internal', value)}
                  systemUsers={systemUsers}
                  appUsers={appUsers}
                  additionalOptions={responsibilityOptions.internal}
                />
                <ResponsibilityField
                  label="Responsibility External"
                  value={formData.responsibility_external || ''}
                  onChange={(value) => handleInputChange('responsibility_external', value)}
                  systemUsers={systemUsers}
                  appUsers={appUsers}
                  additionalOptions={responsibilityOptions.external}
                />
              </div>
              <div className="space-y-2">
                <Label>Control Mechanism</Label>
                <Select 
                    value={formData.control_mechanism || 'no_control_mechanism'} 
                    onValueChange={(value) => handleInputChange('control_mechanism', value === 'no_control_mechanism' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select control mechanism" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_control_mechanism">-- Select Control Mechanism --</SelectItem> {/* Added */}
                    {(options.controlMechanismOptions || []).map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-md font-semibold text-slate-700">Custom Fields</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomField
                  label={customFieldLabels['template_custom_field_1'] || 'Custom Field 1'}
                  value={formData.template_custom_field_1 || ''}
                  onChange={(val) => handleInputChange('template_custom_field_1', val)}
                  options={options.customField1}
                />
                <CustomField
                  label={customFieldLabels['template_custom_field_2'] || 'Custom Field 2'}
                  value={formData.template_custom_field_2 || ''}
                  onChange={(val) => handleInputChange('template_custom_field_2', val)}
                  options={options.customField2}
                />
                <CustomField
                  label={customFieldLabels['template_custom_field_3'] || 'Custom Field 3'}
                  value={formData.template_custom_field_3 || ''}
                  onChange={(val) => handleInputChange('template_custom_field_3', val)}
                  options={options.customField3}
                />
                <CustomField
                  label={customFieldLabels['template_custom_field_4'] || 'Custom Field 4'}
                  value={formData.template_custom_field_4 || ''}
                  onChange={(val) => handleInputChange('template_custom_field_4', val)}
                  options={options.customField4}
                />
              </div>
            </div>

            {/* Notes & Remarks */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-md font-semibold text-slate-700">Notes & Remarks</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="memo">Memo</Label>
                  <Textarea
                    id="memo"
                    value={formData.memo || ''}
                    onChange={(e) => handleInputChange('memo', e.target.value)}
                    rows={2}
                    placeholder="Internal memo or notes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks || ''}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    rows={2}
                    placeholder="Additional remarks"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-6 border-t bg-white p-4 rounded-lg">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Template
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Template'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template "{template?.title_english}" and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Template'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
