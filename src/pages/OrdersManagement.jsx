import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, ShoppingCart, Eye, Printer, AlertTriangle, Search, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ExcelJS from 'exceljs';

export default function OrdersManagementPage() {
  const [selectedItems, setSelectedItems] = useState({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [orderFormData, setOrderFormData] = useState({
    vendor: "",
    order_date: new Date().toISOString().split('T')[0],
    reason: "Initial"
  });
  const [viewOrderId, setViewOrderId] = useState(null);
  const [charLimitWarnings, setCharLimitWarnings] = useState([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmedItems, setConfirmedItems] = useState({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: stickerItems = [] } = useQuery({
    queryKey: ['stickerItems'],
    queryFn: () => base44.entities.StickerItem.list(),
    staleTime: 30 * 1000
  });

  const { data: stops = [] } = useQuery({
    queryKey: ['stops'],
    queryFn: () => base44.entities.Stop.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: stickerTemplates = [] } = useQuery({
    queryKey: ['stickerTemplates'],
    queryFn: () => base44.entities.StickerTemplate.list(),
    staleTime: Infinity
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-order_date'),
    staleTime: 30 * 1000
  });

  const { data: orderLines = [] } = useQuery({
    queryKey: ['orderLines'],
    queryFn: () => base44.entities.OrderLine.list(),
    staleTime: 30 * 1000
  });

  const { data: shelterTypes = [] } = useQuery({
    queryKey: ['shelterTypes'],
    queryFn: () => base44.entities.ShelterType.list(),
    staleTime: Infinity
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => base44.entities.Receipt.list(),
    staleTime: 30 * 1000
  });

  const { data: receiptLines = [] } = useQuery({
    queryKey: ['receiptLines'],
    queryFn: () => base44.entities.ReceiptLine.list(),
    staleTime: 30 * 1000
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
      setCategoryFilters([]);
      setOrderFormData({
        vendor: "",
        order_date: new Date().toISOString().split('T')[0],
        reason: "Initial"
      });
    }
  });

  const isCriticalStop = (stopId, itemId) => {
    const stop = stops.find(s => s.id === stopId);
    const item = stickerItems.find(i => i.id === itemId);
    
    if (!stop || !item) return false;
    if (stop?.all_stickers_installed === true) return false;
    
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    
    // For Needed stickers, check if should be ordered based on lead time
    if (item?.status === "Needed") {
      const daysBeforeInstall = template?.days_before_installation_to_receive || 0;
      
      if (stop?.current_planned_installation_date) {
        const daysUntilInstallation = Math.floor((new Date(stop.current_planned_installation_date) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilInstallation < daysBeforeInstall;
      }
    }
    
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

  // Filter items by selected categories and search
  const filteredItems = availableItems.filter(item => {
    const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
    const { stop } = getStopInfo(item.id);
    
    const matchesCategory = categoryFilters.length === 0 || 
      categoryFilters.includes(template?.sticker_name_category);
    
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || (
      stop?.stop_id?.toLowerCase().includes(term) ||
      stop?.greek_name?.toLowerCase().includes(term) ||
      stop?.english_name?.toLowerCase().includes(term) ||
      template?.sticker_name_category?.toLowerCase().includes(term)
    );
    
    return matchesCategory && matchesSearch;
  });

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(order.status);
    return matchesStatus;
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
    setCategoryFilters([]);
    setCreateDialogOpen(true);
  };

  const checkCharacterLimits = () => {
    const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    const warnings = [];

    selectedItemIds.forEach(itemId => {
      const item = stickerItems.find(i => i.id === itemId);
      if (!item) return;

      const stop = stops.find(s => s.id === item.stop_id);
      if (!stop) return;

      const shelterType = shelterTypes.find(st => st.id === stop.shelter_type_approved_id);
      if (!shelterType) return;

      const greekMaxChars = shelterType.greek_name_max_chars || 0;
      const englishMaxChars = shelterType.english_name_max_chars || 0;

      const greekLength = (stop.greek_name || "").length;
      const englishLength = (stop.english_name || "").length;

      if (greekLength > greekMaxChars || englishLength > englishMaxChars) {
        warnings.push({
          stopId: stop.stop_id,
          greekName: stop.greek_name,
          englishName: stop.english_name,
          greekLength,
          englishLength,
          greekMaxChars,
          englishMaxChars,
          greekExceeds: greekLength > greekMaxChars,
          englishExceeds: englishLength > englishMaxChars
        });
      }
    });

    return warnings;
  };

  const submitOrder = () => {
    if (!orderFormData.vendor || !orderFormData.order_date) {
      alert("Please fill in all required fields");
      return;
    }

    // Check character limits
    const warnings = checkCharacterLimits();
    if (warnings.length > 0) {
      setCharLimitWarnings(warnings);
      // Pre-select all items with warnings
      const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
      const initialConfirmed = {};
      selectedItemIds.forEach(itemId => {
        const item = stickerItems.find(i => i.id === itemId);
        const stop = stops.find(s => s.id === item?.stop_id);
        if (stop && warnings.some(w => w.stopId === stop.stop_id)) {
          initialConfirmed[itemId] = true;
        }
      });
      setConfirmedItems(initialConfirmed);
      setConfirmDialogOpen(true);
      return;
    }

    // No warnings, proceed with order creation
    proceedWithOrderCreation();
  };

  const proceedWithOrderCreation = () => {
    // If there were warnings, only include confirmed items
    if (charLimitWarnings.length > 0) {
      const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
      const warningStopIds = charLimitWarnings.map(w => w.stopId);
      
      // Filter out unconfirmed items that had warnings
      const filteredSelection = {};
      selectedItemIds.forEach(itemId => {
        const item = stickerItems.find(i => i.id === itemId);
        const stop = stops.find(s => s.id === item?.stop_id);
        
        // If this item's stop had a warning, only include if confirmed
        if (stop && warningStopIds.includes(stop.stop_id)) {
          if (confirmedItems[itemId]) {
            filteredSelection[itemId] = true;
          }
        } else {
          // No warning for this item, include it
          filteredSelection[itemId] = true;
        }
      });
      
      setSelectedItems(filteredSelection);
    }
    
    createOrderMutation.mutate({
      vendor: orderFormData.vendor,
      order_date: orderFormData.order_date,
      reason: orderFormData.reason,
      status: "Open"
    });
    setConfirmDialogOpen(false);
    setCharLimitWarnings([]);
    setConfirmedItems({});
  };

  const toggleConfirmedItem = (itemId) => {
    setConfirmedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const selectAllWarningItems = () => {
    const allWarningItems = {};
    charLimitWarnings.forEach(warning => {
      const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
      selectedItemIds.forEach(itemId => {
        const item = stickerItems.find(i => i.id === itemId);
        const stop = stops.find(s => s.id === item?.stop_id);
        if (stop && stop.stop_id === warning.stopId) {
          allWarningItems[itemId] = true;
        }
      });
    });
    setConfirmedItems(allWarningItems);
  };

  const deselectAllWarningItems = () => {
    setConfirmedItems({});
  };

  const getOrderStats = (orderId) => {
    const lines = orderLines.filter(l => l.order_id === orderId);
    const uniqueStops = new Set();
    let criticalCount = 0;

    lines.forEach(line => {
      const { item, stop } = getStopInfo(line.sticker_item_id);
      if (stop && item) {
        uniqueStops.add(stop.id);
        if (isCriticalStop(stop.id, item.id)) {
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

  const handleExportAvailableItems = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Available Sticker Items');

    worksheet.columns = [
      { header: 'Stop ID', key: 'stop_id', width: 15 },
      { header: 'Greek Name', key: 'greek_name', width: 30 },
      { header: 'English Name', key: 'english_name', width: 30 },
      { header: 'Sticker Template', key: 'sticker_template', width: 25 },
      { header: 'Print Line 1', key: 'print_line_1', width: 20 },
      { header: 'Print Line 2', key: 'print_line_2', width: 20 },
      { header: 'Print Line 3', key: 'print_line_3', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Critical', key: 'critical', width: 10 }
    ];

    filteredItems.forEach(item => {
      const { stop } = getStopInfo(item.id);
      const template = getTemplateInfo(item.sticker_template_id);
      const critical = isCriticalStop(item.stop_id, item.id);

      worksheet.addRow({
        stop_id: stop?.stop_id || '-',
        greek_name: stop?.greek_name || '-',
        english_name: stop?.english_name || '-',
        sticker_template: template?.sticker_name_category || '-',
        print_line_1: item.print_line_1 || '-',
        print_line_2: item.print_line_2 || '-',
        print_line_3: item.print_line_3 || '-',
        status: item.status,
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
    link.download = `available_sticker_items_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportOrders = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 20 },
      { header: 'Vendor', key: 'vendor', width: 25 },
      { header: 'Order Date', key: 'order_date', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Items Count', key: 'items', width: 12 },
      { header: 'Critical Stops', key: 'critical', width: 15 }
    ];

    filteredOrders.forEach(order => {
      const stats = getOrderStats(order.id);
      
      worksheet.addRow({
        order_id: `#${order.id.slice(0, 8)}`,
        vendor: order.vendor || '-',
        order_date: order.order_date || '-',
        status: order.status,
        items: stats.itemCount,
        critical: stats.criticalStops
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
    link.download = `orders_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const criticalInSelection = Object.keys(selectedItems)
    .filter(id => selectedItems[id])
    .filter(id => {
      const item = stickerItems.find(i => i.id === id);
      return item && isCriticalStop(item.stop_id, item.id);
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportAvailableItems}>
                <FileDown className="w-4 h-4 mr-2" />
                Export
              </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          {availableItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No sticker items need ordering</p>
          ) : (
            <>
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by Stop ID, Name, or Sticker Type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1">Sticker Categories</Label>
                  <MultiSelect
                    options={stickerCategories.map(cat => ({ value: cat, label: cat }))}
                    selected={categoryFilters}
                    onChange={setCategoryFilters}
                    placeholder="All Categories"
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
                    <TableHead>Status</TableHead>
                    <TableHead>Critical</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredItems.map((item) => {
                    const { stop } = getStopInfo(item.id);
                    const template = getTemplateInfo(item.sticker_template_id);
                    const critical = isCriticalStop(item.stop_id, item.id);

                    return (
                      <TableRow key={item.id} className={critical ? "bg-red-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems[item.id] || false}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{stop?.stop_id || "-"}</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="truncate max-w-[200px] cursor-help">
                                  {stop?.greek_name || "-"}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{stop?.greek_name || "-"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="truncate max-w-[200px] cursor-help">
                                  {stop?.english_name || "-"}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{stop?.english_name || "-"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2 - Order List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Orders</span>
            <Button variant="outline" size="sm" onClick={handleExportOrders}>
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label className="text-xs text-gray-600 mb-1">Filter by Status</Label>
            <MultiSelect
              options={[
                { value: "Open", label: "Open" },
                { value: "Closed", label: "Closed" },
                { value: "Cancelled", label: "Cancelled" }
              ]}
              selected={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="All Statuses"
              className="w-64"
            />
          </div>
          {filteredOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No orders found</p>
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

      {/* Character Limit Warning Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Προειδοποίηση Ορίου Χαρακτήρων
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-700">
              Τα παρακάτω αυτοκόλλητα υπερβαίνουν το επιτρεπόμενο όριο χαρακτήρων για το στέγαστρο τους. 
              Επιλέξτε ποια θέλετε να συμπεριλάβετε στην παραγγελία:
            </p>
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={selectAllWarningItems}>
                Επιλογή Όλων
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllWarningItems}>
                Αποεπιλογή Όλων
              </Button>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Stop ID</TableHead>
                    <TableHead>Ελληνικό Όνομα</TableHead>
                    <TableHead>English Name</TableHead>
                    <TableHead>Approved Type</TableHead>
                    <TableHead>Sticker Type</TableHead>
                    <TableHead>Χαρακτήρες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charLimitWarnings.map((warning, index) => {
                    const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
                    const itemForThisStop = selectedItemIds.find(itemId => {
                      const item = stickerItems.find(i => i.id === itemId);
                      const stop = stops.find(s => s.id === item?.stop_id);
                      return stop && stop.stop_id === warning.stopId;
                    });
                    
                    const stop = stops.find(s => s.stop_id === warning.stopId);
                    const shelterType = shelterTypes.find(st => st.shelter_type_id === stop?.shelter_type_approved_id);
                    const item = stickerItems.find(i => i.id === itemForThisStop);
                    const template = stickerTemplates.find(t => t.id === item?.sticker_template_id);
                    
                    return (
                      <TableRow key={index} className="bg-orange-50">
                        <TableCell>
                          <Checkbox
                            checked={confirmedItems[itemForThisStop] || false}
                            onCheckedChange={() => toggleConfirmedItem(itemForThisStop)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{warning.stopId}</TableCell>
                      <TableCell>
                        <div>
                          <div className={warning.greekExceeds ? "text-red-600 font-semibold" : ""}>
                            {warning.greekName}
                          </div>
                          {warning.greekExceeds && (
                            <div className="text-xs text-red-600">
                              {warning.greekLength}/{warning.greekMaxChars} χαρακτήρες 
                              (υπέρβαση: {warning.greekLength - warning.greekMaxChars})
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className={warning.englishExceeds ? "text-red-600 font-semibold" : ""}>
                            {warning.englishName}
                          </div>
                          {warning.englishExceeds && (
                            <div className="text-xs text-red-600">
                              {warning.englishLength}/{warning.englishMaxChars} chars 
                              (excess: {warning.englishLength - warning.englishMaxChars})
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {shelterType?.description || stop?.shelter_type_approved_id || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {template?.sticker_name_category || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {warning.greekExceeds && (
                            <Badge className="bg-red-100 text-red-800 block w-fit">
                              Ελληνικά: +{warning.greekLength - warning.greekMaxChars}
                            </Badge>
                          )}
                          {warning.englishExceeds && (
                            <Badge className="bg-red-100 text-red-800 block w-fit">
                              English: +{warning.englishLength - warning.englishMaxChars}
                            </Badge>
                          )}
                        </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Σημείωση:</strong> Τα ονόματα αυτά μπορεί να μην εκτυπωθούν σωστά στα αυτοκόλλητα λόγω περιορισμών του στεγάστρου. 
                Παρακαλώ επιβεβαιώστε ποια αυτοκόλλητα επιθυμείτε να συμπεριλάβετε στην παραγγελία.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Επιλεγμένα: {Object.values(confirmedItems).filter(Boolean).length} / {charLimitWarnings.length}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConfirmDialogOpen(false);
              setCharLimitWarnings([]);
            }}>
              Ακύρωση
            </Button>
            <Button 
              onClick={proceedWithOrderCreation}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={createOrderMutation.isPending || Object.values(confirmedItems).filter(Boolean).length === 0}
            >
              {createOrderMutation.isPending 
                ? "Δημιουργία..." 
                : `Επιβεβαίωση & Δημιουργία Παραγγελίας (${Object.values(confirmedItems).filter(Boolean).length})`}
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
          receiptLines={receiptLines}
        />
      )}
    </div>
  );
}

function ViewOrderDialog({ orderId, onClose, orders, orderLines, stickerItems, stops, stickerTemplates, isCriticalStop, receiptLines }) {
  const order = orders.find(o => o.id === orderId);
  const lines = orderLines.filter(l => l.order_id === orderId);

  const isItemReceived = (itemId) => {
    return receiptLines.some(rl => rl.sticker_item_id === itemId);
  };

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
                  <TableHead>Status</TableHead>
                  <TableHead>Critical</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                   const item = stickerItems.find(i => i.id === line.sticker_item_id);
                   const stop = stops.find(s => s.id === item?.stop_id);
                   const template = stickerTemplates.find(t => t.id === item?.sticker_template_id);
                   const critical = item && isCriticalStop(item.stop_id, item.id);
                   const received = isItemReceived(line.sticker_item_id);

                  return (
                    <TableRow key={line.id} className={critical ? "bg-red-50" : received ? "bg-green-50" : ""}>
                      <TableCell className="font-medium">{stop?.stop_id || "-"}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="truncate max-w-[200px] cursor-help">
                                {stop?.greek_name || "-"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{stop?.greek_name || "-"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="truncate max-w-[200px] cursor-help">
                                {stop?.english_name || "-"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{stop?.english_name || "-"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{template?.sticker_name_category || "-"}</TableCell>
                      <TableCell>{line.ordered_quantity}</TableCell>
                      <TableCell>
                        {received ? (
                          <Badge className="bg-green-600">Παραλήφθηκε</Badge>
                        ) : (
                          <Badge variant="outline">Εκκρεμεί</Badge>
                        )}
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
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}