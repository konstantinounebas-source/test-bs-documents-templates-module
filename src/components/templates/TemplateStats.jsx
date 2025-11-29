import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileText, BookOpen, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TemplateStats({ templates, isLoading }) {
  const stats = {
    total: templates.length,
    fileTemplates: templates.filter(t => t.template_type === "file_template").length,
    interactiveForms: templates.filter(t => t.template_type === "interactive_form").length,
    active: templates.filter(t => t.status === "active").length
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <Card className="border-slate-200 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        icon={FileText}
        title="Total Templates"
        value={stats.total}
        subtitle="All document templates"
        color="bg-blue-500"
      />
      <StatCard
        icon={FileText}
        title="File Templates"
        value={stats.fileTemplates}
        subtitle="Downloadable documents"
        color="bg-green-500"
      />
      <StatCard
        icon={BookOpen}
        title="Interactive Forms"
        value={stats.interactiveForms}
        subtitle="AI-generated forms"
        color="bg-purple-500"
      />
      <StatCard
        icon={CheckCircle}
        title="Active Templates"
        value={stats.active}
        subtitle="Currently available"
        color="bg-emerald-500"
      />
    </div>
  );
}