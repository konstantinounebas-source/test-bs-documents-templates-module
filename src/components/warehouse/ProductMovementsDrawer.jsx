import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Edit } from "lucide-react";
import { format } from "date-fns";

export default function ProductMovementsDrawer({ isOpen, onOpenChange, productId, productName, onEditMovement, vendors = [] }) {
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (isOpen && productId) {
      loadMovements();
    }
  }, [isOpen, productId]);

  const loadMovements = async () => {
    setIsLoading(true);
    try {
      const [movementsData, usersData] = await Promise.all([
        base44.entities.StockMovement.filter({ product_id: productId }, "-created_date"),
        base44.entities.User.list().catch(() => [])
      ]);
      
      setMovements(movementsData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading movements:", error);
    }
    setIsLoading(false);
  };

  const getUserName = (identifier) => {
    if (!identifier) return "-";
    const user = users.find(u => u.id === identifier || u.email === identifier);
    return user?.full_name || identifier;
  };

  const getVendorName = (vendorId) => {
    if (!vendorId) return "-";
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || "-";
  };

  const getMovementTypeBadge = (type) => {
    const variants = {
      "IN": "bg-green-100 text-green-800",
      "OUT": "bg-red-100 text-red-800",
      "ADJUSTMENT": "bg-yellow-100 text-yellow-800"
    };
    return variants[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl"  style={{ maxHeight: '80vh' }}>
        <DialogHeader>
          <DialogTitle>{productName}</DialogTitle>
          <DialogDescription>
            Complete movement history for this product
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(80vh-120px)] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No movements found for this product
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(movement.created_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge className={getMovementTypeBadge(movement.movement_type)}>
                        {movement.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {movement.base_quantity || movement.quantity}
                    </TableCell>
                    <TableCell className="text-sm">
                      {movement.warehouse_location || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getUserName(movement.created_by)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getVendorName(movement.vendor_id)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      €{(movement.total_item_cost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {onEditMovement && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            onEditMovement(movement);
                            onOpenChange(false);
                          }}
                          title="Edit movement"
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}