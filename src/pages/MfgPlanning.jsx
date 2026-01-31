import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar } from "lucide-react";

export default function MfgPlanningPage() {
  const { data: targetProfiles = [] } = useQuery({
    queryKey: ['Target_Profile_Master'],
    queryFn: () => base44.entities.Target_Profile_Master.list()
  });

  const { data: scheduledData = [] } = useQuery({
    queryKey: ['Scheduled_Data'],
    queryFn: () => base44.entities.Scheduled_Data.list('-date')
  });

  const { data: targetDaily = [] } = useQuery({
    queryKey: ['Target_Daily'],
    queryFn: () => base44.entities.Target_Daily.list('-date')
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Planning & Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profiles">
              <TabsList>
                <TabsTrigger value="profiles">Target Profiles</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled Data</TabsTrigger>
                <TabsTrigger value="daily">Daily Targets</TabsTrigger>
              </TabsList>

              <TabsContent value="profiles" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Target Profile Master</h3>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Profile
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Active Date</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targetProfiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">No target profiles found</TableCell>
                      </TableRow>
                    ) : (
                      targetProfiles.map(profile => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.profile_name}</TableCell>
                          <TableCell>{profile.department}</TableCell>
                          <TableCell>
                            {profile.active_date ? new Date(profile.active_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>{profile.description || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="scheduled" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Scheduled Production Data</h3>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Schedule
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Time (min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No scheduled data found</TableCell>
                      </TableRow>
                    ) : (
                      scheduledData.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell>{item.item_code}</TableCell>
                          <TableCell>{item.profile_name}</TableCell>
                          <TableCell>{item.scheduled_qty}</TableCell>
                          <TableCell>{item.scheduled_time_min || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="daily" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Daily Targets</h3>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Target
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Target Qty</TableHead>
                      <TableHead>Time (min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targetDaily.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No daily targets found</TableCell>
                      </TableRow>
                    ) : (
                      targetDaily.map(target => (
                        <TableRow key={target.id}>
                          <TableCell>{new Date(target.date).toLocaleDateString()}</TableCell>
                          <TableCell>{target.department}</TableCell>
                          <TableCell>{target.item_code}</TableCell>
                          <TableCell>{target.target_qty}</TableCell>
                          <TableCell>{target.target_time_min || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}