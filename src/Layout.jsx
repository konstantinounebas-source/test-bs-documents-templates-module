import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  FileText,
  Settings,
  FolderOpen,
  Database,
  BookOpen,
  Users,
  ScrollText,
  Users2,
  CheckSquare,
  ShieldQuestion,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  BookMarked,
  CalendarIcon,
  LogOut,
  CalendarDays,
  ClipboardCheck,
  TrendingUp,
  UserCog,
  ShieldCheck,
  ChevronLeft,
  Package,
  Warehouse,
  Truck,
  BarChart3,
  ShoppingCart,
  Boxes,
  ScanBarcode,
  Loader2,
  MapPin,
  AlertTriangle,
  List, // Added List icon
  Smartphone, // Added Smartphone icon
  Route, // Added Route icon
  Sticker, // Added Sticker icon
  PackageCheck, // Added PackageCheck icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Toaster } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// IMPORTANT: Update this version number when deploying a new version
const CURRENT_APP_VERSION = "1.0.0";

const allNavigationGroups = [
  {
    id: 'my-workspace',
    label: 'My Workspace',
    items: [
      {
        title: "My Tasks",
        url: createPageUrl("MyWorkday"),
        icon: ClipboardList,
        description: "Your personal daily tasks and actions",
        pageKey: "MyWorkday"
      },
      {
        title: "My Week Planner",
        url: createPageUrl("WeeklySchedule"),
        icon: CalendarDays,
        description: "Manage your weekly schedule and appointments",
        pageKey: "WeeklySchedule"
      },
      {
        title: "My Daily Log",
        url: createPageUrl("DailyTracker"),
        icon: ClipboardCheck,
        description: "Track and log time for your daily tasks",
        pageKey: "DailyTracker"
      },
      {
        title: "My Week Productivity",
        url: createPageUrl("WeeklyOverview"),
        icon: TrendingUp,
        description: "Performance metrics and weekly summary",
        pageKey: "WeeklyOverview"
      },
      {
        title: "My Calendar Settings",
        url: createPageUrl("Holidays"),
        icon: CalendarIcon,
        description: "Manage personal leaves, schedule, and calendar preferences",
        pageKey: "Holidays"
      },
      {
        title: "Workspace Settings",
        url: createPageUrl("WorkspaceSettings"),
        icon: UserCog,
        description: "Manage company holidays and user visibility (Admin only)",
        pageKey: "WorkspaceSettings"
      },
      {
        title: "My Workspace User Guide",
        url: createPageUrl("MyWorkspaceUserGuide"),
        icon: BookOpen,
        description: "Complete guide for using the My Workspace module",
        pageKey: "MyWorkspaceUserGuide"
      },
    ]
  },
  {
    id: 'document-templates',
    label: 'Document Templates',
    items: [
      {
        title: "Templates",
        url: createPageUrl("Templates"),
        icon: FileText,
        description: "Manage all document templates",
        pageKey: "Templates"
      },
      {
        title: "Interactive Forms",
        url: createPageUrl("InteractiveForms"),
        icon: BookOpen,
        description: "AI-generated interactive forms",
        pageKey: "InteractiveForms"
      },
      {
        title: "Approvals",
        url: createPageUrl("Approvals"),
        icon: CheckSquare,
        description: "Review pending approvals",
        pageKey: "Approvals"
      },
      {
        title: "Documents Fields & Data Definitions",
        url: createPageUrl("DocumentFieldsDataDefinitions"),
        icon: Settings,
        description: "Manage lookup tables and system configuration",
        pageKey: "DocumentFieldsDataDefinitions"
      },
      {
        title: "User Guide",
        url: createPageUrl("UserGuide"),
        icon: HelpCircle,
        description: "Instructions for using the app",
        pageKey: "UserGuide"
      },
    ]
  },
  {
    id: 'warehouse-stock',
    label: 'Warehouse & Stock',
    items: [
      {
        title: "Barcode Scanner",
        url: createPageUrl("BarcodeScanner"),
        icon: ScanBarcode,
        description: "Scan barcodes for stock operations",
        pageKey: "BarcodeScanner"
      },
      {
        title: "Stock Overview",
        url: createPageUrl("StockOverview"),
        icon: Warehouse,
        description: "View current stock levels and locations",
        pageKey: "StockOverview"
      },
      {
        title: "Charged Materials Report",
        url: createPageUrl("ChargedMaterialsReport"),
        icon: ClipboardList,
        description: "View materials charged to each person",
        pageKey: "ChargedMaterialsReport"
      },
      {
        title: "Stock Movements",
        url: createPageUrl("StockMovements"),
        icon: TrendingUp,
        description: "Track all inventory movements",
        pageKey: "StockMovements"
      },
      {
        title: "Installation Capacity",
        url: createPageUrl("InstallationCapacity"),
        icon: BarChart3,
        description: "Calculate how many bus stops can be installed",
        pageKey: "InstallationCapacity"
      },
      {
        title: "Products",
        url: createPageUrl("Products"),
        icon: Package,
        description: "Manage products and inventory items",
        pageKey: "Products"
      },
      {
        title: "Vendors & Categories",
        url: createPageUrl("VendorsCategories"),
        icon: Truck,
        description: "Manage vendors and product categories",
        pageKey: "VendorsCategories"
      },
      {
        title: "Purchase Orders",
        url: createPageUrl("PurchaseOrders"),
        icon: ShoppingCart,
        description: "Manage orders to vendors",
        pageKey: "PurchaseOrders"
      },
      {
        title: "Bus Stop Types & BOM",
        url: createPageUrl("BusStopTypesBOM"),
        icon: Boxes,
        description: "Manage bus stop types and Bill of Materials",
        pageKey: "BusStopTypesBOM"
      },
      {
        title: "User Guide",
        url: createPageUrl("WarehouseUserGuide"),
        icon: HelpCircle,
        description: "Instructions for using the warehouse module",
        pageKey: "WarehouseUserGuide"
      }
    ]
  },
  {
    id: 'stickers-installation',
    label: 'Stickers & Installation',
    items: [
      {
        title: "Dashboard",
        url: createPageUrl("Dashboard"),
        icon: BarChart3,
        description: "Operational overview",
        pageKey: "Dashboard"
      },
      {
        title: "Stops",
        url: createPageUrl("Stops"),
        icon: MapPin,
        description: "Manage bus stops",
        pageKey: "Stops"
      },
      {
        title: "Shelter Types",
        url: createPageUrl("ShelterTypes"),
        icon: Boxes,
        description: "Manage shelter types",
        pageKey: "ShelterTypes"
      },
      {
        title: "Sticker Templates",
        url: createPageUrl("StickerTemplates"),
        icon: Sticker,
        description: "Manage sticker templates",
        pageKey: "StickerTemplates"
      },
      {
        title: "Sticker Items",
        url: createPageUrl("StickerItems"),
        icon: Sticker,
        description: "View all sticker items",
        pageKey: "StickerItems"
      },
      {
        title: "Stops & Stickers",
        url: createPageUrl("StopsWithStickers"),
        icon: Sticker,
        description: "View stops with their stickers",
        pageKey: "StopsWithStickers"
      },
      {
        title: "Orders Management",
        url: createPageUrl("OrdersManagement"),
        icon: ShoppingCart,
        description: "Create and manage sticker orders",
        pageKey: "OrdersManagement"
      },
      {
        title: "Receive Stickers",
        url: createPageUrl("Receipts"),
        icon: PackageCheck,
        description: "Receive sticker orders",
        pageKey: "Receipts"
      },
      {
        title: "Handover to Technician",
        url: createPageUrl("StickerHandovers"),
        icon: Users,
        description: "Hand stickers to technicians",
        pageKey: "StickerHandovers"
      },
      {
        title: "Movement Logs",
        url: createPageUrl("StickerMovementLogs"),
        icon: ScrollText,
        description: "View all sticker movements",
        pageKey: "StickerMovementLogs"
      },
      {
        title: "Stickers & Installation User Guide",
        url: createPageUrl("StickersInstallationUserGuide"),
        icon: HelpCircle,
        description: "Instructions for stickers and installation management",
        pageKey: "StickersInstallationUserGuide"
      }
      ]
      },
  {
    id: 'delivery-management',
    label: 'Delivery Management',
    items: [
      {
        title: "Delivery Reporting",
        url: createPageUrl("DeliveryReporting"),
        icon: BarChart3,
        description: "Analytics and custom reporting for deliveries",
        pageKey: "DeliveryReporting"
      },
      {
        title: "Mobile Field Work",
        url: createPageUrl("MobileFieldWork"),
        icon: Smartphone,
        description: "Mobile app for field work and snag management",
        pageKey: "MobileFieldWork"
      },
      {
        title: "Repair Routes",
        url: createPageUrl("RepairRoutes"),
        icon: Route,
        description: "Plan optimal repair routes and schedules",
        pageKey: "RepairRoutes"
      },
      {
        title: "Bus Stop Delivery",
        url: createPageUrl("BusStopDelivery"),
        icon: MapPin,
        description: "Manage bus stop deliveries and status",
        pageKey: "BusStopDelivery"
      },
      {
        title: "Snagging List",
        url: createPageUrl("SnaggingList"),
        icon: AlertTriangle,
        description: "Track and manage snagging items",
        pageKey: "SnaggingList"
      },
      {
        title: "Delivery Logs",
        url: createPageUrl("DeliveryLogs"),
        icon: ScrollText,
        description: "View delivery history and logs",
        pageKey: "DeliveryLogs"
      },
      {
        title: "Delivery Fields & Data Definitions",
        url: createPageUrl("DeliveryFieldsDataDefinitions"),
        icon: List,
        description: "Manage delivery field options",
        pageKey: "DeliveryFieldsDataDefinitions"
      },
      {
        title: "User Guide",
        url: createPageUrl("DeliveryUserGuide"),
        icon: HelpCircle,
        description: "Instructions for using the delivery management module",
        pageKey: "DeliveryUserGuide"
      }
    ]
  },
  {
    id: 'administration',
    label: 'Administration',
    subgroups: [
      {
        id: 'bus-stop-orders-management',
        label: 'Bus Stop Orders Management',
        items: [
          {
            title: "Official Orders",
            url: createPageUrl("OfficialOrders"),
            icon: BookMarked,
            description: "Manage main order documents",
            pageKey: "OfficialOrders"
          },
          {
            title: "Bus Stop Order Allocation",
            url: createPageUrl("BSOrder"),
            icon: ClipboardList,
            description: "Manage bus stop order allocations",
            pageKey: "BSOrder"
          },
          {
            title: "BS Order Fields & Data Definitions",
            url: createPageUrl("BSOrderFieldsDataDefinitions"),
            icon: Settings,
            description: "Manage lookup tables for bus stop orders",
            pageKey: "BSOrderFieldsDataDefinitions"
          },
          {
            title: "User Guide",
            url: createPageUrl("BusStopOrdersUserGuide"),
            icon: HelpCircle,
            description: "Instructions for using the bus stop orders module",
            pageKey: "BusStopOrdersUserGuide"
          }
        ]
      }
    ]
  },
  {
    id: 'system-management',
    label: 'System Management',
    items: [
      {
        title: "Users",
        url: createPageUrl("Users"),
        icon: Users2,
        description: "Manage platform & app users",
        pageKey: "Users"
      },
      {
        title: "Access Control",
        url: createPageUrl("AccessControl"),
        icon: ShieldCheck,
        description: "Manage user access profiles and permissions",
        pageKey: "AccessControl"
      },
      {
        title: "Version Management",
        url: createPageUrl("VersionManagement"),
        icon: Settings,
        description: "Manage app versions and updates",
        pageKey: "VersionManagement"
      },
      {
        title: "Audit Logs",
        url: createPageUrl("AuditLogs"),
        icon: ScrollText,
        description: "Track system activities",
        pageKey: "AuditLogs"
      },
      {
        title: "Platform Change Log",
        url: createPageUrl("PlatformChangeLog"),
        icon: Settings,
        description: "Manage platform changes and improvements",
        pageKey: "PlatformChangeLog"
      },
    ]
  }
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [navigationGroups, setNavigationGroups] = useState([]);
  const [quickStats, setQuickStats] = useState({ totalTemplates: '-', activeTemplates: '-', pendingApprovals: '-' });
  const [expandedGroups, setExpandedGroups] = useState({
    'my-workspace': true,
    'document-templates': true,
    'warehouse-stock': true,
    'stickers-installation': true,
    'delivery-management': true,
    'system-management': true,
    'administration': true,
    'bus-stop-orders-management': true,
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);

  const hasAccessToPage = (pageKey, permissions, currentUser) => {
    if (!pageKey) return true;
    // Welcome page is always accessible
    if (pageKey === 'Welcome') return true;
    // Admins without profile have full access
    if (currentUser?.role === 'admin' && Object.keys(permissions).length === 0) {
      return true;
    }
    const accessLevel = permissions[pageKey];
    if (!accessLevel) return false;
    return accessLevel === 'full_access';
  };

  const filterNavigationByPermissions = (permissions, currentUser) => {
    return allNavigationGroups.map(group => {
      const filteredGroup = { ...group };
      
      if (group.items) {
        filteredGroup.items = group.items.filter(item => {
          return hasAccessToPage(item.pageKey, permissions, currentUser);
        });
      }
      
      if (group.subgroups) {
        filteredGroup.subgroups = filteredGroup.subgroups.map(subgroup => ({
          ...subgroup,
          items: subgroup.items.filter(item => {
            return hasAccessToPage(item.pageKey, permissions, currentUser);
          })
        })).filter(subgroup => subgroup.items.length > 0);
      }
      
      return filteredGroup;
    }).filter(group => {
      const hasItems = group.items && group.items.length > 0;
      const hasSubgroups = group.subgroups && group.subgroups.length > 0;
      return hasItems || hasSubgroups;
    });
  };

  const fetchStats = async () => {
    try {
      await delay(500); // Add delay before fetching stats
      const templates = await base44.entities.FormTemplate.list();
      const activeTemplates = templates.filter(t => t.status === 'active').length;
      const pendingApprovals = templates.filter(t => t.approval_status === 'Pending').length;
      setQuickStats({
        totalTemplates: templates.length,
        activeTemplates: activeTemplates,
        pendingApprovals: pendingApprovals
      });
    } catch (error) {
      console.error("Failed to load quick stats:", error);
    }
  };

  const loadUserPermissions = async (currentUser) => {
    try {
      const permissions = {};
      
      if (currentUser?.access_profile_id) {
        await delay(400); // Add delay before fetching permissions
        const pagePermissions = await base44.entities.PagePermission.filter({
          access_profile_id: currentUser.access_profile_id 
        });
        
        pagePermissions.forEach(permission => {
          permissions[permission.page_key] = permission.access_level;
        });
      }
      
      setUserPermissions(permissions);
      const filteredNavigation = filterNavigationByPermissions(permissions, currentUser);
      setNavigationGroups(filteredNavigation);
      
    } catch (error) {
      console.error("Failed to load user permissions:", error);
      const getMinimalNavigation = () => {
        return [
          {
            id: 'basic',
            label: 'Basic Access',
            items: [
              {
                title: "Welcome",
                url: createPageUrl("Welcome"),
                icon: HelpCircle,
                description: "Welcome page",
                pageKey: "Welcome"
              }
            ]
          }
        ];
      };
      setNavigationGroups(getMinimalNavigation());
    }
  };

  const checkAppVersion = async (currentUser) => {
    try {
      const versions = await base44.entities.AppVersion.filter({ is_active: true });
      if (versions.length > 0) {
        const activeVersion = versions[0];
        setLatestVersion(activeVersion);

        console.log('Current code version:', CURRENT_APP_VERSION, 'Active DB version:', activeVersion.version);

        // Compare current running code version with active version in DB
        if (CURRENT_APP_VERSION !== activeVersion.version) {
          console.log('Showing version dialog - code version does not match DB version');
          setShowVersionDialog(true);
        }
      }
    } catch (error) {
      console.error("Error checking app version:", error);
    }
  };

  const handleAcknowledgeVersion = async () => {
    // Don't update version - just close the dialog temporarily
    setShowVersionDialog(false);
  };

  const handleUpdateNow = async () => {
    if (latestVersion?.update_url) {
      window.location.href = latestVersion.update_url;
    } else {
      window.location.reload();
    }
  };

  useEffect(() => {
    const initializeLayout = async () => {
      // Don't run initialization logic multiple times
      if (!isInitializing) return;

      try {
        // Try to get current user
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Load permissions with delay
        await loadUserPermissions(currentUser);
        
        // Small delay to let permissions load
        await delay(500);
        
        // Load stats with delay
        await fetchStats();

        // Check if on Welcome or ProfileSetup - these pages are always allowed
        if (location.pathname === createPageUrl("Welcome") || 
            location.pathname === createPageUrl("ProfileSetup")) {
          setIsInitializing(false);
          return;
        }
        
        // If user doesn't have position, redirect to Welcome (not ProfileSetup)
        if (!currentUser.position) {
          navigate(createPageUrl("Welcome"), { replace: true });
        }
        
      } catch (error) {
        console.error("Layout initialization error:", error);
        // If not logged in or error, set minimal navigation including Welcome
        setUser(null);
        const getMinimalNavigation = () => {
          return [
            {
              id: 'basic',
              label: 'Basic Access',
              items: [
                {
                  title: "Welcome",
                  url: createPageUrl("Welcome"),
                  icon: HelpCircle,
                  description: "Welcome page",
                  pageKey: "Welcome"
                }
              ]
            }
          ];
        };
        setNavigationGroups(getMinimalNavigation());
      }
      
      setIsInitializing(false);
    };

    initializeLayout();
  }, []);

  // Check version separately - runs every time user changes
  useEffect(() => {
    if (user && !isInitializing) {
      checkAppVersion(user);
    }
  }, [user, isInitializing]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Show loading spinner during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>{`
        @media print {
          .print-hide {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 h-16 flex items-center px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-4 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </Button>
          <h1 className="text-xl font-bold text-slate-900">Documents & Templates</h1>

          <div className="ml-auto flex items-center gap-4">
            <TooltipProvider>
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                   <div className="flex items-center gap-2 justify-end">
                     <p className="font-semibold text-slate-800 text-sm truncate max-w-[150px]">{user.full_name}</p>
                     {latestVersion && (
                       <span className="text-xs text-slate-400">v{CURRENT_APP_VERSION}</span>
                     )}
                     {latestVersion && CURRENT_APP_VERSION !== latestVersion.version && (
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full cursor-pointer" onClick={() => setShowVersionDialog(true)}>
                             <AlertCircle className="w-3 h-3" />
                             <span className="text-xs font-medium">Παλιά Έκδοση</span>
                           </div>
                         </TooltipTrigger>
                         <TooltipContent>
                           <p>Κάντε κλικ για ενημέρωση</p>
                         </TooltipContent>
                       </Tooltip>
                     )}
                   </div>
                   <p className="text-xs text-slate-500 truncate max-w-[150px]">{user.position || user.role}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0 rounded-full"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Log Out</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <Button variant="outline" onClick={() => base44.auth.login()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log In
                </Button>
              )}
            </TooltipProvider>
          </div>
        </nav>

        <aside
          className={`fixed left-0 top-0 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 w-80 flex flex-col print-hide ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ marginTop: '64px' }}
        >
          <div className="border-b border-slate-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Documents</h2>
                <p className="text-xs text-slate-500 font-medium">& Templates</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {navigationGroups.map((group, groupIndex) => (
              <div key={group.id} className={groupIndex > 0 ? "mt-6" : ""}>
                <div
                  className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 mb-2 cursor-pointer hover:text-slate-700 transition-colors flex items-center justify-between"
                  onClick={() => toggleGroup(group.id)}
                >
                  <span>{group.label}</span>
                  {expandedGroups[group.id] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>

                {expandedGroups[group.id] && (
                  <div>
                    {group.items && (
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <div key={item.title}>
                            <Link
                              to={item.url}
                              className={`w-full justify-start hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg px-3 py-2 flex items-center gap-3 ${
                                location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
                              }`}
                            >
                              <item.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="text-xs font-medium">{item.title}</span>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                    {group.subgroups && group.subgroups.map(subgroup => (
                      <div key={subgroup.id} className="pl-3 mt-2">
                        <div
                          className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 mb-2 cursor-pointer hover:text-slate-700 transition-colors flex items-center justify-between"
                          onClick={() => toggleGroup(subgroup.id)}
                        >
                          <span>{subgroup.label}</span>
                          {expandedGroups[subgroup.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        {expandedGroups[subgroup.id] && (
                          <div className="space-y-1">
                            {subgroup.items.map((item) => (
                              <div key={item.title}>
                                <Link
                                  to={item.url}
                                  className={`w-full justify-start hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg px-3 py-2 flex items-center gap-3 ${
                                    location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
                                  }`}
                                >
                                  <item.icon className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-xs font-medium">{item.title}</span>
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-8">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 mb-2">
                Quick Stats
              </div>
              <div>
                <div className="px-3 py-2 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Database className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Total Templates</span>
                    <span className="ml-auto font-semibold text-slate-900">{quickStats.totalTemplates}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Active Templates</span>
                    <span className="ml-auto font-semibold text-slate-900">{quickStats.activeTemplates}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <ShieldQuestion className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Pending Approval</span>
                    <span className="ml-auto font-semibold text-slate-900">{quickStats.pendingApprovals}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-4">
            <p className="text-xs text-center text-slate-400">© {new Date().getFullYear()} Bus Stop</p>
          </div>
        </aside>

        <main className={`transition-all duration-300 ${isSidebarOpen ? 'ml-80' : 'ml-0'} pt-16`}>
          <div className="relative z-10">
            {children}
          </div>
        </main>
        <Toaster richColors position="top-right" />
        </div>

        {/* Version Update Dialog */}
        <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              Νέα Έκδοση Διαθέσιμη
            </DialogTitle>
            <DialogDescription className="pt-4">
              {latestVersion && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Έκδοση: {latestVersion.version}</p>
                    {latestVersion.release_date && (
                      <p className="text-xs text-slate-500">
                        Ημερομηνία: {new Date(latestVersion.release_date).toLocaleDateString('el-GR')}
                      </p>
                    )}
                  </div>
                  {latestVersion.release_notes && (
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-slate-600 mb-1">Αλλαγές:</p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{latestVersion.release_notes}</p>
                    </div>
                  )}
                  {latestVersion.is_critical && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                      <p className="text-xs font-medium text-red-700">⚠️ Κρίσιμη Ενημέρωση - Απαιτείται άμεση ενημέρωση</p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            {!latestVersion?.is_critical && (
              <Button variant="outline" onClick={handleAcknowledgeVersion}>
                Απόκρυψη
              </Button>
            )}
            <Button onClick={handleUpdateNow} className="bg-blue-600 hover:bg-blue-700">
              Ενημέρωση Τώρα
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
        </>
        );
        }