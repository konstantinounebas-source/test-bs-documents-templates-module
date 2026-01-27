import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StickerItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCustodyStatus, setFilterCustodyStatus] = useState("all");

  const { data: stickerItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list('-created_date')
  });

  const { data: stops = [], isLoading: stopsLoading } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list()
  });

  const { data: stickerTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list()
  });

  const getStopName = (stopId) => {
    const stop = stops.find(s => s.id === stopId);
    return stop ? `${stop.stop_id} - ${stop.english_name}` : "-";
  };

  const getStickerTemplateName = (templateId) => {
    const template = stickerTemplates.find(t => t.id === templateId);
    return template ? template.sticker_name_category : "-";
  };

  const getStatusBadge = (status) => {
    const variants = {
      Needed: "secondary",
      Ordered: "outline",
      Received: "default",
      Installed: "default"
    };
    const colors = {
      Needed: "bg-yellow-100 text-yellow-800",
      Ordered: "bg-blue-100 text-blue-800",
      Received: "bg-green-100 text-green-800",
      Installed: "bg-gray-100 text-gray-800"
    };
    return <Badge className={colors[status]}>{status}</Badge>;
  };

  const filteredItems = stickerItems.filter(item => {
    const term = searchTerm.toLowerCase();
    const stopName = getStopName(item.stop_id).toLowerCase();
    const templateName = getStickerTemplateName(item.sticker_template_id).toLowerCase();
    
    const matchesSearch = (
      stopName.includes(term) ||
      templateName.includes(term) ||
      item.print_line_1?.toLowerCase().includes(term) ||
      item.print_line_2?.toLowerCase().includes(term) ||
      item.print_line_3?.toLowerCase().includes(term)
    );

    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesCustodyStatus = filterCustodyStatus === "all" || item.custody_status === filterCustodyStatus;

    return matchesSearch && matchesStatus && matchesCustodyStatus;
  });

  const isLoading = itemsLoading || stopsLoading || templatesLoading;

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sticker Items</span>
            <div className="text-sm font-normal text-gray-600">
              Total: {filteredItems.length} items
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by stop, template, or print lines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Needed">Needed</SelectItem>
                  <SelectItem value="Ordered">Ordered</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Installed">Installed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCustodyStatus} onValueChange={setFilterCustodyStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Custody Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Custody Statuses</SelectItem>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="With Technician">With Technician</SelectItem>
                  <SelectItem value="Installed">Installed</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stop</TableHead>
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
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No sticker items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{getStopName(item.stop_id)}</TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}