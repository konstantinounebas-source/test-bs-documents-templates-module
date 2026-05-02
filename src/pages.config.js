/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AirControlCalculations from './pages/AirControlCalculations';
import AccessControl from './pages/AccessControl';
import AccessDenied from './pages/AccessDenied';
import Approvals from './pages/Approvals';
import AuditLogs from './pages/AuditLogs';
import BSOrder from './pages/BSOrder';
import BSOrderFieldsDataDefinitions from './pages/BSOrderFieldsDataDefinitions';
import BarcodeScanner from './pages/BarcodeScanner';
import BusStopDelivery from './pages/BusStopDelivery';
import BusStopOrdersUserGuide from './pages/BusStopOrdersUserGuide';
import BusStopTypesBOM from './pages/BusStopTypesBOM';
import ChargedMaterialsReport from './pages/ChargedMaterialsReport';
import CustomFields from './pages/CustomFields';
import DailyTracker from './pages/DailyTracker';
import Dashboard from './pages/Dashboard';
import DeliveryFieldsDataDefinitions from './pages/DeliveryFieldsDataDefinitions';
import DeliveryLogs from './pages/DeliveryLogs';
import DeliveryReporting from './pages/DeliveryReporting';
import DeliveryUserGuide from './pages/DeliveryUserGuide';
import DocumentFieldsDataDefinitions from './pages/DocumentFieldsDataDefinitions';
import FactoryFinancialCalculations from './pages/FactoryFinancialCalculations';
import FormRunner from './pages/FormRunner';
import Holidays from './pages/Holidays';
import Home from './pages/Home';
import InstallationCapacity from './pages/InstallationCapacity';
import InteractiveForms from './pages/InteractiveForms';
import JVFinancialCalculations from './pages/JVFinancialCalculations';
import JVFinancialResults from './pages/JVFinancialResults';
import Manufacturing from './pages/Manufacturing';
import MfgConsumables from './pages/MfgConsumables';
import MfgDailyProduction from './pages/MfgDailyProduction';
import MfgDailyStandardsAssignment from './pages/MfgDailyStandardsAssignment';
import MfgKPIDashboard from './pages/MfgKPIDashboard';
import MfgKPIDefinitions from './pages/MfgKPIDefinitions';
import MfgPlanning from './pages/MfgPlanning';
import MfgPlanningWizard from './pages/MfgPlanningWizard';
import MfgProfiles from './pages/MfgProfiles';
import MfgQC from './pages/MfgQC';
import MfgReferenceDataWizard from './pages/MfgReferenceDataWizard';
import MfgStandards from './pages/MfgStandards';
import MfgStandardsData from './pages/MfgStandardsData';
import MfgStandardsManagement from './pages/MfgStandardsManagement';
import MobileFieldWork from './pages/MobileFieldWork';
import ModulesDocumentation from './pages/ModulesDocumentation';
import MyWorkday from './pages/MyWorkday';
import MyWorkspaceUserGuide from './pages/MyWorkspaceUserGuide';
import OfficialOrders from './pages/OfficialOrders';
import OperationalDashboard from './pages/OperationalDashboard';
import OrderDetail from './pages/OrderDetail';
import OrderPrint from './pages/OrderPrint';
import Orders from './pages/Orders';
import OrdersManagement from './pages/OrdersManagement';
import PlatformChangeLog from './pages/PlatformChangeLog';
import Products from './pages/Products';
import ProfileSetup from './pages/ProfileSetup';
import PurchaseOrders from './pages/PurchaseOrders';
import Receipts from './pages/Receipts';
import RepairRoutes from './pages/RepairRoutes';
import ShelterTypes from './pages/ShelterTypes';
import SnaggingList from './pages/SnaggingList';
import StickerHandovers from './pages/StickerHandovers';
import StickerItems from './pages/StickerItems';
import StickerMovementLogs from './pages/StickerMovementLogs';
import StickerTemplates from './pages/StickerTemplates';
import StickersInstallationUserGuide from './pages/StickersInstallationUserGuide';
import StockMovements from './pages/StockMovements';
import StockOverview from './pages/StockOverview';
import Stops from './pages/Stops';
import StopsWithStickers from './pages/StopsWithStickers';
import Templates from './pages/Templates';
import UserGuide from './pages/UserGuide';
import Users from './pages/Users';
import VendorsCategories from './pages/VendorsCategories';
import VersionManagement from './pages/VersionManagement';
import WarehouseUserGuide from './pages/WarehouseUserGuide';
import WeeklyOverview from './pages/WeeklyOverview';
import WeeklySchedule from './pages/WeeklySchedule';
import Welcome from './pages/Welcome';
import WorkspaceSettings from './pages/WorkspaceSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AirControlCalculations": AirControlCalculations,
    "AccessControl": AccessControl,
    "AccessDenied": AccessDenied,
    "Approvals": Approvals,
    "AuditLogs": AuditLogs,
    "BSOrder": BSOrder,
    "BSOrderFieldsDataDefinitions": BSOrderFieldsDataDefinitions,
    "BarcodeScanner": BarcodeScanner,
    "BusStopDelivery": BusStopDelivery,
    "BusStopOrdersUserGuide": BusStopOrdersUserGuide,
    "BusStopTypesBOM": BusStopTypesBOM,
    "ChargedMaterialsReport": ChargedMaterialsReport,
    "CustomFields": CustomFields,
    "DailyTracker": DailyTracker,
    "Dashboard": Dashboard,
    "DeliveryFieldsDataDefinitions": DeliveryFieldsDataDefinitions,
    "DeliveryLogs": DeliveryLogs,
    "DeliveryReporting": DeliveryReporting,
    "DeliveryUserGuide": DeliveryUserGuide,
    "DocumentFieldsDataDefinitions": DocumentFieldsDataDefinitions,
    "FactoryFinancialCalculations": FactoryFinancialCalculations,
    "FormRunner": FormRunner,
    "Holidays": Holidays,
    "Home": Home,
    "InstallationCapacity": InstallationCapacity,
    "InteractiveForms": InteractiveForms,
    "JVFinancialCalculations": JVFinancialCalculations,
    "JVFinancialResults": JVFinancialResults,
    "Manufacturing": Manufacturing,
    "MfgConsumables": MfgConsumables,
    "MfgDailyProduction": MfgDailyProduction,
    "MfgDailyStandardsAssignment": MfgDailyStandardsAssignment,
    "MfgKPIDashboard": MfgKPIDashboard,
    "MfgKPIDefinitions": MfgKPIDefinitions,
    "MfgPlanning": MfgPlanning,
    "MfgPlanningWizard": MfgPlanningWizard,
    "MfgProfiles": MfgProfiles,
    "MfgQC": MfgQC,
    "MfgReferenceDataWizard": MfgReferenceDataWizard,
    "MfgStandards": MfgStandards,
    "MfgStandardsData": MfgStandardsData,
    "MfgStandardsManagement": MfgStandardsManagement,
    "MobileFieldWork": MobileFieldWork,
    "ModulesDocumentation": ModulesDocumentation,
    "MyWorkday": MyWorkday,
    "MyWorkspaceUserGuide": MyWorkspaceUserGuide,
    "OfficialOrders": OfficialOrders,
    "OperationalDashboard": OperationalDashboard,
    "OrderDetail": OrderDetail,
    "OrderPrint": OrderPrint,
    "Orders": Orders,
    "OrdersManagement": OrdersManagement,
    "PlatformChangeLog": PlatformChangeLog,
    "Products": Products,
    "ProfileSetup": ProfileSetup,
    "PurchaseOrders": PurchaseOrders,
    "Receipts": Receipts,
    "RepairRoutes": RepairRoutes,
    "ShelterTypes": ShelterTypes,
    "SnaggingList": SnaggingList,
    "StickerHandovers": StickerHandovers,
    "StickerItems": StickerItems,
    "StickerMovementLogs": StickerMovementLogs,
    "StickerTemplates": StickerTemplates,
    "StickersInstallationUserGuide": StickersInstallationUserGuide,
    "StockMovements": StockMovements,
    "StockOverview": StockOverview,
    "Stops": Stops,
    "StopsWithStickers": StopsWithStickers,
    "Templates": Templates,
    "UserGuide": UserGuide,
    "Users": Users,
    "VendorsCategories": VendorsCategories,
    "VersionManagement": VersionManagement,
    "WarehouseUserGuide": WarehouseUserGuide,
    "WeeklyOverview": WeeklyOverview,
    "WeeklySchedule": WeeklySchedule,
    "Welcome": Welcome,
    "WorkspaceSettings": WorkspaceSettings,
}

export const pagesConfig = {
    mainPage: "Templates",
    Pages: PAGES,
    Layout: __Layout,
};