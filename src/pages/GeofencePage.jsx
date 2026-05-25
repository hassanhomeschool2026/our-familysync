import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import { GoogleMap, useJsApiLoader, Circle, Marker } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Trash2, Pencil, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const DEFAULT_CENTER = { lat: 32.9482, lng: -96.7970 };

export default function GeofencePage({ embedded = false }) {
  const navigate = useNavigate();
  const { family, currentUser, isAdmin } = useFamily();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('200');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRadius, setEditRadius] = useState('');
  const inputRef = useRef(null);
  const placesAutocompleteRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('fs_geofence_monitoring', 'false');
    } catch {
      // Ignore storage failures; saved zones still work without monitoring.
    }
    window.dispatchEvent(new CustomEvent('fs_zone_monitoring_change', { detail: false }));
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

  const initPlacesSearchAutocomplete = useCallback(() => {
    const el = inputRef.current;
    if (!el || !isLoaded || !showForm || placesAutocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(el, {
      fields: ['geometry', 'name', 'formatted_address'],
    });
    placesAutocompleteRef.current = autocomplete;
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const loc = place?.geometry?.location;
      if (!loc) return;
      setSelectedCoords({ lat: loc.lat(), lng: loc.lng() });
    });
  }, [isLoaded, showForm]);

  useEffect(() => {
    initPlacesSearchAutocomplete();
    return () => {
      if (placesAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(placesAutocompleteRef.current);
        placesAutocompleteRef.current = null;
      }
    };
  }, [initPlacesSearchAutocomplete]);

  const searchInputRef = useCallback(
    (el) => {
      inputRef.current = el;
      if (!el) {
        if (placesAutocompleteRef.current) {
          google.maps.event.clearInstanceListeners(placesAutocompleteRef.current);
          placesAutocompleteRef.current = null;
        }
        return;
      }
      initPlacesSearchAutocomplete();
    },
    [initPlacesSearchAutocomplete]
  );

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

  const updateGeofence = useMutation({
    mutationFn: async ({ id, name, radius_meters }) => {
      const { error } = await supabase
        .from('geofences')
        .update({ name: name.trim(), radius_meters: parseInt(radius_meters) || 200 })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences', family?.id] });
      setEditingZone(null);
      toast.success('Zone updated!');
    },
    onError: () => toast.error('Could not update zone.'),
  });

  return (
    <div className="space-y-4">
      {!embedded && (
        <button
          type="button"
          onClick={() => navigate('/checkin')}
          className="inline-flex items-center justify-center rounded-full p-2 -ml-1 text-foreground hover:bg-muted/80 transition-colors"
          aria-label="Back to Check-In"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
        <p className="mb-0.5 text-xs font-semibold text-teal-800">About Saved Zones</p>
        <p className="text-xs text-teal-700 leading-relaxed">
          Zones are saved places your family can reference from check-ins. Automatic arrive/leave alerts are a foreground-only beta and may vary by device or browser.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">Geofences</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <Button size="sm" onClick={() => setShowForm(v => !v)} className="rounded-full">
              <Plus className="w-4 h-4 mr-1" /> Add Zone
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Create named places like home, school, or work for easier family check-ins.
      </p>

      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3 bg-[rgba(1,220,186,0.08)] border border-[rgba(1,220,186,0.25)]">
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[rgba(14,165,233,0.12)] text-sky-700">Improving</span>
        <p className="text-xs text-gray-800">Automatic zone alerts work best while the app is open and are still being improved.</p>
      </div>

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
              <Input ref={searchInputRef} placeholder="Search for an address..." className="mb-2" />
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
          <div key={zone.id} className="rounded-xl bg-card border border-border overflow-hidden">
            {editingZone?.id === zone.id ? (
              <div className="p-3 space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Zone name"
                  className="h-8 text-sm"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editRadius}
                    onChange={(e) => setEditRadius(e.target.value)}
                    placeholder="Radius (meters)"
                    className="h-8 text-sm flex-1"
                  />
                  <span className="text-xs text-muted-foreground">m radius</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs rounded-lg"
                    onClick={() =>
                      updateGeofence.mutate({
                        id: zone.id,
                        name: editName,
                        radius_meters: editRadius,
                      })
                    }
                    disabled={!editName.trim() || updateGeofence.isPending}
                  >
                    {updateGeofence.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs rounded-lg px-3"
                    onClick={() => setEditingZone(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{zone.name}</p>
                  <p className="text-xs text-muted-foreground">{zone.radius_meters}m radius</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingZone(zone);
                        setEditName(zone.name);
                        setEditRadius(String(zone.radius_meters));
                      }}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteGeofence.mutate(zone.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
