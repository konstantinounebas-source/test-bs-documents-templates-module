import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BookOpen, Settings, Database, TrendingUp, Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function StickersInstallationUserGuide() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef(null);

  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
      pdf.save('Stickers-Installation-User-Guide.pdf');
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2">Stickers & Installation User Guide</h1>
          <p className="text-gray-600">Ολοκληρωμένη αναφορά για την παρακολούθηση και διαχείριση αυτοκόλλητων στάσεων</p>
        </div>
        <Button 
          onClick={handleExportPDF} 
          disabled={isExporting}
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Εξαγωγή...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Εξαγωγή σε PDF
            </>
          )}
        </Button>
      </div>

      <div ref={contentRef}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Εισαγωγή</TabsTrigger>
          <TabsTrigger value="warnings">Προειδοποιήσεις</TabsTrigger>
          <TabsTrigger value="tables">Πίνακες</TabsTrigger>
          <TabsTrigger value="flow">Data Flow</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Επισκόπηση Συστήματος
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Το σύστημα παρακολούθησης αυτοκόλλητων διαιρείται σε 5 κύριες σειρές:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-blue-900 mb-2">1. Δημιουργία Αυτοκόλλητων</h3>
                    <p className="text-sm text-blue-800">Αξιολόγηση αναγκών - Εντοπισμός ποιες στάσεις χρειάζονται stickers</p>
                  </CardContent>
                </Card>

                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-yellow-900 mb-2">2. Διαδικασία Παραγγελίας</h3>
                    <p className="text-sm text-yellow-800">Έναρξη παραγγελιών για τα απαιτούμενα stickers</p>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-orange-900 mb-2">3. Παρακολούθηση Παραγγελιών</h3>
                    <p className="text-sm text-orange-800">Παρακολούθηση της κατάστασης παραγγελιών και παραλαβών</p>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-red-900 mb-2">4. Επιχειρησιακές Ασυμφωνίες</h3>
                    <p className="text-sm text-red-800">Κρίσιμα προβλήματα που απαιτούν άμεση ενέργεια</p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-purple-900 mb-2">5. Ανάλυση & Έλεγχος</h3>
                    <p className="text-sm text-purple-800">Στατιστικά στοιχεία και ανάλυση των παραμέτρων</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WARNINGS TAB */}
        <TabsContent value="warnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Προειδοποιήσεις & Παράμετροι
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Row 1 Warnings */}
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="font-bold text-red-700 mb-3">Σειρά 1: Δημιουργία Αυτοκόλλητων</h3>
                
                <Alert className="mb-3 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <strong>⚠️ Κρίσιμες Στάσεις χωρίς Stickers</strong>
                    <p className="text-sm mt-1">Στάσεις που δεν έχουν δημιουργηθεί αυτοκόλλητα αλλά έχουν Planned Installation Date πολύ κοντά</p>
                    <div className="mt-2 bg-white p-2 rounded border border-red-200">
                      <p className="text-xs font-mono">Παράμετρος: <strong>Περιθώριο Ασφάλειας (ημέρες)</strong></p>
                      <p className="text-xs">Προεπιλογή: 30 ημέρες</p>
                      <p className="text-xs text-gray-600 mt-1">Τροποποίηση: Στη σειρά 2, κάρτα "Περιθώριο"</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Row 2 Warnings */}
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="font-bold text-yellow-700 mb-3">Σειρά 2: Διαδικασία Παραγγελίας</h3>
                
                <Alert className="mb-3 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <strong>Stickers χωρίς Παραγγελία</strong>
                    <p className="text-sm mt-1">Stickers που έχουν δημιουργηθεί (Status = Needed) αλλά δεν έχουν παραγγελθεί ακόμα</p>
                    <div className="mt-2 bg-white p-2 rounded border border-yellow-200">
                      <p className="text-xs">Δεν έχει παράμετρο - Εξαρτάται από Status</p>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert className="mb-3 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    <strong>⚠️ Καθυστερημένη Παραγγελία</strong>
                    <p className="text-sm mt-1">Stickers με Status = Needed όπου Planned Date &lt; Estimated Delivery Days</p>
                    <div className="mt-2 bg-white p-2 rounded border border-orange-200">
                      <p className="text-xs font-mono">Παράμετρος: <strong>estimated_delivery_days (ανά Sticker Template)</strong></p>
                      <p className="text-xs">Τροποποίηση: Στη σελίδα "Sicker Templates" → Επεξεργασία template</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Row 3 Warnings */}
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-bold text-orange-700 mb-3">Σειρά 3: Παρακολούθηση Παραγγελιών</h3>
                
                <Alert className="mb-3 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    <strong>⚠️ Ordered με Warning</strong>
                    <p className="text-sm mt-1">Παραγγελμένα stickers που δεν έχουν παραληφθεί και είμαστε πολύ κοντά στην ημερομηνία εγκατάστασης</p>
                    <div className="mt-2 bg-white p-2 rounded border border-orange-200">
                      <p className="text-xs font-mono">Παράμετρος: <strong>days_before_installation_to_receive (ανά Sticker Template)</strong></p>
                      <p className="text-xs">Προεπιλογή: 7 ημέρες πριν τη Planned Date</p>
                      <p className="text-xs text-gray-600 mt-1">Τροποποίηση: Στη σελίδα "Sticker Templates" → Επεξεργασία template</p>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert className="bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    <strong>Ordered σε Εγκατ. (χωρίς Παραλαβή)</strong>
                    <p className="text-sm mt-1">Stickers με Status = Ordered σε στάσεις που έχουν ήδη εγκατάσταση shelter</p>
                    <div className="mt-2 bg-white p-2 rounded border border-orange-200">
                      <p className="text-xs">Δεν έχει παράμετρο - Εξαρτάται από shelter_installed flag</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Row 4 Warnings */}
              <div className="border-l-4 border-red-600 pl-4">
                <h3 className="font-bold text-red-800 mb-3">Σειρά 4: Επιχειρησιακές Ασυμφωνίες (ΚΡΙΣΙΜΟ)</h3>
                
                <Alert className="mb-3 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <strong>🔴 ΚΡΙΣΙΜΟ: Εγκατεστημένες χωρίς Παραγγελία</strong>
                    <p className="text-sm mt-1">Το πιο σοβαρό πρόβλημα: Shelter είναι εγκατεστημένο αλλά τα stickers έχουν Status = Needed (δεν έχουν παραγγελθεί)</p>
                    <div className="mt-2 bg-white p-2 rounded border border-red-200">
                      <p className="text-xs text-red-700 font-semibold">Απαιτείται ΆΜΕΣΗ ενέργεια!</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TABLES TAB */}
        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Πίνακες & Δεδομένα
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              <div>
                <h3 className="font-bold text-lg mb-3 text-blue-700">Stop Entity</h3>
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <p className="text-sm mb-3"><strong>Ποιος συμπληρώνει:</strong> Admin/Manager κατά την εισαγωγή σταθμών</p>
                  <p className="text-sm mb-3"><strong>Κύρια πεδία:</strong></p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li><code className="bg-white px-2 py-1 rounded">stop_id</code> - Μοναδικό ID στάσης</li>
                    <li><code className="bg-white px-2 py-1 rounded">english_name</code> - Όνομα στα αγγλικά</li>
                    <li><code className="bg-white px-2 py-1 rounded">greek_name</code> - Όνομα στα ελληνικά</li>
                    <li><code className="bg-white px-2 py-1 rounded">shelter_installed</code> - Boolean (true/false)</li>
                    <li><code className="bg-white px-2 py-1 rounded">current_planned_installation_date</code> - Ημερομηνία εγκατάστασης</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-yellow-700">StickerItem Entity</h3>
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                  <p className="text-sm mb-3"><strong>Ποιος συμπληρώνει:</strong> Admin κατά την εισαγωγή ή χειροκίνητη δημιουργία</p>
                  <p className="text-sm mb-3"><strong>Κύρια πεδία:</strong></p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li><code className="bg-white px-2 py-1 rounded">stop_id</code> - Σχέση με Stop</li>
                    <li><code className="bg-white px-2 py-1 rounded">sticker_template_id</code> - Σχέση με StickerTemplate</li>
                    <li><code className="bg-white px-2 py-1 rounded">status</code> - Needed → Ordered → Received → Installed → Obsolete</li>
                    <li><code className="bg-white px-2 py-1 rounded">installed</code> - Boolean flag</li>
                    <li><code className="bg-white px-2 py-1 rounded">installed_date</code> - Ημερομηνία εγκατάστασης</li>
                  </ul>
                  <p className="text-sm mt-3 text-yellow-800">Ο αριθμός και τύπος stickers ορίζεται μέσω <strong>ShelterTypeStickerRequirement</strong></p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-orange-700">StickerTemplate Entity</h3>
                <div className="bg-orange-50 p-4 rounded border border-orange-200">
                  <p className="text-sm mb-3"><strong>Ποιος συμπληρώνει:</strong> Admin (Setup)</p>
                  <p className="text-sm mb-3"><strong>Κύρια πεδία:</strong></p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li><code className="bg-white px-2 py-1 rounded">sticker_name_category</code> - Όνομα κατηγορίας</li>
                    <li><code className="bg-white px-2 py-1 rounded">estimated_delivery_days</code> - Εκτιμώμενες μέρες παράδοσης (παράμετρος warning)</li>
                    <li><code className="bg-white px-2 py-1 rounded">days_before_installation_to_receive</code> - Πόσες μέρες πριν θέλουμε να έχουμε το sticker (παράμετρος warning)</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-red-700">Order & OrderLine Entities</h3>
                <div className="bg-red-50 p-4 rounded border border-red-200">
                  <p className="text-sm mb-3"><strong>Ποιος συμπληρώνει:</strong> Δημιουργούνται αυτόματα όταν δημιουργείται παραγγελία</p>
                  <p className="text-sm mb-3"><strong>Order:</strong> Περιέχει το σύνολο της παραγγελίας</p>
                  <p className="text-sm mb-3"><strong>OrderLine:</strong> Κάθε StickerItem που περιλαμβάνεται στην παραγγελία</p>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* DATA FLOW TAB */}
        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Data Flow & Διαδικασία
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-4">
                <h3 className="font-bold text-lg">1️⃣ Import Phase - Εισαγωγή Δεδομένων</h3>
                <div className="bg-gray-50 p-4 rounded border-l-4 border-blue-500 space-y-2">
                  <p className="text-sm"><strong>CSV Import:</strong> Στάσεις (Stop) + ShelterTypeStickerRequirement</p>
                  <p className="text-sm">→ Δημιουργούνται αυτόματα τα StickerItems με Status = "Needed"</p>
                  <p className="text-sm">→ Το Dashboard δείχνει αυτές τις νέες στάσεις στη Σειρά 1</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">2️⃣ Ordering Phase - Δημιουργία Παραγγελιών</h3>
                <div className="bg-gray-50 p-4 rounded border-l-4 border-yellow-500 space-y-2">
                  <p className="text-sm"><strong>Manual Order Creation:</strong> User επιλέγει stickers και δημιουργεί Order</p>
                  <p className="text-sm">→ Status StickerItem: "Needed" → "Ordered"</p>
                  <p className="text-sm">→ Δημιουργείται Order + OrderLines</p>
                  <p className="text-sm">→ Dashboard δείχνει αυτά στη Σειρά 3</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">3️⃣ Receipt Phase - Παραλαβή</h3>
                <div className="bg-gray-50 p-4 rounded border-l-4 border-orange-500 space-y-2">
                  <p className="text-sm"><strong>Receive Stickers:</strong> User αναφέρει ότι παρέλαβε stickers</p>
                  <p className="text-sm">→ Status StickerItem: "Ordered" → "Received"</p>
                  <p className="text-sm">→ Δημιουργείται Receipt + ReceiptLines</p>
                  <p className="text-sm">→ Warning "Ordered με Warning" εξαφανίζεται</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">4️⃣ Installation Phase - Εγκατάσταση</h3>
                <div className="bg-gray-50 p-4 rounded border-l-4 border-green-500 space-y-2">
                  <p className="text-sm"><strong>Install Stickers:</strong> Τεχνικός εγκαθιστά τα stickers</p>
                  <p className="text-sm">→ Status StickerItem: "Received" → "Installed"</p>
                  <p className="text-sm">→ installed = true, installed_date, installed_by</p>
                  <p className="text-sm">→ Σειρά 5: Άλλα stickers περνούν σε "Remaining" για την ίδια στάση</p>
                </div>
              </div>

              <Alert className="bg-purple-50 border-purple-200">
                <Settings className="h-4 w-4 text-purple-600" />
                <AlertDescription>
                  <strong>Όπου Αλλάζουν οι Παράμετροι:</strong>
                  <ul className="text-sm space-y-1 mt-2 ml-4">
                    <li>✏️ <strong>Περιθώριο Ασφάλειας (30 ημ.):</strong> Dashboard κάρτα "Περιθώριο"</li>
                    <li>✏️ <strong>estimated_delivery_days:</strong> Sticker Templates σελίδα</li>
                    <li>✏️ <strong>days_before_installation_to_receive:</strong> Sticker Templates σελίδα</li>
                    <li>✏️ <strong>shelter_installed:</strong> Stops σελίδα ή Delivery Module</li>
                  </ul>
                </AlertDescription>
              </Alert>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}