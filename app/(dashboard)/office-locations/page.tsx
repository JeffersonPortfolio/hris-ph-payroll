'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MapPin, Building2 } from 'lucide-react';

interface OfficeLocation {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  departmentLocations: any[];
}

interface Department {
  id: string;
  name: string;
}

export default function OfficeLocationsPage() {
  const { data: session } = useSession() || {};
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radiusKm: '0.1', // Default 100m = 0.1km
  });

  const userRole = (session?.user as any)?.role;
  const canManage = ['ADMIN', 'HR'].includes(userRole);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locationsRes, departmentsRes] = await Promise.all([
        fetch('/api/office-locations'),
        fetch('/api/departments'),
      ]);

      if (locationsRes.ok) {
        setLocations(await locationsRes.json());
      }
      if (departmentsRes.ok) {
        const data = await departmentsRes.json();
        setDepartments(data.departments || data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const url = '/api/office-locations';
      const method = editingLocation ? 'PUT' : 'POST';
      
      // Convert km to meters
      const radiusKmValue = parseFloat(form.radiusKm) || 0.1;
      const radiusMeters = Math.round(radiusKmValue * 1000);
      
      const body = editingLocation 
        ? { id: editingLocation.id, name: form.name, address: form.address, latitude: form.latitude, longitude: form.longitude, radiusMeters } 
        : { name: form.name, address: form.address, latitude: form.latitude, longitude: form.longitude, radiusMeters };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingLocation ? 'Location updated' : 'Location created');
        setDialogOpen(false);
        setEditingLocation(null);
        setForm({ name: '', address: '', latitude: '', longitude: '', radiusKm: '0.1' });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save location');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      const res = await fetch(`/api/office-locations?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Location deleted');
        fetchData();
      } else {
        toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleToggleActive = async (location: OfficeLocation) => {
    try {
      const res = await fetch('/api/office-locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: location.id, isActive: !location.isActive }),
      });

      if (res.ok) {
        toast.success(`Location ${location.isActive ? 'deactivated' : 'activated'}`);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Office Locations</h1>
          <p className="text-muted-foreground">Configure geofencing locations for attendance</p>
        </div>
        {canManage && (
          <Button onClick={() => {
            setEditingLocation(null);
            setForm({ name: '', address: '', latitude: '', longitude: '', radiusKm: '0.1' });
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Locations</p>
                <p className="text-2xl font-bold">{locations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Locations</p>
                <p className="text-2xl font-bold">
                  {locations.filter(l => l.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Radius</p>
                <p className="text-2xl font-bold">
                  {locations.length > 0 
                    ? Math.round(locations.reduce((sum, l) => sum + l.radiusMeters, 0) / locations.length)
                    : 0}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Office Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Radius</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>{location.address || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{(location.radiusMeters / 1000).toFixed(2)} km</span>
                    <span className="text-muted-foreground text-xs ml-1">({location.radiusMeters}m)</span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={location.isActive ? 'default' : 'destructive'}
                      className="cursor-pointer"
                      onClick={() => canManage && handleToggleActive(location)}
                    >
                      {location.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingLocation(location);
                            setForm({
                              name: location.name,
                              address: location.address || '',
                              latitude: location.latitude.toString(),
                              longitude: location.longitude.toString(),
                              radiusKm: (location.radiusMeters / 1000).toString(),
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(location.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {locations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No office locations configured. Add your first location to enable geofencing.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-800 mb-2">How Geofencing Works</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Configure office locations with GPS coordinates and radius</li>
            <li>• Employees can only clock in/out when within the geofence radius</li>
            <li>• GPS validation will be enabled in the mobile app (Phase 3)</li>
            <li>• You can assign specific locations to departments</li>
          </ul>
        </CardContent>
      </Card>

      {/* Location Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Location' : 'Add Office Location'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Location Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Main Office"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full address (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g., 14.5995"
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g., 120.9842"
                />
              </div>
            </div>
            <div>
              <Label>Geofence Radius (kilometers)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.radiusKm}
                onChange={(e) => setForm({ ...form, radiusKm: e.target.value })}
                placeholder="0.55"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Employees must be within this radius to clock in/out. 
                <span className="font-medium"> (0.55 km = 550 meters)</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingLocation ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
