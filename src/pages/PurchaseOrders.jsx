import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye, Send, CheckCircle, XCircle, Loader2, Trash2, Edit, ChevronDown, ChevronRight, Package, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import PaginationControls from "../components/warehouse/PaginationControls";
import ProductSearchCombobox from "../components/warehouse/ProductSearchCombobox";

function PurchaseOrdersTable({
  orders,
  vendors,
  products,
  isLoading,
  expandedPOs,
  handleView,
  handleEdit,
  handleChangeStatus,
  togglePOExpand,
  getMovementsForPO,
  getProductName,
  getProductSKU,
  getUserName,
  calculatePOCompletion,
  getStatusBadge,
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>PO Number</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Order Date</TableHead>
          <TableHead>Expected Delivery</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Completion</TableHead>
          <TableHead className="text-right">Total Amount</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </TableCell>
          </TableRow>
        ) : orders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-slate-500">
              No purchase orders found
            </TableCell>
          </TableRow>
        ) : (
          orders.map((po) => {
            const vendor = vendors.find(v => v.id === po.vendor_id);
            const isExpanded = expandedPOs.has(po.id);
            const poMovements = getMovementsForPO(po.id);
            const completion = calculatePOCompletion(po);

            return (
              <React.Fragment key={po.id}>
                <TableRow className="hover:bg-slate-50">
                  <TableCell>
                    {poMovements.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => togglePOExpand(po.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-medium">{po.po_number}</TableCell>
                  <TableCell>{vendor?.name || 'Unknown'}</TableCell>
                  <TableCell>{format(new Date(po.order_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(po.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            completion === 100 ? 'bg-green-500' :
                            completion > 0 ? 'bg-blue-500' : 'bg-slate-300'
                          }`}
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{completion}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    €{(po.total_amount || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(po)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {po.status !== 'Received' && po.status !== 'Canceled' && (
                            <DropdownMenuItem onClick={() => handleEdit(po)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Order
                            </DropdownMenuItem>
                          )}
                          {po.status === 'Draft' && (
                            <>
                              <DropdownMenuItem onClick={() => handleChangeStatus(po, 'Sent')}>
                                <Send className="w-4 h-4 mr-2" />
                                Mark as Sent
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeStatus(po, 'Canceled')}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Order
                              </DropdownMenuItem>
                            </>
                          )}
                          {po.status === 'Sent' && (
                            <>
                              <DropdownMenuItem onClick={() => handleChangeStatus(po, 'Confirmed')}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark as Confirmed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeStatus(po, 'Canceled')}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Order
                              </DropdownMenuItem>
                            </>
                          )}
                          {po.status === 'Confirmed' && po.items.some(item => (item.quantity_received || 0) < item.quantity_ordered) && (
                              <DropdownMenuItem disabled>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Awaiting Receipt
                              </DropdownMenuItem>
                          )}
                          {po.status === 'Partially Received' && (
                              <DropdownMenuItem disabled>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Partially Received
                              </DropdownMenuItem>
                          )}
                          {po.status === 'Received' && (
                              <DropdownMenuItem disabled>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Fully Received
                              </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>

                {isExpanded && poMovements.length > 0 && (
                  <TableRow className="bg-slate-50">
                    <TableCell colSpan={9} className="p-0">
                      <div className="px-12 py-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Stock Movements History ({poMovements.length})
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-white">
                              <TableHead>Date/Time</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead>To Location</TableHead>
                              <TableHead>Performed By</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {poMovements.map((movement) => (
                              <TableRow key={movement.id} className="bg-white">
                                <TableCell className="text-sm">
                                  {format(new Date(movement.created_date), 'dd/MM/yyyy HH:mm')}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {getProductName(movement.product_id)}
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                  {getProductSKU(movement.product_id)}
                                </TableCell>
                                <TableCell className="text-right text-sm font-semibold text-green-600">
                                  +{movement.quantity}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {movement.to_location || '-'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {getUserName(movement.performed_by)}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                  {movement.notes || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}


export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [productVendors, setProductVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPOs, setExpandedPOs] = useState(new Set());
  const [movements, setMovements] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCompletedPOs, setShowCompletedPOs] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPO, setEditingPO] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("10");

  const [formData, setFormData] = useState({
    po_number: '',
    vendor_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    status: 'Draft',
    items: [],
    notes: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [poData, vendorsData, productsData, pvData, movementsData, usersData] = await Promise.all([
        base44.entities.PurchaseOrder.list("-created_date"),
        base44.entities.Vendor.filter({ is_active: true }),
        base44.entities.Product.filter({ is_active: true }),
        base44.entities.ProductVendor.list(),
        base44.entities.StockMovement.list("-created_date"),
        base44.entities.User.list().catch(() => [])
      ]);

      const processedPOs = poData.map(po => {
        let updatedItems = po.items.map(item => {
          const receivedQty = movementsData
            .filter(m => m.reference_type === 'PurchaseOrder' && m.reference_id === po.id && m.product_id === item.product_id)
            .reduce((sum, m) => sum + m.quantity, 0);
          return { ...item, quantity_received: receivedQty };
        });

        let newStatus = po.status;
        const totalOrdered = updatedItems.reduce((sum, item) => sum + item.quantity_ordered, 0);
        const totalReceived = updatedItems.reduce((sum, item) => sum + (item.quantity_received || 0), 0);

        if (totalOrdered > 0) {
          if (totalReceived === totalOrdered) {
            newStatus = 'Received';
          } else if (totalReceived > 0) {
            if (newStatus !== 'Received' && newStatus !== 'Canceled') {
                newStatus = 'Partially Received';
            }
          }
        }

        return { ...po, items: updatedItems, status: newStatus };
      });

      setPurchaseOrders(processedPOs);
      setVendors(vendorsData);
      setProducts(productsData);
      setProductVendors(pvData);
      setMovements(movementsData);
      setUsers(usersData);

    } catch (error) {
      console.error("Error loading purchase orders:", error);
    }
    setIsLoading(false);
  };

  const generatePONumber = () => {
    const year = new Date().getFullYear();
    const existingPOs = purchaseOrders.filter(po => po.po_number?.startsWith(`PO-${year}`));
    const nextNumber = existingPOs.length + 1;
    return `PO-${year}-${String(nextNumber).padStart(4, '0')}`;
  };

  const handleCreateNew = () => {
    setFormData({
      po_number: generatePONumber(),
      vendor_id: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      status: 'Draft',
      items: [],
      notes: ''
    });
    setEditingPO(null);
    setShowCreateDialog(true);
  };

  const handleEdit = (po) => {
    setEditingPO(po);
    setFormData({
      po_number: po.po_number,
      vendor_id: po.vendor_id,
      order_date: po.order_date,
      expected_delivery_date: po.expected_delivery_date || '',
      status: po.status,
      items: po.items.map(item => ({
        ...item,
        quantity_ordered: item.quantity_ordered,
        input_unit_of_measure: item.input_unit_of_measure || '',
        conversion_rate: item.conversion_rate || 1,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
        expected_receipt_date: item.expected_receipt_date || '',
        bundle_quantity: item.bundle_quantity || null
      })),
      notes: po.notes || ''
    });
    setShowEditDialog(true);
  };

  const handleView = (po) => {
    setSelectedPO(po);
    setShowViewDialog(true);
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: '',
          quantity_ordered: 1,
          quantity_received: 0,
          input_unit_of_measure: '',
          conversion_rate: 1,
          unit_cost: 0,
          total_cost: 0,
          expected_receipt_date: prev.expected_delivery_date || '',
          bundle_quantity: null,
          vendor_product_code: ''
        }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getAvailableProductsForVendor = () => {
    if (!formData.vendor_id) return products.filter(p => p.is_active);
    
    // Get products that this vendor has in ProductVendor
    const vendorProductIds = productVendors
      .filter(pv => pv.vendor_id === formData.vendor_id && pv.is_active)
      .map(pv => pv.product_id);
    
    // Return vendor products first, then all other active products
    const vendorProducts = products.filter(p => p.is_active && vendorProductIds.includes(p.id));
    const otherProducts = products.filter(p => p.is_active && !vendorProductIds.includes(p.id));
    
    return [...vendorProducts, ...otherProducts];
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };

    if (field === 'product_id' && value && formData.vendor_id) {
      const pv = productVendors.find(
        pv => pv.product_id === value && pv.vendor_id === formData.vendor_id && pv.is_active
      );
      if (pv) {
        newItems[index].unit_cost = pv.unit_cost;
        newItems[index].vendor_product_code = pv.vendor_product_code;
      }
    }

    if (field === 'bundle_quantity') {
      const bundleQty = parseFloat(value) || null;
      newItems[index].is_bundle = bundleQty && bundleQty > 1;
    }

    if (field === 'quantity_ordered' || field === 'unit_cost' || field === 'bundle_quantity') {
      const qty = parseFloat(newItems[index].quantity_ordered) || 0;
      const cost = parseFloat(newItems[index].unit_cost) || 0;
      newItems[index].total_cost = qty * cost;
    }

    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    const vatAmount = subtotal * 0.19;
    const totalAmount = subtotal + vatAmount;
    return { subtotal, vatAmount, totalAmount };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      alert("Please select a vendor");
      return;
    }

    if (formData.items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    const hasEmptyProducts = formData.items.some(item => !item.product_id);
    if (hasEmptyProducts) {
      alert("Please select a product for all items");
      return;
    }

    setIsSaving(true);
    try {
      const { subtotal, vatAmount, totalAmount } = calculateTotals();

      const poData = {
        ...formData,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        payment_status: editingPO ? editingPO.payment_status : 'Unpaid'
      };

      if (editingPO) {
        await base44.entities.PurchaseOrder.update(editingPO.id, poData);
      } else {
        await base44.entities.PurchaseOrder.create(poData);
      }

      setShowCreateDialog(false);
      setShowEditDialog(false);
      setEditingPO(null);
      loadAllData();
    } catch (error) {
      console.error("Error saving purchase order:", error);
      alert("Failed to save purchase order. Please try again.");
    }
    setIsSaving(false);
  };

  const handleChangeStatus = async (po, newStatus) => {
    try {
      await base44.entities.PurchaseOrder.update(po.id, { status: newStatus });
      loadAllData();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  const getProductSKU = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.sku : '-';
  };

  const calculatePOCompletion = (po) => {
    if (!po.items || po.items.length === 0) return 0;

    const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity_ordered, 0);
    const totalReceived = po.items.reduce((sum, item) => sum + (item.quantity_received || 0), 0);

    return totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const vendor = vendors.find(v => v.id === po.vendor_id);
    const matchesSearch = searchTerm === "" ||
      po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const completion = calculatePOCompletion(po);
    const isCompleted = (completion === 100 && po.status === 'Received');

    if (!showCompletedPOs && isCompleted) {
      return false;
    }

    return matchesSearch;
  });

  const paginatedOrders = itemsPerPage === "all"
    ? filteredPOs
    : filteredPOs.slice(
        (currentPage - 1) * parseInt(itemsPerPage),
        currentPage * parseInt(itemsPerPage)
      );

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Draft': 'bg-slate-100 text-slate-800',
      'Sent': 'bg-blue-100 text-blue-800',
      'Confirmed': 'bg-green-100 text-green-800',
      'Partially Received': 'bg-yellow-100 text-yellow-800',
      'Received': 'bg-purple-100 text-purple-800',
      'Canceled': 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[status] || 'bg-slate-100 text-slate-800'}>{status}</Badge>;
  };

  const togglePOExpand = (poId) => {
    setExpandedPOs(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(poId)) {
        newExpanded.delete(poId);
      } else {
        newExpanded.add(poId);
      }
      return newExpanded;
    });
  };

  const getMovementsForPO = (poId) => {
    return movements.filter(m => m.reference_type === 'PurchaseOrder' && m.reference_id === poId);
  };

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.full_name || email;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
            <p className="text-slate-600 mt-1">Manage orders to vendors</p>
          </div>
          <Button
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Purchase Order
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{purchaseOrders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Confirmed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {purchaseOrders.filter(po => po.status === 'Confirmed').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Pending Receipt</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {purchaseOrders.filter(po => po.status === 'Confirmed' || po.status === 'Partially Received').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Total Value</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                €{purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-auto flex-grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by PO number or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-completed-pos"
              checked={showCompletedPOs}
              onCheckedChange={setShowCompletedPOs}
            />
            <Label htmlFor="show-completed-pos" className="text-sm">Show Completed POs</Label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <PurchaseOrdersTable
            orders={paginatedOrders}
            vendors={vendors}
            products={products}
            isLoading={isLoading}
            expandedPOs={expandedPOs}
            handleView={handleView}
            handleEdit={handleEdit}
            handleChangeStatus={handleChangeStatus}
            togglePOExpand={togglePOExpand}
            getMovementsForPO={getMovementsForPO}
            getProductName={getProductName}
            getProductSKU={getProductSKU}
            getUserName={getUserName}
            calculatePOCompletion={calculatePOCompletion}
            getStatusBadge={getStatusBadge}
          />

          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredPOs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Purchase Order</DialogTitle>
            <DialogDescription>
              Add products from a vendor to create a purchase order
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="po_number">PO Number *</Label>
                <Input
                  id="po_number"
                  value={formData.po_number}
                  onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="vendor">Vendor *</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_id: value, items: [] })}
                  required
                >
                  <SelectTrigger id="vendor">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                <Input
                  id="expected_delivery_date"
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Order Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  disabled={!formData.vendor_id}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {!formData.vendor_id && (
                <p className="text-sm text-slate-500 mb-4">Select a vendor first to add items</p>
              )}

              {formData.items.length > 0 && (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[250px]">Product *</TableHead>
                        <TableHead className="w-[150px]">Previous Purchase</TableHead>
                        <TableHead className="w-24">Qty *</TableHead>
                        <TableHead className="w-24">Unit</TableHead>
                        <TableHead className="w-24">Pcs/Qty</TableHead>
                        <TableHead className="w-32">Unit Cost (€) *</TableHead>
                        <TableHead className="w-32">Unit Cost/Pcs (€)</TableHead>
                        <TableHead className="w-28">Total (€)</TableHead>
                        <TableHead className="w-40">Expected Receipt</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.items.map((item, index) => {
                        const availableProducts = getAvailableProductsForVendor();
                        const vendorProductIds = productVendors
                          .filter(pv => pv.vendor_id === formData.vendor_id && pv.is_active)
                          .map(pv => pv.product_id);
                        
                        // Get previous purchases for this product
                        const previousPurchases = item.product_id ? 
                          movements
                            .filter(m => 
                              m.movement_type === 'IN' && 
                              m.product_id === item.product_id &&
                              m.reference_type === 'Vendor' &&
                              m.reference_id === formData.vendor_id
                            )
                            .slice(0, 5)
                            .map(m => ({
                              unit_cost: m.unit_cost,
                              vendor_product_code: m.vendor_product_code,
                              invoice_category_id: m.invoice_category_id,
                              notes: m.notes
                            }))
                            .filter((v, i, a) => a.findIndex(t => 
                              t.unit_cost === v.unit_cost && 
                              t.vendor_product_code === v.vendor_product_code
                            ) === i)
                          : [];
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <ProductSearchCombobox
                                products={availableProducts}
                                vendorProductIds={vendorProductIds}
                                value={item.product_id}
                                onValueChange={(value) => handleItemChange(index, 'product_id', value)}
                                placeholder="Select product..."
                              />
                            </TableCell>
                            <TableCell>
                              {previousPurchases.length > 0 ? (
                                <Select
                                  value=""
                                  onValueChange={(val) => {
                                    if (val !== 'new') {
                                      const purchase = previousPurchases[parseInt(val)];
                                      handleItemChange(index, 'unit_cost', purchase.unit_cost);
                                      handleItemChange(index, 'vendor_product_code', purchase.vendor_product_code);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="New / Previous" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="new">New Purchase</SelectItem>
                                    {previousPurchases.map((p, i) => (
                                      <SelectItem key={i} value={i.toString()}>
                                        €{p.unit_cost?.toFixed(2)} {p.vendor_product_code ? `(${p.vendor_product_code})` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-xs text-slate-400">New</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                max="999999"
                                step="1"
                                value={item.quantity_ordered}
                                onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)}
                                required
                                placeholder="Qty"
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.input_unit_of_measure || ''}
                                onValueChange={(val) => handleItemChange(index, 'input_unit_of_measure', val)}
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(() => {
                                    const product = products.find(p => p.id === item.product_id);
                                    if (product?.unit_of_measure === 'kg') {
                                      return (
                                        <>
                                          <SelectItem value={null}>-</SelectItem>
                                          <SelectItem value="g">g</SelectItem>
                                          <SelectItem value="kg">kg</SelectItem>
                                          <SelectItem value="ton">ton</SelectItem>
                                        </>
                                      );
                                    } else if (product?.unit_of_measure === 'liter') {
                                      return (
                                        <>
                                          <SelectItem value={null}>-</SelectItem>
                                          <SelectItem value="ml">ml</SelectItem>
                                          <SelectItem value="liter">L</SelectItem>
                                        </>
                                      );
                                    } else if (product?.unit_of_measure === 'meter') {
                                      return (
                                        <>
                                          <SelectItem value={null}>-</SelectItem>
                                          <SelectItem value="mm">mm</SelectItem>
                                          <SelectItem value="cm">cm</SelectItem>
                                          <SelectItem value="meter">m</SelectItem>
                                        </>
                                      );
                                    } else if (product?.unit_of_measure === 'piece') {
                                      return (
                                        <>
                                          <SelectItem value={null}>-</SelectItem>
                                          <SelectItem value="piece">pcs</SelectItem>
                                          <SelectItem value="box">box</SelectItem>
                                          <SelectItem value="pallet">pallet</SelectItem>
                                        </>
                                      );
                                    } else {
                                      return <SelectItem value={null}>{product?.unit_of_measure || '-'}</SelectItem>;
                                    }
                                  })()}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                max="999999"
                                step="1"
                                value={item.bundle_quantity || ''}
                                onChange={(e) => handleItemChange(index, 'bundle_quantity', e.target.value)}
                                placeholder="π.χ. 100 τεμ."
                                className="text-xs"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_cost}
                                onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                                required
                              />
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-slate-600">
                                {item.bundle_quantity && item.unit_cost ? 
                                  (item.unit_cost / item.bundle_quantity).toFixed(4) : '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">
                                {(item.total_cost || 0).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={item.expected_receipt_date || ''}
                                onChange={(e) => handleItemChange(index, 'expected_receipt_date', e.target.value)}
                                placeholder="Expected date"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {formData.items.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">€{calculateTotals().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (19%):</span>
                  <span className="font-semibold">€{calculateTotals().vatAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-blue-600">€{calculateTotals().totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Purchase Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
            <DialogDescription>
              Update purchase order details and items
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="po_number_edit">PO Number *</Label>
                <Input
                  id="po_number_edit"
                  value={formData.po_number}
                  onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="vendor_edit">Vendor *</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_id: value, items: [] })}
                  required
                >
                  <SelectTrigger id="vendor_edit">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order_date_edit">Order Date *</Label>
                <Input
                  id="order_date_edit"
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="expected_delivery_date_edit">Expected Delivery Date</Label>
                <Input
                  id="expected_delivery_date_edit"
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Order Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  disabled={!formData.vendor_id}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {!formData.vendor_id && (
                <p className="text-sm text-slate-500 mb-4">Select a vendor first to add items</p>
              )}

              {formData.items.length > 0 && (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                       <TableHead className="min-w-[250px]">Product *</TableHead>
                       <TableHead className="w-[150px]">Previous Purchase</TableHead>
                       <TableHead className="w-24">Qty *</TableHead>
                       <TableHead className="w-24">Unit</TableHead>
                       <TableHead className="w-24">Pcs/Qty</TableHead>
                       <TableHead className="w-32">Unit Cost (€) *</TableHead>
                       <TableHead className="w-32">Unit Cost/Pcs (€)</TableHead>
                       <TableHead className="w-28">Total (€)</TableHead>
                       <TableHead className="w-40">Expected Receipt</TableHead>
                       <TableHead className="w-16"></TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {formData.items.map((item, index) => {
                       const availableProducts = getAvailableProductsForVendor();
                       const vendorProductIds = productVendors
                         .filter(pv => pv.vendor_id === formData.vendor_id && pv.is_active)
                         .map(pv => pv.product_id);

                       // Get previous purchases for this product
                       const previousPurchases = item.product_id ? 
                         movements
                           .filter(m => 
                             m.movement_type === 'IN' && 
                             m.product_id === item.product_id &&
                             m.reference_type === 'Vendor' &&
                             m.reference_id === formData.vendor_id
                           )
                           .slice(0, 5)
                           .map(m => ({
                             unit_cost: m.unit_cost,
                             vendor_product_code: m.vendor_product_code,
                             invoice_category_id: m.invoice_category_id,
                             notes: m.notes
                           }))
                           .filter((v, i, a) => a.findIndex(t => 
                             t.unit_cost === v.unit_cost && 
                             t.vendor_product_code === v.vendor_product_code
                           ) === i)
                         : [];

                       return (
                         <TableRow key={index}>
                           <TableCell>
                             <ProductSearchCombobox
                               products={availableProducts}
                               vendorProductIds={vendorProductIds}
                               value={item.product_id}
                               onValueChange={(value) => handleItemChange(index, 'product_id', value)}
                               placeholder="Select product..."
                             />
                           </TableCell>
                           <TableCell>
                             {previousPurchases.length > 0 ? (
                               <Select
                                 value=""
                                 onValueChange={(val) => {
                                   if (val !== 'new') {
                                     const purchase = previousPurchases[parseInt(val)];
                                     handleItemChange(index, 'unit_cost', purchase.unit_cost);
                                     handleItemChange(index, 'vendor_product_code', purchase.vendor_product_code);
                                   }
                                 }}
                               >
                                 <SelectTrigger className="text-xs">
                                   <SelectValue placeholder="New / Previous" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="new">New Purchase</SelectItem>
                                   {previousPurchases.map((p, i) => (
                                     <SelectItem key={i} value={i.toString()}>
                                       €{p.unit_cost?.toFixed(2)} {p.vendor_product_code ? `(${p.vendor_product_code})` : ''}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                             ) : (
                               <span className="text-xs text-slate-400">New</span>
                             )}
                           </TableCell>
                           <TableCell>
                             <Input
                               type="number"
                               min="1"
                               max="999999"
                               step="1"
                               value={item.quantity_ordered}
                               onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)}
                               required
                               placeholder="Quantity"
                               className="w-full"
                             />
                           </TableCell>
                           <TableCell>
                             <Select
                               value={item.input_unit_of_measure || ''}
                               onValueChange={(val) => handleItemChange(index, 'input_unit_of_measure', val)}
                             >
                               <SelectTrigger className="text-xs">
                                 <SelectValue placeholder="-" />
                               </SelectTrigger>
                               <SelectContent>
                                 {(() => {
                                   const product = products.find(p => p.id === item.product_id);
                                   if (product?.unit_of_measure === 'kg') {
                                     return (
                                       <>
                                         <SelectItem value="g">g</SelectItem>
                                         <SelectItem value="kg">kg</SelectItem>
                                         <SelectItem value="ton">ton</SelectItem>
                                       </>
                                     );
                                   } else if (product?.unit_of_measure === 'liter') {
                                     return (
                                       <>
                                         <SelectItem value="ml">ml</SelectItem>
                                         <SelectItem value="liter">L</SelectItem>
                                       </>
                                     );
                                   } else if (product?.unit_of_measure === 'meter') {
                                     return (
                                       <>
                                         <SelectItem value="mm">mm</SelectItem>
                                         <SelectItem value="cm">cm</SelectItem>
                                         <SelectItem value="meter">m</SelectItem>
                                       </>
                                     );
                                   } else if (product?.unit_of_measure === 'piece') {
                                     return (
                                       <>
                                         <SelectItem value="piece">pcs</SelectItem>
                                         <SelectItem value="box">box</SelectItem>
                                         <SelectItem value="pallet">pallet</SelectItem>
                                       </>
                                     );
                                   } else {
                                     return <SelectItem value={product?.unit_of_measure || ''}>{product?.unit_of_measure || '-'}</SelectItem>;
                                   }
                                 })()}
                               </SelectContent>
                             </Select>
                           </TableCell>
                           <TableCell>
                             <Input
                               type="number"
                               min="1"
                               max="999999"
                               step="1"
                               value={item.bundle_quantity || ''}
                               onChange={(e) => handleItemChange(index, 'bundle_quantity', e.target.value)}
                               placeholder="π.χ. 100 τεμάχια"
                               className="text-xs"
                             />
                           </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_cost}
                                onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                                required
                              />
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-slate-600">
                                {item.bundle_quantity && item.unit_cost ? 
                                  (item.unit_cost / item.bundle_quantity).toFixed(4) : '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">
                                {(item.total_cost || 0).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={item.expected_receipt_date || ''}
                                onChange={(e) => handleItemChange(index, 'expected_receipt_date', e.target.value)}
                                placeholder="Expected date"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {formData.items.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">€{calculateTotals().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (19%):</span>
                  <span className="font-semibold">€{calculateTotals().vatAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-blue-600">€{calculateTotals().totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes_edit">Notes</Label>
              <Input
                id="notes_edit"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowEditDialog(false);
                setEditingPO(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Purchase Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              {selectedPO?.po_number}
            </DialogDescription>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Vendor</Label>
                  <p className="font-medium">{vendors.find(v => v.id === selectedPO.vendor_id)?.name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPO.status)}</div>
                </div>
                <div>
                  <Label className="text-slate-600">Order Date</Label>
                  <p className="font-medium">{format(new Date(selectedPO.order_date), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Expected Delivery</Label>
                  <p className="font-medium">
                    {selectedPO.expected_delivery_date ? format(new Date(selectedPO.expected_delivery_date), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-slate-600 mb-2 block">Order Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Qty Ordered</TableHead>
                      <TableHead>Qty Received</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expected Receipt</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items?.map((item, index) => {
                      const isFullyReceived = item.quantity_received >= item.quantity_ordered;
                      const isPartiallyReceived = item.quantity_received > 0 && item.quantity_received < item.quantity_ordered;
                      const isPending = item.quantity_received === 0;

                      return (
                        <TableRow key={index}>
                          <TableCell>{getProductName(item.product_id)}</TableCell>
                          <TableCell className="font-mono text-sm">{getProductSKU(item.product_id)}</TableCell>
                          <TableCell>{item.quantity_ordered}</TableCell>
                          <TableCell>{item.quantity_received || 0}</TableCell>
                          <TableCell>
                            {isFullyReceived && (
                              <Badge className="bg-green-100 text-green-800">Received</Badge>
                            )}
                            {isPartiallyReceived && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Partial ({Math.round(((item.quantity_received || 0) / item.quantity_ordered) * 100)}%)
                              </Badge>
                            )}
                            {isPending && (
                              <Badge className="bg-slate-100 text-slate-800">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.expected_receipt_date ? format(new Date(item.expected_receipt_date), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell>€{(item.unit_cost || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">€{(item.total_cost || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">€{(selectedPO.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (19%):</span>
                  <span className="font-semibold">€{(selectedPO.vat_amount || 0).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-blue-600">€{(selectedPO.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              {selectedPO.notes && (
                <div>
                  <Label className="text-slate-600">Notes</Label>
                  <p className="mt-1 text-slate-700">{selectedPO.notes}</p>
                </div>
              )}

              {getMovementsForPO(selectedPO.id).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Stock Movements History
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date/Time</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead>To Location</TableHead>
                          <TableHead>Performed By</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getMovementsForPO(selectedPO.id).map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="text-sm">
                              {format(new Date(movement.created_date), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getProductName(movement.product_id)}
                            </TableCell>
                            <TableCell className="text-sm font-mono">
                              {getProductSKU(movement.product_id)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-green-600">
                              +{movement.quantity}
                            </TableCell>
                            <TableCell className="text-sm">
                              {movement.to_location || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getUserName(movement.performed_by)}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {movement.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}