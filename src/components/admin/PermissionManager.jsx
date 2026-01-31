import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// ALL available pages in the system
const ALL_PAGES = [
  { key: 'Templates', label: 'Templates', module: 'Document Templates' },
  { key: 'InteractiveForms', label: 'Interactive Forms', module: 'Document Templates' },
  { key: 'Approvals', label: 'Approvals', module: 'Document Templates' },
  { key: 'DocumentFieldsDataDefinitions', label: 'Documents Fields & Data Definitions', module: 'Document Templates' },
  { key: 'UserGuide', label: 'User Guide', module: 'Document Templates' },
  
  { key: 'MyWorkday', label: 'My Tasks', module: 'My Workspace' },
  { key: 'WeeklySchedule', label: 'My Week Planner', module: 'My Workspace' },
  { key: 'DailyTracker', label: 'My Daily Log', module: 'My Workspace' },
  { key: 'WeeklyOverview', label: 'My Week Productivity', module: 'My Workspace' },
  { key: 'Holidays', label: 'My Calendar Settings', module: 'My Workspace' },
  { key: 'WorkspaceSettings', label: 'Workspace Settings', module: 'My Workspace' },
  { key: 'MyWorkspaceUserGuide', label: 'My Workspace User Guide', module: 'My Workspace' },

  { key: 'BarcodeScanner', label: 'Barcode Scanner', module: 'Warehouse & Stock' },
  { key: 'StockOverview', label: 'Stock Overview', module: 'Warehouse & Stock' },
  { key: 'ChargedMaterialsReport', label: 'Charged Materials Report', module: 'Warehouse & Stock' },
  { key: 'StockMovements', label: 'Stock Movements', module: 'Warehouse & Stock' },
  { key: 'InstallationCapacity', label: 'Installation Capacity', module: 'Warehouse & Stock' },
  { key: 'Products', label: 'Products', module: 'Warehouse & Stock' },
  { key: 'VendorsCategories', label: 'Vendors & Categories', module: 'Warehouse & Stock' },
  { key: 'PurchaseOrders', label: 'Purchase Orders', module: 'Warehouse & Stock' },
  { key: 'BusStopTypesBOM', label: 'Bus Stop Types & BOM', module: 'Warehouse & Stock' },
  { key: 'WarehouseUserGuide', label: 'Warehouse User Guide', module: 'Warehouse & Stock' },

  { key: 'Dashboard', label: 'Dashboard', module: 'Stickers & Installation' },
  { key: 'Stops', label: 'Stops', module: 'Stickers & Installation' },
  { key: 'ShelterTypes', label: 'Shelter Types', module: 'Stickers & Installation' },
  { key: 'StickerTemplates', label: 'Sticker Templates', module: 'Stickers & Installation' },
  { key: 'StickerItems', label: 'Sticker Items', module: 'Stickers & Installation' },
  { key: 'StopsWithStickers', label: 'Stops & Stickers', module: 'Stickers & Installation' },
  { key: 'OrdersManagement', label: 'Orders Management', module: 'Stickers & Installation' },
  { key: 'OrderPrint', label: 'Order Print', module: 'Stickers & Installation' },
  { key: 'Receipts', label: 'Receipts', module: 'Stickers & Installation' },
  { key: 'StickerHandovers', label: 'Sticker Handovers', module: 'Stickers & Installation' },
  { key: 'StickerMovementLogs', label: 'Movement Logs', module: 'Stickers & Installation' },
  { key: 'StickersInstallationUserGuide', label: 'Stickers & Installation User Guide', module: 'Stickers & Installation' },

  { key: 'DeliveryReporting', label: 'Delivery Reporting', module: 'Delivery Management' },
  { key: 'MobileFieldWork', label: 'Mobile Field Work', module: 'Delivery Management' },
  { key: 'RepairRoutes', label: 'Repair Routes', module: 'Delivery Management' },
  { key: 'BusStopDelivery', label: 'Bus Stop Delivery', module: 'Delivery Management' },
  { key: 'SnaggingList', label: 'Snagging List', module: 'Delivery Management' },
  { key: 'DeliveryLogs', label: 'Delivery Logs', module: 'Delivery Management' },
  { key: 'DeliveryFieldsDataDefinitions', label: 'Delivery Fields & Data Definitions', module: 'Delivery Management' },

  { key: 'OfficialOrders', label: 'Official Orders', module: 'Bus Stop Orders Management' },
  { key: 'BSOrder', label: 'Bus Stop Order Allocation', module: 'Bus Stop Orders Management' },
  { key: 'BSOrderFieldsDataDefinitions', label: 'BS Order Fields & Data Definitions', module: 'Bus Stop Orders Management' },
  { key: 'BusStopOrdersUserGuide', label: 'Bus Stop Orders User Guide', module: 'Bus Stop Orders Management' },

  { key: 'MfgReferenceData', label: 'Reference Data', module: 'Manufacturing Production' },
  { key: 'MfgStandards', label: 'Standards Management', module: 'Manufacturing Production' },
  { key: 'MfgProfiles', label: 'Profile Sets', module: 'Manufacturing Production' },
  { key: 'MfgQC', label: 'QC Sets', module: 'Manufacturing Production' },
  { key: 'MfgConsumables', label: 'Consumables Standards', module: 'Manufacturing Production' },
  { key: 'MfgKPIDefinitions', label: 'KPI & Metrics Definitions', module: 'Manufacturing Production' },
  { key: 'MfgDailyProduction', label: 'Daily Production Entry', module: 'Manufacturing Production' },
  { key: 'MfgPlanning', label: 'Planning & Targets', module: 'Manufacturing Production' },
  { key: 'MfgKPIDashboard', label: 'KPI Dashboard', module: 'Manufacturing Production' },

  { key: 'Users', label: 'Users', module: 'System Management' },
  { key: 'AccessControl', label: 'Access Control', module: 'System Management' },
  { key: 'VersionManagement', label: 'Version Management', module: 'System Management' },
  { key: 'AuditLogs', label: 'Audit Logs', module: 'System Management' },
  { key: 'PlatformChangeLog', label: 'Platform Change Log', module: 'System Management' },
];

