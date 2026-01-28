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
import FormRunner from './pages/FormRunner';
import Holidays from './pages/Holidays';
import Home from './pages/Home';
import InstallationCapacity from './pages/InstallationCapacity';
import InteractiveForms from './pages/InteractiveForms';
import MobileFieldWork from './pages/MobileFieldWork';
import MyWorkday from './pages/MyWorkday';
import MyWorkspaceUserGuide from './pages/MyWorkspaceUserGuide';
import OfficialOrders from './pages/OfficialOrders';
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
import StockMovements from './pages/StockMovements';
import StockOverview from './pages/StockOverview';
import Stops from './pages/Stops';
import StopsWithStickers from './pages/StopsWithStickers';
import Templates from './pages/Templates';
import UserGuide from './pages/UserGuide';
import Users from './pages/Users';
import VendorsCategories from './pages/VendorsCategories';
import WarehouseUserGuide from './pages/WarehouseUserGuide';
import WeeklyOverview from './pages/WeeklyOverview';
import WeeklySchedule from './pages/WeeklySchedule';
import Welcome from './pages/Welcome';
import WorkspaceSettings from './pages/WorkspaceSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
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
    "FormRunner": FormRunner,
    "Holidays": Holidays,
    "Home": Home,
    "InstallationCapacity": InstallationCapacity,
    "InteractiveForms": InteractiveForms,
    "MobileFieldWork": MobileFieldWork,
    "MyWorkday": MyWorkday,
    "MyWorkspaceUserGuide": MyWorkspaceUserGuide,
    "OfficialOrders": OfficialOrders,
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
    "StockMovements": StockMovements,
    "StockOverview": StockOverview,
    "Stops": Stops,
    "StopsWithStickers": StopsWithStickers,
    "Templates": Templates,
    "UserGuide": UserGuide,
    "Users": Users,
    "VendorsCategories": VendorsCategories,
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