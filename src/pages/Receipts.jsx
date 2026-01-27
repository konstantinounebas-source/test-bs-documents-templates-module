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
import { Save } from "lucide-react";

export default function ReceiptsPage() {
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [receiptData, setReceiptData] = useState({
    received_date: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [receiptLines, setReceiptLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-order_date')
  });

  const { data: orderLines = [] } = useQuery({
    queryKey: ['orderLines', selectedOrderId],
    queryFn: () => base44.entities.OrderLine.filter({ order_id: selectedOrderId }),
    enabled: !!selectedOrderId
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
    if (orderLines.length > 0) {
      setReceiptLines(orderLines.map(line => ({
        sticker_item_id: line.sticker_item_id,
        ordered_quantity: line.ordered_quantity,
        received_quantity: 0
      })));
    }
  }, [orderLines]);

  const getStickerItemDisplay = (itemId) => {
    const item = stickerItems.find(i => i.id === itemId);
    if (!item) return "-";
    
    const stop = stops.find(s => s.id === item.stop_id);
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    
    return `${stop?.stop_id || "?"} - ${template?.sticker_name_category || "?"}`;
  };

  const handleLineChange = (index, value) => {
    const newLines = [...receiptLines];
    newLines[index].received_quantity = parseInt(value) || 0;
    setReceiptLines(newLines);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderId) return;

    setLoading(true);

    try {
      const user = await base44.auth.me();
      
      // Create receipt
      const receipt = await base44.entities.Receipt.create({
        order_id: selectedOrderId,
        received_date: receiptData.received_date,
        received_by: user.email,
        notes: receiptData.notes
      });

      // Create receipt lines for items with quantity > 0
      for (const line of receiptLines) {
        if (line.received_quantity > 0) {
          await base44.entities.ReceiptLine.create({
            receipt_id: receipt.id,
            sticker_item_id: line.sticker_item_id,
            received_quantity: line.received_quantity
          });

          // Update sticker item status
          await base44.entities.StickerItem.update(line.sticker_item_id, {
            status: "Received"
          });
        }
      }

      // Check if order is fully received or partial
      const allReceived = receiptLines.every(line => line.received_quantity === line.ordered_quantity);
      const anyReceived = receiptLines.some(line => line.received_quantity > 0);
      
      if (allReceived && anyReceived) {
        await base44.entities.Order.update(selectedOrderId, { status: "Closed" });
      } else if (anyReceived) {
        await base44.entities.Order.update(selectedOrderId, { status: "Partial" });
      }

      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['stickerItems']);
      
      // Reset form
      setSelectedOrderId("");
      setReceiptLines([]);
      setReceiptData({
        received_date: new Date().toISOString().split('T')[0],
        notes: ""
      });

      alert("Receipt created successfully!");
    } catch (error) {
      console.error("Error creating receipt:", error);
    }

    setLoading(false);
  };

  const openOrders = orders.filter(o => o.status === "Open" || o.status === "Partial");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Receive Stickers</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Receipt Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order">Select Order *</Label>
                <Select
                  value={selectedOrderId}
                  onValueChange={setSelectedOrderId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {openOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.id} - {order.vendor} ({order.order_date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="received_date">Received Date *</Label>
                <Input
                  id="received_date"
                  type="date"
                  value={receiptData.received_date}
                  onChange={(e) => setReceiptData({ ...receiptData, received_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={receiptData.notes}
                onChange={(e) => setReceiptData({ ...receiptData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {selectedOrderId && receiptLines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Items to Receive</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sticker Item</TableHead>
                    <TableHead className="w-[150px]">Ordered Qty</TableHead>
                    <TableHead className="w-[150px]">Receive Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiptLines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>{getStickerItemDisplay(line.sticker_item_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{line.ordered_quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={line.ordered_quantity}
                          value={line.received_quantity}
                          onChange={(e) => handleLineChange(index, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {selectedOrderId && (
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Create Receipt"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}