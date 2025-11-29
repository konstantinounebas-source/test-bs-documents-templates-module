import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Clock, Calendar, XCircle, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChangeLogStats({ items, isLoading, onStatClick, activeFilter }) {
  const stats = {
    total: items.length,
    pending: items.filter(item => item.status === "Εκκρεμεί").length,
    implemented: items.filter(item => item.status === "Υλοποιήθηκε").length,
    scheduled: items.filter(item => item.status === "Προγραμματισμένο").length,
    rejected: items.filter(item => item.status === "Απορρίφθηκε").length,
    future: items.filter(item => item.status === "Μελλοντική Επέκταση").length
  };

  const isActive = (status) => {
    if (!activeFilter) return false;
    return activeFilter.field === 'status' && activeFilter.value === status;
  };

  const StatCard = ({ icon: Icon, title, value, status, color, onClick }) => (
    <Card 
      className={`border-slate-200 hover:shadow-md transition-all duration-200 cursor-pointer ${
        isActive(status) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onClick={() => onClick('status', status)}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        icon={Layers}
        title="Συνολικά"
        value={stats.total}
        status={null}
        color="bg-slate-500"
        onClick={() => onStatClick(null, null)}
      />
      <StatCard
        icon={Clock}
        title="Εκκρεμεί"
        value={stats.pending}
        status="Εκκρεμεί"
        color="bg-yellow-500"
        onClick={onStatClick}
      />
      <StatCard
        icon={CheckCircle}
        title="Υλοποιήθηκε"
        value={stats.implemented}
        status="Υλοποιήθηκε"
        color="bg-green-500"
        onClick={onStatClick}
      />
      <StatCard
        icon={Calendar}
        title="Προγραμματισμένο"
        value={stats.scheduled}
        status="Προγραμματισμένο"
        color="bg-blue-500"
        onClick={onStatClick}
      />
      <StatCard
        icon={XCircle}
        title="Απορρίφθηκε"
        value={stats.rejected}
        status="Απορρίφθηκε"
        color="bg-red-500"
        onClick={onStatClick}
      />
      <StatCard
        icon={AlertTriangle}
        title="Μελλοντική Επέκταση"
        value={stats.future}
        status="Μελλοντική Επέκταση"
        color="bg-purple-500"
        onClick={onStatClick}
      />
    </div>
  );
}