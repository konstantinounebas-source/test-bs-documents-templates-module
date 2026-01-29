import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function CreateEditVersionDialog({ version, onClose, latestVersion }) {
  const [formData, setFormData] = useState({
    version: '',
    release_date: '',
    release_notes: '',
    update_url: '',
    is_active: false,
    is_critical: false
  });

  const incrementVersion = (currentVersion) => {
    const parts = currentVersion.split('.');
    if (parts.length === 3) {
      const [major, minor, patch] = parts.map(Number);
      return `${major}.${minor}.${patch + 1}`;
    }
    return currentVersion;
  };

  useEffect(() => {
    if (version) {
      setFormData({
        version: version.version || '',
        release_date: version.release_date ? version.release_date.split('T')[0] : '',
        release_notes: version.release_notes || '',
        update_url: version.update_url || '',
        is_active: version.is_active || false,
        is_critical: version.is_critical || false
      });
    } else if (latestVersion) {
      // Auto-increment version for new version
      const nextVersion = incrementVersion(latestVersion.version);
      setFormData({
        version: nextVersion,
        release_date: new Date().toISOString().split('T')[0],
        release_notes: '',
        update_url: '',
        is_active: false,
        is_critical: false
      });
    }
  }, [version, latestVersion]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        release_date: formData.release_date ? new Date(formData.release_date).toISOString() : null
      };

      if (version) {
        await base44.entities.AppVersion.update(version.id, data);
      } else {
        await base44.entities.AppVersion.create(data);
      }
      
      onClose();
    } catch (error) {
      console.error("Error saving version:", error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {version ? 'Επεξεργασία Έκδοσης' : 'Νέα Έκδοση'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Αριθμός Έκδοσης *</Label>
            <Input
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="π.χ. 1.0.2"
              required
            />
          </div>

          <div>
            <Label>Ημερομηνία Έκδοσης</Label>
            <Input
              type="date"
              value={formData.release_date}
              onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Σημειώσεις Έκδοσης</Label>
            <Textarea
              value={formData.release_notes}
              onChange={(e) => setFormData({ ...formData, release_notes: e.target.value })}
              placeholder="Περιγράψτε τις αλλαγές σε αυτήν την έκδοση..."
              rows={5}
            />
          </div>

          <div>
            <Label>URL Ενημέρωσης</Label>
            <Input
              value={formData.update_url}
              onChange={(e) => setFormData({ ...formData, update_url: e.target.value })}
              placeholder="https://... (προαιρετικό - αν είναι κενό, θα κάνει reload)"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Ενεργή Έκδοση</Label>
              <p className="text-xs text-slate-500">Αυτή είναι η τρέχουσα έκδοση της εφαρμογής</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Κρίσιμη Ενημέρωση</Label>
              <p className="text-xs text-slate-500">Οι χρήστες δεν μπορούν να αποκρύψουν το μήνυμα</p>
            </div>
            <Switch
              checked={formData.is_critical}
              onCheckedChange={(checked) => setFormData({ ...formData, is_critical: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Ακύρωση
            </Button>
            <Button type="submit">
              {version ? 'Ενημέρωση' : 'Δημιουργία'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}