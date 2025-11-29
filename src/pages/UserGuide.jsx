
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  FileText, 
  Settings, 
  BookOpen, 
  Users2,
  CheckSquare,
  ScrollText,
  HelpCircle,
  LogIn,
  UserPlus,
  PlusCircle,
  Eye,
  ChevronsRight,
  ThumbsUp,
  ThumbsDown,
  Info,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

export default function UserGuidePage() {

  const SectionCard = ({ title, icon, children }) => (
    <Card className="border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl text-slate-800">
          {React.createElement(icon, { className: "w-6 h-6 text-blue-600" })}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none prose-p:text-slate-700 prose-headings:text-slate-800 prose-strong:text-slate-900 prose-li:text-slate-700">
        {children}
      </CardContent>
    </Card>
  );

  const FieldDescription = ({ fieldName, children }) => (
    <div className="py-3 border-b last:border-b-0">
      <h4 className="font-semibold text-slate-800">{fieldName}</h4>
      <p className="!mt-1 text-sm text-slate-600">{children}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Οδηγός Χρήσης: Σύστημα DocuFlow</h1>
          <p className="text-slate-600 mt-2 text-lg">Όλα όσα πρέπει να γνωρίζετε για να αξιοποιήσετε πλήρως την πλατφόρμα.</p>
        </div>

        <SectionCard title="Καλωσόρισμα στο DocuFlow!" icon={HelpCircle}>
          <p>
            Το DocuFlow είναι το κεντρικό σύστημα για τη διαχείριση, δημιουργία και παρακολούθηση όλων των εγγράφων και προτύπων (templates) του οργανισμού. Στόχος του είναι να απλοποιήσει τις διαδικασίες, να εξασφαλίσει την τήρηση των εκδόσεων και να βελτιώσει τη συνεργασία.
          </p>
        </SectionCard>

        <SectionCard title="Πρώτη Είσοδος & Ρύθμιση Προφίλ" icon={LogIn}>
            <ul>
                <li><strong><UserPlus className="inline-block w-4 h-4 mr-1" /> Σύνδεση:</strong> Η πλατφόρμα χρησιμοποιεί ασφαλή σύνδεση. Επιλέξτε το εταιρικό σας email για να συνδεθείτε.</li>
                <li><strong><Settings className="inline-block w-4 h-4 mr-1" /> Ρύθμιση Προφίλ:</strong> Κατά την πρώτη σας είσοδο, το σύστημα θα σας ζητήσει να συμπληρώσετε τη <strong>Θέση/Ιδιότητά</strong> σας. Αυτό είναι σημαντικό για την ανάθεση αρμοδιοτήτων και εγκρίσεων.</li>
            </ul>
        </SectionCard>

        <SectionCard title="Επισκόπηση Πλατφόρμας" icon={Eye}>
            <p>Το αριστερό μενού πλοήγησης σας δίνει πρόσβαση σε όλες τις κύριες λειτουργίες:</p>
            <ul>
                <li><strong><FileText className="inline-block w-5 h-5 mr-2 text-blue-600"/>Templates:</strong> Η καρδιά του συστήματος. Εδώ θα βρείτε και θα διαχειριστείτε όλα τα πρότυπα.</li>
                <li><strong><BookOpen className="inline-block w-5 h-5 mr-2 text-purple-600"/>Interactive Forms:</strong> Προβολή και χρήση των online φορμών που δημιουργούνται από τα πρότυπα.</li>
                <li><strong><CheckSquare className="inline-block w-5 h-5 mr-2 text-green-600"/>Approvals:</strong> Διαχείριση της διαδικασίας έγκρισης των προτύπων που το απαιτούν.</li>
                <li><strong><Users2 className="inline-block w-5 h-5 mr-2 text-orange-600"/>Users:</strong> Διαχείριση των χρηστών που έχουν πρόσβαση στην πλατφόρμα και των χρηστών που χρησιμοποιούνται για αναθέσεις.</li>
                <li><strong><Settings className="inline-block w-5 h-5 mr-2 text-gray-600"/>Administration:</strong> Ρύθμιση των επιλογών που εμφανίζονται στα dropdowns της εφαρμογής (π.χ. Κατηγορίες, Status, Custom Fields).</li>
                <li><strong><ScrollText className="inline-block w-5 h-5 mr-2 text-yellow-600"/>Audit Logs:</strong> Παρακολούθηση όλων των ενεργειών που γίνονται στο σύστημα για λόγους ασφάλειας και συμμόρφωσης.</li>
            </ul>
        </SectionCard>
        
        <SectionCard title="Διαχείριση Χρηστών (Users)" icon={Users2}>
            <p>Η σελίδα "Users" είναι χωρισμένη σε δύο σημαντικές καρτέλες:</p>
            <FieldDescription fieldName="Application Users">
                Αυτή είναι η κύρια λίστα χρηστών που χρησιμοποιείται για την ανάθεση αρμοδιοτήτων (π.χ. στα πεδία Responsibility, Approver). Μπορείτε να προσθέσετε εδώ χρήστες που δεν έχουν απαραίτητα λογαριασμό στην πλατφόρμα (π.χ. εξωτερικοί συνεργάτες, γενικοί ρόλοι).
            </FieldDescription>
            <FieldDescription fieldName="Platform Users">
                Αυτή η λίστα δείχνει όλους τους χρήστες που έχουν συνδεθεί τουλάχιστον μία φορά στην εφαρμογή. Είναι μια λίστα μόνο για ανάγνωση.
            </FieldDescription>
            
            <Alert className="!my-4 border-blue-300 bg-blue-50">
                <RefreshCw className="h-5 w-5 text-blue-700" />
                <AlertTitle className="text-blue-900">Συγχρονισμός Χρηστών</AlertTitle>
                <AlertDescription className="text-blue-800">
                    Στην καρτέλα "Application Users" θα βρείτε το κουμπί <strong>"Synchronize Platform Users"</strong>. Πατώντας το, το σύστημα θα αντιγράψει αυτόματα όλους τους "Platform Users" στους "Application Users". <strong>Είναι σημαντικό να το κάνετε αυτό περιοδικά</strong> για να διασφαλίσετε ότι όλοι οι ενεργοί χρήστες της πλατφόρμας είναι διαθέσιμοι για ανάθεση αρμοδιοτήτων.
                </AlertDescription>
            </Alert>
        </SectionCard>

        <SectionCard title="Ρυθμίσεις Συστήματος (Administration)" icon={Settings}>
          <p>
            Η σελίδα "Administration" είναι το κέντρο ελέγχου της εφαρμογής. Εδώ, οι Διαχειριστές (Admins) μπορούν να παραμετροποιήσουν τις λίστες επιλογών (dropdowns) που εμφανίζονται σε όλη την πλατφόρμα, όπως στις φόρμες δημιουργίας και επεξεργασίας προτύπων. Η σωστή παραμετροποίηση εδώ διασφαλίζει τη συνέπεια και την ομοιομορφία των δεδομένων.
          </p>
          <p>
            Από το κεντρικό dropdown, μπορείτε να επιλέξετε την κατηγορία ρυθμίσεων που θέτετε να διαχειριστείτε. Για κάθε κατηγορία, μπορείτε να προσθέσετε νέες επιλογές, να επεξεργαστείτε τις υπάρχουσες ή να τις απενεργοποιήσετε.
          </p>

          <Alert className="!my-4 border-orange-300 bg-orange-50">
              <AlertTriangle className="h-5 w-5 text-orange-700" />
              <AlertTitle className="text-orange-900">Προσοχή!</AlertTitle>
              <AlertDescription className="text-orange-800">
                  Οι αλλαγές που γίνονται σε αυτή τη σελίδα έχουν άμεσο αντίκτυπο σε ολόκληρη την εφαρμογή. Μόνο εξουσιοδοτημένοι Διαχειριστές πρέπει να έχουν πρόσβαση και να κάνουν αλλαγές εδώ.
              </AlertDescription>
          </Alert>

          <h3 className="!text-lg !font-semibold !mt-6">Κύριες Κατηγορίες Ρυθμίσεων</h3>
          <FieldDescription fieldName="Template Categories">
            Διαχειριστείτε τις κατηγορίες στις οποίες ανήκουν τα πρότυπα (π.χ. 'Ποιότητα', 'Οικονομικά', 'Ανθρώπινο Δυναμικό').
          </FieldDescription>
          <FieldDescription fieldName="Template Status Options">
            Ορίστε τις πιθανές καταστάσεις ενός προτύπου (π.χ. 'Draft', 'Active', 'Need Approval', 'Archived'). Εδώ καθορίζετε ποιες καταστάσεις θα ενεργοποιούν τη ροή έγκρισης.
          </FieldDescription>
          <FieldDescription fieldName="Custom Field Labels">
            Δώστε τα δικά σας ονόματα στα τέσσερα διαθέσιμα προσαρμοσμένα πεδία (π.χ. αντί για 'Custom Field 1' να λέγεται 'Τύπος Έργου').
          </FieldDescription>
          <FieldDescription fieldName="Custom Field Options (1-4)">
            Για κάθε προσαρμοσμένο πεδίο που ονομάσατε, εδώ ορίζετε τις επιλογές που θα εμφανίζονται στο αντίστοιχο dropdown (π.χ. για τον 'Τύπο Έργου', οι επιλογές θα μπορούσαν να είναι 'Εσωτερικό', 'Εξωτερικό').
          </FieldDescription>
           <FieldDescription fieldName="Responsibility Options">
            Προσθέστε γενικούς ρόλους ή τμήματα (π.χ. 'Τμήμα Ποιότητας', 'Εξωτερικός Συνεργάτης') που μπορούν να ανατεθούν ως υπεύθυνοι, πέρα από τους συγκεκριμένους χρήστες του συστήματος.
          </FieldDescription>
          <FieldDescription fieldName="Λοιπές Επιλογές">
            Διαχειριστείτε τις επιλογές για πεδία όπως 'Activity', 'Frequency', 'Availability', και 'Control Mechanism' για να ταιριάζουν απόλυτα στις διαδικασίες του οργανισμού σας.
          </FieldDescription>
        </SectionCard>

        <SectionCard title="Δημιουργία Νέου Προτύπου - Αναλυτικός Οδηγός" icon={PlusCircle}>
            <p>Όταν πατάτε "Create Template", εμφανίζεται η φόρμα δημιουργίας. Η σωστή συμπλήρωσή της είναι το κλειδί για την οργάνωση του συστήματος.</p>
            
            <Alert className="!my-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Σημείωση για τις Επιλογές</AlertTitle>
                <AlertDescription>
                    Πολλά πεδία είναι λίστες επιλογών (dropdowns). Αν μια επιλογή λείπει, ένας <strong>Διαχειριστής (Admin)</strong> πρέπει να την προσθέσει από τη σελίδα <strong>Administration</strong> στην αντίστοιχη κατηγορία.
                </AlertDescription>
            </Alert>
            
            <h3 className="!text-lg !font-semibold !mt-6">Υποχρεωτικές Πληροφορίες</h3>
            <FieldDescription fieldName="Template Type (Τύπος Προτύπου)">
                Επιλέξτε <strong>File Template</strong> για έγγραφα που οι χρήστες κατεβάζουν (PDF, Word) ή <strong>Interactive Form</strong> για φόρμες που συμπληρώνονται online.
            </FieldDescription>
            <FieldDescription fieldName="Template Code & Title">
                Ο μοναδικός, ελεγχόμενος κωδικός και ο επίσημος τίτλος του προτύπου.
            </FieldDescription>
            <FieldDescription fieldName="Status (Κατάσταση)">
                 Η τρέχουσα κατάσταση του προτύπου. Αν επιλέξετε ένα status που περιλαμβάνει τη λέξη "Approval" (π.χ. "Need Approval"), το template θα μπει αυτόματα στη διαδικασία έγκρισης.
            </FieldDescription>

            <h3 className="!text-lg !font-semibold !mt-6">Αρμοδιότητες & Εγκρίσεις</h3>
            <FieldDescription fieldName="Approver & Responsibility Fields">
                Αυτά τα πεδία σας επιτρέπουν να αναθέσετε αρμοδιότητες. Η λίστα περιλαμβάνει όλους τους <strong>Application Users</strong>. Βεβαιωθείτε ότι έχετε κάνει "Sync" από τη σελίδα Users για να έχετε όλους τους χρήστες διαθέσιμους. Ο χρήστης που θα ορίσετε στο πεδίο "Approver" είναι ο μοναδικός που θα μπορεί να εγκρίνει ή να απορρίψει το πρότυπο.
            </FieldDescription>
        </SectionCard>

        <SectionCard title="Η Ροή Εργασίας Έγκρισης" icon={ChevronsRight}>
            <p>Η σελίδα "Approvals" ασχολείται μόνο με τα πρότυπα που απαιτούν έγκριση.</p>
            <div className="flex flex-col md:flex-row items-start justify-around text-center gap-4">
                <div className="flex-1">
                    <h4 className="font-bold">1. Δημιουργία</h4>
                    <PlusCircle className="w-12 h-12 text-blue-500 mx-auto my-2" />
                    <p className="text-sm">Ο Δημιουργός φτιάχνει το πρότυπο, επιλέγει ένα status που απαιτεί έγκριση και ορίζει τον "Approver".</p>
                </div>
                <ChevronsRight className="w-8 h-8 text-slate-400 hidden md:block mt-8" />
                <div className="flex-1">
                    <h4 className="font-bold">2. Έγκριση</h4>
                    <div className="flex justify-center gap-4">
                        <ThumbsUp className="w-12 h-12 text-green-500 mx-auto my-2" />
                        <ThumbsDown className="w-12 h-12 text-red-500 mx-auto my-2" />
                    </div>
                    <p className="text-sm">Ο "Approver" βλέπει το πρότυπο στην καρτέλα "Pending" της σελίδας Approvals, το ελέγχει και το εγκρίνει ή το απορρίπτει.</p>
                </div>
                <ChevronsRight className="w-8 h-8 text-slate-400 hidden md:block mt-8" />
                <div className="flex-1">
                    <h4 className="font-bold">3. Ολοκλήρωση</h4>
                    <CheckSquare className="w-12 h-12 text-purple-500 mx-auto my-2" />
                    <p className="text-sm">Το πρότυπο μεταφέρεται στην καρτέλα "Processed" ως "Approved" ή "Rejected". Αν εγκριθεί, το status του συνήθως γίνεται "Active".</p>
                </div>
            </div>
             <Alert variant="destructive" className="!mt-8">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Σημαντική Διευκρίνιση</AlertTitle>
                <AlertDescription>
                    Αν ένα template δημιουργηθεί με status "Draft" ή "Active", δεν θα εμφανιστεί ποτέ στη σελίδα "Approvals", καθώς η έγκρισή του δεν απαιτείται. Η κατάσταση έγκρισής του θα είναι "Not Applicable".
                </AlertDescription>
            </Alert>
        </SectionCard>

      </div>
    </div>
  );
}
