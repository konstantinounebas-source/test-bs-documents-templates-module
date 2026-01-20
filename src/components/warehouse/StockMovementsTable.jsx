import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Loader2, Eye, Edit } from "lucide-react";

// Helper to format dates in Cyprus/Athens timezone
const formatLocalDateTime = (dateString) => {
  try {
    if (!dateString) return 'N/A';
    
    // Force UTC interpretation by adding Z if not present
    let utcDateString = dateString;
    if (!dateString.endsWith('Z') && !dateString.includes('+')) {
      // Remove any existing timezone info and add Z
      utcDateString = dateString.replace(/[+-]\d{2}:\d{2}$/, '') + 'Z';
    }
    
    const utcDate = new Date(utcDateString);
    
    // Check if date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date:', dateString);
      return 'Invalid Date';
    }
    
    // Format to Cyprus/Athens time (UTC+2 winter, UTC+3 summer)
    const formatted = utcDate.toLocaleString('en-GB', {
      timeZone: 'Europe/Athens',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    return formatted;
  } catch (error) {
    console.error('Date formatting error:', error, 'for date:', dateString);
    return 'Invalid Date';
  }
};

export default function StockMovementsTable({ movements, products, users, isLoading, onView, onEdit }) {
  const [sortConfig, setSortConfig] = useState({ key: 'created_date', direction: 'desc' });

  const getProductInfo = (productId) => {
    const product = products.find(p => p.id === productId);
    return product || { name: 'Unknown', sku: 'N/A', unit_of_measure: '' };
  };

  const calculateDisplayQuantity = (movement) => {
    // If base_quantity exists and is valid, use it
    if (movement.base_quantity && movement.base_quantity > 0) {
      return movement.base_quantity;
    }
    
    // Otherwise, calculate it from quantity, conversion_rate, and bundle_quantity
    const quantity = parseFloat(movement.quantity) || 0;
    const conversionRate = parseFloat(movement.conversion_rate) || 1;
    const bundleQuantity = parseFloat(movement.bundle_quantity) || null;
    
    if (bundleQuantity) {
      return quantity * conversionRate * bundleQuantity;
    }
    
    return quantity * conversionRate;
  };

  const getUserName = (identifier) => {
    if (!identifier) return 'System';
    
    const userByEmail = users.find(u => u.email === identifier);
    if (userByEmail) return userByEmail.full_name || userByEmail.email;
    
    const userById = users.find(u => u.id === identifier);
    if (userById) return userById.full_name || userById.email;
    
    return identifier;
  };

  const movementTypeColors = {
    IN: 'bg-green-100 text-green-800',
    OUT: 'bg-red-100 text-red-800',
    TRANSFER: 'bg-blue-100 text-blue-800',
    ADJUSTMENT: 'bg-orange-100 text-orange-800',
    default: 'bg-gray-100 text-gray-800'
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedMovements = [...movements].sort((a, b) => {
    if (sortConfig.key === 'created_date') {
      const dateA = new Date(a.created_date).getTime();
      const dateB = new Date(b.created_date).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('created_date')} className="font-semibold px-0 h-auto">
                Date/Time (Cyprus)
                {sortConfig.key === 'created_date' && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                )}
                {sortConfig.key !== 'created_date' && (
                  <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
                )}
              </Button>
            </TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Total Value</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Charged To</TableHead>
            <TableHead>Waybill</TableHead>
            <TableHead>Performed By</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={12} className="h-24 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
              </TableCell>
            </TableRow>
          ) : sortedMovements.length > 0 ? (
            sortedMovements.map((movement) => {
              const product = getProductInfo(movement.product_id);
              const formattedDateTime = formatLocalDateTime(movement.created_date);

              return (
                <TableRow key={movement.id} className="hover:bg-slate-50">
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {formattedDateTime}
                  </TableCell>
                  <TableCell>
                    <Badge className={`flex items-center gap-1 w-fit ${movementTypeColors[movement.movement_type] || movementTypeColors.default}`}>
                      {movement.movement_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{product.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={
                      movement.movement_type === 'IN' ? 'text-green-600' :
                      movement.movement_type === 'OUT' ? 'text-red-600' :
                      'text-slate-900'
                    }>
                      {calculateDisplayQuantity(movement)} {product.unit_of_measure}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {movement.total_value && parseFloat(movement.total_value) > 0 ? (
                      <span className="text-blue-600">
                        €{parseFloat(movement.total_value).toFixed(2)}
                      </span>
                    ) : movement.base_unit_cost && parseFloat(movement.base_unit_cost) > 0 ? (
                      <span className="text-blue-600">
                        €{(parseFloat(movement.base_unit_cost) * calculateDisplayQuantity(movement)).toFixed(2)}
                      </span>
                    ) : movement.unit_cost && parseFloat(movement.unit_cost) > 0 && parseFloat(movement.quantity) > 0 ? (
                      <span className="text-blue-600">
                        €{(parseFloat(movement.unit_cost) * parseFloat(movement.quantity)).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {movement.from_location || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {movement.to_location || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {movement.charged_to_person ? (
                      <div className="text-sm">
                        <div className="font-medium">{getUserName(movement.charged_to_person)}</div>
                        <Badge variant="outline" className="text-xs mt-1">Charged</Badge>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {movement.waybill_number || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getUserName(movement.performed_by)}
                  </TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">
                    {movement.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(movement)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(movement)}
                        title="Edit Movement"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={12} className="h-24 text-center">
                <p className="text-slate-500">No stock movements found.</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}