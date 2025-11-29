
import React, { useState, useEffect } from "react";
import { FormTemplate } from "@/entities/FormTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Play, Eye, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function InteractiveFormsPage() {
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInteractiveForms();
  }, []);

  const loadInteractiveForms = async () => {
    setIsLoading(true);
    try {
      const allTemplates = await FormTemplate.list("-updated_date");
      const interactiveForms = allTemplates.filter(t => t.template_type === "interactive_form");
      setForms(interactiveForms);
    } catch (error) {
      console.error("Error loading interactive forms:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Interactive Forms</h1>
          <p className="text-slate-600 mt-1">AI-powered forms created from your document templates</p>
        </div>

        {/* Forms Grid */}
        {forms.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-900 mb-2">No interactive forms</h3>
            <p className="text-slate-600 mb-6">
              Create templates with type "Interactive Form" to see AI-generated forms here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <Card key={form.id} className="hover:shadow-lg transition-shadow duration-200 border-slate-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-500" />
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        Interactive Form
                      </Badge>
                    </div>
                    <Badge className={
                      form.status === 'active' ? 'bg-green-100 text-green-800' :
                      form.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {form.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-6 mt-3">
                    {form.title_english}
                  </CardTitle>
                  {form.template_code && (
                    <p className="text-sm text-slate-500 font-mono">
                      {form.template_code}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.description && (
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {form.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Category: {form.category?.replace(/_/g, ' ')}</span>
                    <span>v{form.current_version || "1.0.0"}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button asChild size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700">
                      <Link to={createPageUrl(`FormRunner?id=${form.id}`)}>
                        <Play className="w-4 h-4 mr-2" />
                        Use Form
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  {form.form_schema && (
                    <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      ✓ AI form schema available
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
