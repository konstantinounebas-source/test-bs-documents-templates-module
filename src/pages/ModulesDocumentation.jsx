import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, BookOpen } from "lucide-react";

export default function ModulesDocumentation() {
  const modules = [
    {
      name: "My Workspace",
      description: "Personal task management and scheduling system for users",
      functions: [
        "Manage daily tasks and action items",
        "Weekly schedule planning and calendar management",
        "Daily time tracking and productivity logging",
        "Performance metrics and weekly overview"
      ],
      tables: ["UserTask", "ScheduledEvent", "Holiday", "WorkSchedule", "UserTaskLog"]
    },
    {
      name: "Document Templates",
      description: "Enterprise document and form template management system",
      functions: [
        "Create and manage document templates",
        "Generate interactive AI-powered forms",
        "Manage template approvals and versioning",
        "Define custom fields and data lookup tables"
      ],
      tables: ["FormTemplate", "FormData", "TemplateCategory", "TemplateStatusOption", "TemplateAvailabilityOption", "CustomFieldLabel"]
    },
    {
      name: "Warehouse & Stock",
      description: "Inventory and warehouse management system",
      functions: [
        "Track stock levels and inventory movements",
        "Manage products, vendors and categories",
        "Process purchase orders",
        "Calculate installation capacity",
        "Barcode scanning and stock operations"
      ],
      tables: ["StockItem", "StockMovement", "Product", "Vendor", "ProductCategory", "PurchaseOrder", "WarehouseLocation"]
    },
    {
      name: "Stickers & Installation",
      description: "Bus stop sticker template and installation tracking system",
      functions: [
        "Manage bus stops and shelter types",
        "Create sticker templates and requirements",
        "Track sticker orders, receipts and handovers",
        "Monitor sticker installation status",
        "Log all sticker movements and custody changes"
      ],
      tables: ["Stop", "ShelterType", "StickerTemplate", "StickerItem", "Order", "OrderLine", "Receipt", "StickerHandover", "StickerMovementLog"]
    },
    {
      name: "Delivery Management",
      description: "Field delivery and snagging management system",
      functions: [
        "Track bus stop deliveries",
        "Manage snagging items and defects",
        "Mobile field work and data collection",
        "Plan repair routes and schedules",
        "Generate delivery analytics and reports"
      ],
      tables: ["BusStop", "SnaggingList", "SnagLog", "DeliveryLog", "StateOfDelivery"]
    },
    {
      name: "Bus Stop Orders Management",
      description: "Official orders and bus stop allocation system",
      functions: [
        "Manage official order documents",
        "Allocate bus stops to orders",
        "Define order-related field options and configurations"
      ],
      tables: ["OfficialOrderDocument", "BusStopOrder"]
    },
    {
      name: "Manufacturing Production",
      description: "Production planning and tracking system",
      functions: [
        "Define operations, departments and QC types",
        "Manage production standards and bundles",
        "Plan production targets and scheduling",
        "Enter daily production data",
        "Track KPIs and performance metrics"
      ],
      tables: ["Department", "Operation", "QC_Type", "Std_Set", "QC_Set", "Profile_Set", "Batch_Header", "Daily_KPI_Run"]
    },
    {
      name: "System Management",
      description: "User access, permissions and system configuration",
      functions: [
        "Manage platform and app users",
        "Configure access control and permissions",
        "Manage application versions",
        "Track audit logs for compliance",
        "Monitor platform changes and improvements"
      ],
      tables: ["User", "AppUser", "AccessProfile", "PagePermission", "AuditLog", "AppVersion", "PlatformChangeLog"]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">System Modules Documentation</h1>
          <p className="text-lg text-slate-600">
            Complete reference guide for all modules, their functions, and database tables
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid gap-6">
          {modules.map((module, idx) => (
            <Card key={idx} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl text-slate-900">{module.name}</CardTitle>
                    <CardDescription className="text-base mt-2">{module.description}</CardDescription>
                  </div>
                  <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0 ml-4" />
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* Functions Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900 text-lg">Core Functions</h3>
                  <ul className="space-y-2">
                    {module.functions.map((func, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-blue-600 font-bold mt-0.5">•</span>
                        <span className="text-slate-700">{func}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tables Section */}
                <div className="space-y-3 border-t pt-6">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900 text-lg">Database Tables</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {module.tables.map((table, i) => (
                      <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-800 font-mono text-xs py-1.5 px-2.5">
                        {table}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-sm text-slate-700">
            <strong>Note:</strong> This documentation provides an overview of all system modules and their associated database tables. 
            Use the Access Control page to manage user permissions for each module.
          </p>
        </div>
      </div>
    </div>
  );
}