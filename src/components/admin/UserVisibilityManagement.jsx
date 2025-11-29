import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { UserVisibilitySetting } from '@/entities/UserVisibilitySetting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function UserVisibilityManagement() {
    const [users, setUsers] = useState([]);
    const [visibilitySettings, setVisibilitySettings] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const allUsers = await User.list();
                setUsers(allUsers);

                const settings = await UserVisibilitySetting.list();
                const settingsMap = settings.reduce((acc, setting) => {
                    acc[setting.viewer_user_email] = {
                        id: setting.id,
                        visible_user_emails: new Set(setting.visible_user_emails)
                    };
                    return acc;
                }, {});
                
                // Initialize settings for users that don't have one yet
                allUsers.forEach(user => {
                    if (!settingsMap[user.email]) {
                        settingsMap[user.email] = { id: null, visible_user_emails: new Set() };
                    }
                    // A user can always see themselves
                    settingsMap[user.email].visible_user_emails.add(user.email);
                });

                setVisibilitySettings(settingsMap);
            } catch (error) {
                console.error("Failed to load visibility settings:", error);
            }
            setIsLoading(false);
        };
        loadData();
    }, []);

    const handleCheckboxChange = (viewerEmail, targetEmail, isChecked) => {
        setVisibilitySettings(prevSettings => {
            const newSettings = { ...prevSettings };
            const viewerSetting = { ...newSettings[viewerEmail] };
            const visibleEmails = new Set(viewerSetting.visible_user_emails);

            if (isChecked) {
                visibleEmails.add(targetEmail);
            } else {
                visibleEmails.delete(targetEmail);
            }
            
            viewerSetting.visible_user_emails = visibleEmails;
            newSettings[viewerEmail] = viewerSetting;
            return newSettings;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            for (const viewerEmail in visibilitySettings) {
                const setting = visibilitySettings[viewerEmail];
                const data = {
                    viewer_user_email: viewerEmail,
                    visible_user_emails: Array.from(setting.visible_user_emails)
                };

                if (setting.id) {
                    await UserVisibilitySetting.update(setting.id, data);
                } else {
                    // Check if a setting for this user has been created by another process
                    const existing = await UserVisibilitySetting.filter({ viewer_user_email: viewerEmail });
                    if (existing.length > 0) {
                        await UserVisibilitySetting.update(existing[0].id, data);
                    } else {
                        const newSetting = await UserVisibilitySetting.create(data);
                        // Update local state with new ID
                        setVisibilitySettings(prev => ({
                            ...prev,
                            [viewerEmail]: { ...prev[viewerEmail], id: newSetting.id }
                        }));
                    }
                }
            }
            toast({ title: "Success", description: "Visibility settings saved successfully." });
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save settings." });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                    Save All Changes
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(viewerUser => (
                    <Card key={viewerUser.email}>
                        <CardHeader>
                            <CardTitle>{viewerUser.full_name}</CardTitle>
                            <CardDescription>Can view the following users:</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                            {users.map(targetUser => (
                                <div key={targetUser.email} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`${viewerUser.email}-${targetUser.email}`}
                                        checked={visibilitySettings[viewerUser.email]?.visible_user_emails.has(targetUser.email)}
                                        onCheckedChange={(checked) => handleCheckboxChange(viewerUser.email, targetUser.email, checked)}
                                        disabled={viewerUser.email === targetUser.email} // User can always see themselves
                                    />
                                    <Label htmlFor={`${viewerUser.email}-${targetUser.email}`} className="font-normal">
                                        {targetUser.full_name}
                                    </Label>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}