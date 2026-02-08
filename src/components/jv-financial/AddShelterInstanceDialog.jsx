import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AddShelterInstanceDialog({ open, onOpenChange, onAdded }) {
    const [name, setName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error('Please enter a shelter instance name');
            return;
        }

        setIsCreating(true);
        try {
            // Check if name already exists
            const existing = await base44.entities.ShelterInstance.filter({ name: name.trim() });
            if (existing.length > 0) {
                toast.error('A shelter instance with this name already exists');
                setIsCreating(false);
                return;
            }

            const newInstance = await base44.entities.ShelterInstance.create({
                name: name.trim()
            });

            toast.success('Shelter instance created successfully');
            setName('');
            onOpenChange(false);
            if (onAdded) {
                onAdded(newInstance);
            }
        } catch (error) {
            console.error('Failed to create shelter instance:', error);
            toast.error('Failed to create shelter instance');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Shelter Instance</DialogTitle>
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
                                    handleCreate();
                                }
                            }}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Enter a unique label/code for this shelter instance
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
                        {isCreating ? 'Creating...' : 'Create Instance'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}