// Helper to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function PermissionManager({ profile, accessLevel }) {
  const [permissions, setPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (profile) {
      loadPermissions();
    }
  }, [profile]);

  const loadPermissions = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await delay(300);
      const pagePermissions = await base44.entities.PagePermission.filter({
        access_profile_id: profile.id
      });
      
      const permissionsMap = {};
      pagePermissions.forEach(p => {
        permissionsMap[p.page_key] = p.access_level;
      });
      
      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setError('Failed to load permissions. Please try again.');
    }
    
    setIsLoading(false);
  };

  const handlePermissionChange = async (pageKey, newAccessLevel) => {
    if (accessLevel !== 'full_access') {
      return;
    }

    setPermissions(prev => ({
      ...prev,
      [pageKey]: newAccessLevel
    }));

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const existingPermissions = await base44.entities.PagePermission.filter({
        access_profile_id: profile.id,
        page_key: pageKey
      });

      if (existingPermissions.length > 0) {
        await base44.entities.PagePermission.update(existingPermissions[0].id, {
          access_level: newAccessLevel
        });
      } else {
        await base44.entities.PagePermission.create({
          access_profile_id: profile.id,
          page_key: pageKey,
          access_level: newAccessLevel
        });
      }

      setSuccessMessage('Permission updated successfully');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Failed to update permission:', error);
      setError('Failed to update permission. Please try again.');
      await loadPermissions();
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const groupedPages = ALL_PAGES.reduce((acc, page) => {
    if (!acc[page.module]) {
      acc[page.module] = [];
    }
    acc[page.module].push(page);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {Object.entries(groupedPages).map(([module, pages]) => (
        <div key={module} className="space-y-3">
          <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{module}</h4>
          <div className="space-y-2">
            {pages.map(page => (
              <div key={page.key} className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <Label className="font-medium text-slate-900">{page.label}</Label>
                  <p className="text-xs text-slate-500">{page.key}</p>
                </div>
                <div className="w-40">
                  <Select
                    value={permissions[page.key] || 'no_access'}
                    onValueChange={(value) => handlePermissionChange(page.key, value)}
                    disabled={accessLevel !== 'full_access' || isSaving}
                  >
                    <SelectTrigger className={permissions[page.key] === 'full_access' ? 'bg-green-50 border-green-200' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_access">Full Access</SelectItem>
                      <SelectItem value="no_access">No Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}