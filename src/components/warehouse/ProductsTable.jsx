import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Eye, AlertTriangle, Power, PowerOff, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import CreateEditProductDialog from "./CreateEditProductDialog";
import ViewProductDialog from "./ViewProductDialog";

export default function ProductsTable({ 
  products, 
  categories, 
  vendors, 
  stockItems,
  productVendors,
  isLoading, 
  onProductSaved,
  getStockForProduct,
  selectedProductIds = [],
  onToggleSelection
}) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [productToToggle, setProductToToggle] = useState(null);

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  };

  const handleView = (product) => {
    setSelectedProduct(product);
    setShowViewDialog(true);
  };

  const handleToggleActive = async () => {
    if (!productToToggle) return;
    try {
      await base44.entities.Product.update(productToToggle.id, {
        is_active: !productToToggle.is_active
      });
      onProductSaved();
      setShowToggleDialog(false);
      setProductToToggle(null);
    } catch (error) {
      console.error("Error toggling product status:", error);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'N/A';
  };

  const getProductVendors = (productId) => {
    return productVendors.filter(pv => pv.product_id === productId && pv.is_active);
  };

  const renderUnitCost = (product) => {
    const pvs = getProductVendors(product.id);
    
    if (pvs.length === 0) {
      return <span className="text-slate-400 text-sm">No vendors</span>;
    }
    
    const preferredPV = pvs.find(pv => pv.is_preferred);
    
    if (preferredPV) {
      return (
        <div className="flex items-center gap-1">
          <span className="font-semibold">€{preferredPV.unit_cost.toFixed(2)}</span>
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
        </div>
      );
    }
    
    if (pvs.length === 1) {
      return <span>€{pvs[0].unit_cost.toFixed(2)}</span>;
    }
    
    // Multiple vendors, show range
    const costs = pvs.map(pv => pv.unit_cost);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    
    return (
      <div>
        <div className="font-semibold">€{minCost.toFixed(2)} - €{maxCost.toFixed(2)}</div>
        <div className="text-xs text-slate-500">{pvs.length} vendors</div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500">No products found. Create your first product to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-12"></TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Minimum Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const currentStock = getStockForProduct(product.id);
              const isLowStock = currentStock < (product.minimum_stock || 0);
              
              return (
                <TableRow key={product.id} className="hover:bg-slate-50">
                  <TableCell>
                    {onToggleSelection && (
                      <Checkbox
                        checked={selectedProductIds.includes(product.id)}
                        onCheckedChange={() => onToggleSelection(product.id)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-slate-600">
                    {product.description || '-'}
                  </TableCell>
                  <TableCell>{getCategoryName(product.category_id)}</TableCell>
                  <TableCell>{renderUnitCost(product)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={isLowStock ? 'text-red-600 font-semibold' : ''}>
                        {currentStock} {product.unit_of_measure}
                      </span>
                      {isLowStock && (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{product.minimum_stock || 0} {product.unit_of_measure}</TableCell>
                  <TableCell>
                    <Badge className={product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleView(product)} title="View Details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} title="Edit Product">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setProductToToggle(product);
                          setShowToggleDialog(true);
                        }}
                        title={product.is_active ? "Deactivate Product" : "Activate Product"}
                        className={product.is_active ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                      >
                        {product.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CreateEditProductDialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedProduct(null);
        }}
        onProductSaved={onProductSaved}
        product={selectedProduct}
        categories={categories}
        vendors={vendors}
      />

      <ViewProductDialog
        open={showViewDialog}
        onClose={() => {
          setShowViewDialog(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        categories={categories}
        vendors={vendors}
        stockItems={stockItems}
      />

      <AlertDialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {productToToggle?.is_active ? 'Deactivate Product' : 'Activate Product'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {productToToggle?.is_active ? (
                <>
                  Are you sure you want to deactivate "{productToToggle?.name}"? 
                  <br /><br />
                  <strong>This will:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Hide the product from new operations</li>
                    <li>Preserve all historical data (stock movements, purchase orders, etc.)</li>
                    <li>Keep existing stock records intact</li>
                  </ul>
                  <br />
                  You can reactivate the product at any time.
                </>
              ) : (
                <>
                  Are you sure you want to activate "{productToToggle?.name}"? 
                  <br /><br />
                  The product will become available for new operations.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggleActive}
              className={productToToggle?.is_active ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"}
            >
              {productToToggle?.is_active ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}