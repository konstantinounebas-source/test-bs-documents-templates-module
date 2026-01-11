import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScanBarcode, Package, CheckCircle, AlertTriangle, ArrowRight, Info, Camera, X, Plus, Zap, TrendingUp, TrendingDown, Move, Activity, Upload, Image as ImageIcon, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import CreateEditVendorDialog from "../components/warehouse/CreateEditVendorDialog";
import CreateEditProductDialog from "../components/warehouse/CreateEditProductDialog";
import PersonSearchCombobox from "../components/warehouse/PersonSearchCombobox";
import VendorSearchCombobox from "../components/warehouse/VendorSearchCombobox";
import ProductSearchCombobox from "../components/warehouse/ProductSearchCombobox";
import PreviousPurchasesSelector from "../components/warehouse/PreviousPurchasesSelector";

// Helper function to introduce a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function BarcodeScannerPage() {
  const [products, setProducts] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [productVendors, setProductVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [invoiceCategories, setInvoiceCategories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [movementType, setMovementType] = useState("IN");
  const [quantity, setQuantity] = useState("1");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [selectedPO, setSelectedPO] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [waybillNumber, setWaybillNumber] = useState("");
  const [chargedToPerson, setChargedToPerson] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [vendorProductCode, setVendorProductCode] = useState("");
  const [selectedInvoiceCategory, setSelectedInvoiceCategory] = useState("");
  const [costInputMethod, setCostInputMethod] = useState("unit"); // 'unit' or 'total'
  const [unitCost, setUnitCost] = useState("");
  const [totalItemCost, setTotalItemCost] = useState("");
  const [discount, setDiscount] = useState("0");
  const [bundleQuantity, setBundleQuantity] = useState("");
  const [inputUnitSubtype, setInputUnitSubtype] = useState("");
  const [conversionRate, setConversionRate] = useState("1");
  const [notes, setNotes] = useState("");
  const [recentScans, setRecentScans] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCreateVendorDialog, setShowCreateVendorDialog] = useState(false);
  const [recentlyScannedProducts, setRecentlyScannedProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [poItemInfo, setPOItemInfo] = useState(null);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  // New state for PO selection dialog
  const [showPOSelectionDialog, setShowPOSelectionDialog] = useState(false);
  const [selectedPOForBulkReceive, setSelectedPOForBulkReceive] = useState(null);
  const [poItemsToReceive, setPOItemsToReceive] = useState([]);

  // Bulk invoice entry state
  const [showBulkInvoiceDialog, setShowBulkInvoiceDialog] = useState(false);
  const [bulkInvoiceVendor, setBulkInvoiceVendor] = useState("");
  const [bulkInvoiceNumber, setBulkInvoiceNumber] = useState("");
  const [bulkInvoiceWaybill, setBulkInvoiceWaybill] = useState("");
  const [bulkInvoiceItems, setBulkInvoiceItems] = useState([]);
  const [showCreateProductFromBulk, setShowCreateProductFromBulk] = useState(false);
  const [showCreateVendorFromBulk, setShowCreateVendorFromBulk] = useState(false);

  // Camera scanning state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Helper to format dates in Cyprus/Athens timezone
  const formatLocalTime = (date) => {
    try {
      return date.toLocaleString('en-GB', {
        timeZone: 'Europe/Athens',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Time formatting error:', error);
      return date.toLocaleTimeString('el-GR');
    }
  };

  const loadData = useCallback(async () => {
    try {
      // Load data sequentially with LARGER delays to avoid rate limiting
      console.log("Loading products...");
      const productsData = await base44.entities.Product.filter({ is_active: true });
      setProducts(productsData);
      
      await delay(500);
      console.log("Loading stock items...");
      const stockData = await base44.entities.StockItem.list();
      setStockItems(stockData);
      
      await delay(500);
      console.log("Loading locations...");
      const locationsData = await base44.entities.WarehouseLocation.filter({ is_active: true });
      setLocations(locationsData);
      
      await delay(500);
      console.log("Loading purchase orders...");
      const allPoData = await base44.entities.PurchaseOrder.list().catch(() => []);
      
      await delay(500);
      console.log("Loading current user...");
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      await delay(500);
      console.log("Loading system users...");
      const sysUsers = await base44.entities.User.list().catch(() => []);
      setSystemUsers(sysUsers);
      
      await delay(500);
      console.log("Loading app users...");
      const aUsers = await base44.entities.AppUser.list().catch(() => []);
      setAppUsers(aUsers);
      
      await delay(500);
      console.log("Loading vendors...");
      const vendorsData = await base44.entities.Vendor.filter({ is_active: true });
      setVendors(vendorsData);
      
      await delay(500);
      console.log("Loading product vendors...");
      const pvData = await base44.entities.ProductVendor.list().catch(() => []);
      setProductVendors(pvData);
      
      await delay(500);
      console.log("Loading categories...");
      const categoriesData = await base44.entities.ProductCategory.filter({ is_active: true });
      setCategories(categoriesData);
      
      await delay(500);
      console.log("Loading companies...");
      const companiesData = await base44.entities.Company.filter({ is_active: true });
      setCompanies(companiesData);
      
      await delay(500);
      console.log("Loading invoice categories...");
      const invoiceCatsData = await base44.entities.InvoiceCategory.filter({ is_active: true });
      setInvoiceCategories(invoiceCatsData);
      
      await delay(500);
      console.log("Loading movements...");
      const movementsData = await base44.entities.StockMovement.list("-created_date");
      setMovements(movementsData);

      // Process POs to include calculated received quantities based on movements
      const processedPOs = allPoData.map(po => {
        let updatedItems = (po.items || []).map(item => {
          const receivedQty = movementsData
            .filter(m =>
              m.reference_type === 'PurchaseOrder' &&
              m.reference_id === po.id &&
              m.product_id === item.product_id &&
              m.movement_type === 'IN'
            )
            .reduce((sum, m) => sum + m.quantity, 0);
          return { ...item, quantity_received: receivedQty };
        });

        let newStatus = 'Confirmed';
        const totalOrdered = updatedItems.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0);
        const totalReceived = updatedItems.reduce((sum, item) => sum + (item.quantity_received || 0), 0);

        if (totalOrdered > 0) {
          if (totalReceived >= totalOrdered) {
            newStatus = 'Received';
          } else if (totalReceived > 0) {
            newStatus = 'Partially Received';
          }
        }

        return { ...po, items: updatedItems, status: newStatus };
      });

      // Only show non-completed POs (Confirmed and Partially Received)
      const filteredPOs = processedPOs.filter(po => 
        ['Confirmed', 'Partially Received'].includes(po.status)
      );
      
      setPurchaseOrders(filteredPOs);
      console.log("Data loaded successfully");
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadRecentScans();
  }, [loadData]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (selectedPO && matchedProduct && movementType === "IN") {
      const po = purchaseOrders.find(p => p.id === selectedPO);
      if (po) {
        setSelectedVendor(po.vendor_id);
        
        const poItem = po.items.find(item => item.product_id === matchedProduct.id);
        if (poItem) {
          const quantityOrdered = poItem.quantity_ordered;
          const quantityReceived = poItem.quantity_received || 0;
          const quantityRemaining = quantityOrdered - quantityReceived;
          
          setPOItemInfo({
            quantityOrdered,
            quantityReceived,
            quantityRemaining,
            unitCost: poItem.unit_cost,
            bundleQuantity: poItem.bundle_quantity
          });
          
          setUnitCost(String(poItem.unit_cost));
          setBundleQuantity(String(poItem.bundle_quantity || ''));
          
          if (quantityRemaining > 0 && parseInt(quantity) > quantityRemaining) {
            setQuantity(String(quantityRemaining));
          }
        } else {
          setPOItemInfo(null);
          setUnitCost("");
          setBundleQuantity("");
        }
      }
    } else {
      setPOItemInfo(null);
      if (movementType === "IN" && !selectedPO) {
        setSelectedVendor("");
        setUnitCost("");
        setBundleQuantity("");
      }
    }
  }, [selectedPO, matchedProduct, movementType, purchaseOrders, quantity]);

  // Auto-fill unit cost from ProductVendor when vendor is selected
  useEffect(() => {
    if (movementType === "IN" && selectedVendor && matchedProduct && !selectedPO) {
      const pv = productVendors.find(
        pv => pv.product_id === matchedProduct.id && pv.vendor_id === selectedVendor && pv.is_active
      );
      if (pv && pv.unit_cost) {
        setUnitCost(String(pv.unit_cost));
        setBundleQuantity(String(pv.bundle_quantity || ''));
      } else {
        setUnitCost("");
        setBundleQuantity("");
      }
    }
  }, [selectedVendor, matchedProduct, movementType, selectedPO, productVendors]);

  // Calculate unit cost when using total cost method
  useEffect(() => {
    if (costInputMethod === 'total' && movementType === "IN" && !selectedPO) {
      const qty = parseFloat(quantity) || 0;
      const totalCost = parseFloat(totalItemCost) || 0;
      const discountVal = parseFloat(discount) || 0;
      
      if (qty > 0 && totalCost > 0) {
        const adjustedTotalCost = totalCost * (1 - discountVal / 100);
        setUnitCost(String((adjustedTotalCost / qty).toFixed(4)));
      }
    }
  }, [costInputMethod, quantity, totalItemCost, discount, movementType, selectedPO]);

  const loadRecentScans = () => {
    try {
      const stored = localStorage.getItem('recentlyScannedProducts');
      if (stored) {
        setRecentlyScannedProducts(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading recent scans:", error);
    }
  };

  const saveRecentScan = (productSku) => {
    try {
      let recent = [...recentlyScannedProducts];
      recent = recent.filter(sku => sku !== productSku);
      recent.unshift(productSku);
      recent = recent.slice(0, 10);
      
      setRecentlyScannedProducts(recent);
      localStorage.setItem('recentlyScannedProducts', JSON.stringify(recent));
    } catch (error) {
      console.error("Error saving recent scan:", error);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      if ('BarcodeDetector' in window) {
        const barcodeDetector = new window.BarcodeDetector({
          formats: [
            'qr_code',
            'ean_13',
            'ean_8',
            'code_128',
            'code_39',
            'code_93',
            'codabar',
            'upc_a',
            'upc_e'
          ]
        });
        
        setIsScanning(true);
        
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const barcode = barcodes[0].rawValue;
                handleBarcodeDetected(barcode);
              }
            } catch (error) {
              console.error('Barcode detection error:', error);
            }
          }
        }, 200);
        
      } else {
        setCameraError("Your browser doesn't support automatic barcode scanning. Please enter the code manually.");
        stopCamera();
      }
      
    } catch (error) {
      console.error("Camera access error:", error);
      let errorMessage = "Could not access camera. ";
      
      if (error.name === 'NotAllowedError') {
        errorMessage += "Please allow camera access in your browser settings.";
      } else if (error.name === 'NotFoundError') {
        errorMessage += "No camera found on your device.";
      } else {
        errorMessage += "Please check your camera permissions.";
      }
      
      setCameraError(errorMessage);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setShowCamera(false);
  };

  const handleBarcodeDetected = (barcode) => {
    stopCamera();
    setScannedBarcode(barcode);
    
    const product = products.find(
      p => p.barcode === barcode || 
           p.qr_code === barcode ||
           p.sku === barcode
    );

    if (product) {
      setMatchedProduct(product);
      setScanResult({ type: 'success', message: `✓ Product found: ${product.name}` });
      saveRecentScan(product.sku);
    } else {
      setMatchedProduct(null);
      setScanResult({ type: 'error', message: `No product found with code: "${barcode}"` });
    }
  };

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) {
      setScanResult({ type: 'error', message: 'Please enter a barcode, QR code, or SKU' });
      return;
    }

    const product = products.find(
      p => p.barcode === scannedBarcode.trim() || 
           p.qr_code === scannedBarcode.trim() ||
           p.sku === scannedBarcode.trim()
    );

    if (product) {
      setMatchedProduct(product);
      setScanResult({ type: 'success', message: `✓ Product found: ${product.name}` });
      saveRecentScan(product.sku);
    } else {
      setMatchedProduct(null);
      setScanResult({ type: 'error', message: `No product found with code: "${scannedBarcode.trim()}"` });
    }
  };

  const getAvailableStockAtLocation = useCallback((productId, locationName) => {
    const item = stockItems.find(
      s => s.product_id === productId && s.warehouse_location === locationName
    );
    if (!item) return 0;
    return (item.quantity_on_hand || 0) - (item.quantity_reserved || 0);
  }, [stockItems]);

  const getAvailableLocationsForProduct = useCallback(() => {
    if (!matchedProduct) return [];
    const uniqueLocations = [...new Set(
      stockItems
        .filter(s => s.product_id === matchedProduct.id && (s.quantity_on_hand || 0) > 0)
        .map(s => s.warehouse_location)
    )];
    return uniqueLocations;
  }, [matchedProduct, stockItems]);

  const getProductStock = useCallback((productId) => {
    const items = stockItems.filter(s => s.product_id === productId);
    return items.reduce((sum, item) => sum + (item.quantity_on_hand || 0), 0);
  }, [stockItems]);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const result = await base44.integrations.Core.UploadFile({ file });
        return {
          url: result.file_url,
          filename: file.name,
          uploaded_at: new Date().toISOString()
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setUploadedPhotos(prev => [...prev, ...uploadedFiles]);
      setScanResult({ type: 'success', message: `✓ Uploaded ${files.length} photo(s)` });
    } catch (error) {
      console.error("Error uploading photos:", error);
      setScanResult({ type: 'error', message: 'Failed to upload photos' });
    }
    setIsUploadingPhoto(false);
  };

  const removePhoto = (index) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleStockMovement = async () => {
    if (!matchedProduct) {
      setScanResult({ type: 'error', message: 'Please scan a product first' });
      return;
    }

    const quantityNum = parseInt(quantity);
    if (!quantityNum || quantityNum < 1) {
      setScanResult({ type: 'error', message: 'Please enter a valid quantity (minimum 1)' });
      return;
    }

    // Validation based on movement type
    if (movementType === "TRANSFER") {
      if (!fromLocation) {
        setScanResult({ type: 'error', message: 'Please select a From Location for transfer' });
        return;
      }
      if (!toLocation) {
        setScanResult({ type: 'error', message: 'Please select a To Location for transfer' });
        return;
      }
      if (fromLocation === toLocation) {
        setScanResult({ type: 'error', message: 'From and To locations must be different' });
        return;
      }
      
      const availableStock = getAvailableStockAtLocation(matchedProduct.id, fromLocation);
      if (availableStock < quantityNum) {
        setScanResult({ 
          type: 'error', 
          message: `❌ Insufficient stock at "${fromLocation}". Available: ${availableStock} ${matchedProduct.unit_of_measure}, Required: ${quantityNum} ${matchedProduct.unit_of_measure}` 
        });
        return;
      }
    } else if (movementType === "IN") {
      if (!toLocation) {
        setScanResult({ type: 'error', message: 'Please select a warehouse location' });
        return;
      }
      
      if (!selectedVendor) {
        setScanResult({ type: 'error', message: 'Please select a vendor for stock IN' });
        return;
      }

      if (!vendorProductCode.trim()) {
        setScanResult({ type: 'error', message: 'Please enter vendor product code' });
        return;
      }

      if (!selectedCompany) {
        setScanResult({ type: 'error', message: 'Please select a company' });
        return;
      }

      if (!selectedInvoiceCategory) {
        setScanResult({ type: 'error', message: 'Please select invoice category' });
        return;
      }
      
      const cost = parseFloat(unitCost);
      if (unitCost !== "" && (isNaN(cost) || cost < 0)) {
        setScanResult({ type: 'error', message: 'Please enter a valid unit cost' });
        return;
      }

      // Validate against PO if one is selected
      if (selectedPO) {
        if (!poItemInfo) {
          setScanResult({ 
            type: 'error', 
            message: `❌ Product "${matchedProduct.name}" is not included in the selected Purchase Order` 
          });
          return;
        }
        if (poItemInfo.quantityRemaining <= 0) {
          setScanResult({ 
            type: 'error', 
            message: `❌ This product has already been fully received for this PO (${poItemInfo.quantityOrdered} ordered, ${poItemInfo.quantityReceived} received)` 
          });
          return;
        }

        if (quantityNum > poItemInfo.quantityRemaining) {
          setScanResult({ 
            type: 'error', 
            message: `❌ Cannot receive ${quantityNum} units. Only ${poItemInfo.quantityRemaining} remaining in PO (${poItemInfo.quantityOrdered} ordered, ${poItemInfo.quantityReceived} already received)` 
          });
          return;
        }
      }

    } else if (movementType === "OUT") {
      if (!fromLocation) {
        setScanResult({ type: 'error', message: 'Please select a warehouse location' });
        return;
      }
      
      if (!chargedToPerson) {
        setScanResult({ type: 'error', message: 'Please select who this material is being charged to' });
        return;
      }

      const availableStock = getAvailableStockAtLocation(matchedProduct.id, fromLocation);
      if (availableStock < quantityNum) {
        setScanResult({ 
          type: 'error', 
          message: `❌ Insufficient stock at "${fromLocation}". Available: ${availableStock} ${matchedProduct.unit_of_measure}, Required: ${quantityNum} ${matchedProduct.unit_of_measure}` 
        });
        return;
      }
    } else if (movementType === "ADJUSTMENT") {
      if (!toLocation) {
        setScanResult({ type: 'error', message: 'Please select a location for the adjustment' });
        return;
      }
    }

    setIsProcessing(true);
    try {
      const parsedConversionRate = parseFloat(conversionRate) || 1;
      const parsedUnitCost = parseFloat(unitCost) || 0;
      const baseQuantity = quantityNum * parsedConversionRate;
      const baseUnitCost = parsedUnitCost > 0 && parsedConversionRate > 0 ? parsedUnitCost / parsedConversionRate : undefined;

      // For IN movements, create or update ProductVendor relationship
      if (movementType === "IN" && selectedVendor && unitCost !== "") {
        const cost = parseFloat(unitCost);
        
        const existingPVs = await base44.entities.ProductVendor.filter({
          product_id: matchedProduct.id,
          vendor_id: selectedVendor
        });
        
        if (existingPVs.length === 0) {
          await base44.entities.ProductVendor.create({
            product_id: matchedProduct.id,
            vendor_id: selectedVendor,
            unit_cost: cost,
            is_preferred: false,
            is_active: true,
            conversion_rate: parsedConversionRate,
            bundle_quantity: bundleQuantity ? parseFloat(bundleQuantity) : null
          });
        } else {
          await base44.entities.ProductVendor.update(existingPVs[0].id, {
            unit_cost: cost,
            is_active: true,
            conversion_rate: parsedConversionRate,
            bundle_quantity: bundleQuantity ? parseFloat(bundleQuantity) : null
          });
        }
      }

      // Update product company_id if changed
      if (movementType === "IN" && selectedCompany) {
        const currentProduct = products.find(p => p.id === matchedProduct.id);
        if (currentProduct && selectedCompany !== currentProduct.company_id) {
          await base44.entities.Product.update(matchedProduct.id, {
            company_id: selectedCompany
          });
        }
      }

      // Prepare movement data
      const movementData = {
        product_id: matchedProduct.id,
        movement_type: movementType,
        quantity: quantityNum,
        input_unit_of_measure: inputUnitSubtype || matchedProduct.unit_of_measure,
        conversion_rate: parsedConversionRate,
        base_quantity: baseQuantity,
        from_location: movementType === "TRANSFER" || movementType === "OUT" ? fromLocation : null,
        to_location: movementType === "TRANSFER" || movementType === "IN" || movementType === "ADJUSTMENT" ? toLocation : null,
        performed_by: currentUser.email,
        scanned_barcode: scannedBarcode,
        notes: notes || null,
        waybill_number: waybillNumber || null,
        photos: uploadedPhotos.length > 0 ? uploadedPhotos : null
      };

      // Add charged_to_person for OUT movements
      if (movementType === "OUT") {
        movementData.charged_to_person = chargedToPerson;
        movementData.unit_cost = matchedProduct.unit_cost || 0;
        movementData.base_unit_cost = baseUnitCost;
      }

      // Add vendor reference for IN movements
      if (movementType === "IN" && selectedVendor) {
        movementData.reference_type = "Vendor";
        movementData.reference_id = selectedVendor;
        if (unitCost !== "" && !isNaN(parseFloat(unitCost))) {
          movementData.unit_cost = parseFloat(unitCost);
          movementData.base_unit_cost = baseUnitCost;
        }
        if (vendorProductCode) {
          movementData.vendor_product_code = vendorProductCode;
        }
        if (selectedInvoiceCategory) {
          movementData.invoice_category_id = selectedInvoiceCategory;
        }
        if (bundleQuantity) {
          movementData.bundle_quantity = parseFloat(bundleQuantity);
        }
      }

      // Add PO or invoice reference for IN movements
      if (movementType === "IN") {
        if (selectedPO) {
          movementData.reference_type = "PurchaseOrder";
          movementData.reference_id = selectedPO;
        } else if (invoiceNumber) {
          movementData.reference_type = "Invoice";
          movementData.reference_id = invoiceNumber;
        }
      }

      // Create stock movement record
      await base44.entities.StockMovement.create(movementData);

      // Update stock items using base_quantity
      if (movementType === "IN" || movementType === "ADJUSTMENT") {
        const existingStock = stockItems.find(
          s => s.product_id === matchedProduct.id && s.warehouse_location === toLocation
        );

        if (existingStock) {
          await base44.entities.StockItem.update(existingStock.id, {
            quantity_on_hand: (existingStock.quantity_on_hand || 0) + baseQuantity
          });
        } else {
          await base44.entities.StockItem.create({
            product_id: matchedProduct.id,
            warehouse_location: toLocation,
            quantity_on_hand: baseQuantity,
            quantity_reserved: 0
          });
        }
      } else if (movementType === "OUT") {
        const existingStock = stockItems.find(
          s => s.product_id === matchedProduct.id && s.warehouse_location === fromLocation
        );

        if (existingStock) {
          await base44.entities.StockItem.update(existingStock.id, {
            quantity_on_hand: Math.max(0, (existingStock.quantity_on_hand || 0) - baseQuantity)
          });
        }
      } else if (movementType === "TRANSFER") {
        const fromStock = stockItems.find(
          s => s.product_id === matchedProduct.id && s.warehouse_location === fromLocation
        );
        if (fromStock) {
          await base44.entities.StockItem.update(fromStock.id, {
            quantity_on_hand: Math.max(0, (fromStock.quantity_on_hand || 0) - baseQuantity)
          });
        }

        const toStock = stockItems.find(
          s => s.product_id === matchedProduct.id && s.warehouse_location === toLocation
        );
        if (toStock) {
          await base44.entities.StockItem.update(toStock.id, {
            quantity_on_hand: (toStock.quantity_on_hand || 0) + baseQuantity
          });
        } else {
          await base44.entities.StockItem.create({
            product_id: matchedProduct.id,
            warehouse_location: toLocation,
            quantity_on_hand: baseQuantity,
            quantity_reserved: 0
          });
        }
      }

      // Reload all data after all updates to reflect changes in stock and POs
      await loadData();
      
      // Get charged person name for display
      let chargedPersonName = '';
      if (chargedToPerson) {
        const sysUser = systemUsers.find(u => u.id === chargedToPerson || u.email === chargedToPerson);
        const appUser = appUsers.find(u => u.id === chargedToPerson);
        chargedPersonName = sysUser?.full_name || appUser?.full_name || chargedToPerson;
      }

      // Get vendor name for display
      let vendorName = '';
      if (selectedVendor) {
        const vendor = vendors.find(v => v.id === selectedVendor);
        vendorName = vendor?.name || '';
      }

      // Add to recent scans
      setRecentScans(prev => [{
        product: matchedProduct.name,
        barcode: scannedBarcode,
        type: movementType,
        quantity: quantityNum,
        fromLocation: fromLocation || '-',
        toLocation: toLocation || '-',
        chargedTo: chargedPersonName || '-',
        vendor: vendorName || '-',
        unitCost: movementType === "IN" && unitCost !== "" ? parseFloat(unitCost) : null,
        waybill: waybillNumber || '-',
        timestamp: new Date(),
        hasPhotos: uploadedPhotos.length > 0
      }, ...prev.slice(0, 9)]);

      let successMsg = '';
      if (movementType === "IN") {
        successMsg = `✓ Added ${quantityNum} ${matchedProduct.unit_of_measure} to "${toLocation}" from ${vendorName}`;
        if (unitCost !== "") {
          successMsg += ` @ €${parseFloat(unitCost).toFixed(2)}`;
        }
      } else if (movementType === "OUT") {
        successMsg = `✓ Charged ${quantityNum} ${matchedProduct.unit_of_measure} to ${chargedPersonName}`;
      } else if (movementType === "TRANSFER") {
        successMsg = `✓ Transferred ${quantityNum} ${matchedProduct.unit_of_measure} from "${fromLocation}" to "${toLocation}"`;
      } else if (movementType === "ADJUSTMENT") {
        successMsg = `✓ Adjusted ${quantityNum} ${matchedProduct.unit_of_measure} at "${toLocation}"`;
      }

      setScanResult({ type: 'success', message: successMsg });
      saveRecentScan(matchedProduct.sku);

      // Reset form
      setScannedBarcode("");
      setMatchedProduct(null);
      setQuantity("1");
      setFromLocation("");
      setToLocation("");
      setSelectedPO("");
      setInvoiceNumber("");
      setWaybillNumber("");
      setChargedToPerson("");
      setSelectedVendor("");
      setSelectedCompany("");
      setVendorProductCode("");
      setSelectedInvoiceCategory("");
      setCostInputMethod("unit");
      setUnitCost("");
      setTotalItemCost("");
      setDiscount("0");
      setBundleQuantity("");
      setInputUnitSubtype("");
      setConversionRate("1");
      setNotes("");
      setPOItemInfo(null);
      setUploadedPhotos([]);
      
    } catch (error) {
      console.error("Error processing stock movement:", error);
      setScanResult({ type: 'error', message: 'Failed to process stock movement. Please try again.' });
    }
    setIsProcessing(false);
  };

  const handleQuickTest = (sampleSku) => {
    setScannedBarcode(sampleSku);
    setTimeout(() => {
      const product = products.find(p => p.sku === sampleSku);
      if (product) {
        setMatchedProduct(product);
        setScanResult({ type: 'success', message: `✓ Product found: ${product.name}` });
      }
    }, 100);
  };

  const handleQuickTestPO = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setSelectedPOForBulkReceive(po);
      
      // Initialize items to receive with remaining quantities
      const itemsToReceive = po.items
        .filter(item => (item.quantity_ordered - (item.quantity_received || 0)) > 0)
        .map(item => ({
          ...item,
          quantity_to_receive: item.quantity_ordered - (item.quantity_received || 0),
          selected: true
        }));
      
      setPOItemsToReceive(itemsToReceive);
      setShowPOSelectionDialog(true);
    }
  };

  const handleBulkReceiveFromPO = async () => {
    const selectedItems = poItemsToReceive.filter(item => item.selected && item.quantity_to_receive > 0);
    
    if (selectedItems.length === 0) {
      setScanResult({ type: 'error', message: 'Please select at least one item to receive' });
      return;
    }

    if (!toLocation) {
      setScanResult({ type: 'error', message: 'Please select a warehouse location' });
      return;
    }

    setIsProcessing(true);
    try {
      const po = selectedPOForBulkReceive;
      // const vendor = vendors.find(v => v.id === po.vendor_id); // Not used

      // Process each selected item
      for (const item of selectedItems) {
        // Update product company if specified
        if (item.company_id) {
          const currentProduct = products.find(p => p.id === item.product_id);
          if (currentProduct && item.company_id !== currentProduct.company_id) {
            await base44.entities.Product.update(item.product_id, {
              company_id: item.company_id
            });
          }
        }

        // Create stock movement
        const product = products.find(p => p.id === item.product_id);
        const itemConversionRate = parseFloat(item.conversion_rate) || 1;
        const itemBaseQuantity = item.quantity_to_receive * itemConversionRate;
        const itemBaseUnitCost = item.unit_cost && itemConversionRate > 0 ? item.unit_cost / itemConversionRate : undefined;

        await base44.entities.StockMovement.create({
          product_id: item.product_id,
          movement_type: "IN",
          quantity: item.quantity_to_receive,
          input_unit_of_measure: item.input_unit_subtype || product?.unit_of_measure,
          conversion_rate: itemConversionRate,
          base_quantity: itemBaseQuantity,
          to_location: toLocation,
          reference_type: "PurchaseOrder",
          reference_id: po.id,
          performed_by: currentUser.email,
          unit_cost: item.unit_cost || null,
          base_unit_cost: itemBaseUnitCost,
          bundle_quantity: item.bundle_quantity || null,
          vendor_product_code: item.vendor_product_code || null,
          invoice_category_id: item.invoice_category_id || null,
          notes: `Bulk receive from PO ${po.po_number}`,
          photos: uploadedPhotos.length > 0 ? uploadedPhotos : null
        });

        // Update stock using base_quantity
        const existingStock = stockItems.find(
          s => s.product_id === item.product_id && s.warehouse_location === toLocation
        );

        if (existingStock) {
          await base44.entities.StockItem.update(existingStock.id, {
            quantity_on_hand: (existingStock.quantity_on_hand || 0) + itemBaseQuantity
          });
        } else {
          await base44.entities.StockItem.create({
            product_id: item.product_id,
            warehouse_location: toLocation,
            quantity_on_hand: itemBaseQuantity,
            quantity_reserved: 0
          });
        }

        // Update ProductVendor if unit cost exists
        if (item.unit_cost) {
          const existingPVs = await base44.entities.ProductVendor.filter({
            product_id: item.product_id,
            vendor_id: po.vendor_id
          });
          
          if (existingPVs.length === 0) {
            await base44.entities.ProductVendor.create({
              product_id: item.product_id,
              vendor_id: po.vendor_id,
              unit_cost: item.unit_cost,
              is_preferred: false,
              is_active: true,
              conversion_rate: itemConversionRate,
              bundle_quantity: item.bundle_quantity
            });
          }
        }

        // Small delay between items to avoid rate limiting
        await delay(200);
      }

      await loadData();

      setScanResult({ 
        type: 'success', 
        message: `✓ Successfully received ${selectedItems.length} items from PO ${po.po_number}` 
      });

      setShowPOSelectionDialog(false);
      setSelectedPOForBulkReceive(null);
      setPOItemsToReceive([]);
      setToLocation("");
      setUploadedPhotos([]);

    } catch (error) {
      console.error("Error processing bulk receive:", error);
      setScanResult({ type: 'error', message: 'Failed to process bulk receive. Please try again.' });
    }
    setIsProcessing(false);
  };

  const getQuickTestProducts = () => {
    const recent = recentlyScannedProducts
      .map(sku => products.find(p => p.sku === sku))
      .filter(Boolean)
      .slice(0, 5);
    
    if (recent.length >= 5) {
      return recent;
    }
    
    const additional = products
      .filter(p => !recent.find(r => r.id === p.id))
      .slice(0, 5 - recent.length);
    
    return [...recent, ...additional];
  };

  const getOpenPOs = () => {
    return purchaseOrders
      .filter(po => po.status === 'Confirmed' || po.status === 'Partially Received')
      .slice(0, 10); // Show up to 10 POs
  };

  const handleVendorCreated = async () => {
    setShowCreateVendorDialog(false);
    const vendorsData = await base44.entities.Vendor.filter({ is_active: true });
    setVendors(vendorsData);
    loadData();
  };

  const handleVendorCreatedFromBulk = async (newVendor) => {
    await loadData();
    setBulkInvoiceVendor(newVendor.id);
    setShowCreateVendorFromBulk(false);
  };

  const handleProductCreatedFromBulk = async () => {
    await loadData();
    setShowCreateProductFromBulk(false);
  };

  const handleMovementTypeChange = (value) => {
    setMovementType(value);
    setFromLocation("");
    setToLocation("");
    setSelectedPO("");
    setInvoiceNumber("");
    setWaybillNumber("");
    setChargedToPerson("");
    setSelectedVendor("");
    setSelectedCompany("");
    setVendorProductCode("");
    setSelectedInvoiceCategory("");
    setCostInputMethod("unit");
    setUnitCost("");
    setTotalItemCost("");
    setDiscount("0");
    setBundleQuantity("");
    setInputUnitSubtype("");
    setConversionRate("1");
    setPOItemInfo(null);
  };

  const togglePOItemSelection = (index) => {
    setPOItemsToReceive(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const updatePOItemQuantity = (index, quantity) => {
    setPOItemsToReceive(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity_to_receive: parseInt(quantity) || 0 } : item
    ));
  };

  const handleOpenBulkInvoice = () => {
    setBulkInvoiceVendor("");
    setBulkInvoiceNumber("");
    setBulkInvoiceWaybill("");
    setBulkInvoiceItems([]);
    setShowBulkInvoiceDialog(true);
  };

  const handleAddBulkInvoiceItem = () => {
    setBulkInvoiceItems(prev => [...prev, {
      product_id: '',
      quantity: 1,
      cost_input_method: 'unit',
      unit_cost: '',
      total_item_cost: '',
      discount: 0,
      bundle_quantity: '',
      input_unit_subtype: '',
      conversion_rate: '1',
      vendor_product_code: '',
      invoice_category_id: '',
      company_id: '',
      warehouse_location: ''
    }]);
  };

  const handleRemoveBulkInvoiceItem = (index) => {
    setBulkInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkInvoiceItemChange = (index, field, value) => {
    setBulkInvoiceItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      const updatedItem = { ...item, [field]: value };
      
      // Auto-fill unit cost from ProductVendor when product is selected
      if (field === 'product_id' && value && bulkInvoiceVendor) {
        const pv = productVendors.find(
          pv => pv.product_id === value && pv.vendor_id === bulkInvoiceVendor && pv.is_active
        );
        if (pv) {
          updatedItem.unit_cost = String(pv.unit_cost || '');
          updatedItem.bundle_quantity = String(pv.bundle_quantity || '');
          updatedItem.conversion_rate = String(pv.conversion_rate || pv.bundle_quantity || '1');
          updatedItem.input_unit_subtype = pv.input_unit_of_measure || '';
        }
      }
      
      // Calculate unit cost when using total cost method
      if (updatedItem.cost_input_method === 'total') {
        const qty = parseFloat(updatedItem.quantity) || 0;
        const totalCost = parseFloat(updatedItem.total_item_cost) || 0;
        const discount = parseFloat(updatedItem.discount) || 0;
        
        if (qty > 0 && totalCost > 0) {
          const adjustedTotalCost = totalCost * (1 - discount / 100);
          updatedItem.unit_cost = String((adjustedTotalCost / qty).toFixed(4));
        }
      }
      
      return updatedItem;
    }));
  };

  const handleSubmitBulkInvoice = async () => {
    if (!bulkInvoiceVendor) {
      setScanResult({ type: 'error', message: 'Παρακαλώ επιλέξτε προμηθευτή' });
      return;
    }

    if (!bulkInvoiceNumber) {
      setScanResult({ type: 'error', message: 'Παρακαλώ εισάγετε αριθμό τιμολογίου' });
      return;
    }

    if (bulkInvoiceItems.length === 0) {
      setScanResult({ type: 'error', message: 'Παρακαλώ προσθέστε τουλάχιστον ένα προϊόν' });
      return;
    }

    for (let i = 0; i < bulkInvoiceItems.length; i++) {
      const item = bulkInvoiceItems[i];
      if (!item.product_id) {
        setScanResult({ type: 'error', message: `Παρακαλώ επιλέξτε προϊόν για τη γραμμή ${i + 1}` });
        return;
      }
      if (!item.warehouse_location) {
        setScanResult({ type: 'error', message: `Παρακαλώ επιλέξτε θέση αποθήκης για τη γραμμή ${i + 1}` });
        return;
      }
      if (!item.quantity || parseInt(item.quantity) < 1) {
        setScanResult({ type: 'error', message: `Παρακαλώ εισάγετε έγκυρη ποσότητα για τη γραμμή ${i + 1}` });
        return;
      }
    }

    setIsProcessing(true);
    try {
      for (const item of bulkInvoiceItems) {
        const quantityNum = parseInt(item.quantity);
        const cost = parseFloat(item.unit_cost) || 0;
        const parsedConversionRate = parseFloat(item.conversion_rate) || 1;
        const baseQuantity = quantityNum * parsedConversionRate;
        const baseUnitCost = cost > 0 && parsedConversionRate > 0 ? cost / parsedConversionRate : undefined;

        // Create or update ProductVendor if unit cost is provided
        if (cost > 0) {
          const existingPVs = await base44.entities.ProductVendor.filter({
            product_id: item.product_id,
            vendor_id: bulkInvoiceVendor
          });
          
          if (existingPVs.length === 0) {
            await base44.entities.ProductVendor.create({
              product_id: item.product_id,
              vendor_id: bulkInvoiceVendor,
              unit_cost: cost,
              is_preferred: false,
              is_active: true,
              conversion_rate: parsedConversionRate,
              bundle_quantity: item.bundle_quantity ? parseFloat(item.bundle_quantity) : null
            });
          } else {
            await base44.entities.ProductVendor.update(existingPVs[0].id, {
              unit_cost: cost,
              is_active: true,
              conversion_rate: parsedConversionRate,
              bundle_quantity: item.bundle_quantity ? parseFloat(item.bundle_quantity) : null
            });
          }
        }

        // Update product company if specified
        if (item.company_id) {
          const currentProduct = products.find(p => p.id === item.product_id);
          if (currentProduct && item.company_id !== currentProduct.company_id) {
            await base44.entities.Product.update(item.product_id, {
              company_id: item.company_id
            });
          }
        }

        // Create stock movement
        const product = products.find(p => p.id === item.product_id);
        await base44.entities.StockMovement.create({
          product_id: item.product_id,
          movement_type: "IN",
          quantity: quantityNum,
          input_unit_of_measure: item.input_unit_subtype || product?.unit_of_measure,
          conversion_rate: parsedConversionRate,
          base_quantity: baseQuantity,
          to_location: item.warehouse_location,
          reference_type: "Invoice",
          reference_id: bulkInvoiceNumber,
          performed_by: currentUser.email,
          waybill_number: bulkInvoiceWaybill || null,
          unit_cost: cost > 0 ? cost : null,
          base_unit_cost: baseUnitCost,
          bundle_quantity: item.bundle_quantity ? parseFloat(item.bundle_quantity) : null,
          vendor_product_code: item.vendor_product_code || null,
          invoice_category_id: item.invoice_category_id || null,
          notes: `Bulk invoice entry: ${bulkInvoiceNumber}`
        });

        // Update stock using base_quantity
        const existingStock = stockItems.find(
          s => s.product_id === item.product_id && s.warehouse_location === item.warehouse_location
        );

        if (existingStock) {
          await base44.entities.StockItem.update(existingStock.id, {
            quantity_on_hand: (existingStock.quantity_on_hand || 0) + baseQuantity
          });
        } else {
          await base44.entities.StockItem.create({
            product_id: item.product_id,
            warehouse_location: item.warehouse_location,
            quantity_on_hand: baseQuantity,
            quantity_reserved: 0
          });
        }

        await delay(200);
      }

      await loadData();

      setScanResult({ 
        type: 'success', 
        message: `✓ Καταχωρήθηκαν επιτυχώς ${bulkInvoiceItems.length} προϊόντα από τιμολόγιο ${bulkInvoiceNumber}` 
      });

      setShowBulkInvoiceDialog(false);
      setBulkInvoiceVendor("");
      setBulkInvoiceNumber("");
      setBulkInvoiceWaybill("");
      setBulkInvoiceItems([]);

    } catch (error) {
      console.error("Error processing bulk invoice:", error);
      setScanResult({ type: 'error', message: 'Αποτυχία καταχώρησης τιμολογίου. Παρακαλώ δοκιμάστε ξανά.' });
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Barcode Scanner</h1>
          <p className="text-sm md:text-base text-slate-600">Scan products for quick stock operations</p>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            <strong>How to use:</strong> Click "Scan with Camera" to use your device camera, or manually enter a barcode/QR/SKU and search.
          </AlertDescription>
        </Alert>

        {cameraError && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-800">
              {cameraError}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Scanning Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScanBarcode className="w-5 h-5" />
              Scan Product
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={handleOpenBulkInvoice}
                size="lg"
                variant="outline"
                className="flex-1 border-green-600 text-green-700 hover:bg-green-50 text-sm md:text-base"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Bulk Invoice Entry
              </Button>
              <Button 
                onClick={startCamera}
                size="lg"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm md:text-base"
              >
                <Camera className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Scan with Camera
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or enter manually</span>
              </div>
            </div>

            <form onSubmit={handleManualSearch} className="space-y-3">
              <div>
                <Label htmlFor="barcode" className="text-sm md:text-base">Barcode / QR Code / SKU</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="barcode"
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    placeholder="Type code here..."
                    className="flex-1 text-base h-11 md:h-12"
                  />
                  <Button 
                    type="submit" 
                    size="lg"
                    variant="outline"
                    disabled={!scannedBarcode.trim()}
                    className="px-4 md:px-6 h-11 md:h-12"
                  >
                    <ScanBarcode className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
                    <span className="hidden md:inline">Search</span>
                  </Button>
                </div>
              </div>
            </form>

            {scanResult && (
              <Alert className={
                scanResult.type === 'success' 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }>
                {scanResult.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={`text-sm ${
                  scanResult.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {scanResult.message}
                </AlertDescription>
              </Alert>
            )}

            {matchedProduct && (
              <>
                <Separator />

                {/* Product Info - Compact */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Package className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg text-blue-900 break-words">{matchedProduct.name}</p>
                          {matchedProduct.description && (
                            <p className="text-sm text-blue-700 mt-1 break-words">{matchedProduct.description}</p>
                          )}
                        </div>
                        <Badge className="bg-blue-600 text-white flex-shrink-0">Matched ✓</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-blue-700 font-mono">
                          <span className="font-semibold">SKU:</span> {matchedProduct.sku}
                        </p>
                        <p className="text-sm text-blue-600">
                          <span className="font-semibold">Current Stock:</span> {getProductStock(matchedProduct.id)} {matchedProduct.unit_of_measure}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Conditional Fields based on Movement Type */}
                  {(movementType === "TRANSFER" || movementType === "OUT") && (
                    <div className="space-y-2">
                      <Label>Από Θέση *</Label>
                      <Select value={fromLocation || 'none'} onValueChange={(val) => setFromLocation(val === 'none' ? '' : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε θέση" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Επιλέξτε --</SelectItem>
                          {getAvailableLocationsForProduct().filter(locName => locName && locName.trim() !== '').map(locName => (
                            <SelectItem key={locName} value={locName}>
                              {locName} ({getAvailableStockAtLocation(matchedProduct.id, locName)} διαθέσιμα)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Movement Type & Warehouse Location */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Τύπος Κίνησης *</Label>
                      <Select value={movementType} onValueChange={handleMovementTypeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IN">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span>Εισαγωγή (IN)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="OUT">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-red-600" />
                              <span>Εξαγωγή (OUT)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="TRANSFER">
                            <div className="flex items-center gap-2">
                              <Move className="w-4 h-4 text-blue-600" />
                              <span>Μεταφορά (TRANSFER)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ADJUSTMENT">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-orange-600" />
                              <span>Διόρθωση (ADJUSTMENT)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(movementType === "TRANSFER" || movementType === "IN" || movementType === "ADJUSTMENT") && (
                      <div>
                        <Label>Θέση Αποθήκης *</Label>
                        <Select value={toLocation || 'none'} onValueChange={(val) => setToLocation(val === 'none' ? '' : val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Επιλέξτε θέση" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Επιλέξτε --</SelectItem>
                            {locations.filter(loc => loc.id && loc.name && loc.name.trim() !== '' && loc.name !== fromLocation).map(loc => (
                              <SelectItem key={loc.id} value={loc.name}>
                                {loc.name} {loc.warehouse && `- ${loc.warehouse}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Company & Invoice Category */}
                  {movementType === "IN" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Εταιρεία *</Label>
                        <Select value={selectedCompany || 'none'} onValueChange={(val) => setSelectedCompany(val === 'none' ? '' : val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Επιλέξτε εταιρεία" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Χωρίς Εταιρεία --</SelectItem>
                            {companies.map(comp => (
                              <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Κατηγορία Τιμολόγησης *</Label>
                        <Select value={selectedInvoiceCategory || 'none'} onValueChange={(val) => setSelectedInvoiceCategory(val === 'none' ? '' : val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Επιλέξτε κατηγορία" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Χωρίς Κατηγορία --</SelectItem>
                            {invoiceCategories.map(ic => (
                              <SelectItem key={ic.id} value={ic.id}>
                                <div>
                                  <div className="font-medium">{ic.name}</div>
                                  {ic.description && (
                                    <div className="text-xs text-slate-500">{ic.description}</div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {movementType === "IN" && (
                    <>
                      <Separator />

                      <PreviousPurchasesSelector
                        productId={matchedProduct?.id}
                        vendors={vendors}
                        companies={companies}
                        invoiceCategories={invoiceCategories}
                        onSelect={(data) => {
                          if (data) {
                            setSelectedVendor(data.vendor_id || '');
                            setUnitCost(data.unit_cost ? String(data.unit_cost) : '');
                            setBundleQuantity(data.bundle_quantity ? String(data.bundle_quantity) : '');
                            setConversionRate(data.conversion_rate ? String(data.conversion_rate) : (data.bundle_quantity ? String(data.bundle_quantity) : '1'));
                            setInputUnitSubtype(data.input_unit_of_measure || '');
                            setVendorProductCode(data.vendor_product_code || '');
                            setSelectedInvoiceCategory(data.invoice_category_id || '');
                            setSelectedCompany(data.company_id || '');
                          }
                        }}
                      />

                      <Separator />

                      {/* Vendor Information Section */}
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700">Στοιχεία Προμηθευτή</p>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Προμηθευτής *</Label>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <VendorSearchCombobox
                                  vendors={vendors}
                                  vendorProductIds={productVendors
                                    .filter(pv => pv.product_id === matchedProduct?.id && pv.is_active)
                                    .map(pv => pv.vendor_id)}
                                  value={selectedVendor}
                                  onValueChange={setSelectedVendor}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setShowCreateVendorDialog(true)}
                                title="Add new vendor"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div>
                            <Label>Κωδικός Προϊόντος Προμηθευτή *</Label>
                            <Input
                              value={vendorProductCode}
                              onChange={(e) => setVendorProductCode(e.target.value)}
                              placeholder="Κωδικός προμηθευτή"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="invoice-number">Αριθμός Τιμολογίου</Label>
                          <Input
                            id="invoice-number"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            placeholder="π.χ. INV-2025-001"
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Quantity & Cost Section */}
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700">Ποσότητα & Κόστος</p>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Ποσότητα *</Label>
                            <Input
                              id="quantity"
                              type="text"
                              inputMode="numeric"
                              value={quantity}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^\d+$/.test(value)) {
                                  setQuantity(value);
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val) || val < 1) {
                                  setQuantity("1");
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                            />
                          </div>

                          <div>
                            <Label>Pcs/Qty</Label>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={bundleQuantity || ''}
                              onChange={(e) => setBundleQuantity(e.target.value)}
                              placeholder="π.χ. 100 τεμ."
                            />
                            {unitCost && bundleQuantity && parseFloat(bundleQuantity) > 0 && (
                              <p className="text-xs text-slate-700 mt-1">
                                <strong>Κόστος ανά τεμάχιο:</strong> €{(parseFloat(unitCost) / parseFloat(bundleQuantity)).toFixed(4)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label>Μέθοδος Εισαγωγής Κόστους</Label>
                          <Select 
                            value={costInputMethod} 
                            onValueChange={(val) => {
                              setCostInputMethod(val);
                              if (val === 'unit') {
                                setTotalItemCost("");
                                setDiscount("0");
                              } else {
                                setUnitCost("");
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unit">Ανά Μονάδα</SelectItem>
                              <SelectItem value="total">Συνολικό Κόστος + Έκπτωση</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {costInputMethod === 'unit' ? (
                          <div>
                            <Label>Κόστος ανά μονάδα (€) *</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              value={unitCost}
                              onChange={(e) => setUnitCost(e.target.value)}
                              placeholder="0.0000"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              Κόστος ανά {matchedProduct.unit_of_measure}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Συνολικό Κόστος Προϊόντος (€) *</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={totalItemCost}
                                  onChange={(e) => setTotalItemCost(e.target.value)}
                                  placeholder="0.00"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                  Το συνολικό κόστος πριν την έκπτωση
                                </p>
                              </div>
                              <div>
                                <Label>Έκπτωση (%)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  value={discount}
                                  onChange={(e) => setDiscount(e.target.value)}
                                  placeholder="0"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                  Ποσοστό έκπτωσης επί του συνολικού κόστους
                                </p>
                              </div>
                            </div>
                            {unitCost && (
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-900">
                                  <strong>Υπολογιζόμενο Κόστος ανά Μονάδα:</strong> €{parseFloat(unitCost).toFixed(4)}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                        <Separator />

                        {/* Additional Details Section */}
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-slate-700">Πρόσθετα Στοιχεία</p>

                          <div>
                            <Label htmlFor="waybill-in">Αριθμός Waybill</Label>
                            <Input
                              id="waybill-in"
                              value={waybillNumber}
                              onChange={(e) => setWaybillNumber(e.target.value)}
                              placeholder="π.χ. WB-2025-001"
                            />
                          </div>
                        </div>
                    </>
                  )}

                  {movementType === "OUT" && (
                    <>
                      <div>
                        <Label>Ποσότητα *</Label>
                        <Input
                          id="quantity-out"
                          type="text"
                          inputMode="numeric"
                          value={quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d+$/.test(value)) {
                              setQuantity(value);
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val) || val < 1) {
                              setQuantity("1");
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>

                      <div>
                        <Label>Χρέωση σε Άτομο *</Label>
                        <PersonSearchCombobox
                          systemUsers={systemUsers}
                          appUsers={appUsers}
                          value={chargedToPerson}
                          onValueChange={setChargedToPerson}
                        />
                      </div>

                      <div>
                        <Label htmlFor="waybill">Αριθμός Waybill (προαιρετικό)</Label>
                        <Input
                          id="waybill"
                          value={waybillNumber}
                          onChange={(e) => setWaybillNumber(e.target.value)}
                          placeholder="π.χ. WB-2025-001"
                        />
                      </div>
                    </>
                  )}

                  {(movementType === "ADJUSTMENT" || movementType === "TRANSFER") && (
                    <div>
                      <Label>Ποσότητα *</Label>
                      <Input
                        id="quantity-other"
                        type="text"
                        inputMode="numeric"
                        value={quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            setQuantity(value);
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (isNaN(val) || val < 1) {
                            setQuantity("1");
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  )}

                  {/* Photo Upload Section */}
                  <div className="space-y-2">
                    <Label>Φωτογραφίες (προαιρετικό)</Label>
                    <div className="flex gap-2">
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="w-full"
                      >
                        {isUploadingPhoto ? (
                          <>
                            <Upload className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Upload Photos
                          </>
                        )}
                      </Button>
                    </div>
                    {uploadedPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {uploadedPhotos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={photo.url} 
                              alt={photo.filename}
                              className="w-full h-24 object-cover rounded-lg border border-slate-200"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removePhoto(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Σημειώσεις (προαιρετικό)</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Προσθέστε επιπλέον σημειώσεις..."
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleStockMovement} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>Επεξεργασία...</>
                  ) : (
                    <>
                      <ArrowRight className="w-5 h-5 mr-2" />
                      Επεξεργασία Κίνησης Αποθέματος
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Test Section - Improved */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              Quick Access - Products & Open POs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recent Products */}
            {getQuickTestProducts().length > 0 && (
              <div className="p-3 md:p-4 bg-white rounded-lg border border-slate-200">
                <p className="text-xs md:text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Recent & Popular Products
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {getQuickTestProducts().map((product, idx) => (
                    <Button
                      key={product.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickTest(product.sku)}
                      className="justify-start text-left h-auto py-2 px-3"
                    >
                      {idx < recentlyScannedProducts.length && (
                        <span className="text-xs text-blue-600 mr-2">●</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs font-semibold">{product.sku}</div>
                        <div className="text-xs text-slate-600 truncate">{product.name}</div>
                      </div>
                    </Button>
                  ))}
                </div>
                {recentlyScannedProducts.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2">● = Recently scanned</p>
                )}
              </div>
            )}

            {/* Open POs - List View */}
            {getOpenPOs().length > 0 && (
              <div className="p-3 md:p-4 bg-white rounded-lg border border-slate-200">
                <p className="text-xs md:text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Open Purchase Orders ({getOpenPOs().length})
                </p>
                <div className="space-y-2">
                  {getOpenPOs().map((po) => {
                    const vendor = vendors.find(v => v.id === po.vendor_id);
                    const totalRemaining = po.items.reduce((sum, item) => 
                      sum + (item.quantity_ordered - (item.quantity_received || 0)), 0
                    );
                    const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity_ordered, 0);
                    const totalReceived = po.items.reduce((sum, item) => sum + (item.quantity_received || 0), 0);
                    const percentReceived = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
                    
                    return (
                      <div
                        key={po.id}
                        className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                        onClick={() => handleQuickTestPO(po.id)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-slate-900">
                              PO #{po.po_number}
                            </div>
                            <div className="text-xs text-slate-600 truncate">{vendor?.name || 'N/A'}</div>
                          </div>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {po.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Progress:</span>
                            <span className="font-semibold">{percentReceived}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${percentReceived}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-600 pt-1">
                            <span>{totalReceived} / {totalOrdered} items received</span>
                            <span className="font-semibold text-orange-600">{totalRemaining} remaining</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {getOpenPOs().length === 0 && (
              <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
                <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">No open purchase orders</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scans - Improved */}
        {recentScans.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-base md:text-lg">Recent Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentScans.map((scan, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{scan.product}</p>
                      <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                        {scan.type === 'TRANSFER' && (
                          <p>📦 {scan.fromLocation} → {scan.toLocation}</p>
                        )}
                        {scan.type === 'IN' && (
                          <>
                            <p>📍 To: {scan.toLocation}</p>
                            <p>🏢 Vendor: {scan.vendor}</p>
                            {scan.unitCost && (
                              <p>💶 Cost: €{scan.unitCost.toFixed(2)} per unit</p>
                            )}
                          </>
                        )}
                        {scan.type === 'OUT' && (
                          <>
                            <p>📍 From: {scan.fromLocation}</p>
                            <p>👤 Charged to: {scan.chargedTo}</p>
                          </>
                        )}
                        {scan.waybill !== '-' && (
                          <p>📋 Waybill: {scan.waybill}</p>
                        )}
                        {scan.hasPhotos && (
                          <p className="text-blue-600">📷 Photos attached</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className={
                        scan.type === 'IN' ? 'bg-green-600 text-white' : 
                        scan.type === 'OUT' ? 'bg-red-600 text-white' :
                        scan.type === 'TRANSFER' ? 'bg-blue-600 text-white' :
                        'bg-orange-600 text-white'
                      }>
                        {scan.type === 'IN' && '+'}
                        {scan.type === 'OUT' && '-'}
                        {scan.quantity}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatLocalTime(scan.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Scanning Barcode...
              </span>
              <Button variant="ghost" size="icon" onClick={stopCamera}>
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              {isScanning ? "Hold the barcode/QR code in front of the camera" : "Starting camera..."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-4 border-blue-500 rounded-lg opacity-50">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
              </div>
            </div>
            
            {isScanning && (
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <Badge className="bg-blue-600 text-white">Scanning...</Badge>
              </div>
            )}
          </div>
          
          <div className="flex justify-center">
            <Button onClick={stopCamera} variant="outline">
              Cancel Scanning
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PO Selection Dialog */}
      <Dialog open={showPOSelectionDialog} onOpenChange={setShowPOSelectionDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Items from PO #{selectedPOForBulkReceive?.po_number}</DialogTitle>
            <DialogDescription>
              Select the items you want to receive and adjust quantities as needed
            </DialogDescription>
          </DialogHeader>

          {selectedPOForBulkReceive && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Vendor:</strong> {vendors.find(v => v.id === selectedPOForBulkReceive.vendor_id)?.name || 'N/A'}
                </p>
                <p className="text-sm text-blue-900 mt-1">
                  <strong>Order Date:</strong> {new Date(selectedPOForBulkReceive.order_date).toLocaleDateString('en-GB')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Θέση Αποθήκης *</Label>
                <Select value={toLocation || 'none'} onValueChange={(val) => setToLocation(val === 'none' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε θέση για όλα τα items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Επιλέξτε --</SelectItem>
                    {locations.filter(loc => loc.id && loc.name && loc.name.trim() !== '').map(loc => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name} {loc.warehouse && `- ${loc.warehouse}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Photo Upload for bulk receive */}
              <div className="space-y-2">
                <Label>Φωτογραφίες (προαιρετικό)</Label>
                <div className="flex gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="w-full"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Upload Photos
                      </>
                    )}
                  </Button>
                </div>
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {uploadedPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={photo.url} 
                          alt={photo.filename}
                          className="w-full h-20 object-cover rounded-lg border border-slate-200"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {poItemsToReceive.map((item, index) => {
                  const product = products.find(p => p.id === item.product_id);
                  return (
                    <div key={index} className="border rounded-lg p-4 bg-slate-50">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => togglePOItemSelection(index)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="font-semibold text-slate-900">{product?.name || 'Unknown'}</p>
                            <p className="text-sm text-slate-600 font-mono">SKU: {product?.sku || 'N/A'}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-slate-600">Παραγγέλθηκαν</p>
                              <p className="font-semibold">{item.quantity_ordered}</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Παραλήφθηκαν</p>
                              <p className="font-semibold">{item.quantity_received || 0}</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Υπόλοιπο</p>
                              <p className="font-semibold text-orange-600">
                                {item.quantity_ordered - (item.quantity_received || 0)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Παραλαμβάνω Τώρα</Label>
                              <Input
                                type="number"
                                min="1"
                                max={item.quantity_ordered - (item.quantity_received || 0)}
                                value={item.quantity_to_receive}
                                onChange={(e) => updatePOItemQuantity(index, e.target.value)}
                                disabled={!item.selected}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Unit Cost (€)</Label>
                              <div className="flex items-center h-10 px-3 bg-slate-100 rounded-md border">
                                <span className="text-sm font-mono">€{item.unit_cost?.toFixed(4) || '0.0000'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Pcs/Qty</Label>
                              <div className="flex items-center h-10 px-3 bg-slate-100 rounded-md border">
                                <span className="text-sm">{item.bundle_quantity || '-'}</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Cost/Pc (€)</Label>
                              <div className="flex items-center h-10 px-3 bg-slate-100 rounded-md border">
                                <span className="text-sm font-mono">
                                  {item.unit_cost && item.bundle_quantity && parseFloat(item.bundle_quantity) > 0
                                    ? `€${(item.unit_cost / parseFloat(item.bundle_quantity)).toFixed(4)}`
                                    : '-'}
                                </span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Σύνολο (€)</Label>
                              <div className="flex items-center h-10 px-3 bg-blue-50 rounded-md border border-blue-200">
                                <span className="text-sm font-semibold text-blue-900">
                                  €{((item.unit_cost || 0) * item.quantity_to_receive).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Πρόσθετα Στοιχεία</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Κωδ. Προμηθευτή *</Label>
                                <Input
                                  value={item.vendor_product_code || ''}
                                  onChange={(e) => {
                                    setPOItemsToReceive(prev => prev.map((it, i) => 
                                      i === index ? { ...it, vendor_product_code: e.target.value } : it
                                    ));
                                  }}
                                  placeholder="Κωδικός"
                                  disabled={!item.selected}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Εταιρεία *</Label>
                                <Select
                                  value={item.company_id || 'none'}
                                  onValueChange={(val) => {
                                    setPOItemsToReceive(prev => prev.map((it, i) => 
                                      i === index ? { ...it, company_id: val === 'none' ? '' : val } : it
                                    ));
                                  }}
                                  disabled={!item.selected}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Επιλογή" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-</SelectItem>
                                    {companies.map(comp => (
                                      <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Κατ. Τιμολόγησης *</Label>
                                <Select
                                  value={item.invoice_category_id || 'none'}
                                  onValueChange={(val) => {
                                    setPOItemsToReceive(prev => prev.map((it, i) => 
                                      i === index ? { ...it, invoice_category_id: val === 'none' ? '' : val } : it
                                    ));
                                  }}
                                  disabled={!item.selected}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Επιλογή" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-</SelectItem>
                                    {invoiceCategories.map(ic => (
                                      <SelectItem key={ic.id} value={ic.id}>
                                        <div>
                                          <div className="font-medium">{ic.name}</div>
                                          {ic.description && (
                                            <div className="text-xs text-slate-500">{ic.description}</div>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPOSelectionDialog(false);
                    setSelectedPOForBulkReceive(null);
                    setPOItemsToReceive([]);
                    setToLocation("");
                    setUploadedPhotos([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkReceiveFromPO}
                  disabled={isProcessing || !toLocation || !poItemsToReceive.some(item => item.selected)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Receive Selected Items
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Invoice Entry Dialog */}
      <Dialog open={showBulkInvoiceDialog} onOpenChange={setShowBulkInvoiceDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Μαζική Καταχώρηση Τιμολογίου</DialogTitle>
            <DialogDescription>
              Καταχωρήστε πολλά προϊόντα από τον ίδιο προμηθευτή και καθορίστε τη θέση αποθήκης για το καθένα
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div>
                <Label>Προμηθευτής *</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <VendorSearchCombobox
                      vendors={vendors}
                      vendorProductIds={[]}
                      value={bulkInvoiceVendor}
                      onValueChange={setBulkInvoiceVendor}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowCreateVendorFromBulk(true)}
                    title="Δημιουργία νέου προμηθευτή"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Αριθμός Τιμολογίου *</Label>
                <Input
                  value={bulkInvoiceNumber}
                  onChange={(e) => setBulkInvoiceNumber(e.target.value)}
                  placeholder="π.χ. INV-2025-001"
                />
              </div>
              <div className="col-span-2">
                <Label>Αριθμός Waybill (προαιρετικό)</Label>
                <Input
                  value={bulkInvoiceWaybill}
                  onChange={(e) => setBulkInvoiceWaybill(e.target.value)}
                  placeholder="π.χ. WB-2025-001"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Προϊόντα</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateProductFromBulk(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Νέο Προϊόν
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBulkInvoiceItem}
                  disabled={!bulkInvoiceVendor}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Προσθήκη Γραμμής
                </Button>
              </div>
            </div>

            {!bulkInvoiceVendor && (
              <p className="text-sm text-slate-500">Επιλέξτε προμηθευτή για να προσθέσετε προϊόντα</p>
            )}

            {bulkInvoiceItems.length > 0 && (
              <div className="space-y-3">
                {bulkInvoiceItems.map((item, index) => {
                  const unitCost = parseFloat(item.unit_cost) || 0;
                  const bundleQty = parseFloat(item.bundle_quantity) || 1;
                  const qty = parseFloat(item.quantity) || 0;
                  
                  const costPerPc = unitCost > 0 && bundleQty > 0
                    ? (unitCost / bundleQty).toFixed(4)
                    : '-';
                  
                  const totalCost = item.cost_input_method === 'total' && item.total_item_cost
                    ? (parseFloat(item.total_item_cost) * (1 - (parseFloat(item.discount) || 0) / 100)).toFixed(2)
                    : (qty > 0 && unitCost > 0 ? (qty * unitCost).toFixed(2) : '-');
                  
                  return (
                    <div key={index} className="border rounded-lg p-4 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700">Προϊόν #{index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBulkInvoiceItem(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Διαγραφή
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Προϊόν *</Label>
                          <ProductSearchCombobox
                            products={products.filter(p => p.is_active)}
                            vendorProductIds={productVendors
                              .filter(pv => pv.vendor_id === bulkInvoiceVendor && pv.is_active)
                              .map(pv => pv.product_id)}
                            value={item.product_id}
                            onValueChange={(value) => handleBulkInvoiceItemChange(index, 'product_id', value)}
                            placeholder="Επιλογή προϊόντος..."
                          />
                        </div>

                        {item.product_id && (
                          <PreviousPurchasesSelector
                            productId={item.product_id}
                            vendors={vendors}
                            companies={companies}
                            invoiceCategories={invoiceCategories}
                            onSelect={(data) => {
                              if (data) {
                                const updatedItems = [...bulkInvoiceItems];
                                updatedItems[index] = {
                                  ...updatedItems[index],
                                  unit_cost: data.unit_cost ? String(data.unit_cost) : '',
                                  bundle_quantity: data.bundle_quantity ? String(data.bundle_quantity) : '',
                                  conversion_rate: data.conversion_rate ? String(data.conversion_rate) : (data.bundle_quantity ? String(data.bundle_quantity) : '1'),
                                  input_unit_subtype: data.input_unit_of_measure || '',
                                  vendor_product_code: data.vendor_product_code || '',
                                  invoice_category_id: data.invoice_category_id || '',
                                  company_id: data.company_id || ''
                                };
                                setBulkInvoiceItems(updatedItems);
                              }
                            }}
                          />
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Θέση Αποθήκης *</Label>
                            <Select
                              value={item.warehouse_location || 'none'}
                              onValueChange={(val) => handleBulkInvoiceItemChange(index, 'warehouse_location', val === 'none' ? '' : val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Επιλέξτε θέση" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- Επιλέξτε --</SelectItem>
                                {locations.filter(loc => loc.id && loc.name && loc.name.trim() !== '').map(loc => (
                                  <SelectItem key={loc.id} value={loc.name}>
                                    {loc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Εταιρεία *</Label>
                            <Select
                              value={item.company_id || 'none'}
                              onValueChange={(val) => handleBulkInvoiceItemChange(index, 'company_id', val === 'none' ? '' : val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Επιλογή" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-</SelectItem>
                                {companies.map(comp => (
                                  <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Ποσότητα & Κόστος</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Ποσότητα *</Label>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => handleBulkInvoiceItemChange(index, 'quantity', e.target.value)}
                              placeholder="1"
                            />
                          </div>



                        <div>
                          <Label className="text-xs">Pcs/Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.bundle_quantity}
                            onChange={(e) => handleBulkInvoiceItemChange(index, 'bundle_quantity', e.target.value)}
                            placeholder="100"
                          />
                          {costPerPc !== '-' && (
                            <p className="text-xs text-slate-600 mt-1">Κόστος/τεμ: €{costPerPc}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <Label className="text-xs">Μέθοδος Κόστους</Label>
                            <Select
                              value={item.cost_input_method || 'unit'}
                              onValueChange={(val) => handleBulkInvoiceItemChange(index, 'cost_input_method', val)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unit">Ανά Μονάδα</SelectItem>
                                <SelectItem value="total">Συνολικό + Έκπτωση</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">
                              {item.cost_input_method === 'unit' ? 'Κόστος Μονάδας (€)' : 'Συνολικό Κόστος (€)'}
                            </Label>
                            {item.cost_input_method === 'unit' ? (
                              <Input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={item.unit_cost}
                                onChange={(e) => handleBulkInvoiceItemChange(index, 'unit_cost', e.target.value)}
                                placeholder="0.0000"
                              />
                            ) : (
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.total_item_cost}
                                  onChange={(e) => handleBulkInvoiceItemChange(index, 'total_item_cost', e.target.value)}
                                  placeholder="0.00"
                                />
                                {item.unit_cost && (
                                  <p className="text-xs text-slate-600">Κόστος μονάδας: €{parseFloat(item.unit_cost).toFixed(4)}</p>
                                )}
                              </div>
                            )}
                          </div>

                          {item.cost_input_method === 'total' && (
                            <div>
                              <Label className="text-xs">Έκπτωση (%)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={item.discount}
                                onChange={(e) => handleBulkInvoiceItemChange(index, 'discount', e.target.value)}
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Πρόσθετα Στοιχεία</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Κωδ. Προμηθευτή *</Label>
                            <Input
                              value={item.vendor_product_code || ''}
                              onChange={(e) => handleBulkInvoiceItemChange(index, 'vendor_product_code', e.target.value)}
                              placeholder="Κωδικός"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Εταιρεία *</Label>
                            <Select
                              value={item.company_id || 'none'}
                              onValueChange={(val) => handleBulkInvoiceItemChange(index, 'company_id', val === 'none' ? '' : val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Επιλογή" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-</SelectItem>
                                {companies.map(comp => (
                                  <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-2">
                            <Label className="text-xs">Κατ. Τιμολόγησης *</Label>
                            <Select
                              value={item.invoice_category_id || 'none'}
                              onValueChange={(val) => handleBulkInvoiceItemChange(index, 'invoice_category_id', val === 'none' ? '' : val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Επιλογή" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-</SelectItem>
                                {invoiceCategories.map(ic => (
                                  <SelectItem key={ic.id} value={ic.id}>
                                    <div>
                                      <div className="font-medium">{ic.name}</div>
                                      {ic.description && (
                                        <div className="text-xs text-slate-500">{ic.description}</div>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t bg-blue-50 -mx-4 -mb-3 px-4 py-2 rounded-b-lg">
                        <span className="text-xs text-slate-600">Συνολικό Κόστος:</span>
                        <span className="text-lg font-bold text-blue-900">€{totalCost}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkInvoiceDialog(false);
                  setBulkInvoiceVendor("");
                  setBulkInvoiceNumber("");
                  setBulkInvoiceWaybill("");
                  setBulkInvoiceItems([]);
                }}
              >
                Ακύρωση
              </Button>
              <Button
                onClick={handleSubmitBulkInvoice}
                disabled={isProcessing || bulkInvoiceItems.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Επεξεργασία...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Καταχώρηση Τιμολογίου
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Vendor Dialog */}
      <CreateEditVendorDialog
        open={showCreateVendorDialog}
        onClose={() => setShowCreateVendorDialog(false)}
        onVendorSaved={handleVendorCreated}
      />

      {/* Create Vendor From Bulk Dialog */}
      <CreateEditVendorDialog
        open={showCreateVendorFromBulk}
        onClose={() => setShowCreateVendorFromBulk(false)}
        onVendorSaved={handleVendorCreatedFromBulk}
      />

      {/* Create Product From Bulk Dialog */}
      <CreateEditProductDialog
        open={showCreateProductFromBulk}
        onClose={() => setShowCreateProductFromBulk(false)}
        onProductSaved={handleProductCreatedFromBulk}
        categories={categories}
        vendors={vendors}
        existingProducts={products}
      />
    </div>
  );
}