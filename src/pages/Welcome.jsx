import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  ClipboardList, 
  Package, 
  Users, 
  Calendar,
  Warehouse,
  BarChart3,
  Truck,
  ChevronRight,
  Sparkles,
  Shield,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WelcomePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Καλημέρα";
    if (hour < 18) return "Καλό απόγευμα";
    return "Καλησπέρα";
  };

  const moduleCards = [
    {
      title: "My Workspace",
      description: "Διαχείριση προσωπικών εργασιών, ημερολόγιο και παρακολούθηση παραγωγικότητας",
      icon: ClipboardList,
      color: "bg-blue-500",
      link: createPageUrl("MyWorkday"),
      features: ["Daily Tasks", "Week Planner", "Productivity Metrics"]
    },
    {
      title: "Documents & Templates",
      description: "Κεντρική διαχείριση εγγράφων, προτύπων και interactive forms",
      icon: FileText,
      color: "bg-purple-500",
      link: createPageUrl("Templates"),
      features: ["Template Management", "Interactive Forms", "Approvals"]
    },
    {
      title: "Warehouse & Stock",
      description: "Διαχείριση αποθήκης, προϊόντων και κινήσεων stock",
      icon: Warehouse,
      color: "bg-green-500",
      link: createPageUrl("Products"),
      features: ["Products", "Stock Movements", "Barcode Scanner"]
    },
    {
      title: "Bus Stop Orders",
      description: "Διαχείριση παραγγελιών και εγκαταστάσεων στάσεων λεωφορείων",
      icon: Truck,
      color: "bg-orange-500",
      link: createPageUrl("BSOrder"),
      features: ["Order Management", "Installation Tracking", "Official Orders"]
    }
  ];

  const quickActions = [
    {
      title: "View My Tasks",
      description: "Δείτε τις προσωπικές σας εργασίες",
      icon: ClipboardList,
      link: createPageUrl("MyWorkday"),
      color: "text-blue-600 bg-blue-50 hover:bg-blue-100"
    },
    {
      title: "Templates",
      description: "Πρόσβαση στα πρότυπα εγγράφων",
      icon: FileText,
      link: createPageUrl("Templates"),
      color: "text-purple-600 bg-purple-50 hover:bg-purple-100"
    },
    {
      title: "Stock Overview",
      description: "Ελέγξτε τα αποθέματα",
      icon: Package,
      link: createPageUrl("StockOverview"),
      color: "text-green-600 bg-green-50 hover:bg-green-100"
    },
    {
      title: "Weekly Schedule",
      description: "Το εβδομαδιαίο σας πρόγραμμα",
      icon: Calendar,
      link: createPageUrl("WeeklySchedule"),
      color: "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Bus Stop Management Platform
          </div>
          <h1 className="text-5xl font-bold text-slate-900">
            {getGreeting()}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Καλώς ήρθατε στην ολοκληρωμένη πλατφόρμα διαχείρισης για το Bus Stop
          </p>
        </div>

        {/* Stats Banner */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-2xl font-bold text-slate-900">4</h3>
                </div>
                <p className="text-sm text-slate-600">Ενεργά Modules</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <h3 className="text-2xl font-bold text-slate-900">Secure</h3>
                </div>
                <p className="text-sm text-slate-600">Role-Based Access Control</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-2xl font-bold text-slate-900">Real-Time</h3>
                </div>
                <p className="text-sm text-slate-600">Live Data & Analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Modules */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-slate-900">Διαθέσιμα Modules</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {moduleCards.map((module, index) => (
              <Card key={index} className="border-slate-200 hover:shadow-xl transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${module.color} text-white`}>
                        <module.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                          {module.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {module.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {module.features.map((feature, idx) => (
                        <span 
                          key={idx}
                          className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-medium"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    <Link to={module.link}>
                      <Button className="w-full group-hover:bg-blue-600 transition-colors">
                        Πρόσβαση στο Module
                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Γρήγορες Ενέργειες</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.link}>
                <Card className={`border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer h-full ${action.color}`}>
                  <CardContent className="p-6 space-y-3">
                    <action.icon className="w-8 h-8" />
                    <div>
                      <h3 className="font-semibold text-lg">{action.title}</h3>
                      <p className="text-sm opacity-80">{action.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Πληροφορίες Πλατφόρμας
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <p>
              Η πλατφόρμα <strong>Bus Stop Management</strong> είναι ένα ολοκληρωμένο σύστημα που συνδυάζει:
            </p>
            <ul>
              <li><strong>Διαχείριση Εργασιών:</strong> Προσωπικές εργασίες, ημερολόγιο, παρακολούθηση χρόνου και παραγωγικότητας</li>
              <li><strong>Διαχείριση Εγγράφων:</strong> Templates, interactive forms, approval workflows</li>
              <li><strong>Διαχείριση Αποθήκης:</strong> Προϊόντα, stock movements, barcode scanning</li>
              <li><strong>Διαχείριση Παραγγελιών:</strong> Bus stop orders, installation tracking, official orders</li>
            </ul>
            <p className="text-sm text-slate-600 mt-4">
              Για υποστήριξη ή ερωτήσεις, επικοινωνήστε με τον διαχειριστή του συστήματος.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}