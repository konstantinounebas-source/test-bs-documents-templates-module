import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, CheckCircle, Calendar, XCircle, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";

export default function DashboardPage() {
  const { data: stops = [], isLoading: stopsLoading } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list()
  });

  const { data: stickerItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list()
  });

  const { data: stickerTemplates = [] } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list()
  });

  // Critical Stops: Shelter installed but stickers not all installed
  const criticalStops = stops.filter(stop => 
    stop.shelter_installed === true && stop.all_stickers_installed === false
  );

  // Stickers To Order: Status = Needed, grouped by vendor
  const stickersToOrder = stickerItems.filter(item => item.status === "Needed");
  const stickersToOrderByVendor = stickersToOrder.reduce((acc, item) => {
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    const vendor = template?.default_vendor || "No Vendor";
    if (!acc[vendor]) acc[vendor] = [];
    acc[vendor].push(item);
    return acc;
  }, {});

  // Ordered Not Received
  const orderedNotReceived = stickerItems.filter(item => item.status === "Ordered");

  // Received Not Installed
  const receivedNotInstalled = stickerItems.filter(item => item.status === "Received");

  // Lost Stickers
  const lostStickers = stickerItems.filter(item => item.custody_status === "Lost");

  // Upcoming Installations: grouped by month
  const upcomingInstallations = stops
    .filter(stop => stop.current_planned_installation_date)
    .reduce((acc, stop) => {
      const date = new Date(stop.current_planned_installation_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!acc[monthKey]) {
        acc[monthKey] = { label: monthLabel, stops: [] };
      }
      acc[monthKey].stops.push(stop);
      return acc;
    }, {});

  const upcomingMonths = Object.values(upcomingInstallations).sort((a, b) => 
    a.label.localeCompare(b.label)
  );

  const getStopDisplay = (item) => {
    const stop = stops.find(s => s.id === item.stop_id);
    return stop?.stop_id || "-";
  };

  const getTemplateDisplay = (item) => {
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    return template?.sticker_name_category || "-";
  };

  if (stopsLoading || itemsLoading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Operational Dashboard</h1>
        <p className="text-gray-600">Real-time view of stops and sticker tracking</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Stops</p>
                <p className="text-3xl font-bold text-red-600">{criticalStops.length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">To Order</p>
                <p className="text-3xl font-bold text-orange-600">{stickersToOrder.length}</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Received</p>
                <p className="text-3xl font-bold text-blue-600">{receivedNotInstalled.length}</p>
              </div>
              <Package className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lost</p>
                <p className="text-3xl font-bold text-red-600">{lostStickers.length}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Stops */}
      <Card>
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            Critical Stops - Shelter Installed but Stickers Missing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criticalStops.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No critical stops</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stop ID</TableHead>
                    <TableHead>English Name</TableHead>
                    <TableHead>Greek Name</TableHead>
                    <TableHead>Planned Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalStops.map(stop => (
                    <TableRow key={stop.id}>
                      <TableCell className="font-medium">{stop.stop_id}</TableCell>
                      <TableCell>{stop.english_name}</TableCell>
                      <TableCell>{stop.greek_name}</TableCell>
                      <TableCell>{stop.current_planned_installation_date || "-"}</TableCell>
                      <TableCell>
                        <Link to={createPageUrl("StopsWithStickers")}>
                          <Badge className="bg-blue-600 hover:bg-blue-700 cursor-pointer">View</Badge>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stickers To Order - Grouped by Vendor */}
      <Card>
        <CardHeader className="bg-orange-50">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <ShoppingCart className="w-5 h-5" />
            Stickers To Order ({stickersToOrder.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stickersToOrder.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No stickers need ordering</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(stickersToOrderByVendor).map(([vendor, items]) => (
                <div key={vendor} className="border rounded-lg">
                  <div className="bg-gray-50 px-4 py-2 font-semibold border-b">
                    {vendor} ({items.length} items)
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stop ID</TableHead>
                        <TableHead>Sticker Template</TableHead>
                        <TableHead>Print Line 1</TableHead>
                        <TableHead>Print Line 2</TableHead>
                        <TableHead>Print Line 3</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                          <TableCell>{getTemplateDisplay(item)}</TableCell>
                          <TableCell>{item.print_line_1}</TableCell>
                          <TableCell>{item.print_line_2}</TableCell>
                          <TableCell>{item.print_line_3}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Received Not Installed */}
      <Card>
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Package className="w-5 h-5" />
            Received Not Installed ({receivedNotInstalled.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {receivedNotInstalled.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No received stickers pending installation</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stop ID</TableHead>
                    <TableHead>Sticker Template</TableHead>
                    <TableHead>Custody Status</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedNotInstalled.slice(0, 20).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                      <TableCell>{getTemplateDisplay(item)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.custody_status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{item.comments || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {receivedNotInstalled.length > 20 && (
                <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 border-t">
                  Showing 20 of {receivedNotInstalled.length} items. <Link to={createPageUrl("StickerItems")} className="text-blue-600 hover:underline">View all</Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Installations */}
        <Card>
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Calendar className="w-5 h-5" />
              Upcoming Installations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMonths.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No upcoming installations scheduled</p>
            ) : (
              <div className="space-y-3">
                {upcomingMonths.slice(0, 6).map(month => (
                  <div key={month.label} className="border rounded-lg p-3">
                    <div className="font-semibold mb-2 flex items-center justify-between">
                      <span>{month.label}</span>
                      <Badge>{month.stops.length} stops</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      {month.stops.slice(0, 5).map(stop => (
                        <div key={stop.id} className="flex items-center justify-between">
                          <span>{stop.stop_id}</span>
                          <span className="text-xs">{stop.current_planned_installation_date}</span>
                        </div>
                      ))}
                      {month.stops.length > 5 && (
                        <div className="text-xs text-blue-600">
                          +{month.stops.length - 5} more...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lost Stickers */}
        <Card>
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <XCircle className="w-5 h-5" />
              Lost Stickers ({lostStickers.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lostStickers.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-500">No lost stickers</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stop ID</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lostStickers.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                        <TableCell>{getTemplateDisplay(item)}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{item.reorder_reason || "Not specified"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.reorder_date || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ordered Not Received */}
      <Card>
        <CardHeader className="bg-yellow-50">
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <Package className="w-5 h-5" />
            Ordered Not Received ({orderedNotReceived.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orderedNotReceived.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No outstanding orders</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stop ID</TableHead>
                    <TableHead>Sticker Template</TableHead>
                    <TableHead>Total Ordered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderedNotReceived.slice(0, 20).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{getStopDisplay(item)}</TableCell>
                      <TableCell>{getTemplateDisplay(item)}</TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {item.total_ordered_quantity || 0}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {orderedNotReceived.length > 20 && (
                <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 border-t">
                  Showing 20 of {orderedNotReceived.length} items. <Link to={createPageUrl("Orders")} className="text-blue-600 hover:underline">View all orders</Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}