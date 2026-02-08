import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EditShelterInstanceDialog({ open, onOpenChange, instance, onUpdated }) {
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (instance) {
            setName(instance.name || '');
            setIsActive(instance.active !== false);
        }
    }, [instance]);

    const handleUpdate = async () => {
        if (!name.trim()) {
            toast.error('Please enter a shelter instance name');
            return;
        }

        if (!instance?.id) return;

        setIsUpdating(true);
        try {
            // Check if name already exists (excluding current instance)
            const existing = await base44.entities.ShelterInstance.filter({ name: name.trim() });
            if (existing.length > 0 && existing[0].id !== instance.id) {
                toast.error('A shelter instance with this name already exists');
                setIsUpdating(false);
                return;
            }

            await base44.entities.ShelterInstance.update(instance.id, {
                name: name.trim(),
                active: isActive
            });

            toast.success('Shelter instance updated successfully');
            onOpenChange(false);
            if (onUpdated) {
                onUpdated();
            }
        } catch (error) {
            console.error('Failed to update shelter instance:', error);
            toast.error('Failed to update shelter instance');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Shelter Instance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Shelter Instance Name
                        </label>
                        <Input
                            placeholder="e.g., Type A - Main, SHEL-001"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleUpdate();
                                }
                            }}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="edit-active"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                        />
                        <Label htmlFor="edit-active" className="text-sm font-medium cursor-pointer">
                            Active
                        </Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpdate} disabled={isUpdating || !name.trim()}>
                        {isUpdating ? 'Updating...' : 'Update Instance'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}