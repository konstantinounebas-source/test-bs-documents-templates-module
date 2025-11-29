import React, { useState, useEffect } from 'react';
import { AuditLog } from "@/entities/AuditLog";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const actionColors = {
    CREATE: "bg-green-100 text-green-800",
    UPDATE: "bg-blue-100 text-blue-800",
    DELETE: "bg-red-100 text-red-800",
    VIEW: "bg-purple-100 text-purple-800",
    DOWNLOAD: "bg-yellow-100 text-yellow-800",
    EXPORT: "bg-orange-100 text-orange-800"
};

export default function AuditLogViewer() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'created_date', direction: 'desc' });

    useEffect(() => {
        loadLogs();
    }, [sortConfig]);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const sortOrder = sortConfig.direction === 'desc' ? `-${sortConfig.key}` : sortConfig.key;
            const data = await AuditLog.list(sortOrder, 100); // Get latest 100 logs
            setLogs(data);
        } catch (error) {
            console.error("Error loading audit logs:", error);
        }
        setIsLoading(false);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ children, headerKey }) => (
        <TableHead>
            <Button variant="ghost" onClick={() => handleSort(headerKey)} className="px-2">
                {children}
                {sortConfig.key === headerKey ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-2" /> : <ArrowDown className="w-4 h-4 ml-2" />
                ) : null}
            </Button>
        </TableHead>
    );

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold">Audit Logs</h3>
                <p className="text-sm text-slate-600">Track user actions across the system</p>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <SortableHeader headerKey="created_date">Date</SortableHeader>
                                <SortableHeader headerKey="user_email">User</SortableHeader>
                                <SortableHeader headerKey="action_type">Action</SortableHeader>
                                <SortableHeader headerKey="target_entity">Entity</SortableHeader>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={5} className="text-center p-4">Loading...</TableCell></TableRow>
                                ))
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>{format(new Date(log.created_date), "MMM d, yyyy HH:mm:ss")}</TableCell>
                                        <TableCell>{log.user_email}</TableCell>
                                        <TableCell>
                                            <Badge className={actionColors[log.action_type]}>{log.action_type}</Badge>
                                        </TableCell>
                                        <TableCell>{log.target_entity}</TableCell>
                                        <TableCell>
                                            <code className="text-xs">{JSON.stringify(log.details)}</code>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}