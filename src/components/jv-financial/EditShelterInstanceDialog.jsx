import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export default function EditShelterInstanceDialog({ open, onOpenChange, instance, onUpdated }) {
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleDelete = async () => {
        if (!instance?.id) return;

        setIsDeleting(true);
        try {
            // Delete associated financial data first
            const financialData = await base44.entities.ShelterFinancialData.filter({
                shelter_instance_id: instance.id
            });
            for (const data of financialData) {
                await base44.entities.ShelterFinancialData.delete(data.id);
            }

            // Delete associated results
            const results = await base44.entities.ShelterFinancialResults.filter({
                shelter_instance_id: instance.id
            });
            for (const result of results) {
                await base44.entities.ShelterFinancialResults.delete(result.id);
            }

            // Delete the instance
            await base44.entities.ShelterInstance.delete(instance.id);

            toast.success('Shelter instance deleted successfully');
            setShowDeleteDialog(false);
            onOpenChange(false);
            if (onUpdated) {
                onUpdated();
            }
        } catch (error) {
            console.error('Failed to delete shelter instance:', error);
            toast.error('Failed to delete shelter instance');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
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
                    <DialogFooter className="flex justify-between">
                        <Button 
                            variant="destructive" 
                            onClick={() => setShowDeleteDialog(true)} 
                            disabled={isUpdating}
                            className="mr-auto"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdate} disabled={isUpdating || !name.trim()}>
                                {isUpdating ? 'Updating...' : 'Update Instance'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Shelter Instance?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{instance?.name}" and all associated financial data. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}