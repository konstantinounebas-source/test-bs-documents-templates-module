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
import { Save, AlertTriangle, PackageCheck } from "lucide-react";

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
      initialSelection[line.sticker_item_id] = true;
    });
    setSelectedItems(initialSelection);
    setReceiptDialogOpen(true);
  };

  const handleSubmitReceipt = async () => {
    if (!selectedOrderForReceipt) return;

    const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    if (selectedItemIds.length === 0) {
      alert("Please select at least one item to receive");
      return;
    }

    setLoading(true);

    try {
      const user = await base44.auth.me();
      
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

      // Check if order is fully received
      const allOrderLines = orderLines.filter(l => l.order_id === selectedOrderForReceipt);
      const allReceived = allOrderLines.every(line => selectedItemIds.includes(line.sticker_item_id));
      
      if (allReceived) {
        await base44.entities.Order.update(selectedOrderForReceipt, { status: "Closed" });
      } else {
        await base44.entities.Order.update(selectedOrderForReceipt, { status: "Partial" });
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

      alert("Receipt created successfully!");
    } catch (error) {
      console.error("Error creating receipt:", error);
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
                  <SelectItem value="all">All Orders</SelectItem>
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

                      return (
                        <TableRow key={line.id} className={critical ? "bg-red-50" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems[line.sticker_item_id] || false}
                              onCheckedChange={() => toggleItemSelection(line.sticker_item_id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{stop?.stop_id || "-"}</TableCell>
                          <TableCell>{stop?.greek_name || "-"}</TableCell>
                          <TableCell>{stop?.english_name || "-"}</TableCell>
                          <TableCell>{template?.sticker_name_category || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{line.ordered_quantity}</Badge>
                          </TableCell>
                          <TableCell>
                            {critical && (
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
            <Button onClick={handleSubmitReceipt} disabled={loading || selectedCount === 0}>
              {loading ? "Processing..." : `Receive ${selectedCount} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}