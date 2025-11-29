import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Edit, Image, FileText, MapPin, AlertTriangle, ExternalLink } from "lucide-react";
import { OfficialOrderDocument } from '@/entities/OfficialOrderDocument';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function ViewOrderDialog({ open, onClose, item, onEdit }) {
  const [officialOrder, setOfficialOrder] = useState(null);

  useEffect(() => {
    const fetchOfficialOrder = async () => {
      if (item?.official_order_document_id) {
        try {
          // This might be inefficient if we have many orders. A `getById` would be better.
          // Assuming `list` is what we have, we filter client-side.
          const orders = await OfficialOrderDocument.list();
          const foundOrder = orders.find(o => o.id === item.official_order_document_id);
          setOfficialOrder(foundOrder);
        } catch (error) {
          console.error("Failed to fetch official order details:", error);
          setOfficialOrder(null);
        }
      } else {
        setOfficialOrder(null);
      }
    };

    if (open && item) {
      fetchOfficialOrder();
    }
  }, [open, item]);

  if (!item) return null;

  const DetailItem = ({ label, children }) => (
    <>
      <div className="font-semibold text-slate-600">{label}</div>
      <div className="text-slate-800 col-span-2">{children || '-'}</div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{item.stop_name}</DialogTitle>
          <DialogDescription>
            Κωδικός Στάσης: <span className="font-mono">{item.stop_code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4 py-4 space-y-6">
          
          {/* Main Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-slate-800 border-b pb-2">Βασικές Πληροφορίες</h3>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <DetailItem label="Δήμος/Κοινότητα">{item.municipality_community}</DetailItem>
                <DetailItem label="Επαρχία">{item.district}</DetailItem>
                <DetailItem label="Κατάσταση">
                  <Badge variant={item.is_active ? "default" : "secondary"}>{item.is_active ? 'Ενεργή' : 'Ανενεργή'}</Badge>
                </DetailItem>
                <DetailItem label="Επείγον">
                  {item.is_urgent ? <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Ναι</Badge> : 'Όχι'}
                </DetailItem>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-slate-800 border-b pb-2">Γεωγραφική Θέση</h3>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <DetailItem label="Latitude">{item.latitude}</DetailItem>
                <DetailItem label="Longitude">{item.longitude}</DetailItem>
                {item.latitude && item.longitude && (
                  <div className="col-span-3">
                    <a href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <MapPin className="w-4 h-4 mr-2" /> Προβολή σε Χάρτη
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Order Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-800 border-b pb-2">Στοιχεία Παραγγελίας</h3>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <DetailItem label="Αναφορά Παραγγελίας">{item.main_order_reference}</DetailItem>
              <DetailItem label="Ημερομηνία Παραγγελίας">{item.order_date ? format(new Date(item.order_date), 'dd/MM/yyyy') : '-'}</DetailItem>
              <DetailItem label="Τύπος Παραγγελίας">{item.order_type}</DetailItem>
              <DetailItem label="Χρονοδιάγραμμα">{item.implementation_schedule ? format(new Date(item.implementation_schedule), 'dd/MM/yyyy') : '-'}</DetailItem>
              <DetailItem label="Επίσημη Παραγγελία">
                {officialOrder ? (
                  <div className="flex items-center gap-2">
                    <span>{officialOrder.title}</span>
                    {officialOrder.pdf_url && (
                      <a href={officialOrder.pdf_url} target="_blank" rel="noopener noreferrer" title="Λήψη PDF">
                        <FileText className="w-4 h-4 text-blue-600 hover:text-blue-800" />
                      </a>
                    )}
                    <Link to={createPageUrl(`OfficialOrders?view=${officialOrder.id}`)} title="Προβολή Παραγγελίας">
                       <ExternalLink className="w-4 h-4 text-slate-500 hover:text-slate-800" />
                    </Link>
                  </div>
                ) : (item.official_order_document_id ? 'Αναζήτηση...' : '-')}
              </DetailItem>
            </div>
          </div>

          {/* Station Technical Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-800 border-b pb-2">Τεχνικές Λεπτομέρειες Στάσης</h3>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <DetailItem label="Υφιστάμενο Στοιχείο">{item.existing_element}</DetailItem>
              <DetailItem label="Πεζοδρόμιο">{item.pavement}</DetailItem>
              <DetailItem label="Διάβαση">{item.crossing}</DetailItem>
              <DetailItem label="Τύπος Στεγάστρου">{item.shelter_type}</DetailItem>
              <DetailItem label="Προτεινόμενος Τύπος">{item.proposed_shelter_type}</DetailItem>
              <DetailItem label="Αναβάθμιση Στεγάστρου">{item.shelter_upgrade}</DetailItem>
            </div>
          </div>
          
          {/* Photos */}
          {item.photos && item.photos.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-slate-800 border-b pb-2">Φωτογραφίες ({item.photos.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {item.photos.map((photo, index) => (
                  <a key={index} href={photo.url} target="_blank" rel="noopener noreferrer" className="block relative group">
                    <img src={photo.url} alt={photo.filename || `Photo ${index + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                      <Image className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {item.comments && (
            <div>
              <h3 className="font-semibold text-lg text-slate-800 border-b pb-2 mb-2">Σχόλια</h3>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md whitespace-pre-wrap">{item.comments}</p>
            </div>
          )}

        </div>

        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Κλείσιμο</Button>
          <Button onClick={() => onEdit(item)}><Edit className="w-4 h-4 mr-2" />Επεξεργασία</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}