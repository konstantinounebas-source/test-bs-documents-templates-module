
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OfficialOrderDocument } from "@/entities/OfficialOrderDocument";
import { OrderTypeOption } from "@/entities/OrderTypeOption";
import { ClientOption } from "@/entities/ClientOption";
import { UploadFile } from "@/integrations/Core";
import { Upload, Loader2, FileText } from "lucide-react";

export default function CreateEditOfficialOrderDialog({ open, onClose, item, onItemSaved }) {
  const [formData, setFormData] = useState({});
  const [pdfFile, setPdfFile] = useState(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  
  // Dropdown options
  const [orderTypeOptions, setOrderTypeOptions] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      loadDropdownOptions();
      const initialData = {
        main_order_reference: item?.main_order_reference || '',
        title: item?.title || '',
        description: item?.description || '',
        order_date: item?.order_date ? item.order_date.split('T')[0] : '',
        order_type: item?.order_type || '',
        implementation_schedule: item?.implementation_schedule ? item.implementation_schedule.split('T')[0] : '',
        client_name: item?.client_name || '',
        comments: item?.comments || '',
        is_active: item?.is_active !== undefined ? item.is_active : true,
      };
      setFormData(initialData);
      setExistingPdfUrl(item?.pdf_url || '');
      setPdfFile(null);
      setError('');
      setValidationErrors({});
    }
  }, [open, item]);

  const loadDropdownOptions = async () => {
    try {
      const [orderTypes, clients] = await Promise.all([
        OrderTypeOption.list(),
        ClientOption.list()
      ]);
      
      setOrderTypeOptions(orderTypes.filter(opt => opt.is_active));
      setClientOptions(clients.filter(opt => opt.is_active));
    } catch (error) {
      console.error("Error loading dropdown options:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError('');
    } else if (file) {
      setError('Please select a valid PDF file.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        setError('');
      } else {
        setError('Please drop a valid PDF file.');
      }
    }
  };

  const handleDragActivity = (e, isActive) => {
    e.preventDefault();
    setDragActive(isActive);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.main_order_reference?.trim()) {
      errors.main_order_reference = "Order reference is required.";
    }
    if (!formData.title?.trim()) {
      errors.title = "Title is required.";
    }
    if (!formData.order_date) {
      errors.order_date = "Order date is required.";
    }
    if (!formData.order_type) {
      errors.order_type = "Order type is required.";
    }
    if (!formData.implementation_schedule) {
      errors.implementation_schedule = "Implementation schedule is required.";
    }
    if (!formData.client_name) {
      errors.client_name = "Client is required.";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsProcessing(true);
    setError('');

    try {
      let pdfUrl = existingPdfUrl;
      if (pdfFile) {
        const uploadResult = await UploadFile({ file: pdfFile });
        pdfUrl = uploadResult.file_url;
      }

      const dataToSave = { ...formData, pdf_url: pdfUrl };

      if (item) {
        await OfficialOrderDocument.update(item.id, dataToSave);
      } else {
        await OfficialOrderDocument.create(dataToSave);
      }
      onItemSaved();
    } catch (err) {
      setError(`Failed to save: ${err.message}`);
      console.error(err);
    }
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'New'} Official Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="main_order_reference">Order Reference *</Label>
              <Input id="main_order_reference" value={formData.main_order_reference} onChange={e => handleInputChange('main_order_reference', e.target.value)} className={validationErrors.main_order_reference ? 'border-red-500' : ''} />
              {validationErrors.main_order_reference && <p className="text-xs text-red-600">{validationErrors.main_order_reference}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={formData.title} onChange={e => handleInputChange('title', e.target.value)} className={validationErrors.title ? 'border-red-500' : ''} />
              {validationErrors.title && <p className="text-xs text-red-600">{validationErrors.title}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order_date">Order Date *</Label>
              <Input id="order_date" type="date" value={formData.order_date} onChange={e => handleInputChange('order_date', e.target.value)} className={validationErrors.order_date ? 'border-red-500' : ''} />
              {validationErrors.order_date && <p className="text-xs text-red-600">{validationErrors.order_date}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order_type">Order Type *</Label>
              <Select value={formData.order_type} onValueChange={value => handleInputChange('order_type', value)}>
                <SelectTrigger className={validationErrors.order_type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select order type..." />
                </SelectTrigger>
                <SelectContent>
                  {orderTypeOptions.map(option => (
                    <SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.order_type && <p className="text-xs text-red-600">{validationErrors.order_type}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="implementation_schedule">Implementation Schedule *</Label>
              <Input id="implementation_schedule" type="date" value={formData.implementation_schedule} onChange={e => handleInputChange('implementation_schedule', e.target.value)} className={validationErrors.implementation_schedule ? 'border-red-500' : ''} />
              {validationErrors.implementation_schedule && <p className="text-xs text-red-600">{validationErrors.implementation_schedule}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_name">Client *</Label>
              <Select value={formData.client_name} onValueChange={value => handleInputChange('client_name', value)}>
                <SelectTrigger className={validationErrors.client_name ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map(option => (
                    <SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.client_name && <p className="text-xs text-red-600">{validationErrors.client_name}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={e => handleInputChange('description', e.target.value)} rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label>PDF File</Label>
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            <div
              onDrop={handleDrop}
              onDragOver={(e) => handleDragActivity(e, true)}
              onDragLeave={(e) => handleDragActivity(e, false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-medium text-slate-700">
                {pdfFile ? pdfFile.name : 'Drop PDF here or click to upload'}
              </p>
              <p className="text-xs text-slate-500">Drag & drop or select a file</p>
            </div>
            {existingPdfUrl && !pdfFile && (
              <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded-md flex items-center gap-2 mt-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Existing file: <a href={existingPdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></span>
              </div>
            )}
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="comments">Comments</Label>
            <Textarea id="comments" value={formData.comments} onChange={e => handleInputChange('comments', e.target.value)} rows={3} />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch id="is_active" checked={formData.is_active} onCheckedChange={checked => handleInputChange('is_active', checked)} />
            <Label htmlFor="is_active">Active Order</Label>
          </div>

          <DialogFooter className="pt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
            <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
