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
  const { family, currentUser, members, isAdmin } = useFamily();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('200');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [monitoring, setMonitoring] = useState(false);
  const watchIdRef = useRef(null);
  const autocompleteRef = useRef(null);
  const insideZonesRef = useRef(new Set());

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
      if (!name.trim() || !selectedCoords) return;
      const { error } = await supabase.from('geofences').insert({
        family_id: family.id,
        name: name.trim(),
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
        radius_meters: parseInt(radius) || 200,
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
    onError: () => toast.error('Could not add geofence.'),
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

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const checkGeofences = async (lat, lng) => {
    const userName = currentUser?.display_name || currentUser?.full_name || 'Someone';
    for (const zone of geofences) {
      const dist = getDistance(lat, lng, zone.latitude, zone.longitude);
      const inside = dist <= zone.radius_meters;
      const wasInside = insideZonesRef.current.has(zone.id);
      if (inside && !wasInside) {
        insideZonesRef.current.add(zone.id);
        await supabase.from('feed_items').insert({
          family_id: family.id,
          user_id: currentUser.id,
          user_name: userName,
          user_avatar: currentUser.avatar,
          type: 'checkin',
          message: `${userName} arrived at ${zone.name}`,
        });
        await supabase.from('notifications').insert(
          members
            .filter(m => m.id !== currentUser.id)
            .map(m => ({
              user_id: m.id,
              type: 'checkin',
              message: `${userName} arrived at ${zone.name}`,
              read: false,
            }))
        );
        toast.success(`You arrived at ${zone.name}!`);
      } else if (!inside && wasInside) {
        insideZonesRef.current.delete(zone.id);
        await supabase.from('feed_items').insert({
          family_id: family.id,
          user_id: currentUser.id,
          user_name: userName,
          user_avatar: currentUser.avatar,
          type: 'checkin',
          message: `${userName} left ${zone.name}`,
        });
        await supabase.from('notifications').insert(
          members
            .filter(m => m.id !== currentUser.id)
            .map(m => ({
              user_id: m.id,
              type: 'checkin',
              message: `${userName} left ${zone.name}`,
              read: false,
            }))
        );
        toast(`You left ${zone.name}.`);
      }
    }
  };

  useEffect(() => {
    if (monitoring) {
      if (!navigator.geolocation) return;
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          checkGeofences(latitude, longitude);
        },
        () => toast.error('Could not get location.'),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    } else {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [monitoring, geofences]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">Geofences</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMonitoring(v => !v)}
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
        Geofencing alerts your family when you arrive or leave a saved zone — while the app is open.
      </p>

      {showForm && isAdmin && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">New Geofence Zone</h3>
          <div>
            <Label>Zone Name</Label>
            <Input placeholder="e.g. Home, School, Work" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Radius (meters)</Label>
            <Input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} className="mt-1" />
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
