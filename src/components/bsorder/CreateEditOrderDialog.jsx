
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, FileText, ImagePlus, Loader2, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BusStopOrder } from "@/entities/BusStopOrder";
import { OfficialOrderDocument } from "@/entities/OfficialOrderDocument";
import { ExistingElementOption } from "@/entities/ExistingElementOption";
import { PavementOption } from "@/entities/PavementOption";
import { CrossingOption } from "@/entities/CrossingOption";
import { ShelterTypeOption } from "@/entities/ShelterTypeOption";
import { ProposedShelterTypeOption } from "@/entities/ProposedShelterTypeOption";
import { ShelterUpgradeOption } from "@/entities/ShelterUpgradeOption";
import { BusStopType } from "@/entities/BusStopType"; // New import
import { OrderTypeOption } from "@/entities/OrderTypeOption"; // New import
import { UploadFile } from "@/integrations/Core";
import { User } from "@/entities/User";

export default function CreateEditOrderDialog({ open, onClose, item, onItemSaved }) {
  const [formData, setFormData] = useState({});
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [availableOfficialOrders, setAvailableOfficialOrders] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  // Options states
  const [existingElementOptions, setExistingElementOptions] = useState([]);
  const [pavementOptions, setPavementOptions] = useState([]);
  const [crossingOptions, setCrossingOptions] = useState([]);
  const [shelterTypeOptions, setShelterTypeOptions] = useState([]);
  const [proposedShelterTypeOptions, setProposedShelterTypeOptions] = useState([]);
  const [shelterUpgradeOptions, setShelterUpgradeOptions] = useState([]);
  const [busStopTypes, setBusStopTypes] = useState([]); // New state
  const [orderTypeOptions, setOrderTypeOptions] = useState([]); // New state
  
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      loadAvailableOfficialOrders();
      loadDropdownOptions();
      setFormData({
        stop_code: item?.stop_code || '',
        stop_name: item?.stop_name || '',
        municipality_community: item?.municipality_community || '',
        district: item?.district || '',
        latitude: item?.latitude || '',
        longitude: item?.longitude || '',
        is_active: item?.is_active !== undefined ? item.is_active : true,
        existing_element: item?.existing_element || '',
        pavement: item?.pavement || '',
        crossing: item?.crossing || '',
        shelter_type: item?.shelter_type || '',
        proposed_shelter_type: item?.proposed_shelter_type || '',
        shelter_upgrade: item?.shelter_upgrade || '',
        order_date: item?.order_date ? item.order_date.split('T')[0] : '',
        order_type: item?.order_type || '',
        implementation_schedule: item?.implementation_schedule ? item.implementation_schedule.split('T')[0] : '',
        instruction_for_completion_on_date: item?.instruction_for_completion_on_date !== undefined ? item.instruction_for_completion_on_date : false,
        instruction_completion_date: item?.instruction_completion_date ? item.instruction_completion_date.split('T')[0] : '',
        instruction_date: item?.instruction_date ? item.instruction_date.split('T')[0] : '',
        is_urgent: item?.is_urgent !== undefined ? item.is_urgent : false,
        comments: item?.comments || '',
        main_order_reference: item?.main_order_reference || '',
        official_order_document_id: item?.official_order_document_id || '', // Changed to ''
        bus_stop_type_id: item?.bus_stop_type_id || '', // New field
        installation_status: item?.installation_status || 'Planned', // New field with default
        installation_team: item?.installation_team || '', // New field
      });
      setExistingPhotos(item?.photos || []);
      setPhotos([]);
      setError('');
      setValidationErrors({});
    }
  }, [open, item]);

  // Add useEffect for instruction completion date logic
  useEffect(() => {
    if (formData.instruction_for_completion_on_date && formData.instruction_completion_date) {
      setFormData(prev => ({
        ...prev,
        implementation_schedule: prev.instruction_completion_date
      }));
    }
  }, [formData.instruction_for_completion_on_date, formData.instruction_completion_date]);

  useEffect(() => {
    if (formData.official_order_document_id && availableOfficialOrders.length > 0) {
      const selectedOrder = availableOfficialOrders.find(o => o.id === formData.official_order_document_id);
      if (selectedOrder) {
        setFormData(prev => ({
          ...prev,
          main_order_reference: selectedOrder.main_order_reference || prev.main_order_reference,
          order_date: selectedOrder.order_date ? selectedOrder.order_date.split('T')[0] : prev.order_date,
          // order_type is now a user-selectable dropdown, so we don't automatically overwrite it here
          implementation_schedule: selectedOrder.implementation_schedule ? selectedOrder.implementation_schedule.split('T')[0] : prev.implementation_schedule,
        }));
      }
    }
  }, [formData.official_order_document_id, availableOfficialOrders]);

  const loadDropdownOptions = async () => {
    try {
      const [
        existingElements,
        pavements,
        crossings,
        shelterTypes,
        proposedShelterTypes,
        shelterUpgrades,
        busStopTypesData, // New data
        orderTypeOptionsData // New data
      ] = await Promise.all([
        ExistingElementOption.list(),
        PavementOption.list(),
        CrossingOption.list(),
        ShelterTypeOption.list(),
        ProposedShelterTypeOption.list(),
        ShelterUpgradeOption.list(),
        BusStopType.list(), // New list call
        OrderTypeOption.list() // New list call
      ]);

      setExistingElementOptions(existingElements.filter(opt => opt.is_active));
      setPavementOptions(pavements.filter(opt => opt.is_active));
      setCrossingOptions(crossings.filter(opt => opt.is_active));
      setShelterTypeOptions(shelterTypes.filter(opt => opt.is_active));
      setProposedShelterTypeOptions(proposedShelterTypes.filter(opt => opt.is_active));
      setShelterUpgradeOptions(shelterUpgrades.filter(opt => opt.is_active));
      setBusStopTypes(busStopTypesData.filter(opt => opt.is_active)); // Set new state
      setOrderTypeOptions(orderTypeOptionsData.filter(opt => opt.is_active)); // Set new state
    } catch (error) {
      console.error("Error loading dropdown options:", error);
    }
  };

  const loadAvailableOfficialOrders = async () => {
    try {
      const orders = await OfficialOrderDocument.list("-created_date");
      setAvailableOfficialOrders(orders.filter(order => order.is_active));
    } catch (error) {
      console.error("Error loading official orders:", error);
      setAvailableOfficialOrders([]);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errors = {};
    
    // Basic required fields
    if (!formData.stop_code?.trim()) {
      errors.stop_code = "Ο κωδικός στάσης είναι υποχρεωτικός.";
    }
    if (!formData.stop_name?.trim()) {
      errors.stop_name = "Η ονομασία στάσης είναι υποχρεωτική.";
    }

    // Additional required fields if active
    if (formData.is_active) {
      if (!formData.main_order_reference?.trim()) {
        errors.main_order_reference = "Η αναφορά παραγγελίας είναι υποχρεωτική για ενεργές στάσεις.";
      }
      if (!formData.latitude || isNaN(formData.latitude)) {
        errors.latitude = "Το γεωγραφικό πλάτος είναι υποχρεωτικό για ενεργές στάσεις.";
      }
      if (!formData.longitude || isNaN(formData.longitude)) {
        errors.longitude = "Το γεωγραφικό μήκος είναι υποχρεωτικό για ενεργές στάσεις.";
      }
    }

    // Coordinate validation
    if (formData.latitude && (isNaN(formData.latitude) || formData.latitude < -90 || formData.latitude > 90)) {
      errors.latitude = "Το γεωγραφικό πλάτος πρέπει να είναι αριθμός μεταξύ -90 και 90.";
    }
    if (formData.longitude && (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180)) {
      errors.longitude = "Το γεωγραφικό μήκος πρέπει να είναι αριθμός μεταξύ -180 και 180.";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      setError("Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία.");
      return;
    }

    setIsProcessing(true);

    try {
      const user = await User.me();
      const currentDateTime = new Date().toISOString();

      // Upload new photos
      const newPhotoData = [];
      for (const photo of photos) {
        try {
          const uploadResult = await UploadFile({ file: photo });
          newPhotoData.push({
            url: uploadResult.file_url,
            filename: photo.name,
            uploaded_by: user.full_name || user.email,
            uploaded_date: currentDateTime
          });
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          setError(`Σφάλμα κατά το ανέβασμα φωτογραφίας: ${photo.name}`);
          setIsProcessing(false);
          return;
        }
      }

      // Combine existing and new photos
      const allPhotos = [...existingPhotos, ...newPhotoData];

      const orderData = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        photos: allPhotos,
      };
      
      // Ensure official_order_document_id is either a valid string or null/undefined
      if (!orderData.official_order_document_id || orderData.official_order_document_id === '') {
          delete orderData.official_order_document_id;
      }
      // Ensure bus_stop_type_id is either a valid string or null/undefined
      if (!orderData.bus_stop_type_id || orderData.bus_stop_type_id === '') {
        delete orderData.bus_stop_type_id;
      }

      if (item) {
        await BusStopOrder.update(item.id, orderData);
      } else {
        await BusStopOrder.create(orderData);
      }
      
      onItemSaved();
    } catch (error) {
      setError('Αποτυχία αποθήκευσης παραγγελίας. Παρακαλώ δοκιμάστε ξανά.');
      console.error('Error saving bus stop order:', error);
    }

    setIsProcessing(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Επεξεργασία Παραγγελίας Στάσης' : 'Νέα Παραγγελία Στάσης'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Βασικές Πληροφορίες Στάσης</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stop_code">Κωδικός Στάσης *</Label>
                <Input
                  id="stop_code"
                  value={formData.stop_code}
                  onChange={(e) => handleInputChange('stop_code', e.target.value)}
                  className={validationErrors.stop_code ? 'border-red-500' : ''}
                />
                {validationErrors.stop_code && <p className="text-xs text-red-600">{validationErrors.stop_code}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stop_name">Ονομασία Στάσης *</Label>
                <Input
                  id="stop_name"
                  value={formData.stop_name}
                  onChange={(e) => handleInputChange('stop_name', e.target.value)}
                  className={validationErrors.stop_name ? 'border-red-500' : ''}
                />
                {validationErrors.stop_name && <p className="text-xs text-red-600">{validationErrors.stop_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="municipality_community">Δήμος/Κοινότητα</Label>
                <Input
                  id="municipality_community"
                  value={formData.municipality_community}
                  onChange={(e) => handleInputChange('municipality_community', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">Επαρχία</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Geolocation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Γεωγραφική Θέση {formData.is_active && <span className="text-red-500">*</span>}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Γεωγραφικό Πλάτος (Latitude)</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleInputChange('latitude', e.target.value)}
                  placeholder="π.χ. 35.1264"
                  className={validationErrors.latitude ? 'border-red-500' : ''}
                />
                {validationErrors.latitude && <p className="text-xs text-red-600">{validationErrors.latitude}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Γεωγραφικό Μήκος (Longitude)</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleInputChange('longitude', e.target.value)}
                  placeholder="π.χ. 33.4299"
                  className={validationErrors.longitude ? 'border-red-500' : ''}
                />
                {validationErrors.longitude && <p className="text-xs text-red-600">{validationErrors.longitude}</p>}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Ενεργή Καταχώρηση</Label>
            </div>
          </div>

          {/* Station Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Λεπτομέρειες Στάσης</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Υφιστάμενο Στοιχείο</Label>
                <Select value={formData.existing_element || 'no_selection'} onValueChange={(value) => handleInputChange('existing_element', value === 'no_selection' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_selection">-- Καμία επιλογή --</SelectItem>
                    {existingElementOptions.filter(opt => opt.id && opt.is_active).map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Πεζοδρόμιο</Label>
                <Select value={formData.pavement || 'no_selection'} onValueChange={(value) => handleInputChange('pavement', value === 'no_selection' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_selection">-- Καμία επιλογή --</SelectItem>
                    {pavementOptions.filter(opt => opt.id && opt.is_active).map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Διάβαση</Label>
                <Select value={formData.crossing || 'no_selection'} onValueChange={(value) => handleInputChange('crossing', value === 'no_selection' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_selection">-- Καμία επιλογή --</SelectItem>
                    {crossingOptions.filter(opt => opt.id && opt.is_active).map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Τύπος Στεγάστρου</Label>
                <Select value={formData.shelter_type || 'no_selection'} onValueChange={(value) => handleInputChange('shelter_type', value === 'no_selection' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_selection">-- Καμία επιλογή --</SelectItem>
                    {shelterTypeOptions.filter(opt => opt.id && opt.is_active).map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Προτεινόμενος Τύπος Στάσης/Στεγάστρου</Label>
                <Select value={formData.proposed_shelter_type || 'no_selection'} onValueChange={(value) => handleInputChange('proposed_shelter_type', value === 'no_selection' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_selection">-- Καμία επιλογή --</SelectItem>
                    {proposedShelterTypeOptions.filter(opt => opt.id && opt.is_active).map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Αναβάθμιση Υφιστάμενου Στεγάστρου</Label>
                <Select value={formData.shelter_upgrade || 'no_selection'} onValueChange={(value) => handleInputChange('shelter_upgrade', value === 'no_selection' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_selection">-- Καμία επιλογή --</SelectItem>
                    {shelterUpgradeOptions.filter(opt => opt.id && opt.is_active).map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Τύπος Στάσης για Εγκατάσταση</Label>
                <Select value={formData.bus_stop_type_id || 'no_selection'} onValueChange={(value) => handleInputChange('bus_stop_type_id', value === 'no_selection' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_selection">-- Καμία επιλογή --</SelectItem>
                    {busStopTypes.filter(type => type.id && type.is_active).map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Κατάσταση Εγκατάστασης</Label>
                <Select value={formData.installation_status || 'Planned'} onValueChange={(value) => handleInputChange('installation_status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="Materials Reserved">Materials Reserved</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ομάδα Εγκατάστασης</Label>
                <Input 
                  value={formData.installation_team || ''} 
                  onChange={(e) => handleInputChange('installation_team', e.target.value)}
                  placeholder="π.χ. Ομάδα Α"
                />
              </div>
            </div>
          </div>

          {/* Official Order Document */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Σύνδεση με Επίσημη Παραγγελία</h3>
            <div className="space-y-2">
              <Label>Επίσημο Έγγραφο Παραγγελίας</Label>
              <Select
                value={formData.official_order_document_id || 'no_selection'}
                onValueChange={(value) => handleInputChange('official_order_document_id', value === 'no_selection' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_selection">-- Καμία επιλογή --</SelectItem>
                  {availableOfficialOrders.filter(order => order.id && order.is_active).map(order => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.title} ({order.main_order_reference})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <p className="text-xs text-slate-500">
                Αν η παραγγελία δεν υπάρχει, μπορείτε να τη δημιουργήσετε από τη σελίδα "Official Orders".
              </p>
            </div>
          </div>

          {/* Order Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Order Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="main_order_reference">Main Order Reference {formData.is_active && <span className="text-red-500">*</span>}</Label>
                <Input
                  id="main_order_reference"
                  value={formData.main_order_reference}
                  onChange={(e) => handleInputChange('main_order_reference', e.target.value)}
                  placeholder="Code for grouping bus stops"
                  className={validationErrors.main_order_reference ? 'border-red-500' : ''}
                  disabled
                />
                {validationErrors.main_order_reference && <p className="text-xs text-red-600">{validationErrors.main_order_reference}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_date">Order Date</Label>
                <Input
                  id="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => handleInputChange('order_date', e.target.value)}
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <Label>Τύπος Παραγγελίας</Label>
                <Select value={formData.order_type || 'no_selection'} onValueChange={(value) => handleInputChange('order_type', value === 'no_selection' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_selection">-- Καμία επιλογή --</SelectItem>
                    {orderTypeOptions.filter(opt => opt.id && opt.is_active).map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="implementation_schedule">Implementation Schedule</Label>
                <Input
                  id="implementation_schedule"
                  type="date"
                  value={formData.implementation_schedule}
                  onChange={(e) => handleInputChange('implementation_schedule', e.target.value)}
                  disabled={formData.instruction_for_completion_on_date}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="instruction_for_completion_on_date"
                checked={formData.instruction_for_completion_on_date}
                onCheckedChange={(checked) => handleInputChange('instruction_for_completion_on_date', checked)}
              />
              <Label htmlFor="instruction_for_completion_on_date">
                Instruction for completion on specific date
              </Label>
            </div>

            {formData.instruction_for_completion_on_date && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instruction_completion_date">Completion Date</Label>
                  <Input
                    id="instruction_completion_date"
                    type="date"
                    value={formData.instruction_completion_date}
                    onChange={(e) => handleInputChange('instruction_completion_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instruction_date">Instruction Date</Label>
                  <Input
                    id="instruction_date"
                    type="date"
                    value={formData.instruction_date}
                    onChange={(e) => handleInputChange('instruction_date', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="is_urgent"
                checked={formData.is_urgent}
                onCheckedChange={(checked) => handleInputChange('is_urgent', checked)}
              />
              <Label htmlFor="is_urgent">Mark as urgent</Label>
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Φωτογραφίες Στάσης</h3>
            
            {existingPhotos.length > 0 && (
              <div className="space-y-2">
                <Label>Υπάρχουσες Φωτογραφίες</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {existingPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo.url}
                        alt={photo.filename}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removeExistingPhoto(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => photoInputRef.current?.click()}
                className="w-full"
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Προσθήκη Φωτογραφιών
              </Button>
            </div>

            {photos.length > 0 && (
              <div className="space-y-2">
                <Label>Νέες Φωτογραφίες</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={photo.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Σχόλια</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) => handleInputChange('comments', e.target.value)}
              rows={3}
              placeholder="Επιπλέον σχόλια ή παρατηρήσεις..."
            />
          </div>

          <DialogFooter className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                item ? 'Ενημέρωση Παραγγελίας' : 'Δημιουργία Παραγγελίας'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
