import React, { useState, useEffect } from "react";
import { ProductCategory } from "@/entities/ProductCategory";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function CreateEditCategoryDialog({ open, onClose, onCategorySaved, category = null, categories }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    parent_category_id: '',
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        code: category.code || '',
        description: category.description || '',
        parent_category_id: category.parent_category_id || '',
        is_active: category.is_active !== undefined ? category.is_active : true
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        parent_category_id: '',
        is_active: true
      });
    }
  }, [category, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (category) {
        await ProductCategory.update(category.id, formData);
      } else {
        await ProductCategory.create(formData);
      }
      onCategorySaved();
      onClose();
    } catch (error) {
      console.error("Error saving category:", error);
    }
    setIsSaving(false);
  };

  // Filter out current category from parent options to prevent circular references
  const availableParentCategories = category 
    ? categories.filter(c => c.id !== category.id)
    : categories;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Create New Category'}</DialogTitle>
          <DialogDescription>
            {category ? 'Update category information' : 'Add a new product category'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="code">Category Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="e.g., CAT-001"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="parent_category">Parent Category (Optional)</Label>
            <Select
              value={formData.parent_category_id}
              onValueChange={(value) => setFormData({...formData, parent_category_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="No parent (top-level category)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No parent</SelectItem>
                {availableParentCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active Category</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {category ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}