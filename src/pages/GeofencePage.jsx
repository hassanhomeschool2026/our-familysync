import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import { GoogleMap, useJsApiLoader, Circle, Marker, Autocomplete } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Trash2, Radio } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CENTER = { lat: 32.9482, lng: -96.7970 };

export default function GeofencePage() {
  const { family, currentUser, isAdmin } = useFamily();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('200');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [monitoring, setMonitoring] = useState(() => {
    try {
      return localStorage.getItem('fs_geofence_monitoring') === 'true';
    } catch {
      return false;
    }
  });
  const autocompleteRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('fs_geofence_monitoring', String(monitoring));
    } catch {}
  }, [monitoring]);

  useEffect(() => {
    const onSync = (e) => setMonitoring(e.detail);
    window.addEventListener('fs_zone_monitoring_change', onSync);
    return () => window.removeEventListener('fs_zone_monitoring_change', onSync);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // silent — map just falls back to first zone center
    );
  }, []);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
    libraries: ['places'],
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ['geofences', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('geofences')
        .select('*')
        .eq('family_id', family?.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!family?.id,
  });

  const addGeofence = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !selectedCoords) throw new Error('Name and location are required.');
      const r = parseInt(radius, 10);
      if (Number.isNaN(r) || r < 50) {
        toast.error('Radius must be at least 50 meters');
        throw new Error('__radius_validation__');
      }
      const { error } = await supabase.from('geofences').insert({
        family_id: family.id,
        name: name.trim(),
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
        radius_meters: r,
        created_by: currentUser.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences', family?.id] });
      setShowForm(false);
      setName('');
      setSelectedCoords(null);
      setRadius('200');
      toast.success('Geofence added!');
    },
    onError: (error) => {
      if (error?.message === '__radius_validation__') return;
      toast.error(error?.message || 'Could not add geofence.');
    },
  });

  const deleteGeofence = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('geofences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences', family?.id] });
      toast.success('Geofence removed.');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">Geofences</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !monitoring;
              setMonitoring(next);
              try {
                localStorage.setItem('fs_geofence_monitoring', String(next));
              } catch {}
              window.dispatchEvent(new CustomEvent('fs_zone_monitoring_change', { detail: next }));
            }}
            className={`flex items-center gap-1 text-xs rounded-full px-3 py-1 border transition-colors ${monitoring ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
          >
            <Radio className="w-3 h-3" />
            {monitoring ? 'Monitoring On' : 'Monitoring Off'}
          </button>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowForm(v => !v)} className="rounded-full">
              <Plus className="w-4 h-4 mr-1" /> Add Zone
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Geofencing alerts your family when you arrive or leave a saved zone while the app is open. Enable Zone Alerts on the Check-In tab to monitor while using other features.
      </p>

      {showForm && isAdmin && (
        <div className="bg-gradient-to-br from-card to-[#2f9db6]/[0.05] border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">New Geofence Zone</h3>
          <div>
            <Label>Zone Name</Label>
            <Input placeholder="e.g. Home, School, Work" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Radius (meters)</Label>
            <Input
              type="number"
              min={50}
              placeholder="e.g. 100"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="mt-1"
            />
          </div>
          {isLoaded && (
            <div className="relative">
              <Autocomplete
                onLoad={(ac) => { autocompleteRef.current = ac; }}
                onPlaceChanged={() => {
                  const place = autocompleteRef.current?.getPlace();
                  const loc = place?.geometry?.location;
                  if (loc) {
                    setSelectedCoords({ lat: loc.lat(), lng: loc.lng() });
                  }
                }}
                fields={['geometry', 'name', 'formatted_address']}
              >
                <Input placeholder="Search for an address..." className="mb-2" />
              </Autocomplete>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '200px', borderRadius: '12px' }}
                center={selectedCoords || userLocation || DEFAULT_CENTER}
                zoom={selectedCoords ? 15 : 14}
                onClick={(e) => setSelectedCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
                options={{ fullscreenControl: false, mapTypeControl: false }}
              >
                {selectedCoords && (
                  <>
                    <Marker position={selectedCoords} />
                    <Circle
                      center={selectedCoords}
                      radius={parseInt(radius) || 200}
                      options={{ fillColor: '#0d9488', fillOpacity: 0.2, strokeColor: '#0d9488', strokeWeight: 1 }}
                    />
                  </>
                )}
              </GoogleMap>
              <p className="text-xs text-muted-foreground mt-1">Search for an address or tap the map to place the zone.</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button className="flex-1 rounded-xl" onClick={() => addGeofence.mutate()} disabled={!name.trim() || !selectedCoords || addGeofence.isPending}>
              {addGeofence.isPending ? 'Saving...' : 'Save Zone'}
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoaded && geofences.length > 0 && (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '250px', borderRadius: '12px' }}
          center={userLocation || { lat: geofences[0].latitude, lng: geofences[0].longitude }}
          zoom={13}
          options={{ fullscreenControl: false, mapTypeControl: false }}
        >
          {userLocation && <Marker position={userLocation} />}
          {geofences.map((zone) => (
            <React.Fragment key={zone.id}>
              <Marker position={{ lat: zone.latitude, lng: zone.longitude }} label={zone.name[0]} />
              <Circle
                center={{ lat: zone.latitude, lng: zone.longitude }}
                radius={zone.radius_meters}
                options={{ fillColor: '#0d9488', fillOpacity: 0.15, strokeColor: '#0d9488', strokeWeight: 1 }}
              />
            </React.Fragment>
          ))}
        </GoogleMap>
      )}

      {geofences.length === 0 && !showForm && (
        <div className="text-center py-8 text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No geofence zones yet.</p>
          {isAdmin && <p className="text-xs mt-1">Tap &quot;Add Zone&quot; to create one.</p>}
        </div>
      )}

      <div className="space-y-2">
        {geofences.map((zone) => (
          <div key={zone.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{zone.name}</p>
              <p className="text-xs text-muted-foreground">{zone.radius_meters}m radius</p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => deleteGeofence.mutate(zone.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
