import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, ClipboardList, CalendarDays, ClipboardCheck, TrendingUp, Calendar,
  Settings, Lightbulb, User, CheckCircle, AlertTriangle, ArrowRight, PlayCircle,
  Zap, MousePointerClick, Type, Save, Clock, History, BarChart3, PieChart,
  Move, PlusCircle, Maximize2, Edit, Star, Eye, Target, Filter, Users, 
  Activity, FileText, RotateCcw, Timer, BookMarked
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function MyWorkspaceUserGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">Οδηγός Χρήσης</h1>
          </div>
          <h2 className="text-2xl text-slate-700">Η Ενότητα "Ο Χώρος Εργασίας μου" (My Workspace)</h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Καλώς ήρθατε! Αυτός ο οδηγός θα σας βοηθήσει να αξιοποιήσετε πλήρως τα εργαλεία της ενότητας "My Workspace" για να οργανώσετε την εργασία σας, να προγραμματίσετε τον χρόνο σας και να μετρήσετε την απόδοσή σας.
          </p>
        </div>

        {/* Detailed Sections */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 h-auto">
            <TabsTrigger value="tasks" className="flex items-center gap-2 py-2"><ClipboardList className="w-4 h-4" />Οι Εργασίες μου</TabsTrigger>
            <TabsTrigger value="planner" className="flex items-center gap-2 py-2"><CalendarDays className="w-4 h-4" />Προγ/τής Εβδομάδας</TabsTrigger>
            <TabsTrigger value="daily" className="flex items-center gap-2 py-2"><ClipboardCheck className="w-4 h-4" />Καθημερινό Ημερολόγιο</TabsTrigger>
            <TabsTrigger value="productivity" className="flex items-center gap-2 py-2"><TrendingUp className="w-4 h-4" />Παραγωγικότητα</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 py-2"><Calendar className="w-4 h-4" />Ρυθμίσεις</TabsTrigger>
          </TabsList>

          {/* My Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl"><ClipboardList className="w-7 h-7 text-blue-600" />Οι Εργασίες μου (My Tasks)</CardTitle>
                <p className="text-slate-600">Ο κεντρικός πίνακας για όλες τις προσωπικές σας εργασίες και την παρακολούθηση προόδου.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><Zap className="w-5 h-5"/>Βασικές Έννοιες</h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>Η σελίδα περιλαμβάνει τρεις κύριες καρτέλες:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><Badge variant="secondary">Ad-Hoc Tasks</Badge>: Μεμονωμένες, μη-επαναλαμβανόμενες εργασίες</li>
                      <li><Badge variant="secondary">Recurrence Tasks</Badge>: Επαναλαμβανόμενες εργασίες (καθημερινές, εβδομαδιαίες, μηνιαίες)</li>
                      <li><Badge variant="secondary">Watched Tasks</Badge>: Εργασίες που παρακολουθείτε με αστέρι (⭐) - δικές σας ή άλλων</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><PlayCircle className="w-5 h-5"/>Οδηγίες Βήμα-Βήμα</h4>
                  <ol className="space-y-6">
                    <Step icon={PlusCircle} title="Δημιουργία νέας εργασίας:" description="Πατήστε 'New Task'. Επιλέξτε τύπο (Ad-hoc ή Recurring). Συμπληρώστε τίτλο, περιγραφή, προθεσμία και προτεραιότητα. Για recurring tasks, ορίστε το μοτίβο επανάληψης." />
                    
                    <Step icon={Edit} title="Ενημέρωση προόδου εργασίας:" description="Χρησιμοποιήστε τον slider για να αλλάξετε το ποσοστό ολοκλήρωσης (0-100%). Ή κάντε κλικ στο 'Report Progress' για αναλυτικές σημειώσεις και καταγραφή χρόνου." />
                    
                    <Step icon={Star} title="Παρακολούθηση εργασιών με αστέρι:" description="Κάντε κλικ στο αστέρι (⭐) για να προσθέσετε μια εργασία στα 'Watched Tasks'. Μπορείτε να παρακολουθείτε δικές σας ή εργασίες άλλων χρηστών." />
                    
                    <Step icon={Timer} title="Καταγραφή χρόνου εργασίας:" description="Στο 'Report Progress', εισάγετε τον πραγματικό χρόνο που αφιερώσατε σε λεπτά (π.χ. '90' για 1.5 ώρα)." />
                    
                    <Step icon={History} title="Προβολή ιστορικού εργασίας:" description="Κάντε κλικ στο μενού (⋮) και επιλέξτε 'View History' για να δείτε όλες τις αλλαγές και τις καταγραφές προόδου." />

                    <Step icon={Filter} title="Φιλτράρισμα και αναζήτηση:" description="Χρησιμοποιήστε τα φίλτρα Status, Priority και την αναζήτηση για να βρείτε γρήγορα συγκεκριμένες εργασίες." />
                    
                    <Step icon={Users} title="Επιλογή χρήστη για προβολή:" description="Αν έχετε δικαιώματα, χρησιμοποιήστε τον επιλογέα χρήστη στην κορυφή για να δείτε εργασίες άλλων χρηστών." />
                  </ol>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2"><Target className="w-5 h-5"/>Watched Tasks - Λεπτομέρειες</h4>
                  <div className="text-sm text-green-800 space-y-2">
                    <p><strong>Starred Tasks:</strong> Εργασίες που έχετε μαρκάρει με αστέρι για παρακολούθηση.</p>
                    <p><strong>All Visible Tasks:</strong> Εργασίες άλλων χρηστών που μπορείτε να βλέπετε βάσει ρυθμίσεων ορατότητας.</p>
                    <p><strong>Σημείωση:</strong> Μπορείτε να ξε-αστερώσετε εργασίες κάνοντας κλικ ξανά στο αστέρι.</p>
                  </div>
                </div>
                
                <Tip icon={Lightbulb} title="Pro Tips" description="• Χρησιμοποιήστε τα configurable stat cards για γρήγορη ανάλυση των εργασιών σας • Για recurring tasks, η επόμενη εμφάνιση δημιουργείται αυτόματα μετά την ολοκλήρωση • Η προτεραιότητα βοηθά στη σειράδα εμφάνισης των εργασιών" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Week Planner Tab */}
          <TabsContent value="planner">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl"><CalendarDays className="w-7 h-7 text-green-600" />Προγραμματιστής Εβδομάδας</CardTitle>
                 <p className="text-slate-600">Οργανώστε οπτικά την εβδομάδα σας με drag & drop λειτουργικότητα.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                 <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2"><Zap className="w-5 h-5"/>Βασικές Έννοιες</h4>
                  <p className="text-sm text-green-800">Αυτή η σελίδα συνδέει τις εργασίες σας με συγκεκριμένους χρόνους. Προγραμματίζετε πότε θα εργαστείτε σε κάθε εργασία ή συνάντηση.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><PlayCircle className="w-5 h-5"/>Οδηγίες Βήμα-Βήμα</h4>
                  <ol className="space-y-6">
                    <Step icon={Move} title="Προγραμματισμός εργασίας:" description="Βρείτε την εργασία στη λίστα 'Unscheduled Tasks'. Σύρετέ την (drag & drop) στο ημερολόγιο στην επιθυμητή ημέρα και ώρα." />
                    
                    <Step icon={PlusCircle} title="Δημιουργία συνάντησης:" description="Κάντε κλικ σε κενό χρονικό διάστημα στο ημερολόγιο. Επιλέξτε 'Create Meeting' και συμπληρώστε τις λεπτομέρειες." />
                    
                    <Step icon={Maximize2} title="Αλλαγή διάρκειας γεγονότος:" description="Τοποθετήστε τον κέρσορα στο κάτω μέρος ενός προγραμματισμένου μπλοκ. Σύρετε πάνω/κάτω για αλλαγή διάρκειας." />
                    
                    <Step icon={Settings} title="Προσαρμογή ωραρίου:" description="Το ημερολόγιο εμφανίζει τις ώρες εργασίας βάσει των ρυθμίσεων σας από το 'Calendar Settings'." />
                    
                    <Step icon={Eye} title="Επιλογή χρήστη:" description="Χρησιμοποιήστε τον επιλογέα χρήστη για να δείτε ή να επεξεργαστείτε το πρόγραμμα άλλων χρηστών (αν έχετε δικαιώματα)." />
                  </ol>
                </div>
                
                <Tip icon={Lightbulb} title="Pro Tips" description="• Δημιουργήστε γενικά χρονικά μπλοκ όπως 'Focus Time' ή 'Email Processing' • Προγραμματίστε buffer time μεταξύ συναντήσεων • Χρησιμοποιήστε colors για διαφορετικούς τύπους δραστηριοτήτων"/>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Log Tab */}
          <TabsContent value="daily">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl"><ClipboardCheck className="w-7 h-7 text-purple-600" />Καθημερινό Ημερολόγιο</CardTitle>
                <p className="text-slate-600">Καταγράψτε την πρόοδο και τον χρόνο για τα προγραμματισμένα γεγονότα της ημέρας.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                 <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2"><Zap className="w-5 h-5"/>Βασικές Έννοιες</h4>
                  <p className="text-sm text-purple-800">Αυτή η σελίδα δείχνει μόνο τα γεγονότα που έχετε προγραμματίσει για σήμερα. Χρησιμοποιείται για την καταγραφή της πραγματικής προόδου και του χρόνου που αφιερώσατε.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><PlayCircle className="w-5 h-5"/>Οδηγίες Βήμα-Βήμα</h4>
                  <ol className="space-y-6">
                    <Step icon={Type} title="Καταγραφή προόδου:" description="Για κάθε γεγονός, συμπληρώστε το 'Time Spent' (πραγματικός χρόνος) και 'Progress Notes' (τι επιτεύχθηκε). Πατήστε Save." />
                    
                    <Step icon={Clock} title="Σύγκριση προγραμματισμένου vs πραγματικού χρόνου:" description="Το σύστημα συγκρίνει τον προγραμματισμένο χρόνο με τον πραγματικό για ανάλυση αποδοτικότητας." />
                    
                    <Step icon={BookMarked} title="Σύνδεση με εργασίες:" description="Αν το γεγονός συνδέεται με μια εργασία, η πρόοδος ενημερώνει αυτόματα και την κύρια εργασία." />
                    
                    <Step icon={Activity} title="Καθημερινή συνήθεια:" description="Προσπαθήστε να συμπληρώσετε το Daily Log κάθε τέλος ημέρας για ακριβή δεδομένα." />
                  </ol>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/>Σημαντική Σημείωση</h4>
                  <p className="text-sm text-red-800">Αν δεν εργαστήκατε σε ένα προγραμματισμένο γεγονός, μπορείτε να το αφήσετε κενό ή να το διαγράψετε από τον Week Planner για ακριβή στατιστικά.</p>
                </div>
                
                <Tip icon={Lightbulb} title="Pro Tip" description="Κρατήστε σύντομες αλλά περιεκτικές σημειώσεις. Αυτές θα σας βοηθήσουν να θυμηθείτε τι κάνατε και θα βελτιώσουν τον μελλοντικό προγραμματισμό."/>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Productivity Tab */}
          <TabsContent value="productivity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl"><TrendingUp className="w-7 h-7 text-orange-600" />Εβδομαδιαία Παραγωγικότητα</CardTitle>
                <p className="text-slate-600">Αναλύστε την απόδοση και τις συνήθειες εργασίας σας μέσω μετρικών και γραφημάτων.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                 <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2"><BarChart3 className="w-5 h-5"/>Κύριες Μετρικές (KPIs)</h4>
                  <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                    <li><span className="font-semibold">On-Time Completion Rate:</span> Ποσοστό εργασιών που ολοκληρώθηκαν εντός προθεσμίας.</li>
                    <li><span className="font-semibold">Time Estimation Accuracy:</span> Σύγκριση εκτιμώμενου vs πραγματικού χρόνου.</li>
                    <li><span className="font-semibold">Daily Progress Reporting Rate:</span> Συχνότητα καταγραφής προόδου.</li>
                    <li><span className="font-semibold">Task Completion Rate:</span> Ποσοστό εργασιών που φτάνουν στο 100%.</li>
                    <li><span className="font-semibold">Average Task Duration:</span> Μέσος χρόνος ολοκλήρωσης εργασιών.</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><PieChart className="w-5 h-5"/>Πώς να Ερμηνεύσετε τα Στοιχεία</h4>
                  <ol className="space-y-6">
                    <Step icon={BarChart3} title="Ανάλυση Time Spent Charts:" description="Δείτε που πηγαίνει ο περισσότερος χρόνος σας. Αναζητήστε μοτίβα ανά ημέρα ή κατηγορία εργασίας." />
                    
                    <Step icon={Target} title="Βελτίωση On-Time Rate:" description="Αν είναι χαμηλό, εξετάστε αν θέτετε ρεαλιστικές προθεσμίες. Προσθέστε buffer time σε μελλοντικές εκτιμήσεις." />
                    
                    <Step icon={Timer} title="Βελτίωση Time Estimation:" description="Αν οι εκτιμήσεις σας αποκλίνουν πολύ, κρατήστε σημειώσεις για παρόμοιες εργασίες στο μέλλον." />
                    
                    <Step icon={Activity} title="Reporting Consistency:" description="Προσπαθήστε να κρατάτε υψηλό το Progress Reporting Rate - βοηθά στην ακρίβεια των δεδομένων." />
                  </ol>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><Calendar className="w-5 h-5"/>Χρονικά Διαστήματα Ανάλυσης</h4>
                  <p className="text-sm text-blue-800">Τα στοιχεία υπολογίζονται για την τρέχουσα εβδομάδα, με δυνατότητα σύγκρισης με προηγούμενες περιόδους. Μόνο οι εργάσιμες ημέρες (βάσει των ρυθμίσεών σας) υπολογίζονται.</p>
                </div>
                 
                <Tip icon={Lightbulb} title="Pro Tips" description="• Επισκεφτείτε αυτή τη σελίδα κάθε Παρασκευή για εβδομαδιαία ανασκόπηση • Χρησιμοποιήστε τα insights για καλύτερο προγραμματισμό την επόμενη εβδομάδα • Παρακολουθήστε τις τάσεις μακροπρόθεσμα"/>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl"><Calendar className="w-7 h-7 text-indigo-600" />Ρυθμίσεις Ημερολογίου</CardTitle>
                <p className="text-slate-600">Προσαρμόστε το ωράριο εργασίας, τις άδειες και τις ρυθμίσεις ορατότητας.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                 <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2"><Zap className="w-5 h-5"/>Γιατί είναι Σημαντικό;</h4>
                  <p className="text-sm text-indigo-800">Οι ρυθμίσεις επηρεάζουν τον υπολογισμό εργάσιμων ημερών, την εμφάνιση του ημερολογίου, και τα στατιστικά παραγωγικότητας.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><PlayCircle className="w-5 h-5"/>Οδηγίες Βήμα-Βήμα</h4>
                  <ol className="space-y-6">
                    <Step icon={Clock} title="Ρύθμιση ωραρίου εργασίας:" description="Στο 'Work Schedule', ορίστε ώρες έναρξης/λήξης για καθημερινές ή για κάθε ημέρα ξεχωριστά. Αυτές εμφανίζονται στον Week Planner." />
                    
                    <Step icon={Calendar} title="Προσθήκη προσωπικής άδειας:" description="Στο 'Personal Leaves', πατήστε 'Add Leave', επιλέξτε ημερομηνίες και τύπο άδειας (Annual, Sick, etc.)." />
                    
                    <Step icon={Eye} title="Ρυθμίσεις προβολής ημερολογίου:" description="Στο 'Display Preferences', ορίστε τις default ώρες που θέλετε να εμφανίζονται στις calendar views." />
                    
                    <Step icon={Users} title="Διαχείριση ορατότητας χρηστών (Admin only):" description="Στο 'User Visibility', καθορίστε ποιοι χρήστες μπορούν να βλέπουν τα δεδομένα άλλων χρηστών." />
                    
                    <Step icon={Settings} title="Εταιρικές αργίες (Admin only):" description="Στο 'Company Holidays', προσθέστε επίσημες αργίες που επηρεάζουν όλους τους χρήστες." />
                  </ol>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2"><Users className="w-5 h-5"/>Ρυθμίσεις Ορατότητας</h4>
                  <div className="text-sm text-yellow-800 space-y-2">
                    <p><strong>User Visibility:</strong> Καθορίζει ποιες εργασίες εμφανίζονται στο "All Visible Tasks".</p>
                    <p><strong>Workspace Settings:</strong> Μόνο Διαχειριστές μπορούν να ρυθμίσουν ποιος βλέπει τι.</p>
                  </div>
                </div>
                
                <Tip icon={Lightbulb} title="Pro Tips" description="• Στην αρχή του έτους, προσθέστε όλες τις αργίες και προγραμματισμένες άδειες • Ρυθμίστε διαφορετικό ωράριο για διαφορετικές ημέρες αν χρειάζεται • Χρησιμοποιήστε τις display preferences για καλύτερη οπτική εμπειρία"/>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* General Tips Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <User className="w-6 h-6 text-slate-700" />
              Γενικές Οδηγίες & Βέλτιστες Πρακτικές
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Καθημερινή Ρουτίνα
                </h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Ελέγξτε τις εργασίες σας κάθε πρωί</li>
                  <li>• Ενημερώστε την πρόοδο τουλάχιστον μια φορά την ημέρα</li>
                  <li>• Συμπληρώστε το Daily Log κάθε απόγευμα</li>
                </ul>
              </div>
              
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-blue-600" />
                  Εβδομαδιαίος Κύκλος
                </h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Δευτέρα: Προγραμματισμός εβδομάδας</li>
                  <li>• Τρίτη-Πέμπτη: Εκτέλεση & παρακολούθηση</li>
                  <li>• Παρασκευή: Αναθεώρηση και analysis</li>
                </ul>
              </div>
            </div>
            
            <div className="p-4 bg-slate-100 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-600" />
                Σημείωση για τον Επιλογέα Χρήστη
              </h4>
              <p className="text-slate-700 text-sm">
                Στην κορυφή κάθε σελίδας υπάρχει επιλογέας χρήστη. Αν έχετε τα κατάλληλα δικαιώματα, μπορείτε να επιλέξετε άλλον χρήστη για να δείτε τον χώρο εργασίας του. Βεβαιωθείτε ότι έχετε επιλέξει <Badge variant="outline">το όνομά σας</Badge> για να βλέπετε τα δικά σας δεδομένα.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}