import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, ShoppingCart, Eye, Printer, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OrdersManagementPage() {
  const [selectedItems, setSelectedItems] = useState({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orderFormData, setOrderFormData] = useState({
    vendor: "",
    order_date: new Date().toISOString().split('T')[0],
    reason: "Initial"
  });
  const [viewOrderId, setViewOrderId] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-order_date')
  });

  const { data: orderLines = [] } = useQuery({
    queryKey: ['orderLines'],
    queryFn: () => base44.entities.OrderLine.list()
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const user = await base44.auth.me();
      const order = await base44.entities.Order.create(orderData);
      const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
      
      for (const itemId of selectedItemIds) {
        await base44.entities.OrderLine.create({
          order_id: order.id,
          sticker_item_id: itemId,
          ordered_quantity: 1
        });

        const allOrderLines = await base44.entities.OrderLine.filter({
          sticker_item_id: itemId
        });
        const totalOrdered = allOrderLines.reduce((sum, ol) => sum + (ol.ordered_quantity || 0), 0) + 1;
        
        const item = stickerItems.find(i => i.id === itemId);
        const oldStatus = item?.status;
        
        await base44.entities.StickerItem.update(itemId, {
          total_ordered_quantity: totalOrdered,
          status: "Ordered"
        });
        
        await base44.entities.StickerMovementLog.create({
          sticker_item_id: itemId,
          action_type: "Ordered",
          old_status: oldStatus,
          new_status: "Ordered",
          notes: `Order #${order.id.slice(0, 8)} - Vendor: ${orderData.vendor}`,
          user_email: user.email
        });
      }
      
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['orderLines']);
      queryClient.invalidateQueries(['stickerItems']);
      setSelectedItems({});
      setCreateDialogOpen(false);
      setOrderFormData({
        vendor: "",
        order_date: new Date().toISOString().split('T')[0],
        reason: "Initial"
      });
    }
  });

  const isCriticalStop = (stopId) => {
    const stop = stops.find(s => s.id === stopId);
    return stop?.shelter_installed === true && stop?.all_stickers_installed === false;
  };

  const getStopInfo = (itemId) => {
    const item = stickerItems.find(i => i.id === itemId);
    const stop = stops.find(s => s.id === item?.stop_id);
    return { item, stop };
  };

  const getTemplateInfo = (templateId) => {
    return stickerTemplates.find(t => t.id === templateId);
  };

  const availableItems = stickerItems.filter(item => item.status === "Needed");

  // Get unique sticker categories
  const stickerCategories = Array.from(new Set(
    availableItems.map(item => {
      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
      return template?.sticker_name_category;
    }).filter(Boolean)
  )).sort();

  // Filter items by selected category
  const filteredItems = categoryFilter === "all" 
    ? availableItems 
    : availableItems.filter(item => {
        const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
        return template?.sticker_name_category === categoryFilter;
      });

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleCreateOrder = () => {
    const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    if (selectedItemIds.length === 0) {
      alert("Please select at least one sticker item");
      return;
    }

    // Get the first selected item to find its category/template
    const firstItemId = selectedItemIds[0];
    const firstItem = stickerItems.find(i => i.id === firstItemId);
    const firstTemplate = stickerTemplates.find(t => t.id === firstItem?.sticker_template_id);
    
    // Get default vendor from the first sticker template's category if available
    const defaultVendor = firstTemplate?.default_vendor || "";

    setOrderFormData({
      vendor: defaultVendor,
      order_date: new Date().toISOString().split('T')[0],
      reason: "Initial"
    });
    setCategoryFilter("all");
    setCreateDialogOpen(true);
  };

  const submitOrder = () => {
    if (!orderFormData.vendor || !orderFormData.order_date) {
      alert("Please fill in all required fields");
      return;
    }
    createOrderMutation.mutate({
      vendor: orderFormData.vendor,
      order_date: orderFormData.order_date,
      reason: orderFormData.reason,
      status: "Open"
    });
  };

  const getOrderStats = (orderId) => {
    const lines = orderLines.filter(l => l.order_id === orderId);
    const uniqueStops = new Set();
    let criticalCount = 0;

    lines.forEach(line => {
      const { item, stop } = getStopInfo(line.sticker_item_id);
      if (stop) {
        uniqueStops.add(stop.id);
        if (isCriticalStop(stop.id)) {
          criticalCount++;
        }
      }
    });

    return {
      itemCount: lines.length,
      criticalStops: criticalCount
    };
  };

  const handlePrintOrder = (orderId) => {
    navigate(createPageUrl("OrderPrint") + `?orderId=${orderId}`);
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const criticalInSelection = Object.keys(selectedItems)
    .filter(id => selectedItems[id])
    .filter(id => {
      const item = stickerItems.find(i => i.id === id);
      return item && isCriticalStop(item.stop_id);
    }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <p className="text-gray-600">Create and manage sticker orders</p>
        </div>
      </div>

      {/* SECTION 1 - Create Order */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create New Order - Select Sticker Items</CardTitle>
            {selectedCount > 0 && (
              <Button onClick={handleCreateOrder}>
                <Plus className="w-4 h-4 mr-2" />
                Create Order ({selectedCount} items)
                {criticalInSelection > 0 && (
                  <Badge className="ml-2 bg-red-600">{criticalInSelection} Critical</Badge>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {availableItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No sticker items need ordering</p>
          ) : (
            <>
              <div className="mb-4">
                <Label>Filter by Sticker Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {stickerCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Critical</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableItems.map((item) => {
                    const { stop } = getStopInfo(item.id);
                    const template = getTemplateInfo(item.sticker_template_id);
                    const critical = isCriticalStop(item.stop_id);

                    return (
                      <TableRow key={item.id} className={critical ? "bg-red-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems[item.id] || false}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{stop?.stop_id || "-"}</TableCell>
                        <TableCell>{stop?.greek_name || "-"}</TableCell>
                        <TableCell>{stop?.english_name || "-"}</TableCell>
                        <TableCell>{template?.sticker_name_category || "-"}</TableCell>
                        <TableCell>
                          <Badge className="bg-orange-100 text-orange-800">{item.status}</Badge>
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
          )}
        </CardContent>
      </Card>

      {/* SECTION 2 - Order List */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No orders created yet</p>
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
                    <TableHead>Critical Stops</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
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
                          {stats.criticalStops > 0 ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              <span className="font-semibold text-red-600">{stats.criticalStops}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewOrderId(order.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrintOrder(order.id)}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Create Order Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Vendor *</Label>
              <Input
                value={orderFormData.vendor}
                onChange={(e) => setOrderFormData({ ...orderFormData, vendor: e.target.value })}
                placeholder="Enter vendor name"
              />
            </div>
            <div>
              <Label>Order Date *</Label>
              <Input
                type="date"
                value={orderFormData.order_date}
                onChange={(e) => setOrderFormData({ ...orderFormData, order_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Select
                value={orderFormData.reason}
                onValueChange={(value) => setOrderFormData({ ...orderFormData, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Initial">Initial</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Wrong Print">Wrong Print</SelectItem>
                  <SelectItem value="Replacement">Replacement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitOrder} disabled={createOrderMutation.isPending}>
              {createOrderMutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      {viewOrderId && (
        <ViewOrderDialog
          orderId={viewOrderId}
          onClose={() => setViewOrderId(null)}
          orders={orders}
          orderLines={orderLines}
          stickerItems={stickerItems}
          stops={stops}
          stickerTemplates={stickerTemplates}
          isCriticalStop={isCriticalStop}
        />
      )}
    </div>
  );
}

function ViewOrderDialog({ orderId, onClose, orders, orderLines, stickerItems, stops, stickerTemplates, isCriticalStop }) {
  const order = orders.find(o => o.id === orderId);
  const lines = orderLines.filter(l => l.order_id === orderId);

  if (!order) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details - #{order.id.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Vendor</p>
              <p className="font-semibold">{order.vendor || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Order Date</p>
              <p className="font-semibold">{order.order_date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge variant="outline">{order.status}</Badge>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stop ID</TableHead>
                  <TableHead>Greek Name</TableHead>
                  <TableHead>English Name</TableHead>
                  <TableHead>Sticker Name/Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Critical</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const item = stickerItems.find(i => i.id === line.sticker_item_id);
                  const stop = stops.find(s => s.id === item?.stop_id);
                  const template = stickerTemplates.find(t => t.id === item?.sticker_template_id);
                  const critical = item && isCriticalStop(item.stop_id);

                  return (
                    <TableRow key={line.id} className={critical ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{stop?.stop_id || "-"}</TableCell>
                      <TableCell>{stop?.greek_name || "-"}</TableCell>
                      <TableCell>{stop?.english_name || "-"}</TableCell>
                      <TableCell>{template?.sticker_name_category || "-"}</TableCell>
                      <TableCell>{line.ordered_quantity}</TableCell>
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
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}