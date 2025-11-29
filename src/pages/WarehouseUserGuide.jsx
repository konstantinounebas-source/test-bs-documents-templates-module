import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, Package, Warehouse, TrendingUp, ShoppingCart, Truck, 
  Boxes, ScanBarcode, BarChart3, ClipboardList, Lightbulb, PlayCircle,
  Info, AlertTriangle, CheckCircle, Zap, Target, Edit, Plus, Upload,
  Download, Eye, Filter, Move, ArrowRight, Calendar, MapPin, DollarSign
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Step = ({ icon: Icon, title, description }) => (
  <li className="flex items-start gap-4">
    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mt-1">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <h5 className="font-semibold text-slate-800">{title}</h5>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  </li>
);

const Tip = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
    <Icon className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
    <div>
      <h4 className="font-semibold text-amber-900 mb-1">{title}</h4>
      <p className="text-sm text-amber-800">{description}</p>
    </div>
  </div>
);

const FeatureDescription = ({ featureName, children }) => (
  <div className="py-3 border-b last:border-b-0">
    <h4 className="font-semibold text-slate-800">{featureName}</h4>
    <p className="!mt-1 text-sm text-slate-600">{children}</p>
  </div>
);

export default function WarehouseUserGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">Οδηγός Χρήσης</h1>
          </div>
          <h2 className="text-2xl text-slate-700">Warehouse & Stock Management Module</h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Ολοκληρωμένο σύστημα διαχείρισης αποθήκης, αποθεμάτων και παραγγελιών. Από τον εφοδιασμό έως την εγκατάσταση.
          </p>
        </div>

        {/* Detailed Sections */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 h-auto">
            <TabsTrigger value="products" className="flex items-center gap-2 py-2">
              <Package className="w-4 h-4" />Προϊόντα
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-2 py-2">
              <Warehouse className="w-4 h-4" />Αποθέματα
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-2 py-2">
              <ShoppingCart className="w-4 h-4" />Παραγγελίες
            </TabsTrigger>
            <TabsTrigger value="scanner" className="flex items-center gap-2 py-2">
              <ScanBarcode className="w-4 h-4" />Scanner
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Package className="w-7 h-7 text-blue-600" />
                  Products - Διαχείριση Προϊόντων
                </CardTitle>
                <p className="text-slate-600">Το κεντρικό μητρώο όλων των προϊόντων της αποθήκης.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5"/>Βασικές Έννοιες
                  </h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>SKU</strong>: Stock Keeping Unit - Μοναδικός κωδικός κάθε προϊόντος</p>
                    <p><strong>Barcode/QR Code</strong>: Χρησιμοποιείται για γρήγορο scanning</p>
                    <p><strong>Minimum Stock</strong>: Όριο για low stock alerts</p>
                    <p><strong>Product Vendors</strong>: Προμηθευτές και τιμές ανά προϊόν</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5"/>Οδηγίες Βήμα-Βήμα
                  </h4>
                  <ol className="space-y-6">
                    <Step 
                      icon={Plus} 
                      title="Δημιουργία νέου προϊόντος:" 
                      description="Πατήστε 'Add Product'. Συμπληρώστε Name, SKU, Category, Unit of Measure. Προσθέστε Barcode/QR code για scanning. Ορίστε Minimum Stock για alerts." 
                    />
                    
                    <Step 
                      icon={DollarSign} 
                      title="Διαχείριση προμηθευτών & τιμών:" 
                      description="Στη λίστα προϊόντων, κάντε κλικ στο εικονίδιο 'Vendors' (πολλαπλά άτομα). Προσθέστε προμηθευτές με unit cost και lead time. Επιλέξτε 'Preferred' για τον κύριο προμηθευτή." 
                    />
                    
                    <Step 
                      icon={Upload} 
                      title="Μαζική εισαγωγή:" 
                      description="Πατήστε 'Import CSV'. Κατεβάστε το template, συμπληρώστε τα προϊόντα στο Excel, και ανεβάστε το αρχείο για γρήγορη προσθήκη πολλών προϊόντων." 
                    />
                    
                    <Step 
                      icon={Filter} 
                      title="Φιλτράρισμα & αναζήτηση:" 
                      description="Χρησιμοποιήστε τα stat cards για γρήγορο φιλτράρισμα (Total, Active). Αναζητήστε με όνομα, SKU ή περιγραφή. Ενεργοποιήστε 'Show Inactive' για archived προϊόντα." 
                    />
                  </ol>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5"/>Product Vendors - Διαχείριση Προμηθευτών
                  </h4>
                  <div className="text-sm text-green-800 space-y-2">
                    <p><strong>Πολλαπλοί προμηθευτές:</strong> Κάθε προϊόν μπορεί να έχει πολλούς προμηθευτές με διαφορετικές τιμές.</p>
                    <p><strong>Preferred Vendor:</strong> Ο κύριος προμηθευτής εμφανίζεται πρώτος και χρησιμοποιείται για cost calculations.</p>
                    <p><strong>Auto-fill τιμές:</strong> Όταν δημιουργείτε Purchase Order, οι τιμές συμπληρώνονται αυτόματα από τον Preferred Vendor.</p>
                  </div>
                </div>

                <Tip 
                  icon={Lightbulb} 
                  title="Pro Tips" 
                  description="• Χρησιμοποιήστε consistent naming conventions για SKUs (π.χ. CAT-PROD-001) • Βάλτε photo URLs για οπτική αναγνώριση • Ενημερώνετε το Minimum Stock βάσει ιστορικής κατανάλωσης • Κρατήστε μόνο ένα Preferred Vendor ανά προϊόν για ξεκάθαρο costing"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Overview Tab */}
          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Warehouse className="w-7 h-7 text-green-600" />
                  Stock Overview - Επισκόπηση Αποθεμάτων
                </CardTitle>
                <p className="text-slate-600">Real-time παρακολούθηση επιπέδων stock σε όλες τις τοποθεσίες.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5"/>Βασικές Έννοιες
                  </h4>
                  <div className="text-sm text-green-800 space-y-2">
                    <p><strong>On Hand</strong>: Συνολική φυσική ποσότητα στην αποθήκη</p>
                    <p><strong>Reserved</strong>: Ποσότητα δεσμευμένη για συγκεκριμένες παραγγελίες</p>
                    <p><strong>Available</strong>: On Hand - Reserved = Διαθέσιμο για χρήση</p>
                    <p><strong>Stock by Location</strong>: Αναλυτικά ανά θέση αποθήκης</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5"/>Χρήση της Σελίδας
                  </h4>
                  <ol className="space-y-6">
                    <Step 
                      icon={Eye} 
                      title="Παρακολούθηση επιπέδων:" 
                      description="Τα stats cards δείχνουν: Total Stock Value, Products Tracked, Low Stock Alerts, Out of Stock. Κάντε κλικ σε κάρτα για φιλτράρισμα." 
                    />
                    
                    <Step 
                      icon={AlertTriangle} 
                      title="Low Stock Alerts:" 
                      description="Προϊόντα με Available < Minimum Stock εμφανίζονται με πορτοκαλί badge. Φιλτράρετε με 'Low Stock' για να δείτε μόνο αυτά." 
                    />
                    
                    <Step 
                      icon={MapPin} 
                      title="Stock by Location:" 
                      description="Κάθε προϊόν δείχνει αναλυτικά τις ποσότητες ανά warehouse location. Δείτε πού ακριβώς βρίσκεται κάθε item." 
                    />
                    
                    <Step 
                      icon={Edit} 
                      title="Manual adjustments:" 
                      description="Χρησιμοποιήστε το 'Adjust Stock' για corrections (π.χ. μετά από φυσική απογραφή). Προσθέστε notes για το λόγο της αλλαγής." 
                    />
                  </ol>
                </div>

                <Alert className="border-orange-300 bg-orange-50">
                  <AlertTriangle className="h-5 w-5 text-orange-700" />
                  <AlertTitle className="text-orange-900">Σημαντική Σημείωση</AlertTitle>
                  <AlertDescription className="text-orange-800">
                    Το Stock Overview δείχνει **μόνο active προϊόντα** by default. Τα stats (alerts, out of stock) υπολογίζονται επίσης μόνο για active. Ενεργοποιήστε "Show Inactive" για να δείτε archived προϊόντα.
                  </AlertDescription>
                </Alert>

                <Tip 
                  icon={Lightbulb} 
                  title="Pro Tips" 
                  description="• Κάντε τακτικές φυσικές απογραφές και adjustments • Χρησιμοποιήστε τα filters για να εντοπίζετε γρήγορα προβλήματα • Βλέπετε vendors & τιμές ανά προϊόν για καλύτερο planning • Export τα δεδομένα για reporting στο management"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="purchases">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <ShoppingCart className="w-7 h-7 text-purple-600" />
                  Purchase Orders - Παραγγελίες Προμηθευτών
                </CardTitle>
                <p className="text-slate-600">Δημιουργία και παρακολούθηση παραγγελιών από προμηθευτές.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5"/>Workflow Παραγγελίας
                  </h4>
                  <div className="text-sm text-purple-800">
                    <div className="flex flex-wrap items-center gap-2 my-3">
                      <Badge className="bg-slate-200 text-slate-800">Draft</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-blue-200 text-blue-800">Sent</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-green-200 text-green-800">Confirmed</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-yellow-200 text-yellow-800">Partially Received</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-purple-200 text-purple-800">Received</Badge>
                    </div>
                    <p className="mt-2">Κάθε PO ακολουθεί αυτό το workflow. Το status ενημερώνεται αυτόματα καθώς παραλαμβάνονται προϊόντα μέσω του Barcode Scanner.</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5"/>Δημιουργία Purchase Order
                  </h4>
                  <ol className="space-y-6">
                    <Step 
                      icon={Plus} 
                      title="Νέα παραγγελία:" 
                      description="Πατήστε 'New Purchase Order'. Ο PO number δημιουργείται αυτόματα (π.χ. PO-2025-0001). Επιλέξτε vendor και ημερομηνίες." 
                    />
                    
                    <Step 
                      icon={Package} 
                      title="Προσθήκη προϊόντων:" 
                      description="Πατήστε 'Add Item'. Επιλέξτε προϊόν (όλα τα active διαθέσιμα). Το unit cost συμπληρώνεται αυτόματα αν υπάρχει ProductVendor, αλλιώς το βάζετε χειροκίνητα." 
                    />
                    
                    <Step 
                      icon={Calendar} 
                      title="Expected Receipt Date:" 
                      description="Κάθε item μπορεί να έχει διαφορετική αναμενόμενη ημερομηνία παραλαβής. Χρήσιμο για partial deliveries." 
                    />
                    
                    <Step 
                      icon={CheckCircle} 
                      title="Αποθήκευση & workflow:" 
                      description="Αποθηκεύστε ως Draft. Όταν είστε έτοιμοι, αλλάξτε σε 'Sent' → 'Confirmed' μέσω του Actions menu (⋮). Μόνο Confirmed POs εμφανίζονται στο Barcode Scanner." 
                    />
                  </ol>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5"/>Partial Receipts & Tracking
                  </h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>Ανά Item Tracking:</strong> Κάθε προϊόν στο PO παρακολουθείται ξεχωριστά. Βλέπετε Qty Ordered vs Qty Received.</p>
                    <p><strong>Automatic Status:</strong> Καθώς κάνετε receive μέσω Scanner, το PO ενημερώνεται αυτόματα σε "Partially Received" και τελικά "Received".</p>
                    <p><strong>Movement History:</strong> Κάντε expand (▼) ένα PO για να δείτε όλα τα stock movements που έχουν γίνει για αυτό.</p>
                    <p><strong>Completion Bar:</strong> Ποσοστό ολοκλήρωσης (0-100%) υπολογίζεται από τα actual receipts.</p>
                  </div>
                </div>

                <Alert className="border-red-300 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-700" />
                  <AlertTitle className="text-red-900">Προσοχή: VAT Calculation</AlertTitle>
                  <AlertDescription className="text-red-800">
                    Το σύστημα υπολογίζει αυτόματα VAT 19% στο subtotal. Ελέγξτε τα totals πριν την αποστολή της παραγγελίας.
                  </AlertDescription>
                </Alert>

                <Tip 
                  icon={Lightbulb} 
                  title="Pro Tips" 
                  description="• Ενημερώστε το Expected Delivery Date για καλύτερο planning • Χρησιμοποιήστε το Notes πεδίο για special instructions • Μπορείτε να edit ένα PO μετά τη δημιουργία (πριν γίνει Received) • Τα completed POs κρύβονται by default - ενεργοποιήστε το toggle για να τα δείτε"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Barcode Scanner Tab */}
          <TabsContent value="scanner">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <ScanBarcode className="w-7 h-7 text-orange-600" />
                  Barcode Scanner - Γρήγορες Κινήσεις Αποθήκης
                </CardTitle>
                <p className="text-slate-600">Scan products για instant stock movements (IN/OUT/TRANSFER).</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5"/>Τύποι Κινήσεων
                  </h4>
                  <div className="text-sm text-orange-800 space-y-2">
                    <p><strong>IN</strong>: Παραλαβή από προμηθευτή (με ή χωρίς PO)</p>
                    <p><strong>OUT</strong>: Χρέωση υλικού σε άτομο/έργο</p>
                    <p><strong>TRANSFER</strong>: Μεταφορά μεταξύ warehouse locations</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5"/>Οδηγίες Χρήσης
                  </h4>
                  <ol className="space-y-6">
                    <Step 
                      icon={ScanBarcode} 
                      title="Scan ή manual search:" 
                      description="Σκανάρετε το barcode/QR code του προϊόντος ή πληκτρολογήστε SKU και πατήστε Search. Το προϊόν εμφανίζεται με photo και details." 
                    />
                    
                    <Step 
                      icon={Move} 
                      title="Επιλογή τύπου κίνησης:" 
                      description="Διαλέξτε IN/OUT/TRANSFER. Τα πεδία που εμφανίζονται αλλάζουν ανάλογα με τον τύπο." 
                    />
                    
                    <Step 
                      icon={Package} 
                      title="Stock IN (Παραλαβή):" 
                      description="Επιλέξτε Purchase Order (auto-fills vendor & cost) ΄Η εισάγετε χειροκίνητα vendor & cost. Διαλέξτε warehouse location. Προσθέστε waybill number & notes. Κάντε Process Movement." 
                    />
                    
                    <Step 
                      icon={ClipboardList} 
                      title="Stock OUT (Χρέωση):" 
                      description="Επιλέξτε location από όπου θα βγει. Επιλέξτε 'Charged To Person' (σε ποιον χρεώνεται). Το σύστημα ελέγχει available stock πριν επιτρέψει την κίνηση." 
                    />
                    
                    <Step 
                      icon={ArrowRight} 
                      title="Stock TRANSFER:" 
                      description="Επιλέξτε From Location και To Location. Ελέγχεται η διαθεσιμότητα στο from location. Χρήσιμο για αναδιοργάνωση αποθήκης." 
                    />
                  </ol>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5"/>Quick Test - Γρήγορη Δοκιμή
                  </h4>
                  <div className="text-sm text-green-800 space-y-2">
                    <p>Στην κορυφή της σελίδας βλέπετε τα <strong>10 πιο πρόσφατα/συχνά χρησιμοποιούμενα προϊόντα</strong> και τα <strong>Confirmed/Partially Received POs</strong>.</p>
                    <p><strong>Γρήγορη παραλαβή:</strong> Κάντε κλικ σε ένα PO badge για instant selection. Το vendor & cost συμπληρώνονται αυτόματα!</p>
                    <p><strong>Toggle:</strong> Ενεργοποιήστε "Show completed purchase orders" για να δείτε και τα fully received POs.</p>
                  </div>
                </div>

                <Alert className="border-blue-300 bg-blue-50">
                  <Info className="h-5 w-5 text-blue-700" />
                  <AlertTitle className="text-blue-900">Auto-Update Purchase Orders</AlertTitle>
                  <AlertDescription className="text-blue-800">
                    Όταν κάνετε IN movement με επιλεγμένο Purchase Order, το σύστημα ενημερώνει αυτόματα το PO με τις παραληφθείσες ποσότητες και αλλάζει το status (Confirmed → Partially Received → Received).
                  </AlertDescription>
                </Alert>

                <div className="bg-slate-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Recent Scans History
                  </h4>
                  <p className="text-sm text-slate-700">
                    Στο κάτω μέρος της σελίδας βλέπετε τα τελευταία 10 scans με πλήρεις λεπτομέρειες: προϊόν, τύπος κίνησης, ποσότητα, locations, χρεωμένο άτομο, κόστος. Χρήσιμο για γρήγορο έλεγχο.
                  </p>
                </div>

                <Tip 
                  icon={Lightbulb} 
                  title="Pro Tips" 
                  description="• Βάλτε barcodes σε όλα τα προϊόντα για instant scanning • Χρησιμοποιήστε tablet/smartphone με barcode scanner app • Το Recent Scans αποθηκεύεται locally στο browser σας • Για bulk operations χρησιμοποιήστε το 'Import Stock Movements' • Πάντα βάζετε notes για OUT movements για accountability"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Additional Modules */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Boxes className="w-6 h-6 text-slate-700" />
              Πρόσθετες Λειτουργίες
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Vendors & Categories
                </h4>
                <p className="text-sm text-slate-600">
                  Διαχείριση προμηθευτών, προϊοντικών κατηγοριών και warehouse locations. Όλα συγκεντρωμένα σε ένα μέρος με tabs.
                </p>
              </div>
              
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Stock Movements
                </h4>
                <p className="text-sm text-slate-600">
                  Πλήρες ιστορικό όλων των κινήσεων αποθήκης. Filters ανά type, product, date range. Export για αναφορές.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-purple-600" />
                  Bus Stop Types & BOM
                </h4>
                <p className="text-sm text-slate-600">
                  Bill of Materials για τύπους στάσεων. Καθορίστε ποια προϊόντα χρειάζονται για κάθε τύπο εγκατάστασης.
                </p>
              </div>
              
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                  Installation Capacity
                </h4>
                <p className="text-sm text-slate-600">
                  Calculator που δείχνει πόσες στάσεις μπορείτε να εγκαταστήσετε με το τρέχον απόθεμα. Βρίσκει bottlenecks αυτόματα.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-teal-600" />
                  Charged Materials Report
                </h4>
                <p className="text-sm text-slate-600">
                  Αναφορά υλικών που έχουν χρεωθεί σε κάθε άτομο. Χρήσιμο για accountability και cost tracking.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Βέλτιστες Πρακτικές
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Καθημερινές Εργασίες</h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Χρησιμοποιήστε το Barcode Scanner για όλες τις κινήσεις</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Ενημερώνετε τα POs όταν παραλαμβάνετε υλικά</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Ελέγχετε το Stock Overview για low stock alerts</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Εβδομαδιαίες Εργασίες</h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Review pending Purchase Orders και follow up</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Ελέγξτε το Charged Materials Report</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Κάντε stock adjustments όπου χρειάζεται</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg border">
              <h4 className="font-semibold text-slate-900 mb-2">Μηνιαίες Εργασίες</h4>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Φυσική απογραφή κρίσιμων προϊόντων</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Review & update minimum stock levels</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Ενημέρωση vendor pricing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Export reports για management review</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}