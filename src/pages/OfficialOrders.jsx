import React, { useState, useEffect } from 'react';
import { OfficialOrderDocument } from "@/entities/OfficialOrderDocument";
import { Button } from "@/components/ui/button";
import { Plus, BookMarked } from "lucide-react";
import OfficialOrderTable from "../components/officialorders/OfficialOrderTable";
import CreateEditOfficialOrderDialog from "../components/officialorders/CreateEditOfficialOrderDialog";

export default function OfficialOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await OfficialOrderDocument.list("-created_date");
      setOrders(data);
    } catch (error) {
      console.error("Error loading official orders:", error);
    }
    setIsLoading(false);
  };

  const handleOrderSaved = () => {
    setShowCreateDialog(false);
    setEditingOrder(null);
    loadOrders();
  };

  const handleCreateNew = () => {
    setEditingOrder(null);
    setShowCreateDialog(true);
  };
  
  const handleEdit = (order) => {
    setEditingOrder(order);
    setShowCreateDialog(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Official Orders</h1>
            <p className="text-slate-600 mt-1">Manage main order documents that include multiple bus stops</p>
          </div>
          <Button 
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Official Order
          </Button>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <OfficialOrderTable 
            items={orders} 
            isLoading={isLoading}
            onEdit={handleEdit}
          />
        </div>
      </div>

      <CreateEditOfficialOrderDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        item={editingOrder}
        onItemSaved={handleOrderSaved}
      />
    </div>
  );
}