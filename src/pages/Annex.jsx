import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Download, Eye, Edit2, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = [
  'Contract',
  'Drawings',
  'MoM',
  'Technical Submittals',
  'Approvals',
  'Photos',
  'Correspondence',
  'Financial Documents',
  'Other',
];

export default function Annex() {
  const [documents, setDocuments] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showReviseDialog, setShowReviseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [historyDocs, setHistoryDocs] = useState([]);
  const [formData, setFormData] = useState({
    file_name: '',
    category: 'Other',
    revision_notes: '',
    file: null,
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const allDocs = await base44.entities.AnnexDocument.list();
      setDocuments(allDocs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group documents by document_group_id and show only current revision
  const getGroupedDocuments = () => {
    const grouped = {};
    documents.forEach((doc) => {
      const groupId = doc.document_group_id || doc.id;
      if (!grouped[groupId]) {
        grouped[groupId] = [];
      }
      grouped[groupId].push(doc);
    });

    // Get current revision for each group
    return Object.entries(grouped).map(([groupId, docs]) => {
      const current = docs.find((d) => d.is_current_revision) || docs[0];
      return { groupId, current, allRevisions: docs.sort((a, b) => b.current_revision - a.current_revision) };
    });
  };

  const handleUploadClick = () => {
    setFormData({ file_name: '', category: 'Other', revision_notes: '', file: null });
    setSelectedDoc(null);
    setShowUploadDialog(true);
  };

  const handleReviseClick = (doc) => {
    setSelectedDoc(doc);
    setFormData({
      file_name: doc.file_name,
      category: doc.category,
      revision_notes: '',
      file: null,
    });
    setShowReviseDialog(true);
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, file: e.target.files[0] }));
  };

  const handleUploadSubmit = async () => {
    if (!formData.file_name || !formData.file) {
      alert('Please enter a file name and select a file');
      return;
    }

    setUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file: formData.file });
      const fileUrl = uploadRes.file_url;

      if (selectedDoc) {
        // Create new revision
        const groupId = selectedDoc.document_group_id || selectedDoc.id;
        const newRevisionNum = (selectedDoc.current_revision || 0) + 1;

        // Mark old revision as superseded
        await base44.entities.AnnexDocument.update(selectedDoc.id, { is_current_revision: false, status: 'Superseded' });

        // Create new revision
        await base44.entities.AnnexDocument.create({
          file_name: formData.file_name,
          category: formData.category,
          current_revision: newRevisionNum,
          file_url: fileUrl,
          revision_date: new Date().toISOString(),
          revision_notes: formData.revision_notes,
          document_group_id: groupId,
          is_current_revision: true,
          status: 'Current',
        });
      } else {
        // Create new document
        const newDoc = await base44.entities.AnnexDocument.create({
          file_name: formData.file_name,
          category: formData.category,
          current_revision: 1,
          file_url: fileUrl,
          revision_date: new Date().toISOString(),
          revision_notes: formData.revision_notes,
          document_group_id: null,
          is_current_revision: true,
          status: 'Current',
        });

        // Update to set document_group_id to own id
        await base44.entities.AnnexDocument.update(newDoc.id, { document_group_id: newDoc.id });
      }

      setShowUploadDialog(false);
      setShowReviseDialog(false);
      await loadDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (doc) => {
    setSelectedDoc(doc);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await base44.entities.AnnexDocument.delete(selectedDoc.id);
      setShowDeleteDialog(false);
      await loadDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed. Please try again.');
    }
  };

  const handleViewHistory = (groupData) => {
    setSelectedDoc(groupData.current);
    setHistoryDocs(groupData.allRevisions);
    setShowHistoryDialog(true);
  };

  const toggleExpandGroup = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const grouped = getGroupedDocuments();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Annex Documents</h1>
        <Button onClick={handleUploadClick} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-4 py-2 text-left text-xs font-semibold text-slate-700">Category</th>
              <th className="border border-slate-300 px-4 py-2 text-left text-xs font-semibold text-slate-700">File Name</th>
              <th className="border border-slate-300 px-4 py-2 text-center text-xs font-semibold text-slate-700">Current Revision</th>
              <th className="border border-slate-300 px-4 py-2 text-left text-xs font-semibold text-slate-700">Status</th>
              <th className="border border-slate-300 px-4 py-2 text-left text-xs font-semibold text-slate-700">Date</th>
              <th className="border border-slate-300 px-4 py-2 text-center text-xs font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-slate-300 px-4 py-4 text-center text-slate-500">
                  No documents uploaded yet.
                </td>
              </tr>
            ) : (
              grouped.map(({ groupId, current, allRevisions }) => (
                <React.Fragment key={groupId}>
                  <tr className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-4 py-3 text-sm text-slate-700">{current.category}</td>
                    <td className="border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800">{current.file_name}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700">v{current.current_revision}</td>
                    <td className="border border-slate-300 px-4 py-3 text-sm">
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                        {current.status}
                      </span>
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-sm text-slate-600">
                      {formatDistanceToNow(new Date(current.revision_date), { addSuffix: true })}
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(current.file_url, '_blank')}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = current.file_url;
                            a.download = current.file_name;
                            a.click();
                          }}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReviseClick(current)}
                          title="Revise"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteClick(current)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {allRevisions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewHistory({ current, allRevisions })}
                            title="History"
                          >
                            {expandedGroups[groupId] ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedGroups[groupId] && allRevisions.length > 1 && (
                    <tr className="bg-slate-50">
                      <td colSpan={6} className="border border-slate-300 px-4 py-4">
                        <div className="ml-4">
                          <h4 className="text-xs font-semibold text-slate-700 mb-3">Revision History</h4>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left py-2 px-2 text-slate-600">Revision</th>
                                <th className="text-left py-2 px-2 text-slate-600">Status</th>
                                <th className="text-left py-2 px-2 text-slate-600">Date</th>
                                <th className="text-center py-2 px-2 text-slate-600">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allRevisions.map((rev) => (
                                <tr key={rev.id} className="border-b border-slate-200 hover:bg-white">
                                  <td className="py-2 px-2 text-slate-700">v{rev.current_revision}</td>
                                  <td className="py-2 px-2">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                      rev.status === 'Current' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {rev.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-slate-600">
                                    {formatDistanceToNow(new Date(rev.revision_date), { addSuffix: true })}
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => window.open(rev.file_url, '_blank')}
                                        title="View"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => {
                                          const a = document.createElement('a');
                                          a.href = rev.file_url;
                                          a.download = `${rev.file_name} (v${rev.current_revision})`;
                                          a.click();
                                        }}
                                        title="Download"
                                      >
                                        <Download className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-600 hover:text-red-700"
                                        onClick={() => handleDeleteClick(rev)}
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">File Name</label>
              <Input
                value={formData.file_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, file_name: e.target.value }))}
                placeholder="e.g., Contract_Final"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">File</label>
              <Input
                type="file"
                onChange={handleFileChange}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Revision Notes</label>
              <Input
                value={formData.revision_notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, revision_notes: e.target.value }))}
                placeholder="What changed?"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadSubmit} disabled={uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revise Dialog */}
      <Dialog open={showReviseDialog} onOpenChange={setShowReviseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Revision</DialogTitle>
            <DialogDescription>Upload a new version of this document</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">File Name</label>
              <Input
                value={formData.file_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, file_name: e.target.value }))}
                disabled
                className="mt-1 bg-slate-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">New File</label>
              <Input
                type="file"
                onChange={handleFileChange}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Revision Notes</label>
              <Input
                value={formData.revision_notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, revision_notes: e.target.value }))}
                placeholder="What changed in this revision?"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadSubmit} disabled={uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Document</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this revision? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}