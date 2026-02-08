import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

export default function AddShelterInstanceDialog({ open, onOpenChange, onAdded }) {
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [cloneFromId, setCloneFromId] = useState('');
    const [shelterInstances, setShelterInstances] = useState([]);

    useEffect(() => {
        if (open) {
            loadShelterInstances();
            setName('');
            setIsActive(true);
            setCloneFromId('');
        }
    }, [open]);

    const loadShelterInstances = async () => {
        try {
            const instances = await base44.entities.ShelterInstance.list();
            setShelterInstances(instances);
        } catch (error) {
            console.error('Failed to load shelter instances:', error);
        }
    };

    const handleCloneSelect = async (instanceId) => {
        setCloneFromId(instanceId);
        if (!instanceId) return;

        try {
            const instance = shelterInstances.find(i => i.id === instanceId);
            if (instance) {
                setName(instance.name + ' (Copy)');
            }
        } catch (error) {
            console.error('Failed to load instance for cloning:', error);
        }
    };

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

            let instanceData = {
                name: name.trim(),
                active: isActive
            };

            // If cloning, get the source instance data
            if (cloneFromId) {
                const sourceInstance = shelterInstances.find(i => i.id === cloneFromId);
                if (sourceInstance) {
                    instanceData.shelter_type_id = sourceInstance.shelter_type_id;
                }
            }

            const newInstance = await base44.entities.ShelterInstance.create(instanceData);

            // If cloning, also copy financial data
            if (cloneFromId) {
                try {
                    const sourceFinancialData = await base44.entities.ShelterFinancialData.filter({
                        shelter_instance_id: cloneFromId
                    });

                    if (sourceFinancialData.length > 0) {
                        const dataToClone = { ...sourceFinancialData[0] };
                        delete dataToClone.id;
                        delete dataToClone.created_date;
                        delete dataToClone.updated_date;
                        delete dataToClone.created_by;
                        dataToClone.shelter_instance_id = newInstance.id;
                        
                        await base44.entities.ShelterFinancialData.create(dataToClone);
                    }
                } catch (error) {
                    console.error('Failed to clone financial data:', error);
                }
            }

            toast.success('Shelter instance created successfully');
            setName('');
            setIsActive(true);
            setCloneFromId('');
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
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Copy className="w-4 h-4" />
                            Clone from Existing (Optional)
                        </label>
                        <Select value={cloneFromId} onValueChange={handleCloneSelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select instance to clone" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value={null}>None - Create New</SelectItem>
                                {shelterInstances.map(instance => (
                                    <SelectItem key={instance.id} value={instance.id}>
                                        {instance.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 mt-1">
                            Clone allocation and financial data from an existing instance
                        </p>
                    </div>
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
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="active"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                        />
                        <Label htmlFor="active" className="text-sm font-medium cursor-pointer">
                            Active
                        </Label>
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