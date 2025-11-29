
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MapPin, Navigation, Route, Download, Map as MapIcon, Filter, Save, Trash2, Edit, ArrowUp, ArrowDown, X, Search, Calendar } from "lucide-react";
import { usePageAccess } from "@/components/lib/usePageAccess";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RepairRoutesPage() {
  const { hasAccess, isLoading: accessLoading } = usePageAccess('RepairRoutes');
  
  const [busStops, setBusStops] = useState([]);
  const [allSnags, setAllSnags] = useState([]);
  const [filteredSnags, setFilteredSnags] = useState([]);
  const [selectedSnags, setSelectedSnags] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  
  const [warehouseLat, setWarehouseLat] = useState('35.1264');
  const [warehouseLon, setWarehouseLon] = useState('33.4299');
  
  const [filterSnagCategories, setFilterSnagCategories] = useState([]);
  const [filterWorkTypes, setFilterWorkTypes] = useState([]);
  const [filterElementCategories, setFilterElementCategories] = useState([]);
  const [filterCities, setFilterCities] = useState([]);
  const [filterBusStopId, setFilterBusStopId] = useState('');
  const [minSnags, setMinSnags] = useState(''); // This variable is declared but not used in the provided code. Kept for consistency.
  const [maxDistanceFrom, setMaxDistanceFrom] = useState('warehouse');
  const [maxDistance, setMaxDistance] = useState('');
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [routeName, setRouteName] = useState('');
  const [routeNotes, setRouteNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [teamAssigned, setTeamAssigned] = useState('');
  
  const [snagTypeOptions, setSnagTypeOptions] = useState([]);
  const [workTypeOptions, setWorkTypeOptions] = useState([]);
  const [elementCategoryOptions, setElementCategoryOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [hasAccess]);

  useEffect(() => {
    applyFilters();
  }, [busStops, allSnags, filterSnagCategories, filterWorkTypes, filterElementCategories, filterCities, filterBusStopId, minSnags, maxDistance, maxDistanceFrom, warehouseLat, warehouseLon, selectedSnags, editingRoute]); // Added editingRoute to trigger re-filter when editing starts/stops

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stopsData, snagsData, snagTypes, workTypes, elementCategories, cities, routes] = await Promise.all([
        base44.entities.BusStop.list(),
        base44.entities.SnaggingList.list(),
        base44.entities.SnagTypeOption.list(),
        base44.entities.WorkTypeOption.list(),
        base44.entities.ElementCategoryOption.list(),
        base44.entities.CityMunicipalityOption.list(),
        base44.entities.SavedRoute.list('-created_date')
      ]);
      
      const activeStops = stopsData.filter(s => s.is_active && s.latitude && s.longitude);
      const openSnags = snagsData.filter(s => !s.closed); // Assumes 'assigned_to_route_id' is fetched here if present in schema
      
      setBusStops(activeStops);
      setAllSnags(openSnags);
      setSnagTypeOptions(snagTypes.filter(s => s.is_active));
      setWorkTypeOptions(workTypes.filter(w => w.is_active));
      setElementCategoryOptions(elementCategories.filter(e => e.is_active));
      setCityOptions(cities.filter(c => c.is_active));
      setSavedRoutes(routes);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const getCurrentLocation = () => {
    setIsLocating(true);

    if (!navigator.geolocation) {
      alert('Η συσκευή σας δεν υποστηρίζει γεωτοποθεσία');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setWarehouseLat(position.coords.latitude.toString());
        setWarehouseLon(position.coords.longitude.toString());
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Αδυναμία προσδιορισμού θέσης. Παρακαλώ ενεργοποιήστε το GPS.');
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

  const applyFilters = () => {
    if (!warehouseLat || !warehouseLon) {
      setFilteredSnags([]);
      return;
    }

    const whLat = parseFloat(warehouseLat);
    const whLon = parseFloat(warehouseLon);

    if (isNaN(whLat) || isNaN(whLon)) {
      setFilteredSnags([]);
      return;
    }

    const selectedSnagIds = selectedSnags.map(s => s.id);

    let filtered = allSnags
      // Filter out snags that are already part of the current selection, but keep all others for filtering
      .filter(snag => !selectedSnagIds.includes(snag.id))
      .map(snag => {
        const busStop = busStops.find(s => s.id === snag.bus_stop_id);
        if (!busStop) return null; 

        const distanceFromWarehouse = calculateDistance(whLat, whLon, busStop.latitude, busStop.longitude);
        
        let distanceToCheck = distanceFromWarehouse;
        if (maxDistanceFrom !== 'warehouse' && selectedSnags.length > 0) {
          const lastSnag = selectedSnags[selectedSnags.length - 1];
          const lastStop = busStops.find(s => s.id === lastSnag.bus_stop_id);
          if (lastStop) { 
            distanceToCheck = calculateDistance(lastStop.latitude, lastStop.longitude, busStop.latitude, busStop.longitude);
          }
        }

        return {
          ...snag,
          busStop,
          distance_km: distanceFromWarehouse,
          distance_to_check: distanceToCheck
        };
      })
      .filter(snag => snag !== null);

    if (filterSnagCategories.length > 0) {
      filtered = filtered.filter(s => s.snag_category && filterSnagCategories.includes(s.snag_category));
    }
    
    if (filterWorkTypes.length > 0) {
      filtered = filtered.filter(s => s.work_type && filterWorkTypes.includes(s.work_type));
    }

    if (filterElementCategories.length > 0) {
      filtered = filtered.filter(s => s.element_category && filterElementCategories.includes(s.element_category));
    }

    if (filterCities.length > 0) {
      filtered = filtered.filter(s => s.busStop && s.busStop.city && filterCities.includes(s.busStop.city));
    }

    if (filterBusStopId) {
      filtered = filtered.filter(s => 
        s.busStop && s.busStop.bus_stop_id && s.busStop.bus_stop_id.toLowerCase().includes(filterBusStopId.toLowerCase())
      );
    }

    if (maxDistance) {
      const max = parseFloat(maxDistance);
      filtered = filtered.filter(s => s.distance_to_check <= max);
    }

    filtered.sort((a, b) => a.distance_to_check - b.distance_to_check);

    setFilteredSnags(filtered);
  };

  const toggleSnagSelection = (snag) => {
    // If the snag is already assigned to a route and we are not editing that specific route, prevent selection.
    if (snag.assigned_to_route_id && (!editingRoute || editingRoute.id !== snag.assigned_to_route_id)) {
      alert('Η εκκρεμότητα είναι ήδη ανατεθειμένη σε άλλη διαδρομή');
      return;
    }

    setSelectedSnags(prev => {
      const exists = prev.find(s => s.id === snag.id);
      if (exists) {
        return prev.filter(s => s.id !== snag.id);
      } else {
        return [...prev, snag];
      }
    });
  };

  const calculateRouteDistance = () => {
    if (selectedSnags.length === 0) return 0;
    
    const whLat = parseFloat(warehouseLat);
    const whLon = parseFloat(warehouseLon);
    
    let totalDistance = 0;
    
    const firstSnag = selectedSnags[0];
    const firstStop = busStops.find(s => s.id === firstSnag.bus_stop_id);
    if (firstStop) { 
      totalDistance += calculateDistance(whLat, whLon, firstStop.latitude, firstStop.longitude);
    }
    
    for (let i = 0; i < selectedSnags.length - 1; i++) {
      const currentStop = busStops.find(s => s.id === selectedSnags[i].bus_stop_id);
      const nextStop = busStops.find(s => s.id === selectedSnags[i + 1].bus_stop_id);
      if (currentStop && nextStop) { 
        totalDistance += calculateDistance(
          currentStop.latitude, currentStop.longitude,
          nextStop.latitude, nextStop.longitude
        );
      }
    }
    
    if (selectedSnags.length > 0) {
      const lastSnag = selectedSnags[selectedSnags.length - 1];
      const lastStop = busStops.find(s => s.id === lastSnag.bus_stop_id);
      if (lastStop) { 
        totalDistance += calculateDistance(
          lastStop.latitude, lastStop.longitude,
          whLat, whLon
        );
      }
    }
    
    return totalDistance;
  };

  const getDistanceFromPrevious = (index) => {
    const whLat = parseFloat(warehouseLat);
    const whLon = parseFloat(warehouseLon);
    
    const currentStop = busStops.find(s => s.id === selectedSnags[index].bus_stop_id);
    if (!currentStop) return 0; 
    
    if (index === 0) {
      return calculateDistance(whLat, whLon, currentStop.latitude, currentStop.longitude);
    }
    
    const prevStop = busStops.find(s => s.id === selectedSnags[index - 1].bus_stop_id);
    if (!prevStop) return 0; 
    
    return calculateDistance(
      prevStop.latitude, prevStop.longitude,
      currentStop.latitude, currentStop.longitude
    );
  };

  const moveSnagUp = (index) => {
    if (index === 0) return;
    const newSelected = [...selectedSnags];
    [newSelected[index - 1], newSelected[index]] = [newSelected[index], newSelected[index - 1]];
    setSelectedSnags(newSelected);
  };

  const moveSnagDown = (index) => {
    if (index === selectedSnags.length - 1) return;
    const newSelected = [...selectedSnags];
    [newSelected[index], newSelected[index + 1]] = [newSelected[index + 1], newSelected[index]];
    setSelectedSnags(newSelected);
  };

  const openGoogleMapsRoute = () => {
    if (selectedSnags.length === 0) return;
    
    const whLat = parseFloat(warehouseLat);
    const whLon = parseFloat(warehouseLon);
    
    const uniqueStops = [];
    const seenStopIds = new Set();
    
    selectedSnags.forEach(snag => {
      const stop = busStops.find(s => s.id === snag.bus_stop_id);
      if (stop && !seenStopIds.has(stop.id)) { 
        uniqueStops.push(stop);
        seenStopIds.add(stop.id);
      }
    });
    
    const waypoints = uniqueStops.map(stop => 
      `${stop.latitude},${stop.longitude}`
    ).join('/');
    
    const googleMapsUrl = `https://www.google.com/maps/dir/${whLat},${whLon}/${waypoints}/${whLat},${whLon}`;
    window.open(googleMapsUrl, '_blank');
  };

  const exportToCSV = () => {
    if (selectedSnags.length === 0) return;
    
    const headers = ['Σειρά', 'Κωδικός Στάσης', 'Πόλη', 'Τύπος', 'Εκκρεμότητα', 'Στοιχείο', 'Εργασία', 'Απόσταση (km)'];
    const csvContent = [
      headers.join(','),
      ...selectedSnags.map((snag, index) => {
        const stop = busStops.find(s => s.id === snag.bus_stop_id);
        return [
          index + 1,
          '"' + (stop?.bus_stop_id || '') + '"',
          '"' + (stop?.city || '') + '"',
          '"' + (stop?.shelter_type || '') + '"',
          '"' + snag.snag_type + '"',
          '"' + snag.element_category + '"',
          '"' + snag.work_type + '"',
          getDistanceFromPrevious(index).toFixed(2)
        ].join(',');
      })
    ].join('\n');
    
    const totalDistance = calculateRouteDistance();
    const summary = `\n\nΣύνοψη:\nΕκκρεμότητες: ${selectedSnags.length}\nΣυνολική Απόσταση: ${totalDistance.toFixed(2)} km\n`;
    
    const blob = new Blob(['\ufeff' + csvContent + summary], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'repair_route_' + format(new Date(), 'yyyy-MM-dd') + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportSelectedRoutes = () => {
    if (selectedRoutes.length === 0) return;

    const routesToExport = savedRoutes.filter(r => selectedRoutes.includes(r.id));
    
    // Δημιουργία αναλυτικού CSV με όλες τις στάσεις και εκκρεμότητες
    const headers = ['Διαδρομή', 'Ημερομηνία', 'Συνεργείο', 'Σειρά', 'Στάση', 'Πόλη', 'Τύπος Στεγάστρου', 'Εκκρεμότητα', 'Κατηγορία', 'Στοιχείο', 'Εργασία', 'Περιγραφή'];
    
    const rows = [];
    
    routesToExport.forEach(route => {
      const routeSnags = (route.selected_snag_ids || [])
        .map(id => allSnags.find(s => s.id === id))
        .filter(s => s);
      
      if (routeSnags.length === 0) {
        // Αν δεν υπάρχουν snags, βάλε μια γραμμή με τα στοιχεία της διαδρομής
        rows.push([
          '"' + route.route_name + '"',
          '"' + (route.scheduled_date ? format(new Date(route.scheduled_date), 'dd/MM/yyyy') : '-') + '"',
          '"' + (route.team_assigned || '-') + '"',
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          '"Δεν υπάρχουν εκκρεμότητες"'
        ].join(','));
      } else {
        routeSnags.forEach((snag, index) => {
          const stop = busStops.find(s => s.id === snag.bus_stop_id);
          rows.push([
            '"' + route.route_name + '"',
            '"' + (route.scheduled_date ? format(new Date(route.scheduled_date), 'dd/MM/yyyy') : '-') + '"',
            '"' + (route.team_assigned || '-') + '"',
            index + 1,
            '"' + (stop?.bus_stop_id || 'N/A') + '"',
            '"' + (stop?.city || '') + '"',
            '"' + (stop?.shelter_type || '') + '"',
            '"' + (snag.snag_type || '') + '"',
            '"' + (snag.snag_category === 'internal' ? 'Εσωτερικό' : 'Εξωτερικό') + '"',
            '"' + (snag.element_category || '') + '"',
            '"' + (snag.work_type || '') + '"',
            '"' + (snag.work_description || '') + '"'
          ].join(','));
        });
      }
      
      // Προσθήκη κενής γραμμής μεταξύ διαδρομών
      rows.push('');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'detailed_routes_export_' + format(new Date(), 'yyyy-MM-dd') + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveRoute = async () => {
    if (!routeName || selectedSnags.length === 0) {
      alert('Παρακαλώ εισάγετε όνομα και επιλέξτε εκκρεμότητες');
      return;
    }

    try {
      const routeData = {
        route_name: routeName,
        scheduled_date: scheduledDate || undefined,
        team_assigned: teamAssigned || undefined,
        warehouse_lat: parseFloat(warehouseLat),
        warehouse_lon: parseFloat(warehouseLon),
        selected_snag_ids: selectedSnags.map(s => s.id),
        filters: {
          snag_categories: filterSnagCategories,
          work_types: filterWorkTypes,
          element_categories: filterElementCategories,
          cities: filterCities,
          bus_stop_id: filterBusStopId,
          min_snags: minSnags,
          max_distance: maxDistance,
          max_distance_from: maxDistanceFrom
        },
        total_distance_km: calculateRouteDistance(),
        total_snags: selectedSnags.length,
        notes: routeNotes,
        status: 'active'
      };

      let savedRouteId;
      let previousSnagIdsInThisRoute = [];

      if (editingRoute) {
        previousSnagIdsInThisRoute = editingRoute.selected_snag_ids || [];
        await base44.entities.SavedRoute.update(editingRoute.id, routeData);
        savedRouteId = editingRoute.id;
      } else {
        const newRoute = await base44.entities.SavedRoute.create(routeData);
        savedRouteId = newRoute.id;
      }

      const currentSelectedSnagIds = selectedSnags.map(s => s.id);

      // 1. Unassign snags that were previously in this route but are no longer selected
      for (const snagId of previousSnagIdsInThisRoute) {
        if (!currentSelectedSnagIds.includes(snagId)) {
          // Only unassign if it's still assigned to THIS route
          const snagToUpdate = allSnags.find(s => s.id === snagId);
          if (snagToUpdate && snagToUpdate.assigned_to_route_id === savedRouteId) {
            await base44.entities.SnaggingList.update(snagId, {
              assigned_to_route_id: null
            });
          }
        }
      }

      // 2. Assign all currently selected snags to this route
      for (const snag of selectedSnags) {
        // Only update if it's not already correctly assigned
        if (snag.assigned_to_route_id !== savedRouteId) {
          await base44.entities.SnaggingList.update(snag.id, {
            assigned_to_route_id: savedRouteId
          });
        }
      }

      await loadData(); // Reload data to reflect changes in snags' assigned_to_route_id
      setShowSaveDialog(false);
      setEditingRoute(null);
      setRouteName('');
      setRouteNotes('');
      setScheduledDate('');
      setTeamAssigned('');
      setSelectedSnags([]); // Clear selected snags after saving/updating a route
    } catch (error) {
      console.error('Error saving route:', error);
      alert('Σφάλμα κατά την αποθήκευση');
    }
  };

  const handleEditRoute = async (route) => {
    setWarehouseLat(route.warehouse_lat.toString());
    setWarehouseLon(route.warehouse_lon.toString());
    
    if (route.filters) {
      setFilterSnagCategories(route.filters.snag_categories || []);
      setFilterWorkTypes(route.filters.work_types || []);
      setFilterElementCategories(route.filters.element_categories || []);
      setFilterCities(route.filters.cities || []);
      setFilterBusStopId(route.filters.bus_stop_id || '');
      setMinSnags(route.filters.min_snags || '');
      setMaxDistance(route.filters.max_distance || '');
      setMaxDistanceFrom(route.filters.max_distance_from || 'warehouse');
    }
    
    const snags = allSnags.filter(s => route.selected_snag_ids && route.selected_snag_ids.includes(s.id));
    const orderedSnags = (route.selected_snag_ids || []).map(id => 
      snags.find(s => s.id === id)
    ).filter(s => s);
    
    setSelectedSnags(orderedSnags);
    setEditingRoute(route);
    setRouteName(route.route_name);
    setRouteNotes(route.notes || '');
    setScheduledDate(route.scheduled_date || '');
    setTeamAssigned(route.team_assigned || '');
    setShowSaveDialog(true);
  };

  const handleDeleteRoute = async (routeId) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή τη διαδρομή;')) {
      return;
    }

    try {
      // Find the route to get its associated snags
      const routeToDelete = savedRoutes.find(r => r.id === routeId);

      if (routeToDelete && routeToDelete.selected_snag_ids && routeToDelete.selected_snag_ids.length > 0) {
        // Unassign all snags from this route
        const unassignPromises = routeToDelete.selected_snag_ids.map(async (snagId) => {
          try {
            // Always try to unassign, regardless of current state
            await base44.entities.SnaggingList.update(snagId, {
              assigned_to_route_id: null
            });
          } catch (snagError) {
            console.error(`Failed to unassign snag ${snagId}:`, snagError);
            // Continue with other snags even if one fails
          }
        });

        // Wait for all unassignments to complete
        await Promise.all(unassignPromises);
      }

      // Delete the route
      await base44.entities.SavedRoute.delete(routeId);
      
      // Reload all data to reflect changes
      await loadData();
      
      alert(`Η διαδρομή διαγράφηκε επιτυχώς. ${routeToDelete?.selected_snag_ids?.length || 0} εκκρεμότητες επαναφέρθηκαν για επιλογή.`);
    } catch (error) {
      console.error('Error deleting route:', error);
      alert('Σφάλμα κατά τη διαγραφή της διαδρομής');
    }
  };

  const handleNewRoute = () => {
    setEditingRoute(null);
    setRouteName('');
    setRouteNotes('');
    setScheduledDate('');
    setTeamAssigned('');
    setSelectedSnags([]);
    // Clear all filters as well
    setFilterCities([]);
    setFilterSnagCategories([]);
    setFilterElementCategories([]);
    setFilterWorkTypes([]);
    setFilterBusStopId('');
    setMinSnags('');
    setMaxDistance('');
    setMaxDistanceFrom('warehouse');
  };

  const handleOpenSaveDialog = () => {
    if (selectedSnags.length === 0) {
      alert('Παρακαλώ επιλέξτε πρώτα εκκρεμότητες για τη διαδρομή');
      return;
    }
    setShowSaveDialog(true);
  };

  const toggleFilterSelection = (value, currentArray, setFunction) => {
    if (currentArray.includes(value)) {
      setFunction(currentArray.filter(v => v !== value));
    } else {
      setFunction([...currentArray, value]);
    }
  };

  const toggleRouteSelection = (routeId) => {
    setSelectedRoutes(prev => {
      if (prev.includes(routeId)) {
        return prev.filter(id => id !== routeId);
      } else {
        return [...prev, routeId];
      }
    });
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

  const totalRouteDistance = calculateRouteDistance();
  const whLat = parseFloat(warehouseLat);
  const whLon = parseFloat(warehouseLon);
  const lastSnag = selectedSnags[selectedSnags.length - 1];
  const lastStop = lastSnag ? busStops.find(s => s.id === lastSnag.bus_stop_id) : null;
  const returnDistance = lastStop ? calculateDistance(
    lastStop.latitude, lastStop.longitude, whLat, whLon
  ) : 0;

  const uniqueStops = new Set(selectedSnags.map(s => s.bus_stop_id));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Προγραμματισμός Συνεργείων</h1>
            <p className="text-slate-600 mt-1">Δημιουργία βέλτιστων διαδρομών επισκευών</p>
          </div>
          <Button
            onClick={handleNewRoute}
            variant="outline"
          >
            <Route className="w-4 h-4 mr-2" />
            Καθαρισμός & Νέα Διαδρομή
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Σημείο Εκκίνησης
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Γεωγραφικό Πλάτος</Label>
                  <Input
                    type="number"
                    step="any"
                    value={warehouseLat}
                    onChange={(e) => setWarehouseLat(e.target.value)}
                    placeholder="35.1264"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Γεωγραφικό Μήκος</Label>
                  <Input
                    type="number"
                    step="any"
                    value={warehouseLon}
                    onChange={(e) => setWarehouseLon(e.target.value)}
                    placeholder="33.4299"
                  />
                </div>
                <Button
                  onClick={getCurrentLocation}
                  disabled={isLocating}
                  variant="outline"
                  className="w-full"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Εντοπισμός...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 mr-2" />
                      Τρέχουσα Θέση
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Φίλτρα Αναζήτησης
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Αριθμός Στάσης</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      value={filterBusStopId}
                      onChange={(e) => setFilterBusStopId(e.target.value)}
                      placeholder="Αναζήτηση αριθμού..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Πόλεις ({filterCities.length})</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {cityOptions.map(city => (
                      <div key={city.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={filterCities.includes(city.name)}
                          onCheckedChange={() => toggleFilterSelection(city.name, filterCities, setFilterCities)}
                        />
                        <Label className="cursor-pointer text-sm">{city.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Κατηγορία Εκκρεμότητας ({filterSnagCategories.length})</Label>
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={filterSnagCategories.includes('internal')}
                        onCheckedChange={() => toggleFilterSelection('internal', filterSnagCategories, setFilterSnagCategories)}
                      />
                      <Label className="cursor-pointer text-sm">Εσωτερικές</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={filterSnagCategories.includes('external')}
                        onCheckedChange={() => toggleFilterSelection('external', filterSnagCategories, setFilterSnagCategories)}
                      />
                      <Label className="cursor-pointer text-sm">Εξωτερικές</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Κατηγορία Στοιχείου ({filterElementCategories.length})</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {elementCategoryOptions.map(type => (
                      <div key={type.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={filterElementCategories.includes(type.name)}
                          onCheckedChange={() => toggleFilterSelection(type.name, filterElementCategories, setFilterElementCategories)}
                        />
                        <Label className="cursor-pointer text-sm">{type.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Είδος Εργασίας ({filterWorkTypes.length})</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {workTypeOptions.map(type => (
                      <div key={type.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={filterWorkTypes.includes(type.name)}
                          onCheckedChange={() => toggleFilterSelection(type.name, filterWorkTypes, setFilterWorkTypes)}
                        />
                        <Label className="cursor-pointer text-sm">{type.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Μέγιστη Απόσταση</Label>
                  <Select value={maxDistanceFrom} onValueChange={setMaxDistanceFrom}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse">Από Αποθήκη</SelectItem>
                      <SelectItem value="last_stop">Από Τελευταία Στάση</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(e.target.value)}
                    placeholder="π.χ. 50 km"
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFilterCities([]);
                    setFilterSnagCategories([]);
                    setFilterElementCategories([]);
                    setFilterWorkTypes([]);
                    setFilterBusStopId('');
                    setMinSnags('');
                    setMaxDistance('');
                    setMaxDistanceFrom('warehouse');
                  }}
                >
                  Καθαρισμός Φίλτρων
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Διαθέσιμες Εκκρεμότητες ({filteredSnags.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : filteredSnags.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>Δεν βρέθηκαν εκκρεμότητες</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredSnags.map(snag => {
                      const isSelected = selectedSnags.find(s => s.id === snag.id);
                      // Check if snag is assigned to *another* route (not the one currently being edited)
                      const isAssignedToOtherRoute = snag.assigned_to_route_id && (!editingRoute || editingRoute.id !== snag.assigned_to_route_id);
                      
                      return (
                        <div
                          key={snag.id}
                          className={`border rounded-lg p-3 transition-all ${
                            isSelected ? 'bg-blue-50 border-blue-300' : 
                            isAssignedToOtherRoute ? 'bg-slate-100 border-slate-300 opacity-60' :
                            'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={!!isSelected}
                              onCheckedChange={() => toggleSnagSelection(snag)}
                              disabled={isAssignedToOtherRoute}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-sm">{snag.busStop?.bus_stop_id || 'N/A'}</p>
                                  <p className="text-xs text-slate-600">{snag.busStop?.city || ''}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {snag.distance_to_check.toFixed(1)} km
                                  </Badge>
                                  {isAssignedToOtherRoute && (
                                    <Badge className="bg-amber-100 text-amber-800 text-xs">
                                      Σε Διαδρομή
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 space-y-1">
                                <p className="text-sm font-medium text-orange-600">{snag.snag_type}</p>
                                <div className="flex gap-2 flex-wrap">
                                  <Badge className={
                                    snag.snag_category === 'internal' ? 
                                      'bg-blue-100 text-blue-800' : 
                                      'bg-purple-100 text-purple-800'
                                  } style={{ fontSize: '10px' }}>
                                    {snag.snag_category === 'internal' ? 'Εσωτ.' : 'Εξωτ.'}
                                  </Badge>
                                  <Badge variant="outline" style={{ fontSize: '10px' }}>
                                    {snag.element_category}
                                  </Badge>
                                  <Badge variant="outline" style={{ fontSize: '10px' }}>
                                    {snag.work_type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Route className="w-5 h-5" />
                    Διαδρομή ({selectedSnags.length})
                  </CardTitle>
                  {selectedSnags.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSnags([])}
                    >
                      Καθαρισμός
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedSnags.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Route className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>Επιλέξτε εκκρεμότητες</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-blue-100 text-sm">Εκκρεμότητες</span>
                          <p className="text-2xl font-bold">{selectedSnags.length}</p>
                        </div>
                        <div>
                          <span className="text-blue-100 text-sm">Στάσεις</span>
                          <p className="text-2xl font-bold">{uniqueStops.size}</p>
                        </div>
                        <div>
                          <span className="text-blue-100 text-sm">Συνολική Απόσταση</span>
                          <p className="text-xl font-bold">{totalRouteDistance.toFixed(1)} km</p>
                        </div>
                        <div>
                          <span className="text-blue-100 text-sm">Επιστροφή</span>
                          <p className="text-xl font-bold">{returnDistance.toFixed(1)} km</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      <div className="border-2 border-green-500 rounded-lg p-2 bg-green-50">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                            🏠
                          </div>
                          <p className="font-medium text-sm">Αποθήκη (Έναρξη)</p>
                        </div>
                      </div>

                      {selectedSnags.map((snag, index) => {
                        const stop = busStops.find(s => s.id === snag.bus_stop_id);
                        return (
                          <div key={snag.id} className="border rounded-lg p-2 bg-slate-50">
                            <div className="flex items-start gap-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => moveSnagUp(index)}
                                  disabled={index === 0}
                                  className="h-5 w-5 p-0"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => moveSnagDown(index)}
                                  disabled={index === selectedSnags.length - 1}
                                  className="h-5 w-5 p-0"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{stop?.bus_stop_id || 'N/A'}</p>
                                <p className="text-xs text-slate-600">{stop?.city || ''}</p>
                                <p className="text-xs font-medium text-orange-600 mt-1">{snag.snag_type || ''}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  <Badge variant="outline" style={{ fontSize: '9px' }}>
                                    +{getDistanceFromPrevious(index).toFixed(1)} km
                                  </Badge>
                                  <Badge style={{ fontSize: '9px' }} className={
                                    snag.snag_category === 'internal' ? 
                                      'bg-blue-100 text-blue-800' : 
                                      'bg-purple-100 text-purple-800'
                                  }>
                                    {snag.snag_category === 'internal' ? 'Εσωτ' : 'Εξωτ'}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleSnagSelection(snag)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="border-2 border-green-500 rounded-lg p-2 bg-green-50">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                            🏁
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">Επιστροφή</p>
                            <Badge variant="outline" style={{ fontSize: '9px' }} className="mt-1">
                              +{returnDistance.toFixed(1)} km
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={openGoogleMapsRoute}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <MapIcon className="w-4 h-4 mr-1" />
                        Χάρτης
                      </Button>
                      <Button
                        onClick={exportToCSV}
                        variant="outline"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export
                      </Button>
                      <Button
                        onClick={handleOpenSaveDialog}
                        className="col-span-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Αποθήκευση Διαδρομής
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Αποθηκευμένες Διαδρομές ({savedRoutes.length})</CardTitle>
              {selectedRoutes.length > 0 && (
                <Button onClick={exportSelectedRoutes} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export ({selectedRoutes.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {savedRoutes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Route className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Δεν υπάρχουν αποθηκευμένες διαδρομές</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedRoutes.map(route => (
                  <div key={route.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedRoutes.includes(route.id)}
                        onCheckedChange={() => toggleRouteSelection(route.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{route.route_name}</h3>
                          <Badge className={
                            route.status === 'completed' ? 'bg-green-100 text-green-800' :
                            route.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {route.status === 'completed' ? 'Ολοκληρωμένη' :
                             route.status === 'archived' ? 'Αρχειοθετημένη' : 'Ενεργή'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm">
                          {route.scheduled_date && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(route.scheduled_date), 'dd/MM/yyyy')}</span>
                            </div>
                          )}
                          {route.team_assigned && (
                            <div className="text-slate-600">
                              <span className="font-medium">Συνεργείο:</span> {route.team_assigned}
                            </div>
                          )}
                          <div className="text-slate-600">
                            <span>⚠️ {route.total_snags} εκκρεμότητες</span>
                          </div>
                          <div className="text-slate-600">
                            <span>📍 {new Set((route.selected_snag_ids || []).map(id => {
                              const snag = allSnags.find(s => s.id === id);
                              return snag?.bus_stop_id;
                            })).size} στάσεις</span>
                          </div>
                          <div className="text-slate-600">
                            <span>📏 {route.total_distance_km?.toFixed(1)} km</span>
                          </div>
                        </div>
                        {route.notes && (
                          <p className="text-sm text-slate-500 mt-2">{route.notes}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          Δημιουργήθηκε: {format(new Date(route.created_date), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditRoute(route)}
                          variant="outline"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRoute(route.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setShowSaveDialog(false);
          setEditingRoute(null);
          setRouteName('');
          setRouteNotes('');
          setScheduledDate('');
          setTeamAssigned('');
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRoute ? 'Επεξεργασία Διαδρομής' : 'Αποθήκευση Νέας Διαδρομής'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Όνομα Διαδρομής *</Label>
              <Input
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="π.χ. Διαδρομή Λευκωσία Πρωί"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Προγραμματισμένη Ημερομηνία</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Συνεργείο</Label>
                <Input
                  value={teamAssigned}
                  onChange={(e) => setTeamAssigned(e.target.value)}
                  placeholder="π.χ. Συνεργείο Α"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Σημειώσεις</Label>
              <Textarea
                value={routeNotes}
                onChange={(e) => setRouteNotes(e.target.value)}
                placeholder="Προσθήκη σημειώσεων..."
                rows={3}
              />
            </div>
            <Alert>
              <AlertDescription>
                {editingRoute ? 'Θα ενημερωθεί η διαδρομή με' : 'Θα αποθηκευτούν'} {selectedSnags.length} εκκρεμότητες σε {uniqueStops.size} στάσεις με συνολική απόσταση {totalRouteDistance.toFixed(2)} km
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSaveDialog(false);
              setEditingRoute(null);
              setRouteName('');
              setRouteNotes('');
              setScheduledDate('');
              setTeamAssigned('');
            }}>
              Ακύρωση
            </Button>
            <Button 
              onClick={handleSaveRoute} 
              className="bg-green-600 hover:bg-green-700"
              disabled={!routeName}
            >
              <Save className="w-4 h-4 mr-2" />
              {editingRoute ? 'Ενημέρωση' : 'Αποθήκευση'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
