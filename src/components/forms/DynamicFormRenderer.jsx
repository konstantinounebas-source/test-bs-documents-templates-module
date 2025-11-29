import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DynamicFormRenderer({ schema, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Handle form schema - check if it's the AI extracted format or a standard JSON schema
  const fields = schema?.fields || [];
  
  // If no fields found, try to extract from schema properties
  const schemaFields = schema?.properties ? Object.keys(schema.properties).map(key => ({
    name: key,
    label: schema.properties[key].title || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: schema.properties[key].type || 'text',
    required: schema.required?.includes(key) || false,
    options: schema.properties[key].enum || []
  })) : [];

  const finalFields = fields.length > 0 ? fields : schemaFields;

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    finalFields.forEach(field => {
      if (field.required && (!formData[field.name] || formData[field.name] === '')) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const renderField = (field) => {
    const { name, label, type, required, options } = field;
    const value = formData[name] || '';
    const error = errors[name];

    const fieldId = `field-${name}`;
    
    switch (type) {
      case 'select':
      case 'dropdown':
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={fieldId}>{label} {required && <span className="text-red-500">*</span>}</Label>
            <Select value={value} onValueChange={(val) => handleInputChange(name, val)}>
              <SelectTrigger id={fieldId} className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder={`Select ${label}`} />
              </SelectTrigger>
              <SelectContent>
                {options?.map((option, idx) => (
                  <SelectItem key={idx} value={typeof option === 'string' ? option : option.value || option.name}>
                    {typeof option === 'string' ? option : option.label || option.name || option.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );

      case 'textarea':
      case 'multiline':
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={fieldId}>{label} {required && <span className="text-red-500">*</span>}</Label>
            <Textarea
              id={fieldId}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
              rows={4}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );

      case 'checkbox':
      case 'boolean':
        return (
          <div key={name} className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => handleInputChange(name, checked)}
            />
            <Label htmlFor={fieldId}>{label} {required && <span className="text-red-500">*</span>}</Label>
            {error && <p className="text-red-500 text-sm ml-6">{error}</p>}
          </div>
        );

      case 'radio':
        return (
          <div key={name} className="space-y-2">
            <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
            <RadioGroup value={value} onValueChange={(val) => handleInputChange(name, val)}>
              {options?.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={typeof option === 'string' ? option : option.value || option.name} 
                    id={`${fieldId}-${idx}`}
                  />
                  <Label htmlFor={`${fieldId}-${idx}`}>
                    {typeof option === 'string' ? option : option.label || option.name || option.value}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );

      case 'number':
      case 'integer':
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={fieldId}>{label} {required && <span className="text-red-500">*</span>}</Label>
            <Input
              id={fieldId}
              type="number"
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );

      case 'email':
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={fieldId}>{label} {required && <span className="text-red-500">*</span>}</Label>
            <Input
              id={fieldId}
              type="email"
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={fieldId}>{label} {required && <span className="text-red-500">*</span>}</Label>
            <Input
              id={fieldId}
              type="date"
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );

      case 'text':
      case 'string':
      default:
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={fieldId}>{label} {required && <span className="text-red-500">*</span>}</Label>
            <Input
              id={fieldId}
              type="text"
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );
    }
  };

  if (!schema || (finalFields.length === 0)) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-slate-500">No form schema available. Please contact the administrator.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {finalFields.map(field => renderField(field))}
      
      <div className="flex justify-end pt-6 border-t">
        <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Form'
          )}
        </Button>
      </div>
    </form>
  );
}