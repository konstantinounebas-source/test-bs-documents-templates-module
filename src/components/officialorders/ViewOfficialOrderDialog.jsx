import React, { useState, useEffect } from 'react';
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, Edit, Type, Clock, MapPin } from "lucide-react";
import { BusStopOrder } from "@/entities/BusStopOrder";

const InfoLine = ({ icon, label, children }) => (
    <div className="flex items-start gap-4 py-3 border-b">
        <div className="flex items-center gap-2 text-slate-600 w-1/3">
            {React.createElement(icon, { className: "w-4 h-4" })}
            <span className="font-medium">{label}</span>
        </div>
        <div className="text-slate-900 w-2/3">{children || '-'}</div>
    </div>
);

export default function ViewOfficialOrderDialog({ open, onClose, item, onEdit }) {
    const [relatedBusStops, setRelatedBusStops] = useState([]);
    const [isLoadingBusStops, setIsLoadingBusStops] = useState(false);

    useEffect(() => {
        if (open && item) {
            loadRelatedBusStops();
        }
    }, [open, item]);

    const loadRelatedBusStops = async () => {
        if (!item?.id) return;
        
        setIsLoadingBusStops(true);
        try {
            const allBusStops = await BusStopOrder.list();
            const related = allBusStops.filter(busStop => 
                busStop.official_order_document_id === item.id
            );
            setRelatedBusStops(related);
        } catch (error) {
            console.error("Error loading related bus stops:", error);
            setRelatedBusStops([]);
        }
        setIsLoadingBusStops(false);
    };

    if (!item) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                        {item.title}
                    </DialogTitle>
                    <div className="text-sm text-slate-500 font-mono pt-1">{item.main_order_reference}</div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Order Details */}
                    <div className="py-4 space-y-2">
                        <InfoLine icon={Calendar} label="Order Date">
                            {item.order_date ? format(new Date(item.order_date), 'dd MMMM, yyyy') : '-'}
                        </InfoLine>

                        <InfoLine icon={Type} label="Order Type">
                            {item.order_type}
                        </InfoLine>

                        <InfoLine icon={Clock} label="Implementation Schedule">
                            {item.implementation_schedule ? format(new Date(item.implementation_schedule), 'dd MMMM, yyyy') : '-'}
                        </InfoLine>

                        <InfoLine icon={FileText} label="Description">
                            <p className="whitespace-pre-wrap">{item.description}</p>
                        </InfoLine>
                        
                        <InfoLine icon={FileText} label="Client">
                            {item.client_name}
                        </InfoLine>

                        <InfoLine icon={FileText} label="Comments">
                            <p className="whitespace-pre-wrap">{item.comments}</p>
                        </InfoLine>

                        <InfoLine icon={FileText} label="PDF Document">
                            {item.pdf_url ? (
                                <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    View Attached PDF
                                </a>
                            ) : 'No PDF attached'}
                        </InfoLine>

                        <InfoLine icon={FileText} label="Status">
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                                {item.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </InfoLine>
                    </div>

                    {/* Related Bus Stops */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                Related Bus Stops ({relatedBusStops.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingBusStops ? (
                                <p className="text-slate-600">Loading bus stops...</p>
                            ) : relatedBusStops.length === 0 ? (
                                <p className="text-slate-600">No bus stops are currently linked to this official order.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Stop Code</TableHead>
                                            <TableHead>Stop Name</TableHead>
                                            <TableHead>Municipality</TableHead>
                                            <TableHead>District</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Urgent</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {relatedBusStops.map((busStop) => (
                                            <TableRow key={busStop.id}>
                                                <TableCell className="font-mono font-medium">{busStop.stop_code}</TableCell>
                                                <TableCell className="font-medium">{busStop.stop_name}</TableCell>
                                                <TableCell>{busStop.municipality_community || '-'}</TableCell>
                                                <TableCell>{busStop.district || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={busStop.is_active ? "default" : "secondary"}>
                                                        {busStop.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {busStop.is_urgent ? (
                                                        <Badge className="bg-red-100 text-red-800">Urgent</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-slate-600">Normal</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={() => onEdit(item)} className="bg-blue-600 hover:bg-blue-700">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}