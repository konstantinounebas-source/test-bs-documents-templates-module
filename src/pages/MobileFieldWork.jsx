
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Plus, Camera, CheckCircle, AlertTriangle, Navigation, Map, Route, Edit, Calendar, X, MapIcon } from "lucide-react";
import { usePageAccess } from "@/components/lib/usePageAccess";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import MobileCreateSnagDialog from "@/components/delivery/MobileCreateSnagDialog";
import MobileCompleteSnagDialog from "@/components/delivery/MobileCompleteSnagDialog";
import MobileEditBusStopDialog from "@/components/delivery/MobileEditBusStopDialog";
import { format } from 'date-fns';
import { Input } from "@/components/ui/input";

export default function MobileFieldWorkPage() {
  const { hasAccess, isLoading: accessLoading } = usePageAccess('MobileFieldWork');
  
  const [busStops, setBusStops] = useState([]);
  const [selectedBusStop, setSelectedBusStop] = useState(null);
  const [selectedStopIds, setSelectedStopIds] = useState([]);
  const [snags, setSnags] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showEditStopDialog, setShowEditStopDialog] = useState(false);
  const [selectedSnag, setSelectedSnag] = useState(null);
  
  const [busStopSearchTerm, setBusStopSearchTerm] = useState('');

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [hasAccess]);

  useEffect(() => {
    if (selectedBusStop && !selectedRoute) { // Only load snags for single stop if no route is selected
      loadSnags();
    }
  }, [selectedBusStop, selectedRoute]); // Added selectedRoute to dependencies

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stops, routes] = await Promise.all([
        base44.entities.BusStop.list(),
        base44.entities.SavedRoute.filter({ status: 'active' })
      ]);
      setBusStops(stops.filter(s => s.is_active));
      setSavedRoutes(routes);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const loadSnags = async () => {
    if (!selectedBusStop) return;
    
    try {
      const snagsData = await base44.entities.SnaggingList.filter({
        bus_stop_id: selectedBusStop.id
      });
      setSnags(snagsData.filter(s => !s.closed));
    } catch (error) {
      console.error("Error loading snags:", error);
    }
  };

  const handleSelectRoute = async (route) => {
    setSelectedRoute(route);
    setSelectedBusStop(null); // Clear selected bus stop when a route is selected
    setBusStopSearchTerm(''); // Clear search term
    // Φόρτωμα όλων των εκκρεμοτήτων της διαδρομής
    try {
      const routeSnags = await base44.entities.SnaggingList.filter({
        assigned_to_route_id: route.id
      });
      setSnags(routeSnags.filter(s => !s.closed));
    } catch (error) {
      console.error("Error loading route snags:", error);
      setSnags([]);
    }
  };

  const openRouteInGoogleMaps = () => {
    if (!selectedRoute) {
      alert('Δεν υπάρχει επιλεγμένη διαδρομή');
      return;
    }

    // `snags` state already contains the filtered snags for the selected route.
    const routeSnags = snags;

    if (routeSnags.length === 0) {
      alert('Δεν υπάρχουν εκκρεμότητες στη διαδρομή');
      return;
    }

    // Get unique bus stops from the snags in this route
    const uniqueBusStopIds = [...new Set(routeSnags.map(s => s.bus_stop_id))];
    const routeBusStops = uniqueBusStopIds
      .map(id => busStops.find(s => s.id === id))
      .filter(stop => stop && stop.latitude && stop.longitude);

    if (routeBusStops.length === 0) {
      alert('Οι στάσεις της διαδρομής δεν έχουν συντεταγμένες');
      return;
    }

    // Create waypoints string for Google Maps
    const waypoints = routeBusStops.map(stop => 
      `${stop.latitude},${stop.longitude}`
    ).join('/');

    // Fallback coordinates for warehouse if not defined in selectedRoute
    const warehouseLat = selectedRoute.warehouse_lat || 35.1264; // Default Cyprus coordinates
    const warehouseLon = selectedRoute.warehouse_lon || 33.4299; // Default Cyprus coordinates

    const googleMapsUrl = `https://www.google.com/maps/dir/${warehouseLat},${warehouseLon}/${waypoints}/${warehouseLat},${warehouseLon}`;
    window.open(googleMapsUrl, '_blank');
  };

  const findNearestBusStop = () => {
    setIsLocating(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Η συσκευή σας δεν υποστηρίζει γεωτοποθεσία');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        const stopsWithLocation = busStops.filter(s => s.latitude && s.longitude);
        
        if (stopsWithLocation.length === 0) {
          setLocationError('Δεν βρέθηκαν στάσεις με συντεταγμένες');
          setIsLocating(false);
          return;
        }

        let nearest = null;
        let minDistance = Infinity;

        stopsWithLocation.forEach(stop => {
          const distance = calculateDistance(
            userLat,
            userLon,
            stop.latitude,
            stop.longitude
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            nearest = stop;
          }
        });

        if (nearest) {
          setSelectedBusStop(nearest);
          setSelectedRoute(null); // Clear selected route when nearest bus stop is found
          setBusStopSearchTerm(nearest.bus_stop_id || ''); // Update search term with nearest stop
        }
        
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError('Αδυναμία προσδιορισμού θέσης. Παρακαλώ ενεργοποιήστε το GPS.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const openNavigationToStop = () => {
    if (!selectedBusStop || !selectedBusStop.latitude || !selectedBusStop.longitude) {
      alert('Η στάση δεν έχει συντεταγμένες');
      return;
    }

    const lat = selectedBusStop.latitude;
    const lng = selectedBusStop.longitude;
    const label = encodeURIComponent(selectedBusStop.bus_stop_id);

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`;
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const appleMapsUrl = `maps://maps.apple.com/?daddr=${lat},${lng}&q=${label}`;
      window.location.href = appleMapsUrl;
      
      setTimeout(() => {
        window.open(googleMapsUrl, '_blank');
      }, 500);
    } else {
      window.open(googleMapsUrl, '_blank');
    }
  };

  const openMultipleStopsNavigation = () => {
    const selectedStops = busStops.filter(s => selectedStopIds.includes(s.id));
    const stopsWithCoords = selectedStops.filter(s => s.latitude && s.longitude);

    if (stopsWithCoords.length === 0) {
      alert('Οι επιλεγμένες στάσεις δεν έχουν συντεταγμένες');
      return;
    }

    const destinations = stopsWithCoords.map(stop => 
      `${stop.latitude},${stop.longitude}`
    ).join('/');

    const googleMapsUrl = `https://www.google.com/maps/dir//${destinations}`;
    
    window.open(googleMapsUrl, '_blank');
  };

  const toggleStopSelection = (stopId) => {
    setSelectedStopIds(prev => {
      if (prev.includes(stopId)) {
        return prev.filter(id => id !== stopId);
      } else {
        return [...prev, stopId];
      }
    });
  };

  const handleSnagCreated = () => {
    loadSnags();
    setShowCreateDialog(false);
  };

  const handleSnagCompleted = async () => {
    if (selectedRoute) {
      await handleSelectRoute(selectedRoute); // Reload snags for the selected route
    } else {
      await loadSnags(); // Reload snags for the selected bus stop
    }
    setShowCompleteDialog(false);
    setSelectedSnag(null);
  };

  const handleCompleteSnag = (snag) => {
    setSelectedSnag(snag);
    setShowCompleteDialog(true);
  };

  const handleBusStopUpdated = async () => {
    await loadData(); // Reload all data including bus stops
    // Refresh the selected bus stop
    if (selectedBusStop) {
      const updatedStop = await base44.entities.BusStop.filter({ id: selectedBusStop.id });
      if (updatedStop.length > 0) {
        setSelectedBusStop(updatedStop[0]);
        setBusStopSearchTerm(updatedStop[0].bus_stop_id || ''); // Update search term after edit
      }
    }
    setShowEditStopDialog(false);
  };

  const filteredBusStops = busStops.filter(stop => {
    if (!busStopSearchTerm) return true;
    const searchLower = busStopSearchTerm.toLowerCase();
    return (
      stop.bus_stop_id?.toLowerCase().includes(searchLower) ||
      stop.city?.toLowerCase().includes(searchLower)
    );
  });

  const handleBusStopSearch = (value) => {
    setBusStopSearchTerm(value);
    
    // Auto-select if exact match found
    const exactMatch = busStops.find(s => 
      s.bus_stop_id?.toLowerCase() === value.toLowerCase()
    );
    
    if (exactMatch) {
      setSelectedBusStop(exactMatch);
      setSelectedRoute(null);
    } else {
      setSelectedBusStop(null); // Clear selected bus stop if no exact match or search is ongoing
    }
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const openSnags = snags.filter(s => !s.closed);
  const readySnags = snags.filter(s => s.ready_for_submission);

  // Ομαδοποίηση εκκρεμοτήτων ανά στάση για route mode
  const snagsByStop = {};
  if (selectedRoute) {
    openSnags.forEach(snag => {
      if (!snagsByStop[snag.bus_stop_id]) {
        snagsByStop[snag.bus_stop_id] = [];
      }
      snagsByStop[snag.bus_stop_id].push(snag);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Εργασία Πεδίου</h1>
        <p className="text-blue-100 text-sm mt-1">Διαχείριση εκκρεμοτήτων στάσεων</p>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Route className="w-5 h-5" />
              Επιλογή Διαδρομής ή Στάσης
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Προγραμματισμένες Διαδρομές</Label>
              <Select
                value={selectedRoute?.id || ''}
                onValueChange={(value) => {
                  const route = savedRoutes.find(r => r.id === value);
                  handleSelectRoute(route);
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Επιλέξτε διαδρομή..." />
                </SelectTrigger>
                <SelectContent>
                  {savedRoutes.length === 0 ? (
                    <SelectItem value="no-routes" disabled>Δεν υπάρχουν διαθέσιμες διαδρομές</SelectItem>
                  ) : (
                    savedRoutes.map(route => (
                      <SelectItem key={route.id} value={route.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{route.route_name}</span>
                          <span className="text-sm text-slate-500">
                            {route.total_snags} εκκρεμότητες • {route.scheduled_date ? format(new Date(route.scheduled_date), 'dd/MM/yyyy') : 'Χωρίς ημερομηνία'}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-slate-300"></div>
              <span className="text-sm text-slate-500">Ή</span>
              <div className="flex-1 border-t border-slate-300"></div>
            </div>

            <div className="space-y-2">
              <Label>Επιλογή Μεμονωμένης Στάσης</Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Αναζήτηση αριθμού στάσης ή πόλης..."
                  value={busStopSearchTerm}
                  onChange={(e) => handleBusStopSearch(e.target.value)}
                  className="h-12"
                />
                {busStopSearchTerm && filteredBusStops.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredBusStops.slice(0, 10).map(stop => (
                      <div
                        key={stop.id}
                        className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSelectedBusStop(stop);
                          setSelectedRoute(null);
                          setBusStopSearchTerm(stop.bus_stop_id);
                        }}
                      >
                        <p className="font-medium">{stop.bus_stop_id}</p>
                        <p className="text-sm text-slate-500">{stop.city}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={findNearestBusStop} 
                disabled={isLocating}
                className="h-12"
                variant="outline"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Εντοπισμός...
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 mr-2" />
                    Κοντινή Στάση
                  </>
                )}
              </Button>

              {selectedBusStop && selectedBusStop.latitude && selectedBusStop.longitude && (
                <Button
                  onClick={openNavigationToStop}
                  className="h-12 bg-green-600 hover:bg-green-700"
                >
                  <MapIcon className="w-5 h-5 mr-2" />
                  Οδηγίες
                </Button>
              )}
            </div>

            {locationError && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{locationError}</AlertDescription>
              </Alert>
            )}

            {selectedBusStop && !selectedRoute && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">{selectedBusStop.bus_stop_id}</p>
                    <p className="text-sm text-blue-700">{selectedBusStop.city}</p>
                    <p className="text-sm text-blue-600">{selectedBusStop.shelter_type}</p>
                    {selectedBusStop.latitude && selectedBusStop.longitude && (
                      <p className="text-xs text-blue-500 mt-1">
                        📍 {selectedBusStop.latitude.toFixed(6)}, {selectedBusStop.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEditStopDialog(true)}
                    className="flex-shrink-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {selectedRoute && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Route className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900">{selectedRoute.route_name}</p>
                      <p className="text-sm text-green-700">
                        {selectedRoute.team_assigned || 'Χωρίς συνεργείο'} • {selectedRoute.total_snags} εκκρεμότητες
                      </p>
                      {selectedRoute.scheduled_date && (
                        <p className="text-sm text-green-600">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {format(new Date(selectedRoute.scheduled_date), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRoute(null);
                        setSnags([]);
                      }}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={openRouteInGoogleMaps}
                  className="w-full h-12 bg-green-600 hover:bg-green-700"
                >
                  <MapIcon className="w-5 h-5 mr-2" />
                  Οδηγίες Google Maps για Διαδρομή
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {(selectedBusStop || selectedRoute) && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{openSnags.length}</p>
                    <p className="text-xs text-slate-600">Ανοιχτές</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{readySnags.length}</p>
                    <p className="text-xs text-slate-600">Έτοιμες</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <Camera className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">
                      {snags.filter(s => s.photo_taken).length}
                    </p>
                    <p className="text-xs text-slate-600">Με Φωτό</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {selectedRoute ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Εκκρεμότητες Διαδρομής ({openSnags.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.keys(snagsByStop).length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>Όλες οι εκκρεμότητες ολοκληρώθηκαν!</p>
                    </div>
                  ) : (
                    Object.keys(snagsByStop).map(busStopId => {
                      const stop = busStops.find(s => s.id === busStopId);
                      const stopSnags = snagsByStop[busStopId];
                      
                      return (
                        <div key={busStopId} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold text-slate-900">{stop?.bus_stop_id || 'N/A'}</p>
                              <p className="text-sm text-slate-600">{stop?.city}</p>
                            </div>
                            <Badge className="bg-orange-100 text-orange-800">
                              {stopSnags.length} εκκρεμότητες
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {stopSnags.map(snag => (
                              <div
                                key={snag.id}
                                onClick={() => handleCompleteSnag(snag)}
                                className="border rounded-lg p-3 active:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-slate-900">{snag.snag_type}</p>
                                    <p className="text-sm text-slate-600">{snag.element_category}</p>
                                  </div>
                                  <Badge className={
                                    snag.snag_category === 'internal' ? 
                                      'bg-blue-100 text-blue-800' : 
                                      'bg-purple-100 text-purple-800'
                                  }>
                                    {snag.snag_category === 'internal' ? 'Εσωτ.' : 'Εξωτ.'}
                                  </Badge>
                                </div>
                                
                                {snag.work_description && (
                                  <p className="text-sm text-slate-600 mb-3">{snag.work_description}</p>
                                )}

                                <div className="flex gap-2 flex-wrap">
                                  {snag.photo_taken && (
                                    <Badge className="bg-green-100 text-green-800">
                                      <Camera className="w-3 h-3 mr-1" />
                                      Φωτό
                                    </Badge>
                                  )}
                                  {snag.technician_completed && (
                                    <Badge className="bg-blue-100 text-blue-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Ολοκλ.
                                    </Badge>
                                  )}
                                  {snag.ready_for_submission && (
                                    <Badge className="bg-green-100 text-green-800">
                                      Έτοιμη
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ανοιχτές Εκκρεμότητες ({openSnags.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {openSnags.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>Δεν υπάρχουν ανοιχτές εκκρεμότητες</p>
                    </div>
                  ) : (
                    openSnags.map(snag => (
                      <div
                        key={snag.id}
                        onClick={() => handleCompleteSnag(snag)}
                        className="border rounded-lg p-4 active:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{snag.snag_type}</p>
                            <p className="text-sm text-slate-600">{snag.element_category}</p>
                          </div>
                          <Badge className={
                            snag.snag_category === 'internal' ? 
                              'bg-blue-100 text-blue-800' : 
                              'bg-purple-100 text-purple-800'
                          }>
                            {snag.snag_category === 'internal' ? 'Εσωτ.' : 'Εξωτ.'}
                          </Badge>
                        </div>
                        
                        {snag.work_description && (
                          <p className="text-sm text-slate-600 mb-3">{snag.work_description}</p>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {snag.photo_taken && (
                            <Badge className="bg-green-100 text-green-800">
                              <Camera className="w-3 h-3 mr-1" />
                              Φωτό
                            </Badge>
                          )}
                          {snag.technician_completed && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ολοκλ.
                            </Badge>
                          )}
                          {snag.ready_for_submission && (
                            <Badge className="bg-green-100 text-green-800">
                              Έτοιμη
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {selectedBusStop && !selectedRoute && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-6 h-6 mr-2" />
                Νέα Εκκρεμότητα
              </Button>
            )}
          </>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Route className="w-5 h-5" />
                Διαδρομή Πολλαπλών Στάσεων
              </CardTitle>
              {selectedStopIds.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedStopIds([])}
                >
                  Καθαρισμός
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {busStops
                .filter(s => s.latitude && s.longitude)
                .map(stop => (
                  <div
                    key={stop.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedStopIds.includes(stop.id)}
                      onCheckedChange={() => toggleStopSelection(stop.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{stop.bus_stop_id}</p>
                      <p className="text-xs text-slate-600">{stop.city} • {stop.shelter_type}</p>
                    </div>
                    {selectedStopIds.includes(stop.id) && (
                      <Badge className="bg-blue-100 text-blue-800">
                        {selectedStopIds.indexOf(stop.id) + 1}
                      </Badge>
                    )}
                  </div>
                ))}
            </div>

            {selectedStopIds.length > 0 && (
              <Button
                onClick={openMultipleStopsNavigation}
                className="w-full h-12 bg-green-600 hover:bg-green-700"
              >
                <Route className="w-5 h-5 mr-2" />
                Οδηγίες για {selectedStopIds.length} Στάσεις
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <MobileCreateSnagDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        busStop={selectedBusStop}
        onSaved={handleSnagCreated}
      />

      <MobileCompleteSnagDialog
        open={showCompleteDialog}
        onClose={() => {
          setShowCompleteDialog(false);
          setSelectedSnag(null);
        }}
        snag={selectedSnag}
        busStop={selectedBusStop || (selectedSnag ? busStops.find(s => s.id === selectedSnag.bus_stop_id) : null)}
        onSaved={handleSnagCompleted}
      />

      <MobileEditBusStopDialog
        open={showEditStopDialog}
        onClose={() => setShowEditStopDialog(false)}
        busStop={selectedBusStop}
        onSaved={handleBusStopUpdated}
      />
    </div>
  );
}
