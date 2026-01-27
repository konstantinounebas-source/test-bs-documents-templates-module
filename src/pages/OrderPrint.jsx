import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OrderPrintPage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const orders = await base44.entities.Order.list();
      return orders.find(o => o.id === orderId);
    },
    enabled: !!orderId
  });

  const { data: orderLines = [] } = useQuery({
    queryKey: ['orderLines', orderId],
    queryFn: async () => {
      return await base44.entities.OrderLine.filter({ order_id: orderId });
    },
    enabled: !!orderId
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

  const isCriticalStop = (stopId) => {
    const stop = stops.find(s => s.id === stopId);
    return stop?.shelter_installed === true && stop?.all_stickers_installed === false;
  };

  const handlePrint = () => {
    window.print();
  };

  if (!order) {
    return <div className="p-6">Loading...</div>;
  }

  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print-container {
            padding: 20mm;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
        @page {
          size: A4;
          margin: 15mm;
        }
      `}</style>

      <div className="no-print p-4 bg-white border-b flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate(createPageUrl("OrdersManagement"))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      <div className="print-container bg-white p-8 max-w-[210mm] mx-auto">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">STICKER ORDER</h1>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="font-semibold text-lg">#{order.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold text-lg">{order.status}</p>
            </div>
          </div>
        </div>

        {/* Order Information */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">Vendor</p>
            <p className="text-base">{order.vendor || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Order Date</p>
            <p className="text-base">{order.order_date}</p>
          </div>
          {order.reason && (
            <div>
              <p className="text-sm font-semibold text-gray-700">Reason</p>
              <p className="text-base">{order.reason}</p>
            </div>
          )}
        </div>

        {/* Order Items Table */}
        <table className="w-full border-collapse border border-gray-300 mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Stop ID</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Greek Name</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">English Name</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Sticker Name/Category</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold w-20">Quantity</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold w-24">Critical</th>
            </tr>
          </thead>
          <tbody>
            {orderLines.map((line) => {
              const item = stickerItems.find(i => i.id === line.sticker_item_id);
              const stop = stops.find(s => s.id === item?.stop_id);
              const template = stickerTemplates.find(t => t.id === item?.sticker_template_id);
              const critical = item && isCriticalStop(item.stop_id);

              return (
                <tr key={line.id} className={critical ? "bg-red-50" : ""}>
                  <td className="border border-gray-300 px-3 py-2 text-sm font-medium">
                    {stop?.stop_id || "-"}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">
                    {stop?.greek_name || "-"}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">
                    {stop?.english_name || "-"}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">
                    {template?.sticker_name_category || "-"}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-center font-semibold">
                    {line.ordered_quantity}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {critical && (
                      <div className="flex items-center justify-center gap-1">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="text-red-600 font-bold text-sm">YES</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        <div className="mb-8 p-4 bg-gray-50 rounded">
          <p className="font-semibold">Total Items: {orderLines.length}</p>
          <p className="font-semibold text-red-600">
            Critical Stops: {orderLines.filter(line => {
              const item = stickerItems.find(i => i.id === line.sticker_item_id);
              return item && isCriticalStop(item.stop_id);
            }).length}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-4 mt-8">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Printed Date</p>
              <p className="font-semibold">{printDate}</p>
            </div>
            <div>
              <p className="text-gray-600">Printed By</p>
              <p className="font-semibold">{user?.full_name || user?.email || "-"}</p>
            </div>
          </div>
        </div>

        {/* Critical Note */}
        <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-600 rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">CRITICAL STOPS</p>
              <p className="text-sm text-red-700">
                Items marked as CRITICAL are for stops where the shelter is installed but stickers are missing. These require urgent attention.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}