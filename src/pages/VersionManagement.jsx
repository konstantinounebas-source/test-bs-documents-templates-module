import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import CreateEditVersionDialog from "../components/version/CreateEditVersionDialog";

export default function VersionManagement() {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.AppVersion.list('-created_date');
      setVersions(data);
    } catch (error) {
      console.error("Error loading versions:", error);
    }
    setIsLoading(false);
  };

  const handleToggleActive = async (version) => {
    try {
      if (!version.is_active) {
        // Deactivate all other versions first
        const activeVersions = versions.filter(v => v.is_active && v.id !== version.id);
        for (const v of activeVersions) {
          await base44.entities.AppVersion.update(v.id, { is_active: false });
        }
      }
      
      await base44.entities.AppVersion.update(version.id, { 
        is_active: !version.is_active 
      });
      loadVersions();
    } catch (error) {
      console.error("Error toggling version:", error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτήν την έκδοση;')) {
      try {
        await base44.entities.AppVersion.delete(id);
        loadVersions();
      } catch (error) {
        console.error("Error deleting version:", error);
      }
    }
  };

  const handleEdit = (version) => {
    setEditingVersion(version);
    setShowDialog(true);
  };

  const handleCreate = () => {
    setEditingVersion(null);
    setShowDialog(true);
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    setEditingVersion(null);
    loadVersions();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Διαχείριση Εκδόσεων</h1>
          <p className="text-slate-600 mt-1">Διαχειριστείτε τις εκδόσεις της εφαρμογής</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Νέα Έκδοση
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Εκδόσεις Εφαρμογής</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-slate-500">Φόρτωση...</p>
          ) : versions.length === 0 ? (
            <p className="text-center py-8 text-slate-500">Δεν υπάρχουν εκδόσεις</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Έκδοση</TableHead>
                  <TableHead>Ημερομηνία Έκδοσης</TableHead>
                  <TableHead>Σημειώσεις Έκδοσης</TableHead>
                  <TableHead>URL Ενημέρωσης</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                  <TableHead>Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-semibold">{version.version}</TableCell>
                    <TableCell>
                      {version.release_date 
                        ? new Date(version.release_date).toLocaleDateString('el-GR')
                        : '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {version.release_notes || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {version.update_url || 'Reload'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {version.is_active ? (
                          <Badge className="bg-green-100 text-green-700">Ενεργή</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500">Ανενεργή</Badge>
                        )}
                        {version.is_critical && (
                          <Badge className="bg-red-100 text-red-700 gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Κρίσιμη
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(version)}
                          className="h-8 w-8"
                        >
                          {version.is_active ? (
                            <XCircle className="w-4 h-4 text-slate-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(version)}
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(version.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showDialog && (
        <CreateEditVersionDialog
          version={editingVersion}
          onClose={handleDialogClose}
        />
      )}
    </div>
  );
}