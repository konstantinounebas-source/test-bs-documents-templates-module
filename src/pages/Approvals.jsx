import React, { useState, useEffect } from 'react';
import { FormTemplate } from '@/entities/FormTemplate';
import { User } from '@/entities/User';
import { AppUser } from '@/entities/AppUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Clock, Loader2, ShieldQuestion, ShieldCheck, ShieldAlert, Eye, Edit, History, FileText, BookOpen, User as UserIcon } from 'lucide-react';
import { logAction } from '@/components/lib/logger';
import { format } from "date-fns";

import ViewDetailsDialog from "../components/templates/ViewDetailsDialog";
import ViewHistoryDialog from "../components/templates/ViewHistoryDialog";
import EditTemplateDialog from "../components/templates/EditTemplateDialog";

export default function ApprovalsPage() {
  const [allTemplates, setAllTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [templateToReject, setTemplateToReject] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [usersCache, setUsersCache] = useState({});

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      await Promise.all([
        loadAllTemplates(),
        loadUsersCache()
      ]);
    } catch (error) {
      console.error("Failed to initialize:", error);
    }
    setIsLoading(false);
  };

  const loadAllTemplates = async () => {
    try {
      const templates = await FormTemplate.list('-created_date');
      setAllTemplates(templates);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const loadUsersCache = async () => {
    try {
      const [systemUsers, appUsers] = await Promise.all([
        User.list().catch(() => []), // Fallback to empty array if no access
        AppUser.list().catch(() => [])
      ]);
      
      const cache = {};
      systemUsers.forEach(user => { 
        cache[user.id] = user.full_name; 
        // Also cache by email for consistency with Templates page
        cache[user.email] = user.full_name;
      });
      appUsers.forEach(user => { 
        cache[user.id] = user.full_name; 
      });
      
      setUsersCache(cache);
    } catch (error) {
      console.warn("Could not load users cache - using IDs/emails instead:", error);
      setUsersCache({});
    }
  };

  const getApproverName = (approverId) => {
    if (!approverId) return 'Not Set';
    return usersCache[approverId] || approverId; // Fallback to ID if name not found
  };

  const canUserApprove = (template) => {
    return currentUser && template.approver_id === currentUser.id;
  };

  const handleApprove = async (template, event) => {
    event?.stopPropagation();
    setIsProcessing(true);
    try {
      let updateData = {
        approval_status: 'Approved',
        approved_by_id: currentUser.id,
        approval_date: new Date().toISOString()
      };

      // Debug logging
      console.log('Approval - Template status:', template.status);
      console.log('Approval - Status check result:', template.status && template.status.toLowerCase().includes('approval'));

      // If the template status contains "approval", automatically change it to "Active"
      if (template.status && template.status.toLowerCase().includes('approval')) {
        updateData.status = 'Active';
        console.log('Approval - Auto-changing status to Active');
      }

      console.log('Approval - Update data:', updateData);

      await FormTemplate.update(template.id, updateData);
      
      logAction({
        action_type: 'UPDATE',
        target_entity: 'FormTemplate',
        target_id: template.id,
        details: { 
          approval_action: 'Approved',
          original_status: template.status,
          auto_status_change: updateData.status || null
        }
      });
      loadAllTemplates();
    } catch (error) {
      console.error("Failed to approve template:", error);
    }
    setIsProcessing(false);
  };

  const openRejectDialog = (template, event) => {
    event?.stopPropagation();
    setTemplateToReject(template);
    setRejectionNotes('');
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!templateToReject) return;
    setIsProcessing(true);
    try {
      await FormTemplate.update(templateToReject.id, {
        approval_status: 'Rejected',
        approved_by_id: currentUser.id,
        approval_date: new Date().toISOString(),
        approval_notes: rejectionNotes
      });
      logAction({
        action_type: 'UPDATE',
        target_entity: 'FormTemplate',
        target_id: templateToReject.id,
        details: { approval_action: 'Rejected', notes: rejectionNotes }
      });
      setShowRejectDialog(false);
      loadAllTemplates();
    } catch (error) {
      console.error("Failed to reject template:", error);
    }
    setIsProcessing(false);
  };

  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    setShowDetailsDialog(true);
  };

  const handleViewHistory = (template, event) => {
    event?.stopPropagation();
    setSelectedTemplate(template);
    setShowHistoryDialog(true);
  };

  const handleEdit = (template, event) => {
    event?.stopPropagation();
    setSelectedTemplate(template);
    setShowEditDialog(true);
  };
  
  const handleEditFromDetails = (template) => {
    setSelectedTemplate(template);
    setShowDetailsDialog(false);
    setShowEditDialog(true);
  };

  const handleTemplateUpdated = () => {
    setShowEditDialog(false);
    setSelectedTemplate(null);
    loadAllTemplates();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  const getDaysSince = (date) => {
    if (!date) return null;
    const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
    return days;
  };

  const pendingTemplates = allTemplates.filter(t => t.approval_status === 'Pending');
  const processedTemplates = allTemplates.filter(t => t.approval_status === 'Approved' || t.approval_status === 'Rejected');

  const TemplateCard = ({ template }) => (
    <Card 
      key={template.id} 
      className="border-slate-200 hover:shadow-lg transition-all cursor-pointer flex flex-col"
      onClick={() => handleTemplateClick(template)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {template.template_type === "file_template" ? <FileText className="w-5 h-5 text-blue-500" /> : <BookOpen className="w-5 h-5 text-purple-500" />}
            <CardTitle className="text-base">{template.title_english}</CardTitle>
          </div>
          {getStatusBadge(template.approval_status)}
        </div>
        <CardDescription className="font-mono text-sm">{template.template_code}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3 text-sm flex-grow">
        <div className="grid grid-cols-2 gap-4">
          <div><span className="font-semibold">Version:</span> {template.current_version || '1.0.0'}</div>
          <div><span className="font-semibold">Created:</span> {format(new Date(template.created_date), "MMM d, yyyy")}</div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">Approver:</span>
            <span className={template.approver_id ? 'text-slate-900' : 'text-slate-400'}>
              {getApproverName(template.approver_id)}
            </span>
          </div>
          {template.approval_status === 'Pending' && template.created_date && (
            <div className="text-amber-600">
              <Clock className="w-4 h-4 inline mr-1" />
              Pending for {getDaysSince(template.created_date)} days
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-wrap gap-2 pt-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={(e) => handleViewHistory(template, e)}
        >
          <History className="w-4 h-4 mr-1" />
          History
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={(e) => handleEdit(template, e)}
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
        
        {template.approval_status === 'Pending' && canUserApprove(template) && (
          <div className="flex gap-2 ml-auto">
            <Button 
              size="sm" 
              onClick={(e) => handleApprove(template, e)} 
              disabled={isProcessing} 
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={(e) => openRejectDialog(template, e)} 
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Template Approvals</h1>
          <p className="text-slate-600 mt-1">Monitor and manage the approval process for all document templates</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2"><ShieldQuestion className="w-4 h-4" />Pending ({pendingTemplates.length})</TabsTrigger>
            <TabsTrigger value="processed" className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Processed ({processedTemplates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {pendingTemplates.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
                <ShieldQuestion className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-slate-900 mb-2">No Pending Approvals</h3>
                <p className="text-slate-600">All templates have been processed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pendingTemplates.map(template => <TemplateCard key={template.id} template={template} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed" className="mt-6">
            {processedTemplates.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
                <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-slate-900 mb-2">No Processed Templates</h3>
                <p className="text-slate-600">No templates have been approved or rejected yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-[40%]">Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed On</TableHead>
                      <TableHead>Processed By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedTemplates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="font-medium text-slate-900">{template.title_english}</div>
                          <div className="text-sm text-slate-500 font-mono">{template.template_code}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(template.approval_status)}</TableCell>
                        <TableCell>{template.approval_date ? format(new Date(template.approval_date), "MMM d, yyyy") : 'N/A'}</TableCell>
                        <TableCell>{usersCache[template.approved_by_id] || template.approved_by_id || 'N/A'}</TableCell>
                        <TableCell>
                           <div className="flex gap-2">
                               <Button variant="ghost" size="icon" onClick={() => handleTemplateClick(template)} title="View Details"><Eye className="w-4 h-4" /></Button>
                               <Button variant="ghost" size="icon" onClick={(e) => handleViewHistory(template, e)} title="View History"><History className="w-4 h-4" /></Button>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Template</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting the template "{templateToReject?.title_english}". This will be visible to all users.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-notes">Rejection Notes *</Label>
            <Textarea id="rejection-notes" value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} placeholder="e.g., Missing required information, incorrect formatting, needs revision..." rows={4} className="mt-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectionNotes.trim()}>{isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ViewDetailsDialog open={showDetailsDialog} onClose={() => setShowDetailsDialog(false)} template={selectedTemplate} onEdit={handleEditFromDetails} />
      <ViewHistoryDialog open={showHistoryDialog} onClose={() => setShowHistoryDialog(false)} template={selectedTemplate} />
      <EditTemplateDialog open={showEditDialog} onClose={() => setShowEditDialog(false)} template={selectedTemplate} onTemplateUpdated={handleTemplateUpdated} />
    </div>
  );
}