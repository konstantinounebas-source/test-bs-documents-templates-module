
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Eye, Download } from "lucide-react"; // Added Download import
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { UserTask } from "@/entities/UserTask";
import { User } from "@/entities/User";

export default function ImportTasksDialog({ open, onClose, onTasksImported }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a CSV file.');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResults(null);
      setPreviewData(null);
      setShowPreview(false);
    }
  };

  const downloadTemplate = () => {
    // Define the CSV template with proper headers and example data
    const templateHeaders = [
      'title',
      'description',
      'priority',
      'due_date',
      'category',
      'estimated_time_minutes',
      'status',
      'completion_percentage',
      'is_recurring',
      'recurrence_pattern',
      'recurrence_interval',
      'planned_for_date'
    ];

    const exampleData = [
      {
        title: 'Example Task 1',
        description: 'This is an example task description',
        priority: 'High',
        due_date: '2024-12-31',
        category: 'Work',
        estimated_time_minutes: '120',
        status: 'Pending',
        completion_percentage: '0',
        is_recurring: 'false',
        recurrence_pattern: 'None',
        recurrence_interval: '',
        planned_for_date: '2024-12-15'
      },
      {
        title: 'Example Recurring Task',
        description: 'This is an example of a recurring task',
        priority: 'Medium',
        due_date: '2024-12-20',
        category: 'Personal',
        estimated_time_minutes: '60',
        status: 'Pending',
        completion_percentage: '0',
        is_recurring: 'true',
        recurrence_pattern: 'Weekly',
        recurrence_interval: '1',
        planned_for_date: ''
      }
    ];

    const csvContent = [
      templateHeaders.join(','),
      ...exampleData.map(row =>
        templateHeaders.map(header => {
          let cell = row[header] || '';
          // Escape values that contain commas or quotes
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'task_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress(25);

    try {
      // Upload file
      const uploadResult = await UploadFile({ file });
      setProgress(50);

      // Extract data with expected schema
      const extractResult = await ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string" },
                  due_date: { type: "string" },
                  category: { type: "string" },
                  estimated_time_minutes: { type: "number" },
                  status: { type: "string" },
                  completion_percentage: { type: "number" },
                  is_recurring: { type: "boolean" },
                  recurrence_pattern: { type: "string" },
                  recurrence_interval: { type: "number" },
                  planned_for_date: { type: "string" }
                },
                required: ["title"]
              }
            }
          }
        }
      });

      setProgress(100);

      if (extractResult.status === 'success' && extractResult.output) {
        let tasks = extractResult.output.tasks || [];
        if (Array.isArray(extractResult.output)) {
          tasks = extractResult.output;
        }

        setPreviewData(tasks);
        setShowPreview(true);
      } else {
        setError('Failed to extract task data from file. Please check the file format.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError('Failed to preview file. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleImport = async () => {
    if (!previewData || previewData.length === 0) {
      setError('No data to import.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress(0);

    try {
      const currentUser = await User.me();
      const successfulImports = [];
      const failedImports = [];

      for (let i = 0; i < previewData.length; i++) {
        try {
          const taskData = previewData[i];

          // Prepare task data for creation
          const newTaskData = {
            title: taskData.title || `Imported Task ${i + 1}`,
            description: taskData.description || '',
            assigned_to_user_email: currentUser.email,
            priority: ['High', 'Medium', 'Low'].includes(taskData.priority) ? taskData.priority : 'Medium',
            status: ['Pending', 'In Progress', 'Completed', 'On Hold', 'Canceled'].includes(taskData.status) ? taskData.status : 'Pending',
            category: taskData.category || 'Imported',
            estimated_time_minutes: taskData.estimated_time_minutes && !isNaN(taskData.estimated_time_minutes) ? Number(taskData.estimated_time_minutes) : null,
            completion_percentage: taskData.completion_percentage && !isNaN(Number(taskData.completion_percentage)) ? Math.max(0, Math.min(100, Number(taskData.completion_percentage))) : 0,
            is_recurring: typeof taskData.is_recurring === 'string' ? taskData.is_recurring.toLowerCase() === 'true' : false,
            recurrence_pattern: ['None', 'Daily', 'Weekly', 'Monthly'].includes(taskData.recurrence_pattern) ? taskData.recurrence_pattern : 'None',
            current_occurrence: 1, // Default for new tasks
            total_time_spent_minutes: 0 // Default for new tasks
          };

          // Handle recurrence interval based on recurrence_pattern and is_recurring
          if (newTaskData.is_recurring && newTaskData.recurrence_pattern !== 'None') {
            newTaskData.recurrence_interval = taskData.recurrence_interval && !isNaN(Number(taskData.recurrence_interval)) ? Number(taskData.recurrence_interval) : 1; // Default to 1 if recurring
          } else {
            newTaskData.recurrence_interval = null; // No interval if not recurring or pattern is None
          }

          // Handle due date
          if (taskData.due_date) {
            const dueDate = new Date(taskData.due_date);
            if (!isNaN(dueDate.getTime())) {
              newTaskData.due_date = dueDate.toISOString().split('T')[0];
            }
          }

          // Handle planned_for_date
          if (taskData.planned_for_date) {
            const plannedForDate = new Date(taskData.planned_for_date);
            if (!isNaN(plannedForDate.getTime())) {
              newTaskData.planned_for_date = plannedForDate.toISOString().split('T')[0];
            }
          }


          const newTask = await UserTask.create(newTaskData);
          successfulImports.push(newTask);

        } catch (taskError) {
          console.error(`Failed to import task ${i + 1}:`, taskError);
          failedImports.push({
            task: previewData[i],
            error: taskError.message || 'Unknown error'
          });
        }

        setProgress(Math.round(((i + 1) / previewData.length) * 100));
      }

      setResults({
        successful: successfulImports.length,
        failed: failedImports.length,
        failures: failedImports
      });

      if (successfulImports.length > 0) {
        onTasksImported();
      }

    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import tasks. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    setResults(null);
    setPreviewData(null);
    setShowPreview(false);
    setProgress(0);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Tasks from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h4>
            <p className="text-sm text-blue-800 mb-3">
              Your CSV file should include the following columns. Download the template below to get started with the correct format.
            </p>

            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="mb-3"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>

            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Required:</strong> title</p>
              <p><strong>Optional:</strong> description, priority (High/Medium/Low), due_date (YYYY-MM-DD), category, estimated_time_minutes, status (Pending/In Progress/Completed/On Hold/Canceled), completion_percentage (0-100), is_recurring (true/false), recurrence_pattern (None/Daily/Weekly/Monthly), recurrence_interval, planned_for_date (YYYY-MM-DD)</p>
            </div>
          </div>

          {/* File Upload */}
          {!showPreview && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select CSV File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="mt-2"
                />
              </div>

              {file && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="w-4 h-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Preview Data */}
          {showPreview && previewData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold">Preview: {previewData.length} tasks found</h4>
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 border-b">Title</th>
                      <th className="text-left p-2 border-b">Priority</th>
                      <th className="text-left p-2 border-b">Due Date</th>
                      <th className="text-left p-2 border-b">Is Recurring</th>
                      <th className="text-left p-2 border-b">Recurrence Pattern</th>
                      <th className="text-left p-2 border-b">Planned For Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((task, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{task.title || `Task ${index + 1}`}</td>
                        <td className="p-2">{task.priority || 'Medium'}</td>
                        <td className="p-2">{task.due_date || '-'}</td>
                        <td className="p-2">{typeof task.is_recurring === 'boolean' ? (task.is_recurring ? 'Yes' : 'No') : (typeof task.is_recurring === 'string' ? (task.is_recurring.toLowerCase() === 'true' ? 'Yes' : 'No') : 'No')}</td>
                        <td className="p-2">{task.recurrence_pattern || 'None'}</td>
                        <td className="p-2">{task.planned_for_date || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                    ... and {previewData.length - 10} more tasks
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  {showPreview ? 'Importing tasks...' : 'Processing file...'}
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Import completed! {results.successful} tasks imported successfully.
                  {results.failed > 0 && ` ${results.failed} tasks failed to import.`}
                </AlertDescription>
              </Alert>

              {results.failures && results.failures.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-700">Failed Imports:</h4>
                  <div className="max-h-32 overflow-y-auto">
                    {results.failures.map((failure, index) => (
                      <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                        <strong>{failure.task.title || `Task ${index + 1}`}:</strong> {failure.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              {results ? 'Close' : 'Cancel'}
            </Button>

            {!showPreview && !results && (
              <Button
                onClick={handlePreview}
                disabled={!file || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>
            )}

            {showPreview && !results && (
              <Button
                onClick={handleImport}
                disabled={isProcessing || !previewData || previewData.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {previewData?.length || 0} Tasks
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
