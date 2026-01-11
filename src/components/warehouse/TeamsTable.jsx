import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import CreateEditTeamDialog from "./CreateEditTeamDialog";

export default function TeamsTable({ teams, isLoading, onTeamSaved }) {
  const [editingTeam, setEditingTeam] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleEdit = (team) => {
    setEditingTeam(team);
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την ομάδα;")) return;
    
    setDeletingId(id);
    try {
      await base44.entities.Team.delete(id);
      onTeamSaved();
    } catch (error) {
      console.error("Error deleting team:", error);
      alert("Σφάλμα κατά τη διαγραφή της ομάδας");
    }
    setDeletingId(null);
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    setEditingTeam(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Δεν βρέθηκαν ομάδες</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Ομάδα</TableHead>
              <TableHead className="font-semibold">Περιγραφή</TableHead>
              <TableHead className="font-semibold">Χρώμα</TableHead>
              <TableHead className="font-semibold">Κατάσταση</TableHead>
              <TableHead className="text-right font-semibold">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell className="text-slate-600">{team.description || '-'}</TableCell>
                <TableCell>
                  {team.color_code && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border border-slate-300"
                        style={{ backgroundColor: team.color_code }}
                      />
                      <span className="text-xs text-slate-500">{team.color_code}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={team.is_active ? "default" : "secondary"}>
                    {team.is_active ? "Ενεργή" : "Ανενεργή"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(team)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(team.id)}
                      disabled={deletingId === team.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === team.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateEditTeamDialog
        open={showDialog}
        onClose={handleDialogClose}
        onTeamSaved={onTeamSaved}
        team={editingTeam}
      />
    </>
  );
}