import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AddDailyTargetDialog({ 
  open, 
  onClose, 
  profiles, 
  itemCodes, 
  targetTypes,
  onAdd, 
  isAdding,
  calcTimes
}) {
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedTargetType, setSelectedTargetType] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [targetQty, setTargetQty] = useState('');

  const allItemsSelected = useMemo(
    () => selectedItems.length === itemCodes.length && itemCodes.length > 0,
    [selectedItems, itemCodes]
  );

  const handleSelectAll = () => {
    if (allItemsSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...itemCodes]);
    }
  };

  const handleItemToggle = (item) => {
    setSelectedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleAdd = () => {
    if (!selectedProfile) {
      toast.error('Select Operation Profile');
      return;
    }
    if (!selectedTargetType) {
      toast.error('Select Target Type');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Select at least one Item Code');
      return;
    }
    if (!targetQty || parseFloat(targetQty) <= 0) {
      toast.error('Enter a valid Target Qty');
      return;
    }

    onAdd({
      profile_id: selectedProfile,
      target_type: selectedTargetType,
      item_codes: selectedItems,
      qty: parseFloat(targetQty)
    });

    // Reset form
    setSelectedProfile('');
    setSelectedTargetType('');
    setSelectedItems([]);
    setTargetQty('');
  };

  const handleClose = () => {
    setSelectedProfile('');
    setSelectedTargetType('');
    setSelectedItems([]);
    setTargetQty('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Daily Target</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Target Type */}
          <div>
            <Label>Target Type *</Label>
            <Select value={selectedTargetType} onValueChange={setSelectedTargetType}>
              <SelectTrigger>
                <SelectValue placeholder="Select Target Type" />
              </SelectTrigger>
              <SelectContent>
                {targetTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operation Profile */}
          <div>
            <Label>Operation Profile *</Label>
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger>
                <SelectValue placeholder="Select Operation Profile" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Codes with Select All */}
          <div>
            <Label>Item Codes (Multi-Select) *</Label>
            <ScrollArea className="border rounded-lg h-48 p-3">
              <div className="space-y-2">
                {itemCodes.length > 0 && (
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Checkbox
                      id="select-all-items"
                      checked={allItemsSelected}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all-items" className="text-sm font-semibold cursor-pointer flex-1">
                      All ({selectedItems.length}/{itemCodes.length})
                    </label>
                  </div>
                )}
                {itemCodes.length === 0 ? (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>No item codes available. Add items in DATA tab first.</AlertDescription>
                  </Alert>
                ) : (
                  itemCodes.map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <Checkbox
                        id={`item-${item}`}
                        checked={selectedItems.includes(item)}
                        onCheckedChange={() => handleItemToggle(item)}
                      />
                      <label htmlFor={`item-${item}`} className="text-sm font-medium cursor-pointer flex-1">
                        {item}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-slate-500 mt-2">
              {selectedItems.length} of {itemCodes.length} selected
            </p>
          </div>

          {/* Target Qty */}
          <div>
            <Label>Target Qty (applies to all selected items) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={targetQty}
              onChange={(e) => setTargetQty(e.target.value)}
              placeholder="Enter target quantity"
            />
          </div>

          {/* Preview */}
          {selectedProfile && selectedItems.length > 0 && targetQty && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                Will create {selectedItems.length} target line(s) with qty {targetQty} each.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={isAdding}>
            {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}