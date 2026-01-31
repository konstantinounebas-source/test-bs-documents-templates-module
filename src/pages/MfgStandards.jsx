import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Clock } from "lucide-react";

export default function MfgStandardsPage() {
  const { data: standardsSets = [] } = useQuery({
    queryKey: ['Std_Set'],
    queryFn: () => base44.entities.Std_Set.list('-created_date')
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Standards Management
              </CardTitle>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Version
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standardsSets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No standards sets found</TableCell>
                  </TableRow>
                ) : (
                  standardsSets.map(set => (
                    <TableRow key={set.id}>
                      <TableCell className="font-medium">{set.department}</TableCell>
                      <TableCell>{set.version_no}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          set.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          set.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {set.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {set.activated_at ? new Date(set.activated_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(set.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">View Details</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}