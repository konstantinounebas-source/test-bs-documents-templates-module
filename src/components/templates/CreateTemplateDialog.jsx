import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
const FormTemplate = base44.entities.FormTemplate;
const AppUser = base44.entities.AppUser;
const TemplateCategory = base44.entities.TemplateCategory;
const TemplateAvailabilityOption = base44.entities.TemplateAvailabilityOption;
const SOPAvailabilityOption = base44.entities.SOPAvailabilityOption;
const TemplateStatusOption = base44.entities.TemplateStatusOption;
const ActivityOption = base44.entities.ActivityOption;
const CompletionFrequencyOption = base44.entities.CompletionFrequencyOption;
const ResponsibilityCompletionOption = base44.entities.ResponsibilityCompletionOption;
const ResponsibilityProcessingOption = base44.entities.ResponsibilityProcessingOption;
const ResponsibilityInternalOption = base44.entities.ResponsibilityInternalOption;
const ResponsibilityExternalOption = base44.entities.ResponsibilityExternalOption;
const ControlMechanismOption = base44.entities.ControlMechanismOption;
const CustomField1Option = base44.entities.CustomField1Option;
const CustomField2Option = base44.entities.CustomField2Option;
const CustomField3Option = base44.entities.CustomField3Option;
const CustomField4Option = base44.entities.CustomField4Option;
const UploadFile = (params) => base44.integrations.Core.UploadFile(params);
const ExtractDataFromUploadedFile = (params) => base44.integrations.Core.ExtractDataFromUploadedFile(params);
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, FileText, BookOpen, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logAction } from "@/components/lib/logger";
import { getCustomFieldLabels } from "@/components/lib/customFieldLabels";

const initialFormData = {
    template_code: '',
    title_english: '',
    template_type: 'file_template',
    category: '',
    activity: '',
    completion_frequency: '',
    status: 'draft',
    title_greek: '',
    description: '',
    template_availability: '',
    sop_reference_title: '',
    sop_availability: '',
    memo: '',
    responsibility_completion: '',
    responsibility_processing: '',
    responsibility_internal: '',
    responsibility_external: '',
    control_mechanism: '',
    remarks: '',
    effective_date: new Date().toISOString().split('T')[0],
    template_custom_field_1: '',
    template_custom_field_2: '',
    template_custom_field_3: '',
    template_custom_field_4: '',
    approver_id: ''
};

