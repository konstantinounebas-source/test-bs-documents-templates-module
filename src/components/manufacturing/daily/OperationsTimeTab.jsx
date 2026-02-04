import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

export default function OperationsTimeTab({ batchId, department }) {
  // Fetch batch lines
  const { data: batchLines = [] } = useQuery({
    queryKey: ['Batch_Lines', batchId],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 0
  });

  // Fetch batch header for bundle info
  const { data: batchHeader } = useQuery({
    queryKey: ['Batch_Header', batchId],
    queryFn: () => base44.entities.Batch_Header.filter({ id: batchId }),
    enabled: !!batchId,
    select: (data) => data?.[0]
  });

  // Fetch standards data (time per operation)
  const { data: stdSetLines = [] } = useQuery({
    queryKey: ['StdSetLines', batchHeader?.bundle_id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: batchHeader.bundle_id }),
    enabled: !!batchHeader?.bundle_id,
    staleTime: 0
  });

  // Fetch operations for lookup
  const { data: operations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.list()
  });

  // Fetch profiles for profile names
  const { data: profileNames = [] } = useQuery({
    queryKey: ['OperationProfileName'],
    queryFn: () => base44.entities.OperationProfileName.list()
  });

  // Fetch operations data for selected batch
  const { data: opsData = [], isLoading } = useQuery({
    queryKey: ['Operations', batchId],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 0
  });

  // Calculate ops time per line
  const linesWithOpsTime = useMemo(() => {
    return batchLines.map(line => {
      const profile = profileNames.find(p => 
        opsData.find(op => op.item_code === line.item_code && op.operation_profile === p.name)
      );
      
      if (!profile) return { ...line, opsPerPiece: 0, opsTotal: 0, opsTotalHours: 0 };

      // Sum time from std_set_lines for operations in this profile
      const profileOps = profile.operations_required || [];
      let totalMinutes = 0;

      profileOps.forEach(opId => {
        const stdLine = stdSetLines.find(
          sl => sl.item_code === line.item_code && sl.operation_id === opId
        );
        if (stdLine && stdLine.time_per_unit) {
          totalMinutes += parseFloat(stdLine.time_per_unit);
        }
      });

      const qty = parseFloat(line.scheduled_qty) || 0;
      const opsTotal = totalMinutes * qty;
      const opsTotalHours = opsTotal / 60;

      return {
        ...line,
        opsPerPiece: totalMinutes,
        opsTotal,
        opsTotalHours: opsTotalHours.toFixed(2)
      };
    });
  }, [batchLines, profileNames, opsData, stdSetLines]);

  const totals = useMemo(() => {
    const totalMinutes = linesWithOpsTime.reduce((sum, line) => sum + (line.opsTotal || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(2);
    return { totalMinutes: totalMinutes.toFixed(2), totalHours };
  }, [linesWithOpsTime]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Operations - Time Per Item</h3>
      
      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold text-right">Qty</TableHead>
              <TableHead className="font-semibold">Operation Profile</TableHead>
              <TableHead className="font-semibold text-right">Ops Per-piece (min)</TableHead>
              <TableHead className="font-semibold text-right">Ops Total (min)</TableHead>
              <TableHead className="font-semibold text-right">Ops Total (hours)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linesWithOpsTime.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-12">
                  No batch lines defined
                </TableCell>
              </TableRow>
            ) : (
              <>
                {linesWithOpsTime.map(line => (
                  <TableRow key={line.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{line.item_code}</TableCell>
                    <TableCell className="text-right font-mono">{(parseFloat(line.scheduled_qty) || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {profileNames.find(p => 
                        opsData.find(op => op.item_code === line.item_code && op.operation_profile === p.name)
                      )?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">{line.opsPerPiece.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{line.opsTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-blue-600">{line.opsTotalHours}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-blue-50 font-semibold border-t-2">
                  <TableCell colSpan={4} className="text-right">Total Operations Time:</TableCell>
                  <TableCell className="text-right font-mono">{totals.totalMinutes}</TableCell>
                  <TableCell className="text-right font-mono text-blue-600">{totals.totalHours}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}