import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ProfileSetup() {
    const [position, setPosition] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
                if (currentUser.position) {
                    // User already has position, redirect to Welcome
                    navigate(createPageUrl("Welcome"), { replace: true });
                }
            } catch (e) {
                // User not logged in, redirect to login
                base44.auth.redirectToLogin(createPageUrl("ProfileSetup"));
            }
        };
        checkUser();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Find the default access profile
            let defaultProfileId = null;
            try {
                const defaultProfiles = await base44.entities.AccessProfile.filter({ is_default: true });
                if (defaultProfiles.length > 0) {
                    defaultProfileId = defaultProfiles[0].id;
                }
            } catch (profileError) {
                console.warn("Could not find a default access profile. User will have no profile assigned initially.", profileError);
            }

            const userDataToUpdate = { position };
            if (defaultProfileId) {
                userDataToUpdate.access_profile_id = defaultProfileId;
            }

            await base44.auth.updateMe(userDataToUpdate);
            // Redirect to Welcome instead of MyWorkday
            navigate(createPageUrl("Welcome"), { replace: true });
        } catch (error) {
            console.error("Failed to set up profile:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Welcome! Let's set up your profile.</CardTitle>
                        <CardDescription>
                            We need a little more information before you can get started. Please enter your job title or position.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="position">Position / Job Title</Label>
                            <Input
                                id="position"
                                placeholder="e.g., Quality Manager"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save and Continue
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}