const CustomField = ({ label, value, onChange, options, error }) => (
    <div className="space-y-2">
        <Label>{label}</Label>
        <Select
            value={value || '__EMPTY_CUSTOM_FIELD__'}
            onValueChange={(selectedVal) => onChange(selectedVal === '__EMPTY_CUSTOM_FIELD__' ? '' : selectedVal)}
        >
            <SelectTrigger className={error ? 'border-red-500' : ''}><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
            <SelectContent>
                <SelectItem value="__EMPTY_CUSTOM_FIELD__" className="text-muted-foreground">-- Not Set --</SelectItem>
                {options.filter(opt => opt.id && opt.is_active).map(opt => (
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
            <Select
                value={value || '__EMPTY_RESPONSIBILITY__'}
                onValueChange={(selectedVal) => onChange(selectedVal === '__EMPTY_RESPONSIBILITY__' ? '' : selectedVal)}
            >
                <SelectTrigger className={error ? 'border-red-500' : ''}><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="__EMPTY_RESPONSIBILITY__" className="text-muted-foreground">-- Not Set --</SelectItem>
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
                            {appUsers.filter(u => u.id).map(u => (
                                <SelectItem key={`app_user_${u.id}`} value={u.id}>
                                    {u.full_name}
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

export default function CreateTemplateDialog({ open, onClose, onTemplateCreated }) {
    const [formData, setFormData] = useState(initialFormData);
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [dragActive, setDragActive] = useState(false);

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

    useEffect(() => {
        if (open) {
            setFormData(initialFormData);
            setFile(null);
            setError('');
            setValidationErrors({});

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
                        categories: categories.filter(opt => opt.id && opt.is_active),
                        templateAvailability: templateAvailability.filter(opt => opt.id && opt.is_active),
                        sopAvailability: sopAvailability.filter(opt => opt.id && opt.is_active),
                        statusOptions: statusOptions.filter(opt => opt.id && opt.is_active),
                        activityOptions: activityOptions.filter(opt => opt.id && opt.is_active),
                        completionFrequencyOptions: completionFrequencyOptions.filter(opt => opt.id && opt.is_active),
                        controlMechanismOptions: controlMechanismOptions.filter(opt => opt.id && opt.is_active),
                        customField1: customField1.filter(opt => opt.id && opt.is_active),
                        customField2: customField2.filter(opt => opt.id && opt.is_active),
                        customField3: customField3.filter(opt => opt.id && opt.is_active),
                        customField4: customField4.filter(opt => opt.id && opt.is_active),
                    });

                    setResponsibilityOptions({
                        completion: respCompletion.filter(opt => opt.id && opt.is_active),
                        processing: respProcessing.filter(opt => opt.id && opt.is_active),
                        internal: respInternal.filter(opt => opt.id && opt.is_active),
                        external: respExternal.filter(opt => opt.id && opt.is_active)
                    });

                    setCustomFieldLabels(labels || {});
                    setAppUsers(appUsersData || []);

                    try {
                        const users = await base44.entities.User.list();
                        setSystemUsers(users || []);
                    } catch (userError) {
                        console.warn("Could not load system users - they will not appear in responsibility dropdowns:", userError);
                        setSystemUsers([]);
                    }

                } catch (err) {
                    console.error("Failed to load form options:", err);
                    setError("Failed to load form options. Please refresh and try again.");
                }
            }
            loadAllData();
        }
    }, [open]);

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

    const generateSequenceNumber = async () => {
        const templates = await FormTemplate.list();
        return (templates.length + 1).toString().padStart(3, '0');
    };

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

        // If status is "Need Approval", approver is required
        if (formData.status === 'Need Approval' && !formData.approver_id) {
            errors.approver_id = "Approver is required when status is 'Need Approval'.";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            setError("Please fill in all required fields marked with *");
            return;
        }

        setIsProcessing(true);

        let fileUrl = '';
        let formSchema = null;

        if (file instanceof File && file.name) {
            try {
                const uploadResult = await UploadFile({ file });
                fileUrl = uploadResult.file_url;

                if (formData.template_type === 'interactive_form' && isFileTypeSupported(file)) {
                    try {
                        const extractResult = await ExtractDataFromUploadedFile({
                            file_url: fileUrl,
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
                                formSchema = output;
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

        try {
            const sequenceNumber = await generateSequenceNumber();

            // Prepare template data
            let templateData = {
                ...formData,
                sequence_number: sequenceNumber,
                file_url: fileUrl,
                form_schema: formSchema,
                current_version: '1.0.0',
                revision_history: []
            };

            // Debug logging (these can be removed in final code, but helpful for dev)
            console.log('Form status value:', formData.status);
            console.log('Status check result:', formData.status.toLowerCase().includes('approval'));

            // Auto-set approval status based on status selection
            // Use more flexible matching to handle different casings/variations
            if (formData.status && formData.status.toLowerCase().includes('approval')) {
                templateData.approval_status = 'Pending';
                console.log('Setting approval_status to Pending due to status containing "approval"');
            } else {
                templateData.approval_status = 'Not Applicable'; // Set to Not Applicable instead of Approved
                console.log('Setting approval_status to Not Applicable for status:', formData.status);
            }

            console.log('Final templateData.approval_status:', templateData.approval_status);

            const newTemplate = await FormTemplate.create(templateData);

            logAction({
                action_type: 'CREATE',
                target_entity: 'FormTemplate',
                target_id: newTemplate.id,
                details: {
                    code: newTemplate.template_code,
                    title: newTemplate.title_english,
                    status: templateData.status,
                    auto_approval_status: templateData.approval_status
                }
            });

            onTemplateCreated();
        } catch (error) {
            setError('Failed to create template record. Please try again.');
            console.error('Error creating template:', error);
        }

        setIsProcessing(false);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Create New Template
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

                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Template Type *</Label>
                            <RadioGroup
                                value={formData.template_type}
                                onValueChange={(value) => handleInputChange('template_type', value)}
                                className="grid grid-cols-2 gap-4"
                            >
                                <div className="flex items-center space-x-3 border rounded-lg p-4 bg-white">
                                    <RadioGroupItem value="file_template" id="file_template" />
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <Label htmlFor="file_template" className="font-medium">File Template</Label>
                                            <p className="text-sm text-slate-600">Downloadable document (PDF, Word, etc.)</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 border rounded-lg p-4 bg-white">
                                    <RadioGroupItem value="interactive_form" id="interactive_form" />
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-purple-500" />
                                        <div>
                                            <Label htmlFor="interactive_form" className="font-medium">Interactive Form</Label>
                                            <p className="text-sm text-slate-600">AI-generated web form</p>
                                        </div>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="template_code">Template Code *</Label>
                                <Input
                                    id="template_code"
                                    value={formData.template_code}
                                    onChange={(e) => handleInputChange('template_code', e.target.value)}
                                    placeholder="e.g., WI.001.QC.INST"
                                    className={validationErrors.template_code ? 'border-red-500' : 'bg-white'}
                                />
                                {validationErrors.template_code && <p className="text-xs text-red-600">{validationErrors.template_code}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="activity">Activity *</Label>
                                <Select
                                    value={formData.activity || '__EMPTY_ACTIVITY__'}
                                    onValueChange={(value) => handleInputChange('activity', value === '__EMPTY_ACTIVITY__' ? '' : value)}
                                >
                                    <SelectTrigger className={validationErrors.activity ? 'border-red-500' : 'bg-white'}>
                                        <SelectValue placeholder="Select activity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__EMPTY_ACTIVITY__" className="text-muted-foreground">-- Select Activity --</SelectItem>
                                        {options.activityOptions.map(opt => (
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
                                value={formData.title_english}
                                onChange={(e) => handleInputChange('title_english', e.target.value)}
                                className={validationErrors.title_english ? 'border-red-500' : 'bg-white'}
                            />
                            {validationErrors.title_english && <p className="text-xs text-red-600">{validationErrors.title_english}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Frequency *</Label>
                                <Select
                                    value={formData.completion_frequency || '__EMPTY_FREQUENCY__'}
                                    onValueChange={(value) => handleInputChange('completion_frequency', value === '__EMPTY_FREQUENCY__' ? '' : value)}
                                >
                                    <SelectTrigger className={validationErrors.completion_frequency ? 'border-red-500' : 'bg-white'}>
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__EMPTY_FREQUENCY__" className="text-muted-foreground">-- Select Frequency --</SelectItem>
                                        {options.completionFrequencyOptions.map(opt => (
                                            <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {validationErrors.completion_frequency && <p className="text-xs text-red-600">{validationErrors.completion_frequency}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Status *</Label>
                                <Select
                                    value={formData.status || '__EMPTY_STATUS__'}
                                    onValueChange={(value) => handleInputChange('status', value === '__EMPTY_STATUS__' ? '' : value)}
                                >
                                    <SelectTrigger className={validationErrors.status ? 'border-red-500' : 'bg-white'}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__EMPTY_STATUS__" className="text-muted-foreground">-- Select Status --</SelectItem>
                                        {options.statusOptions.map(opt => (
                                            <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {validationErrors.status && <p className="text-xs text-red-600">{validationErrors.status}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                        <Label className="text-base font-semibold">Upload File</Label>
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
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <div className="text-center">
                                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-slate-900">
                                        {file ? file.name : "Click to upload or drag and drop"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        PDF, Word, Excel, CSV, or image files
                                    </p>
                                    {formData.template_type === 'interactive_form' && (
                                        <p className="text-xs text-amber-600 mt-2">
                                            Note: AI form extraction works best with PDF, CSV, PNG, JPG, JPEG files
                                        </p>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-6 p-4 bg-slate-50 rounded-lg border">
                        <h3 className="text-lg font-semibold text-slate-700">Additional Information</h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title_greek">Title (Greek)</Label>
                                    <Input
                                        id="title_greek"
                                        value={formData.title_greek}
                                        onChange={(e) => handleInputChange('title_greek', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select
                                        value={formData.category || '__EMPTY_CATEGORY__'}
                                        onValueChange={(value) => handleInputChange('category', value === '__EMPTY_CATEGORY__' ? '' : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__EMPTY_CATEGORY__" className="text-muted-foreground">-- Select Category --</SelectItem>
                                            {options.categories.map(opt => <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Template Availability</Label>
                                    <Select
                                        value={formData.template_availability || '__EMPTY_AVAILABILITY__'}
                                        onValueChange={(value) => handleInputChange('template_availability', value === '__EMPTY_AVAILABILITY__' ? '' : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select availability" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__EMPTY_AVAILABILITY__" className="text-muted-foreground">-- Not Set --</SelectItem>
                                            {options.templateAvailability.map(opt => (
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
                                    value={formData.effective_date}
                                    onChange={(e) => handleInputChange('effective_date', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-md font-semibold text-slate-700">SOP Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sop_reference_title">SOP Reference Title</Label>
                                    <Input
                                        id="sop_reference_title"
                                        value={formData.sop_reference_title}
                                        onChange={(e) => handleInputChange('sop_reference_title', e.target.value)}
                                        placeholder="Enter SOP reference"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>SOP Availability</Label>
                                    <Select
                                        value={formData.sop_availability || '__EMPTY_SOP_AVAILABILITY__'}
                                        onValueChange={(value) => handleInputChange('sop_availability', value === '__EMPTY_SOP_AVAILABILITY__' ? '' : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select SOP availability" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__EMPTY_SOP_AVAILABILITY__" className="text-muted-foreground">-- Not Set --</SelectItem>
                                            {options.sopAvailability.map(opt => (
                                                <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-md font-semibold text-slate-700">Responsibilities & Approvals</h4>
                            <div className="space-y-2">
                                <Label>Approver {formData.status === 'Need Approval' ? '*' : ''}</Label>
                                <Select
                                    value={formData.approver_id || '__EMPTY_APPROVER__'}
                                    onValueChange={(value) => handleInputChange('approver_id', value === '__EMPTY_APPROVER__' ? '' : value)}
                                >
                                    <SelectTrigger className={validationErrors.approver_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Select an approver for this template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__EMPTY_APPROVER__" className="text-muted-foreground">-- No Approver --</SelectItem>
                                        {systemUsers.length > 0 && (
                                            <>
                                                <SelectItem disabled value="_users_header" className="font-semibold text-blue-600">System Users</SelectItem>
                                                {systemUsers.map(user => <SelectItem key={`user_${user.id}`} value={user.id}>{user.full_name}</SelectItem>)}
                                            </>
                                        )}
                                        {appUsers.length > 0 && (
                                            <>
                                                <SelectItem disabled value="_app_users_header" className="font-semibold text-green-600">Application Users</SelectItem>
                                                {appUsers.map(user => <SelectItem key={`app_user_${user.id}`} value={user.id}>{user.full_name}</SelectItem>)}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                                {validationErrors.approver_id && <p className="text-xs text-red-600">{validationErrors.approver_id}</p>}
                                {formData.status === 'Need Approval' && (
                                    <p className="text-xs text-blue-600">⚠️ Approver is required when status is "Need Approval"</p>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ResponsibilityField
                                    label="Responsibility Completion"
                                    value={formData.responsibility_completion}
                                    onChange={(value) => handleInputChange('responsibility_completion', value)}
                                    systemUsers={systemUsers}
                                    appUsers={appUsers}
                                    additionalOptions={responsibilityOptions.completion}
                                />
                                <ResponsibilityField
                                    label="Responsibility Processing"
                                    value={formData.responsibility_processing}
                                    onChange={(value) => handleInputChange('responsibility_processing', value)}
                                    systemUsers={systemUsers}
                                    appUsers={appUsers}
                                    additionalOptions={responsibilityOptions.processing}
                                />
                                <ResponsibilityField
                                    label="Responsibility Internal"
                                    value={formData.responsibility_internal}
                                    onChange={(value) => handleInputChange('responsibility_internal', value)}
                                    systemUsers={systemUsers}
                                    appUsers={appUsers}
                                    additionalOptions={responsibilityOptions.internal}
                                />
                                <ResponsibilityField
                                    label="Responsibility External"
                                    value={formData.responsibility_external}
                                    onChange={(value) => handleInputChange('responsibility_external', value)}
                                    systemUsers={systemUsers}
                                    appUsers={appUsers}
                                    additionalOptions={responsibilityOptions.external}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Control Mechanism</Label>
                                <Select
                                    value={formData.control_mechanism || '__EMPTY_MECHANISM__'}
                                    onValueChange={(value) => handleInputChange('control_mechanism', value === '__EMPTY_MECHANISM__' ? '' : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select control mechanism" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__EMPTY_MECHANISM__" className="text-muted-foreground">-- Not Set --</SelectItem>
                                        {options.controlMechanismOptions.map(opt => (
                                            <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-md font-semibold text-slate-700">Custom Fields</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CustomField
                                    label={customFieldLabels['template_custom_field_1'] || 'Custom Field 1'}
                                    value={formData.template_custom_field_1}
                                    onChange={(val) => handleInputChange('template_custom_field_1', val)}
                                    options={options.customField1}
                                />
                                <CustomField
                                    label={customFieldLabels['template_custom_field_2'] || 'Custom Field 2'}
                                    value={formData.template_custom_field_2}
                                    onChange={(val) => handleInputChange('template_custom_field_2', val)}
                                    options={options.customField2}
                                />
                                <CustomField
                                    label={customFieldLabels['template_custom_field_3'] || 'Custom Field 3'}
                                    value={formData.template_custom_field_3}
                                    onChange={(val) => handleInputChange('template_custom_field_3', val)}
                                    options={options.customField3}
                                />
                                <CustomField
                                    label={customFieldLabels['template_custom_field_4'] || 'Custom Field 4'}
                                    value={formData.template_custom_field_4}
                                    onChange={(val) => handleInputChange('template_custom_field_4', val)}
                                    options={options.customField4}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-md font-semibold text-slate-700">Notes & Remarks</h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="memo">Memo</Label>
                                    <Textarea
                                        id="memo"
                                        value={formData.memo}
                                        onChange={(e) => handleInputChange('memo', e.target.value)}
                                        rows={2}
                                        placeholder="Internal memo or notes"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="remarks">Remarks</Label>
                                    <Textarea
                                        id="remarks"
                                        value={formData.remarks}
                                        onChange={(e) => handleInputChange('remarks', e.target.value)}
                                        rows={2}
                                        placeholder="Additional remarks"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t bg-white p-4 rounded-lg">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Template'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}