import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FormTemplate } from "@/entities/FormTemplate";
import { FormData } from "@/entities/FormData";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle } from "lucide-react";
import DynamicFormRenderer from "../components/forms/DynamicFormRenderer";

export default function FormRunnerPage() {
  const [template, setTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'success' or 'error'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const templateId = params.get('id');

    if (!templateId) {
      setError("No form template ID provided.");
      setIsLoading(false);
      return;
    }

    const loadTemplate = async () => {
      setIsLoading(true);
      try {
        // Fixed: Use proper method to get template by ID
        const templates = await FormTemplate.list();
        const formTemplate = templates.find(t => t.id === templateId);
        
        if (formTemplate) {
          if (formTemplate.template_type !== 'interactive_form' || !formTemplate.form_schema) {
            setError("The selected template is not a valid interactive form.");
          } else {
            setTemplate(formTemplate);
          }
        } else {
          setError("Form template not found.");
        }
      } catch (err) {
        setError("Failed to load the form template.");
        console.error(err);
      }
      setIsLoading(false);
    };

    loadTemplate();
  }, [location.search]);

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmissionStatus(null);
    try {
      const user = await User.me();
      await FormData.create({
        form_template_id: template.id,
        submitted_by: user.email,
        data: data
      });
      setSubmissionStatus('success');
    } catch (err) {
      console.error("Form submission failed:", err);
      setSubmissionStatus('error');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-center">
        <Alert variant="destructive" className="max-w-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (submissionStatus === 'success') {
    return (
        <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-center">
            <Alert variant="default" className="max-w-xl bg-green-50 border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-800">Submission Successful</CardTitle>
                <AlertDescription className="text-green-700">
                    Your form has been submitted successfully. Thank you!
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center">
      <Card className="w-full max-w-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl">{template.title_english}</CardTitle>
          <CardDescription>{template.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {submissionStatus === 'error' && (
              <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>There was an error submitting your form. Please try again.</AlertDescription>
              </Alert>
          )}
          <DynamicFormRenderer 
            schema={template.form_schema} 
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}