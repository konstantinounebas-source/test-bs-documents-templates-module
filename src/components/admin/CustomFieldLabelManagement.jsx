
import React, { useState, useEffect, useCallback } from 'react';
import { CustomFieldLabel } from "@/entities/CustomFieldLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Tag } from "lucide-react";

const DEFAULT_LABELS = [
  { field_name: 'template_custom_field_1', label: 'Custom Field 1', description: 'Generic custom field 1' },
  { field_name: 'template_custom_field_2', label: 'Custom Field 2', description: 'Generic custom field 2' },
  { field_name: 'template_custom_field_3', label: 'Custom Field 3', description: 'Generic custom field 3' },
  { field_name: 'template_custom_field_4', label: 'Custom Field 4', description: 'Generic custom field 4' }
];

export default function CustomFieldLabelManagement({ onStatsUpdate, accessLevel }) {
  const [customFieldLabels, setCustomFieldLabels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [formData, setFormData] = useState({
    field_name: '',
    label: '',
    description: '',
    is_active: true
  });

  const loadCustomFieldLabels = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await CustomFieldLabel.list();
      
      // Ensure all 4 custom fields have labels (create defaults if missing)
      const existingFieldNames = data.map(item => item.field_name);
      const missingDefaults = DEFAULT_LABELS.filter(
        defaultLabel => !existingFieldNames.includes(defaultLabel.field_name)
      );
      
      // Create missing default labels
      if (missingDefaults.length > 0 && accessLevel === 'full_access') {
          for (const missingLabel of missingDefaults) {
            await CustomFieldLabel.create(missingLabel);
          }
      }
      
      // Reload after creating defaults
      const updatedData = await CustomFieldLabel.list();
      setCustomFieldLabels(updatedData);
    } catch (error) {
      console.error("Error loading custom field labels:", error);
    }
    setIsLoading(false);
  }, [accessLevel]); // Dependency for useCallback

  useEffect(() => {
    loadCustomFieldLabels();
  }, [loadCustomFieldLabels]); // Dependency for useEffect

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLabel) {
        await CustomFieldLabel.update(editingLabel.id, formData);
      } else {
        await CustomFieldLabel.create(formData);
      }
      setShowDialog(false);
      setEditingLabel(null);
      setFormData({ field_name: '', label: '', description: '', is_active: true });
      loadCustomFieldLabels();
      if (onStatsUpdate) onStatsUpdate();
    } catch (error) {
      console.error("Error saving custom field label:", error);
    }
  };

  const handleEdit = (label) => {
    setEditingLabel(label);
    setFormData({
      field_name: label.field_name,
      label: label.label,
      description: label.description || '',
      is_active: label.is_active !== false
    });
    setShowDialog(true);
  };

  const getFieldDisplayName = (fieldName) => {
    if (!fieldName || typeof fieldName !== 'string') {
      return 'Unknown Field';
    }
    const fieldNumber = fieldName.replace('template_custom_field_', '');
    return `Custom Field ${fieldNumber}`;
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Custom Field Labels</h3>
            <p className="text-sm text-slate-600">Define user-friendly names for custom fields</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Field</TableHead>
                  <TableHead>Custom Label</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  {accessLevel === 'full_access' && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : (
                  customFieldLabels.map((label) => (
                    <TableRow key={label.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-slate-400" />
                          {getFieldDisplayName(label.field_name)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-blue-700">
                        {label.label}
                      </TableCell>
                      <TableCell>{label.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={label.is_active ? "default" : "secondary"}>
                          {label.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      {accessLevel === 'full_access' && (
                        <TableCell className="text-right">
                            <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(label)}
                            >
                            <Edit className="w-4 h-4" />
                            </Button>
                        </TableCell>
                       )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLabel ? 'Edit Custom Field Label' : 'Add Custom Field Label'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field_name">Field *</Label>
              <select
                id="field_name"
                value={formData.field_name}
                onChange={(e) => setFormData(prev => ({ ...prev, field_name: e.target.value }))}
                required
                disabled={!!editingLabel}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">Select field</option>
                {DEFAULT_LABELS.map(field => (
                  <option key={field.field_name} value={field.field_name}>
                    {getFieldDisplayName(field.field_name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Custom Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Project Type, Department, Priority Level"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this custom field represents"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingLabel ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
