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
  ChevronDown,
  ChevronRight,
  Download,
  Edit,
  Trash2,
  Eye,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

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

export default function Annexes() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDocs, setExpandedDocs] = useState({});
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showReviseDialog, setShowReviseDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    document_name: '',
    category: '',
    file: null,
  });
  const [reviseForm, setReviseForm] = useState({
    file: null,
    revision_notes: '',
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const annexes = await base44.entities.Annex.list();
      
      // Group by document_id and get only current revisions for main table
      const docMap = {};
      annexes.forEach(annex => {
        if (!docMap[annex.document_id]) {
          docMap[annex.document_id] = [];
        }
        docMap[annex.document_id].push(annex);
      });

      // Sort revisions by revision_number (descending) and get current
      Object.keys(docMap).forEach(docId => {
        docMap[docId].sort((a, b) => b.revision_number - a.revision_number);
      });

      setDocuments(docMap);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadForm.document_name || !uploadForm.category || !uploadForm.file) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const fileUrl = await uploadFile(uploadForm.file);
      const documentId = `doc_${Date.now()}`;

      await base44.entities.Annex.create({
        document_name: uploadForm.document_name,
        category: uploadForm.category,
        file_url: fileUrl,
        revision_number: 0,
        status: 'Current',
        document_id: documentId,
        revision_date: new Date().toISOString(),
      });

      setShowUploadDialog(false);
      setUploadForm({ document_name: '', category: '', file: null });
      await loadDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload document');
    }
  };

  const handleRevise = async () => {
    if (!reviseForm.file) {
      alert('Please select a file');
      return;
    }

    try {
      const fileUrl = await uploadFile(reviseForm.file);
      const currentRevision = documents[selectedDoc][0];

      // Mark old revision as Superseded
      await base44.entities.Annex.update(currentRevision.id, {
        status: 'Superseded',
      });

      // Create new revision
      await base44.entities.Annex.create({
        document_name: currentRevision.document_name,
        category: currentRevision.category,
        file_url: fileUrl,
        revision_number: currentRevision.revision_number + 1,
        status: 'Current',
        document_id: currentRevision.document_id,
        revision_date: new Date().toISOString(),
        revision_notes: reviseForm.revision_notes,
      });

      setShowReviseDialog(false);
      setSelectedDoc(null);
      setReviseForm({ file: null, revision_notes: '' });
      await loadDocuments();
    } catch (error) {
      console.error('Revise failed:', error);
      alert('Failed to revise document');
    }
  };

  const handleDelete = async (annexId) => {
    if (window.confirm('Delete this revision?')) {
      try {
        await base44.entities.Annex.delete(annexId);
        await loadDocuments();
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const uploadFile = async (file) => {
    // In a real app, use base44.integrations.Core.UploadFile
    // For now, return a placeholder
    return URL.createObjectURL(file);
  };

  const toggleExpand = (docId) => {
    setExpandedDocs(prev => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const getCurrentRevision = (docId) => documents[docId]?.[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Annexes Register</h1>
        <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {/* Main Documents Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Category</th>
              <th className="border border-slate-300 px-4 py-2 text-left font-semibold">File Name</th>
              <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Current Revision</th>
              <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Status</th>
              <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Date</th>
              <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(documents).map(([docId, revisions]) => {
              const current = revisions[0];
              const isExpanded = expandedDocs[docId];

              return (
                <React.Fragment key={docId}>
                  {/* Main row */}
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="border border-slate-300 px-4 py-2">{current.category}</td>
                    <td className="border border-slate-300 px-4 py-2 font-medium">{current.document_name}</td>
                    <td className="border border-slate-300 px-4 py-2">Rev.{current.revision_number}</td>
                    <td className="border border-slate-300 px-4 py-2">
                      <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">
                        {current.status}
                      </span>
                    </td>
                    <td className="border border-slate-300 px-4 py-2 text-xs text-slate-500">
                      {new Date(current.revision_date).toLocaleDateString()}
                    </td>
                    <td className="border border-slate-300 px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => window.open(current.file_url, '_blank')}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownload(current.file_url, current.document_name)}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedDoc(docId);
                            setShowReviseDialog(true);
                          }}
                          title="Revise"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(current.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {revisions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleExpand(docId)}
                            title="History"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expandable history rows */}
                  {isExpanded && revisions.length > 1 && revisions.slice(1).map((revision, idx) => (
                    <tr key={`${docId}_rev_${idx}`} className="bg-slate-50 border-b border-slate-200">
                      <td colSpan={2} className="border border-slate-300 px-4 py-2 text-slate-600 italic">
                        &nbsp; History
                      </td>
                      <td className="border border-slate-300 px-4 py-2">Rev.{revision.revision_number}</td>
                      <td className="border border-slate-300 px-4 py-2">
                        <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                          {revision.status}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-4 py-2 text-xs text-slate-500">
                        {new Date(revision.revision_date).toLocaleDateString()}
                      </td>
                      <td className="border border-slate-300 px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => window.open(revision.file_url, '_blank')}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDownload(revision.file_url, `${current.document_name}_Rev${revision.revision_number}`)}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(revision.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload New Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Document Name</label>
              <Input
                value={uploadForm.document_name}
                onChange={e => setUploadForm({ ...uploadForm, document_name: e.target.value })}
                placeholder="e.g., Contract.pdf"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select
                value={uploadForm.category}
                onValueChange={value => setUploadForm({ ...uploadForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File</label>
              <input
                type="file"
                onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] })}
                className="block w-full text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={handleUploadSubmit}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revise Dialog */}
      <Dialog open={showReviseDialog} onOpenChange={setShowReviseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revise Document</DialogTitle>
            <DialogDescription>
              Create a new revision for {selectedDoc && documents[selectedDoc]?.[0]?.document_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">New File</label>
              <input
                type="file"
                onChange={e => setReviseForm({ ...reviseForm, file: e.target.files?.[0] })}
                className="block w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Revision Notes (optional)</label>
              <Input
                value={reviseForm.revision_notes}
                onChange={e => setReviseForm({ ...reviseForm, revision_notes: e.target.value })}
                placeholder="What changed in this revision?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviseDialog(false)}>Cancel</Button>
            <Button onClick={handleRevise}>Create Revision</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}