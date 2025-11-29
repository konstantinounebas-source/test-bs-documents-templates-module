import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, MapPin, AlertTriangle, Smartphone, Route as RouteIcon, BarChart3,
  Lightbulb, PlayCircle, Info, CheckCircle, Zap, Target, Edit, Plus, Upload,
  Download, Eye, Filter, Move, ArrowRight, Calendar, Camera, Clock, Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePageAccess } from "@/components/lib/usePageAccess";

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

export default function DeliveryUserGuidePage() {
  const { hasAccess, isLoading: accessLoading } = usePageAccess('DeliveryUserGuide');

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">Οδηγός Χρήσης</h1>
          </div>
          <h2 className="text-2xl text-slate-700">Delivery Management Module</h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Ολοκληρωμένο σύστημα διαχείρισης παραδόσεων στάσεων λεωφορείου, εκκρεμοτήτων και εργασιών πεδίου.
          </p>
        </div>

        {/* Detailed Sections */}
        <Tabs defaultValue="bus-stop-delivery" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 h-auto">
            <TabsTrigger value="bus-stop-delivery" className="flex items-center gap-2 py-2">
              <MapPin className="w-4 h-4" />Παράδοση Στάσεων
            </TabsTrigger>
            <TabsTrigger value="snagging-list" className="flex items-center gap-2 py-2">
              <AlertTriangle className="w-4 h-4" />Εκκρεμότητες
            </TabsTrigger>
            <TabsTrigger value="mobile-field-work" className="flex items-center gap-2 py-2">
              <Smartphone className="w-4 h-4" />Mobile App
            </TabsTrigger>
            <TabsTrigger value="repair-routes" className="flex items-center gap-2 py-2">
              <RouteIcon className="w-4 h-4" />Διαδρομές
            </TabsTrigger>
            <TabsTrigger value="reporting" className="flex items-center gap-2 py-2">
              <BarChart3 className="w-4 h-4" />Αναφορές
            </TabsTrigger>
          </TabsList>

          {/* Bus Stop Delivery Tab */}
          <TabsContent value="bus-stop-delivery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <MapPin className="w-7 h-7 text-blue-600" />
                  Bus Stop Delivery - Διαχείριση Παραδόσεων
                </CardTitle>
                <p className="text-slate-600">Κεντρική σελίδα για την παρακολούθηση της κατάστασης παράδοσης όλων των στάσεων.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5"/>Βασικές Έννοιες
                  </h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>State of Delivery</strong>: Η κατάσταση παράδοσης κάθε στάσης με 11 διαφορετικά στάδια</p>
                    <p><strong>Εσωτερικά Snags</strong>: Εκκρεμότητες που πρέπει να διορθωθούν πριν την παράδοση</p>
                    <p><strong>Εξωτερικά Snags</strong>: Εκκρεμότητες από την Αναθέτουσα Αρχή μετά την παράδοση</p>
                    <p><strong>Progress Bar</strong>: Ποσοστό ολοκλήρωσης 0-100% ανά στάση</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5"/>Οδηγίες Βήμα-Βήμα
                  </h4>
                  <ol className="space-y-6">
                    <Step 
                      icon={Plus} 
                      title="Δημιουργία νέας στάσης:" 
                      description="Πατήστε 'Νέα Στάση'. Συμπληρώστε Κωδικό Στάσης, Πόλη, Τύπο Στεγάστρου. Προσθέστε GPS συντεταγμένες (latitude/longitude) για το Google Maps." 
                    />
                    
                    <Step 
                      icon={Eye} 
                      title="Προβολή & Επεξεργασία:" 
                      description="Κάντε κλικ στο εικονίδιο 'Προβολή' σε οποιαδήποτε στάση. Εμφανίζεται dialog με 3 tabs: Πληροφορίες, Κατάσταση Παράδοσης, Εκκρεμότητες." 
                    />
                    
                    <Step 
                      icon={CheckCircle} 
                      title="Ενημέρωση κατάστασης:" 
                      description="Στο tab 'Κατάσταση', ενεργοποιήστε checkboxes καθώς προχωράει η εγκατάσταση (Εγκαταστάθηκε → Επιθεώρηση → Έτοιμη για παράδοση → κλπ). Οι ημερομηνίες συμπληρώνονται αυτόματα." 
                    />
                    
                    <Step 
                      icon={Edit} 
                      title="Μαζική Επεξεργασία:" 
                      description="Πατήστε 'Μαζική Επεξεργασία' για να δείτε όλες τις στάσεις σε πίνακα. Ενεργοποιήστε/απενεργοποιήστε checkboxes για πολλές στάσεις ταυτόχρονα. Πατήστε 'Αποθήκευση Όλων'." 
                    />
                  </ol>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5"/>Workflow Παράδοσης (11 Στάδια)
                  </h4>
                  <div className="text-sm text-green-800 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 my-3">
                      <Badge className="bg-slate-200 text-slate-800">1. Εγκαταστάθηκε</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-blue-200 text-blue-800">2. Επιθ. Επιστάτη</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-blue-200 text-blue-800">3. Επιθ. Μηχανικού</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-orange-200 text-orange-800">4. Εσωτερικά Snags</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-green-200 text-green-800">5. Έτοιμη Παράδοσης</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-purple-200 text-purple-800">6. Έντυπα στην Αρχή</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-green-200 text-green-800">7. Εγκρίθηκε</Badge>
                      <Badge className="bg-red-200 text-red-800">Απορρίφθηκε</Badge>
                      <Badge className="bg-yellow-200 text-yellow-800">Με Snags</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-purple-200 text-purple-800">8. Εξωτερικά Snags</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-green-200 text-green-800">9. Έτοιμη Τελικής</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge className="bg-green-500 text-white">10. Ολοκληρωμένη</Badge>
                    </div>
                  </div>
                </div>

                <Alert className="border-blue-300 bg-blue-50">
                  <Info className="h-5 w-5 text-blue-700" />
                  <AlertTitle className="text-blue-900">Αυτοματισμοί Συστήματος</AlertTitle>
                  <AlertDescription className="text-blue-800">
                    • Όταν υπάρχουν ανοιχτά εσωτερικά snags → "Εκκρεμεί Εσωτερικό Snag list" ενεργοποιείται αυτόματα<br/>
                    • Όταν υπάρχουν ανοιχτά εξωτερικά snags → "Snag list εξωτερικό εκκρεμεί" ενεργοποιείται αυτόματα<br/>
                    • Όταν η στάση "Εγκριθεί από Αναθέτουσα Αρχή" → κλείνει αυτόματα (Ολοκληρωμένη)<br/>
                    • Τα πεδία Εγκρίθηκε/Απορρίφθηκε/Εγκρίθηκε με snags είναι αλληλοαποκλειόμενα
                  </AlertDescription>
                </Alert>

                <Tip 
                  icon={Lightbulb} 
                  title="Pro Tips" 
                  description="• Χρησιμοποιήστε το search για γρήγορο εντοπισμό στάσης • Export CSV για αναφορές στο management • Το progress bar δείχνει γρήγορα ποιες στάσεις είναι καθυστερημένες • Τα stats cards στην κορυφή δείχνουν συνολικά νούμερα"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Snagging List Tab */}
          <TabsContent value="snagging-list">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <AlertTriangle className="w-7 h-7 text-orange-600" />
                  Snagging List - Διαχείριση Εκκρεμοτήτων
                </CardTitle>
                <p className="text-slate-600">Παρακολούθηση και επίλυση εκκρεμοτήτων (snags) ανά στάση.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5"/>Τύποι Εκκρεμοτήτων
                  </h4>
                  <div className="text-sm text-orange-800 space-y-2">
                    <p><strong>Εσωτερικά</strong>: Εκκρεμότητες που εντοπίζονται από το συνεργείο πριν την παράδοση</p>
                    <p><strong>Εξωτερικά</strong>: Εκκρεμότητες που εντοπίζονται από την Αναθέτουσα Αρχή μετά την παράδοση</p>
                    <p><strong>Photo Taken</strong>: Έχει ληφθεί φωτογραφία της εκκρεμότητας</p>
                    <p><strong>Technician Completed</strong>: Ο τεχνικός έχει ολοκληρώσει τη διόρθωση</p>
                    <p><strong>Ready for Submission</strong>: Έτοιμη για υποβολή προς έγκριση</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5"/>Workflow Εκκρεμότητας
                  </h4>
                  <ol className="space-y-6">
                    <Step 
                      icon={Plus} 
                      title="Δημιουργία snag:" 
                      description="Πατήστε 'Νέα Εκκρεμότητα'. Επιλέξτε στάση, κατηγορία (Εσωτερικό/Εξωτερικό), τύπο (π.χ. Κατασκευαστική), στοιχείο (π.χ. Στέγαστρο), είδος εργασίας." 
                    />
                    
                    <Step 
                      icon={Camera} 
                      title="Λήψη φωτογραφίας:" 
                      description="Ανοίξτε το snag και ενεργοποιήστε 'Photo Taken'. Η ημερομηνία καταγράφεται αυτόματα. Μπορείτε να ανεβάσετε πολλές φωτογραφίες." 
                    />
                    
                    <Step 
                      icon={CheckCircle} 
                      title="Ολοκλήρωση από τεχνικό:" 
                      description="Όταν ο τεχνικός διορθώσει το πρόβλημα, ενεργοποιήστε 'Technician Completed'. Προσθέστε σχόλια για τις εργασίες που έγιναν." 
                    />
                    
                    <Step 
                      icon={Eye} 
                      title="Επιθεώρηση & Κλείσιμο:" 
                      description="Όταν το snag επιθεωρηθεί και εγκριθεί, ενεργοποιήστε 'Closed'. Το snag αφαιρείται από τα ανοιχτά και επηρεάζει τα αυτόματα πεδία της στάσης." 
                    />
                  </ol>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5"/>Tabs & Filtering
                  </h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>6 Tabs:</strong> Όλες, Ανοιχτές, Εσωτερικά, Εξωτερικά, Κλειστές, Έτοιμες</p>
                    <p><strong>Advanced Filters:</strong> Κάθε στήλη έχει dropdown filter με checkboxes. Επιλέξτε πολλές τιμές ταυτόχρονα.</p>
                    <p><strong>Sort:</strong> Κάντε κλικ στο filter icon και επιλέξτε A→Z ή Z→A για sorting.</p>
                    <p><strong>Search:</strong> Αναζήτηση με όνομα στάσης, τύπο snag, περιγραφή εργασίας.</p>
                  </div>
                </div>

                <Alert className="border-orange-300 bg-orange-50">
                  <AlertTriangle className="h-5 w-5 text-orange-700" />
                  <AlertTitle className="text-orange-900">Σημαντική Σημείωση</AlertTitle>
                  <AlertDescription className="text-orange-800">
                    Τα ανοιχτά snags (εσωτερικά/εξωτερικά) επηρεάζουν άμεσα τα αυτόματα πεδία της State of Delivery. Φροντίστε να κλείνετε τα snags μόλις ολοκληρωθούν για να προχωρήσει η παράδοση.
                  </AlertDescription>
                </Alert>

                <Tip 
                  icon={Lightbulb} 
                  title="Pro Tips" 
                  description="• Χρησιμοποιήστε τα column filters για bulk analysis • Export CSV για reporting • Προσθέστε λεπτομερή work description για accountability • Η επανενεργοποίηση (reopened) σημαδεύει snags που ξανάνοιξαν"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mobile Field Work Tab */}
          <TabsContent value="mobile-field-work">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Smartphone className="w-7 h-7 text-green-600" />
                  Mobile Field Work - Εφαρμογή Πεδίου
                </CardTitle>
                <p className="text-slate-600">Mobile-optimized interface για εργασία στο πεδίο (tablet/smartphone).</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5"/>Χαρακτηριστικά Mobile App
                  </h4>
                  <div className="text-sm text-green-800 space-y-2">
                    <p><strong>Touch-Optimized</strong>: Μεγάλα buttons, swipe gestures, mobile-friendly UI</p>
                    <p><strong>GPS Location</strong>: Εντοπισμός κοντινότερης στάσης με ένα κλικ</p>
                    <p><strong>Quick Actions</strong>: Άμεση δημιουργία/ολοκλήρωση snags χωρίς navigation</p>
                    <p><strong>Offline-Ready</strong>: Λειτουργεί με περιορισμένη σύνδεση</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5"/>Βασική Χρήση στο Πεδίο
                  </h4>
                  <ol className="space-y-6">
                    <Step 
                      icon={MapPin} 
                      title="Επιλογή στάσης:" 
                      description="3 τρόποι: (1) Search με αριθμό στάσης (2) 'Κοντινή Στάση' με GPS (3) Επιλογή από προγραμματισμένη διαδρομή. Εμφανίζονται οι εκκρεμότητες της στάσης." 
                    />
                    
                    <Step 
                      icon={Plus} 
                      title="Δημιουργία snag:" 
                      description="Πατήστε 'Νέα Εκκρεμότητα' (μόνο για μεμονωμένες στάσεις). Συμπληρώστε τα βασικά πεδία. Photo upload από κάμερα ή gallery." 
                    />
                    
                    <Step 
                      icon={CheckCircle} 
                      title="Ολοκλήρωση snag:" 
                      description="Tap σε οποιοδήποτε ανοιχτό snag. Ενεργοποιήστε 'Photo Taken', 'Technician Completed'. Προσθέστε σχόλια. Πατήστε 'Αποθήκευση'." 
                    />
                    
                    <Step 
                      icon={RouteIcon} 
                      title="Route Mode:" 
                      description="Επιλέξτε μια προγραμματισμένη διαδρομή. Βλέπετε τα snags ομαδοποιημένα ανά στάση. Δουλέψτε τη διαδρομή σειριακά. Πατήστε 'Οδηγίες Google Maps'." 
                    />
                  </ol>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5"/>Διαδρομή Πολλαπλών Στάσεων
                  </h4>
                  <div className="text-sm text-purple-800 space-y-2">
                    <p><strong>Multi-Select:</strong> Επιλέξτε πολλές στάσεις με checkboxes από τη λίστα.</p>
                    <p><strong>Optimized Route:</strong> Το σύστημα δημιουργεί βελτιστοποιημένη διαδρομή στο Google Maps.</p>
                    <p><strong>Waypoints:</strong> Όλες οι στάσεις προστίθενται ως waypoints για turn-by-turn navigation.</p>
                    <p><strong>Start & End:</strong> Η διαδρομή ξεκινά και τελειώνει στην αποθήκη (warehouse).</p>
                  </div>
                </div>

                <Tip 
                  icon={Lightbulb} 
                  title="Pro Tips" 
                  description="• Κάντε την προεπισκόπηση της διαδρομής το πρωί • Χρησιμοποιήστε το 'Οδηγίες' button για instant Google Maps • Τα stats cards (Ανοιχτές/Έτοιμες/Με Φωτό) ενημερώνονται real-time • Το Route Mode group snags by stop για efficiency"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Repair Routes Tab */}
          <TabsContent value="repair-routes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <RouteIcon className="w-7 h-7 text-purple-600" />
                  Repair Routes - Προγραμματισμός Διαδρομών
                </CardTitle>
                <p className="text-slate-600">Δημιουργία και βελτιστοποίηση διαδρομών επισκευών.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5"/>Τι κάνει το Route Planning
                  </h4>
                  <div className="text-sm text-purple-800 space-y-2">
                    <p><strong>Optimization</strong>: Υπολογισμός βέλτιστης διαδρομής για ελαχιστοποίηση απόστασης</p>
                    <p><strong>Scheduling</strong>: Ανάθεση ημερομηνίας και συνεργείου σε διαδρομές</p>
                    <p><strong>Snag Grouping</strong>: Ομαδοποίηση snags ανά στάση για αποτελεσματικότητα</p>
                    <p><strong>Export</strong>: Αποθήκευση διαδρομών για χρήση στο Mobile Field Work</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5"/>Δημιουργία Διαδρομής
                  </h4>
                  <ol className="space-y-6">
                    <Step 
                      icon={Filter} 
                      title="Φιλτράρισμα snags:" 
                      description="Χρησιμοποιήστε τα filters (Πόλη, Τύπος, Κατηγορία) για να εμφανίσετε μόνο τα snags που σας ενδιαφέρουν. Ο χάρτης ενημερώνεται αυτόματα." 
                    />
                    
                    <Step 
                      icon={Plus} 
                      title="Επιλογή snags:" 
                      description="Κάντε κλικ στους markers στο χάρτη ή στη λίστα δεξιά για να προσθέσετε snags. Ο αριθμός δίπλα σε κάθε snag δείχνει τη σειρά στη διαδρομή." 
                    />
                    
                    <Step 
                      icon={RouteIcon} 
                      title="Βελτιστοποίηση:" 
                      description="Πατήστε 'Optimize Route'. Το σύστημα υπολογίζει τη βέλτιστη σειρά επισκέψεων. Η διαδρομή σχεδιάζεται στο χάρτη με γραμμές." 
                    />
                    
                    <Step 
                      icon={Calendar} 
                      title="Αποθήκευση & Προγραμματισμός:" 
                      description="Πατήστε 'Save Route'. Δώστε όνομα, επιλέξτε ημερομηνία και συνεργείο. Η διαδρομή αποθηκεύεται και εμφανίζεται στο Mobile Field Work." 
                    />
                  </ol>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5"/>Διαχείριση Αποθηκευμένων Διαδρομών
                  </h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>View Routes:</strong> Δείτε όλες τις αποθηκευμένες διαδρομές με status (Active/Completed/Archived)</p>
                    <p><strong>Load Route:</strong> Φορτώστε μια αποθηκευμένη διαδρομή για edit ή επανεκτέλεση</p>
                    <p><strong>Mobile Access:</strong> Οι Active διαδρομές εμφανίζονται στο Mobile Field Work dropdown</p>
                    <p><strong>Stats:</strong> Συνολική απόσταση, αριθμός snags, αριθμός στάσεων ανά διαδρομή</p>
                  </div>
                </div>

                <Tip 
                  icon={Lightbulb} 
                  title="Pro Tips" 
                  description="• Δημιουργήστε διαδρομές με βάση γεωγραφική περιοχή (πόλη) για efficiency • Προγραμματίστε διαδρομές 1-2 μέρες πριν • Optimize μόνο όταν έχετε επιλέξει 3+ snags • Χρησιμοποιήστε το warehouse location για accurate distance calculation"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reporting Tab */}
          <TabsContent value="reporting">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <BarChart3 className="w-7 h-7 text-indigo-600" />
                  Delivery Reporting - Αναφορές & Analytics
                </CardTitle>
                <p className="text-slate-600">Custom dashboards και αναφορές για management.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5"/>Διαθέσιμες Αναφορές
                  </h4>
                  <div className="text-sm text-indigo-800 space-y-2">
                    <p><strong>Delivery Progress</strong>: Πόσες στάσεις είναι σε κάθε στάδιο παράδοσης</p>
                    <p><strong>Snag Analysis</strong>: Τύποι snags, κατανομή ανά στοιχείο, average resolution time</p>
                    <p><strong>Performance</strong>: Snags ανά τεχνικό, completion rates, productivity metrics</p>
                    <p><strong>Geographic</strong>: Χάρτες με heat maps για προβληματικές περιοχές</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5"/>Δημιουργία Custom Report
                  </h4>
                  <ol className="space-y-6">
                    <Step 
                      icon={Filter} 
                      title="Επιλογή filters:" 
                      description="Φιλτράρετε με ημερομηνίες (date range), πόλεις, τύπους στεγάστρων, κατηγορίες snags. Οι αναφορές ενημερώνονται real-time." 
                    />
                    
                    <Step 
                      icon={BarChart3} 
                      title="Visualization:" 
                      description="Τα charts (pie, bar, line) δείχνουν τα δεδομένα γραφικά. Hover για details. Recharts library για interactive charts." 
                    />
                    
                    <Step 
                      icon={Download} 
                      title="Export:" 
                      description="Πατήστε 'Export CSV' για να κατεβάσετε τα δεδομένα. Ανοίξτε στο Excel για περαιτέρω ανάλυση ή παρουσιάσεις." 
                    />
                  </ol>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5"/>KPIs & Metrics
                  </h4>
                  <div className="text-sm text-green-800 space-y-2">
                    <p><strong>Completion Rate:</strong> % στάσεων που ολοκληρώθηκαν vs συνολικές</p>
                    <p><strong>Average Time to Delivery:</strong> Μέσος χρόνος από Εγκατάσταση έως Ολοκλήρωση</p>
                    <p><strong>Snag Density:</strong> Μέσος αριθμός snags ανά στάση</p>
                    <p><strong>Reopened Rate:</strong> % snags που επανενεργοποιήθηκαν</p>
                    <p><strong>Photo Compliance:</strong> % snags με φωτογραφίες</p>
                  </div>
                </div>

                <Tip 
                  icon={Lightbulb} 
                  title="Pro Tips" 
                  description="• Τρέξτε weekly reports για trend analysis • Compare current vs previous period για insights • Identify bottlenecks (σε ποιο στάδιο καθυστερούν οι στάσεις) • Use charts για παρουσιάσεις σε stakeholders"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                    <span>Χρησιμοποιήστε το Mobile Field Work για όλες τις εργασίες πεδίου</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Τραβήξτε φωτογραφίες για κάθε snag</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Ενημερώνετε τα snags αμέσως μετά την ολοκλήρωση</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Εβδομαδιαίες Εργασίες</h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Προγραμματίστε repair routes για την επόμενη εβδομάδα</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Review ανοιχτών snags και prioritization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Ελέγξτε στάσεις που καθυστερούν σε κάποιο στάδιο</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg border">
              <h4 className="font-semibold text-slate-900 mb-2">Μηνιαίες Εργασίες</h4>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Export full reports για management review</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Analyze snag trends και patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Review KPIs (completion rate, average delivery time)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Update field options βάσει feedback</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}