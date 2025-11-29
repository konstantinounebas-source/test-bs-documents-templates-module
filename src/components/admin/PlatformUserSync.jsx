
import React, { useState } from 'react';
import { User } from "@/entities/User";
import { AppUser } from "@/entities/AppUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Users, RefreshCw, CheckCircle } from "lucide-react";

export default function PlatformUserSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const syncPlatformUsers = async () => {
    setIsLoading(true);
    setError('');
    setResults(null);

    try {
      const [platformUsers, existingAppUsers] = await Promise.all([
        User.list(),
        AppUser.list()
      ]);

      // Create a map of existing app users by email for fast lookup
      const existingAppUserMap = {};
      existingAppUsers.forEach(appUser => {
        if (appUser.email) {
          existingAppUserMap[appUser.email.toLowerCase()] = appUser;
        }
      });

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const platformUser of platformUsers) {
        if (!platformUser.email) {
          skipped++;
          continue;
        }

        const email = platformUser.email.toLowerCase();
        const existingAppUser = existingAppUserMap[email];

        if (existingAppUser) {
          // Update existing app user if name is different
          if (existingAppUser.full_name !== platformUser.full_name) {
            await AppUser.update(existingAppUser.id, {
              full_name: platformUser.full_name,
              position: platformUser.position || existingAppUser.position
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Create new app user
          await AppUser.create({
            full_name: platformUser.full_name,
            email: platformUser.email,
            position: platformUser.position || 'Platform User',
            is_active: true
          });
          created++;
        }
      }

      setResults({ created, updated, skipped, total: platformUsers.length });

    } catch (err) {
      console.error("Failed to sync platform users:", err);
      setError("Failed to synchronize users. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Platform User Synchronization
        </CardTitle>
        <CardDescription>
          Synchronize Platform Users with Application Users to ensure proper name display in responsibility fields.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Synchronization Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Synchronization Complete</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <div>✅ Created: {results.created} new application users</div>
                <div>🔄 Updated: {results.updated} existing users</div>
                <div>⏭️ Skipped: {results.skipped} users (no changes needed)</div>
                <div><strong>Total processed: {results.total} platform users</strong></div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            This will create Application User records for all Platform Users, ensuring that:
          </p>
          <ul className="text-sm text-slate-600 ml-4 space-y-1">
            <li>• Names display properly in responsibility fields instead of IDs</li>
            <li>• All users are available for assignment without exposing sensitive data</li>
            <li>• Existing Application Users with matching emails will be updated</li>
          </ul>
          
          <Button 
            onClick={syncPlatformUsers}
            disabled={isLoading}
            className="w-fit"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Synchronizing...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Sync Platform Users
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
