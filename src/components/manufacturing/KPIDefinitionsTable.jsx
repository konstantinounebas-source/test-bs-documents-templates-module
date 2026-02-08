import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function KPIDefinitionsTable() {
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: kpiDefinitions = [], isLoading } = useQuery({
    queryKey: ['MetricDefinition'],
    queryFn: async () => {
      const data = await base44.entities.MetricDefinition.list();
      return data.filter(item => item.metric_code && item.type === 'KPI');
    }
  });

  const filteredKPIs = useMemo(() => {
    return kpiDefinitions.filter(kpi => {
      const searchLower = searchTerm.toLowerCase();
      return (
        kpi.metric_code?.toLowerCase().includes(searchLower) ||
        kpi.name?.toLowerCase().includes(searchLower) ||
        kpi.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [kpiDefinitions, searchTerm]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search KPIs by code or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="font-semibold">KPI Code</TableHead>
              <TableHead className="font-semibold">KPI Name</TableHead>
              <TableHead className="font-semibold">Applies To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKPIs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                  {searchTerm ? 'No KPIs found matching your search' : 'No KPIs defined'}
                </TableCell>
              </TableRow>
            ) : (
              filteredKPIs.map((kpi) => (
                <React.Fragment key={kpi.id}>
                  <TableRow 
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === kpi.id ? null : kpi.id)}
                  >
                    <TableCell className="w-8 text-center">
                      {expandedId === kpi.id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-blue-700">{kpi.metric_code}</TableCell>
                    <TableCell className="font-semibold">{kpi.name}</TableCell>
                    <TableCell className="text-sm text-slate-600">{kpi.applies_to || '-'}</TableCell>
                  </TableRow>

                  {expandedId === kpi.id && (
                    <TableRow className="bg-slate-50 border-t">
                      <TableCell colSpan={4} className="p-4">
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-600 uppercase">Description</p>
                            <p className="text-sm text-slate-800 mt-1">{kpi.description || '-'}</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}