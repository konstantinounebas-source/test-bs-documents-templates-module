import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Search, FileDown } from "lucide-react";


export default function StopsWithStickersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStops, setExpandedStops] = useState({});

  const { data: stops = [], isLoading: stopsLoading } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list('-created_date')
  });

  const { data: stickerItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list()
  });

  const { data: stickerTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list()
  });

  const templatesMap = useMemo(() => {
    const map = {};
    stickerTemplates.forEach(t => map[t.id] = t);
    return map;
  }, [stickerTemplates]);

  const stickersByStop = useMemo(() => {
    const map = {};
    stickerItems.forEach(item => {
      if (!map[item.stop_id]) map[item.stop_id] = [];
      map[item.stop_id].push(item);
    });
    return map;
  }, [stickerItems]);

  const getStickerTemplateName = useMemo(() => (templateId) => {
    return templatesMap[templateId]?.sticker_name_category || "-";
  }, [templatesMap]);

  const getStatusBadge = (status) => {
    const colors = {
      Needed: "bg-yellow-100 text-yellow-800",
      Ordered: "bg-blue-100 text-blue-800",
      Received: "bg-green-100 text-green-800",
      Installed: "bg-gray-100 text-gray-800"
    };
    return <Badge className={colors[status]}>{status}</Badge>;
  };

  const toggleStop = (stopId) => {
    setExpandedStops(prev => ({
      ...prev,
      [stopId]: !prev[stopId]
    }));
  };

  const getStopStickers = useMemo(() => (stopId) => {
    return stickersByStop[stopId] || [];
  }, [stickersByStop]);

  const filteredStops = stops.filter(stop => {
    const term = searchTerm.toLowerCase();
    return (
      stop.stop_id?.toLowerCase().includes(term) ||
      stop.english_name?.toLowerCase().includes(term) ||
      stop.greek_name?.toLowerCase().includes(term)
    );
  });

  const isLoading = stopsLoading || itemsLoading || templatesLoading;

  const handleExportToExcel = async () => {
    alert('Excel export is not available');
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Stops & Their Stickers</span>
            <Button variant="outline" onClick={handleExportToExcel}>
              <FileDown className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by stop ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Stop ID</TableHead>
                  <TableHead>English Name</TableHead>
                  <TableHead>Greek Name</TableHead>
                  <TableHead>Total Stickers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No stops found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStops.map((stop) => {
                    const stopStickers = getStopStickers(stop.id);
                    const isExpanded = expandedStops[stop.id];

                    return (
                      <React.Fragment key={stop.id}>
                        <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => toggleStop(stop.id)}>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{stop.stop_id}</TableCell>
                          <TableCell>{stop.english_name}</TableCell>
                          <TableCell>{stop.greek_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{stopStickers.length}</Badge>
                          </TableCell>
                        </TableRow>

                        {isExpanded && stopStickers.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-gray-50 p-0">
                              <div className="p-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Sticker Template</TableHead>
                                      <TableHead>Print Line 1</TableHead>
                                      <TableHead>Print Line 2</TableHead>
                                      <TableHead>Print Line 3</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Custody</TableHead>
                                      <TableHead>Installed</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {stopStickers.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>{getStickerTemplateName(item.sticker_template_id)}</TableCell>
                                        <TableCell>{item.print_line_1}</TableCell>
                                        <TableCell>{item.print_line_2}</TableCell>
                                        <TableCell>{item.print_line_3}</TableCell>
                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{item.custody_status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          {item.installed ? (
                                            <span className="text-green-600">✓ {item.installed_date || ""}</span>
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}

                        {isExpanded && stopStickers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-gray-50 text-center text-gray-500 py-4">
                              No stickers for this stop yet
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Total: {filteredStops.length} stops
          </div>
        </CardContent>
      </Card>
    </div>
  );
}