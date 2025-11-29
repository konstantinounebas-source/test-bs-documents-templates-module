import React, { useState, useEffect, useCallback } from 'react';
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import TimeSelect from "@/components/common/TimeSelect";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from 'lucide-react';

export default function DisplayPreferencesManagement({ user }) {
    const [preferences, setPreferences] = useState({
        start: '08:00',
        end: '18:00'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const loadPreferences = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setPreferences({
            start: user.preferred_display_start_time || '08:00',
            end: user.preferred_display_end_time || '18:00',
        });
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const currentUser = await User.me();
            const canUpdate = currentUser.role === 'admin' || currentUser.email === user.email;

            if (!canUpdate) {
                toast({
                    variant: "destructive",
                    title: "Permission Denied",
                    description: "You can only change your own display preferences.",
                });
                setIsSaving(false);
                return;
            }

            const dataToUpdate = {
                preferred_display_start_time: preferences.start,
                preferred_display_end_time: preferences.end
            };

            await User.update(user.id, dataToUpdate);
            
            toast({
                title: "Preferences Saved",
                description: `Display preferences for ${user.full_name} have been updated.`,
            });
        } catch (error) {
            console.error("Failed to save preferences:", error);
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: "Could not save preferences. Please try again.",
            });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-24"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                    <Label htmlFor="start-time">Default Start Time</Label>
                    <TimeSelect
                        value={preferences.start}
                        onChange={(value) => setPreferences(prev => ({ ...prev, start: value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="end-time">Default End Time</Label>
                    <TimeSelect
                        value={preferences.end}
                        onChange={(value) => setPreferences(prev => ({ ...prev, end: value }))}
                    />
                </div>
            </div>
             <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Preferences
                </Button>
            </div>
        </div>
    );
}