import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, AlertTriangle, PackageCheck, FileDown } from "lucide-react";
import ExcelJS from 'exceljs';
import ExportReceiptTemplateDialog from "@/components/stickers/ExportReceiptTemplateDialog";
import ImportReceiptFromFileDialog from "@/components/stickers/ImportReceiptFromFileDialog";
import { Loader2 } from "lucide-react";

export default function ReceiptsPage() {
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [orderFilter, setOrderFilter] = useState("all");
  const [receiptData, setReceiptData] = useState({
    received_date: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stickerTypeFilter, setStickerTypeFilter] = useState("all");
  const [shelterTypeFilter, setShelterTypeFilter] = useState("all");
  const [criticalFilter, setCriticalFilter] = useState("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-order_date')
  });

  const { data: orderLines = [] } = useQuery({
    queryKey: ['orderLines'],
    queryFn: () => base44.entities.OrderLine.list()
  });

  const { data: stickerItems = [] } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list()
  });

  const { data: stops = [] } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list()
  });

  const { data: stickerTemplates = [] } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list()
  });

  const { data: shelterTypes = [] } = useQuery({
    queryKey: ['shelterTypes'],
    queryFn: () => base44.entities.ShelterType.list()
  });

  const isCriticalItem = (stopId, itemId) => {
    const stop = stops.find(s => s.id === stopId);
    const item = stickerItems.find(i => i.id === itemId);
    
    if (!stop || !item) return false;
    if (stop?.all_stickers_installed === true) return false;
    
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    
    // For Ordered stickers, check if should have been received by now
    if (item?.status === "Ordered") {
      const daysBeforeInstall = template?.days_before_installation_to_receive || 0;
      
      if (stop?.current_planned_installation_date) {
        const receiveByDate = new Date(stop.current_planned_installation_date);
        receiveByDate.setDate(receiveByDate.getDate() - daysBeforeInstall);
        return new Date() > receiveByDate;
      }
    }
    
    return false;
  };

  const getOrderStats = (orderId) => {
    const lines = orderLines.filter(l => l.order_id === orderId);
    let criticalCount = 0;

    lines.forEach(line => {
      const item = stickerItems.find(i => i.id === line.sticker_item_id);
      if (item) {
        if (isCriticalItem(item.stop_id, item.id)) {
          criticalCount++;
        }
      }
    });

    return {
      itemCount: lines.length,
      criticalItems: criticalCount
    };
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleOpenReceiptDialog = (orderId) => {
    setSelectedOrderForReceipt(orderId);
    const lines = orderLines.filter(l => l.order_id === orderId);
    const initialSelection = {};
    lines.forEach(line => {
      const item = stickerItems.find(i => i.id === line.sticker_item_id);
      // Only select items that are still "Ordered" (not received yet)
      if (item?.status === "Ordered") {
        initialSelection[line.sticker_item_id] = true;
      }
    });
    setSelectedItems(initialSelection);
    setReceiptDialogOpen(true);
  };

  const handleSubmitReceipt = async () => {
    if (!selectedOrderForReceipt) return;

    const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);

    setLoading(true);

    try {
      const user = await base44.auth.me();
      
      // Only create receipt if there are items to receive
      if (selectedItemIds.length > 0) {
        // Create receipt
        const receipt = await base44.entities.Receipt.create({
          order_id: selectedOrderForReceipt,
          received_date: receiptData.received_date,
          received_by: user.email,
          notes: receiptData.notes
        });

        // Create receipt lines and update items
        for (const itemId of selectedItemIds) {
          const line = orderLines.find(l => l.order_id === selectedOrderForReceipt && l.sticker_item_id === itemId);
          if (line) {
            await base44.entities.ReceiptLine.create({
              receipt_id: receipt.id,
              sticker_item_id: itemId,
              received_quantity: line.ordered_quantity
            });

            await base44.entities.StickerItem.update(itemId, {
              status: "Received"
            });

            await base44.entities.StickerMovementLog.create({
              sticker_item_id: itemId,
              action_type: "Received",
              old_status: "Ordered",
              new_status: "Received",
              notes: `Receipt #${receipt.id.slice(0, 8)}`,
              user_email: user.email
            });
          }
        }
      }

      // Refetch updated sticker items to check actual statuses
      const updatedStickerItems = await base44.entities.StickerItem.list();
      
      // Check if order is fully received by checking if all items have status "Received"
      const allOrderLines = orderLines.filter(l => l.order_id === selectedOrderForReceipt);
      const allReceived = allOrderLines.every(line => {
        const item = updatedStickerItems.find(i => i.id === line.sticker_item_id);
        return item?.status === "Received";
      });
      
      if (allReceived) {
        await base44.entities.Order.update(selectedOrderForReceipt, { status: "Closed" });
        alert("Order closed successfully - all items received!");
      } else {
        await base44.entities.Order.update(selectedOrderForReceipt, { status: "Partial" });
        if (selectedItemIds.length > 0) {
          alert("Receipt created successfully!");
        }
      }

      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['stickerItems']);
      queryClient.invalidateQueries(['orderLines']);
      
      // Reset
      setReceiptDialogOpen(false);
      setSelectedOrderForReceipt(null);
      setSelectedItems({});
      setReceiptData({
        received_date: new Date().toISOString().split('T')[0],
        notes: ""
      });

    } catch (error) {
      console.error("Error creating receipt:", error);
      alert("Error creating receipt");
    }

    setLoading(false);
  };

  const handleImportItems = async (itemsToImport) => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      // Find the order_id from the first item
      const firstItemId = itemsToImport[0]?.stickerId;
      const orderLine = orderLines.find(ol => ol.sticker_item_id === firstItemId);
      const orderId = orderLine?.order_id || null;
      
      // Create receipt
      const receipt = await base44.entities.Receipt.create({
        order_id: orderId,
        received_date: new Date().toISOString().split('T')[0],
        received_by: user.email,
        notes: "Imported from file"
      });

      // Create receipt lines and update items
      for (const item of itemsToImport) {
        await base44.entities.ReceiptLine.create({
          receipt_id: receipt.id,
          sticker_item_id: item.stickerId,
          received_quantity: item.quantity
        });

        await base44.entities.StickerItem.update(item.stickerId, {
          status: "Received"
        });

        await base44.entities.StickerMovementLog.create({
          sticker_item_id: item.stickerId,
          action_type: "Received",
          old_status: "Ordered",
          new_status: "Received",
          notes: `Receipt #${receipt.id.slice(0, 8)} - Imported`,
          user_email: user.email
        });
      }

      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['stickerItems']);
      queryClient.invalidateQueries(['orderLines']);

      alert("Receipt created successfully from imported data!");
    } catch (error) {
      console.error("Error creating receipt from import:", error);
      alert("Error creating receipt");
    }
    setLoading(false);
  };

  const openOrders = orders.filter(o => o.status === "Open" || o.status === "Partial");

  // Filter orders based on selected order number
  const filteredOrders = orderFilter === "all" 
    ? openOrders 
    : openOrders.filter(o => o.id === orderFilter);

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  // Get all ordered items (pending receipt)
  const orderedItems = stickerItems.filter(item => item.status === "Ordered");

  // Get unique sticker types and shelter types for filters
  const stickerTypes = Array.from(new Set(
    orderedItems.map(item => {
      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
      return template?.sticker_name_category;
    }).filter(Boolean)
  )).sort();

  const activeShelterTypes = shelterTypes.filter(st => st.active).sort((a, b) => 
    (a.shelter_type_id || "").localeCompare(b.shelter_type_id || "")
  );

  // Filter ordered items
  const handleExportOrderedItems = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pending Items');

    worksheet.columns = [
      { header: 'Stop ID', key: 'stop_id', width: 15 },
      { header: 'Greek Name', key: 'greek_name', width: 30 },
      { header: 'English Name', key: 'english_name', width: 30 },
      { header: 'Sticker Type', key: 'sticker_type', width: 25 },
      { header: 'Approved Shelter Type', key: 'shelter_type', width: 30 },
      { header: 'Planned Date', key: 'planned_date', width: 15 },
      { header: 'Order ID', key: 'order_id', width: 20 },
      { header: 'Critical', key: 'critical', width: 10 }
    ];

    filteredOrderedItems.forEach(item => {
      const stop = stops.find(s => s.id === item.stop_id);
      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
      const shelterType = shelterTypes.find(st => st.id === stop?.shelter_type_approved_id);
      const critical = isCriticalItem(item.stop_id, item.id);
      const orderLine = orderLines.find(ol => ol.sticker_item_id === item.id);
      const order = orders.find(o => o.id === orderLine?.order_id);

      worksheet.addRow({
        stop_id: stop?.stop_id || '-',
        greek_name: stop?.greek_name || '-',
        english_name: stop?.english_name || '-',
        sticker_type: template?.sticker_name_category || '-',
        shelter_type: shelterType ? `${shelterType.shelter_type_id} - ${shelterType.description}` : '-',
        planned_date: stop?.current_planned_installation_date || '-',
        order_id: order ? `#${order.id.slice(0, 8)}` : '-',
        critical: critical ? 'Yes' : 'No'
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pending_sticker_items_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredOrderedItems = orderedItems.filter(item => {
    const stop = stops.find(s => s.id === item.stop_id);
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    const critical = isCriticalItem(item.stop_id, item.id);

    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      stop?.stop_id?.toLowerCase().includes(searchLower) ||
      stop?.greek_name?.toLowerCase().includes(searchLower) ||
      stop?.english_name?.toLowerCase().includes(searchLower);

    // Sticker type filter
    const matchesStickerType = stickerTypeFilter === "all" || 
      template?.sticker_name_category === stickerTypeFilter;

    // Shelter type filter
    const matchesShelterType = shelterTypeFilter === "all" || 
      stop?.shelter_type_approved_id === shelterTypeFilter;

    // Critical filter
    const matchesCritical = criticalFilter === "all" || 
      (criticalFilter === "critical" && critical) ||
      (criticalFilter === "non-critical" && !critical);

    return matchesSearch && matchesStickerType && matchesShelterType && matchesCritical;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Receive Stickers</h1>
          <p className="text-gray-600">Receive ordered stickers and update inventory</p>
        </div>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Open Orders</CardTitle>
            <div className="w-64">
              <Select value={orderFilter} onValueChange={setOrderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Open Orders</SelectItem>
                  {openOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      Order #{order.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No open orders to receive</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Critical Items</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const stats = getOrderStats(order.id);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id.slice(0, 8)}</TableCell>
                        <TableCell>{order.vendor || "-"}</TableCell>
                        <TableCell>{order.order_date}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.status}</Badge>
                        </TableCell>
                        <TableCell>{stats.itemCount}</TableCell>
                        <TableCell>
                          {stats.criticalItems > 0 ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              <span className="font-semibold text-red-600">{stats.criticalItems}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenReceiptDialog(order.id)}
                          >
                            <PackageCheck className="w-4 h-4 mr-1" />
                            Receive
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pending Items to Receive</span>
            <div className="flex gap-2">
              <ExportReceiptTemplateDialog 
                orderedItems={filteredOrderedItems}
                stops={stops}
                stickerTemplates={stickerTemplates}
              />
              <ImportReceiptFromFileDialog 
                onClose={() => {}}
                onItemsImported={handleImportItems}
                stops={stops}
                stickerItems={stickerItems}
                stickerTemplates={stickerTemplates}
              />
              <Button variant="outline" size="sm" onClick={handleExportOrderedItems}>
                <FileDown className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Search Stop</Label>
                <Input
                  placeholder="Search by Stop ID or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label>Sticker Type</Label>
                <Select value={stickerTypeFilter} onValueChange={setStickerTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {stickerTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Approved Shelter Type</Label>
                <Select value={shelterTypeFilter} onValueChange={setShelterTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shelter Types</SelectItem>
                    {activeShelterTypes.map(st => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.shelter_type_id} - {st.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={criticalFilter} onValueChange={setCriticalFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="critical">Critical Only</SelectItem>
                    <SelectItem value="non-critical">Non-Critical Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items Table */}
            {filteredOrderedItems.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No pending items to receive</p>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stop ID</TableHead>
                      <TableHead>Greek Name</TableHead>
                      <TableHead>English Name</TableHead>
                      <TableHead>Sticker Type</TableHead>
                      <TableHead>Approved Shelter Type</TableHead>
                      <TableHead>Planned Date</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Critical</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrderedItems.map((item) => {
                      const stop = stops.find(s => s.id === item.stop_id);
                      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
                      const shelterType = shelterTypes.find(st => st.id === stop?.shelter_type_approved_id);
                      const critical = isCriticalItem(item.stop_id, item.id);
                      const orderLine = orderLines.find(ol => ol.sticker_item_id === item.id);
                      const order = orders.find(o => o.id === orderLine?.order_id);

                      return (
                        <TableRow key={item.id} className={critical ? "bg-red-50" : ""}>
                          <TableCell className="font-medium">{stop?.stop_id || "-"}</TableCell>
                          <TableCell>{stop?.greek_name || "-"}</TableCell>
                          <TableCell>{stop?.english_name || "-"}</TableCell>
                          <TableCell>{template?.sticker_name_category || "-"}</TableCell>
                          <TableCell>
                            {shelterType ? `${shelterType.shelter_type_id} - ${shelterType.description}` : "-"}
                          </TableCell>
                          <TableCell>
                            {stop?.current_planned_installation_date || "-"}
                          </TableCell>
                          <TableCell>
                            {order ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={() => handleOpenReceiptDialog(order.id)}
                              >
                                #{order.id.slice(0, 8)}
                              </Button>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {critical && (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <span className="text-xs text-red-600 font-semibold">Critical</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Receive Items - Order #{selectedOrderForReceipt?.slice(0, 8)}
              {selectedCount > 0 && (
                <Badge className="ml-2">{selectedCount} items selected</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>Received Date *</Label>
                <Input
                  type="date"
                  value={receiptData.received_date}
                  onChange={(e) => setReceiptData({ ...receiptData, received_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={receiptData.notes}
                  onChange={(e) => setReceiptData({ ...receiptData, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Stop ID</TableHead>
                    <TableHead>Greek Name</TableHead>
                    <TableHead>English Name</TableHead>
                    <TableHead>Sticker Name/Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Critical</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderLines
                    .filter(l => l.order_id === selectedOrderForReceipt)
                    .map((line) => {
                      const item = stickerItems.find(i => i.id === line.sticker_item_id);
                      const stop = stops.find(s => s.id === item?.stop_id);
                      const template = stickerTemplates.find(t => t.id === item?.sticker_template_id);
                      const critical = item && isCriticalItem(item.stop_id, item.id);
                      const alreadyReceived = item?.status === "Received";

                      return (
                        <TableRow key={line.id} className={critical ? "bg-red-50" : alreadyReceived ? "bg-gray-100 opacity-50" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems[line.sticker_item_id] || false}
                              onCheckedChange={() => toggleItemSelection(line.sticker_item_id)}
                              disabled={alreadyReceived}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{stop?.stop_id || "-"}</TableCell>
                          <TableCell>{stop?.greek_name || "-"}</TableCell>
                          <TableCell>{stop?.english_name || "-"}</TableCell>
                          <TableCell>
                            {template?.sticker_name_category || "-"}
                            {alreadyReceived && (
                              <Badge className="ml-2 bg-green-100 text-green-800">Received</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{line.ordered_quantity}</Badge>
                          </TableCell>
                          <TableCell>
                            {critical && !alreadyReceived && (
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReceipt} disabled={loading}>
              {loading ? "Processing..." : selectedCount === 0 ? "Close Order" : `Receive ${selectedCount} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}