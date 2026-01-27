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
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OrderDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");
  const mode = urlParams.get("mode");
  const isCreateMode = mode === "create";

  const [formData, setFormData] = useState({
    vendor: "",
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    status: "Open",
    reason: "Initial",
    notes: ""
  });

  const [orderLines, setOrderLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.Order.filter({ id: orderId }),
    enabled: !!orderId && !isCreateMode
  });

  const { data: existingOrderLines = [] } = useQuery({
    queryKey: ['orderLines', orderId],
    queryFn: () => base44.entities.OrderLine.filter({ order_id: orderId }),
    enabled: !!orderId && !isCreateMode
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

  useEffect(() => {
    if (order && order.length > 0) {
      setFormData(order[0]);
    }
  }, [order]);

  useEffect(() => {
    if (existingOrderLines.length > 0) {
      setOrderLines(existingOrderLines.map(line => ({
        id: line.id,
        sticker_item_id: line.sticker_item_id,
        ordered_quantity: line.ordered_quantity
      })));
    }
  }, [existingOrderLines]);

  const getStickerItemDisplay = (itemId) => {
    const item = stickerItems.find(i => i.id === itemId);
    if (!item) return "-";
    
    const stop = stops.find(s => s.id === item.stop_id);
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    
    return `${stop?.stop_id || "?"} - ${template?.sticker_name_category || "?"}`;
  };

  const handleAddLine = () => {
    setOrderLines([...orderLines, { sticker_item_id: "", ordered_quantity: 1 }]);
  };

  const handleRemoveLine = (index) => {
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...orderLines];
    newLines[index][field] = value;
    setOrderLines(newLines);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let currentOrderId;

      if (isCreateMode) {
        const createdOrder = await base44.entities.Order.create(formData);
        currentOrderId = createdOrder.id;
      } else {
        await base44.entities.Order.update(orderId, formData);
        currentOrderId = orderId;

        // Delete existing lines
        for (const line of existingOrderLines) {
          await base44.entities.OrderLine.delete(line.id);
        }
      }

      // Create new lines and update sticker items
      for (const line of orderLines) {
        if (line.sticker_item_id && line.ordered_quantity > 0) {
          await base44.entities.OrderLine.create({
            order_id: currentOrderId,
            sticker_item_id: line.sticker_item_id,
            ordered_quantity: line.ordered_quantity
          });

          // Recalculate Total Ordered Quantity for this sticker item
          const allOrderLines = await base44.entities.OrderLine.filter({
            sticker_item_id: line.sticker_item_id
          });
          const totalOrdered = allOrderLines.reduce((sum, ol) => sum + (ol.ordered_quantity || 0), 0);
          
          await base44.entities.StickerItem.update(line.sticker_item_id, {
            total_ordered_quantity: totalOrdered,
            status: "Ordered"
          });
        }
      }

      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['orderLines']);
      
      window.location.href = createPageUrl("Orders");
    } catch (error) {
      console.error("Error saving order:", error);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Orders")}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {isCreateMode ? "New Order" : `Order ${orderId}`}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor">Vendor *</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Select
                  value={formData.reason}
                  onValueChange={(value) => setFormData({ ...formData, reason: value })}
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="order_date">Order Date *</Label>
                <Input
                  id="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="expected_delivery_date">Expected Delivery</Label>
                <Input
                  id="expected_delivery_date"
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order Lines</span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                <Plus className="w-4 h-4 mr-2" />
                Add Line
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sticker Item</TableHead>
                  <TableHead className="w-[150px]">Quantity</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                      No order lines. Click "Add Line" to add items.
                    </TableCell>
                  </TableRow>
                ) : (
                  orderLines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={line.sticker_item_id}
                          onValueChange={(value) => handleLineChange(index, "sticker_item_id", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sticker item" />
                          </SelectTrigger>
                          <SelectContent>
                            {stickerItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {getStickerItemDisplay(item.id)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={line.ordered_quantity}
                          onChange={(e) => handleLineChange(index, "ordered_quantity", parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLine(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link to={createPageUrl("Orders")}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}