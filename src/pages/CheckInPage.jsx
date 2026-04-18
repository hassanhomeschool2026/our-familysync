import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api';

import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, X, Clock, Radio } from 'lucide-react';
import MemberAvatar from '@/components/shared/MemberAvatar';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';

const DEFAULT_CENTER = { lat: 32.9482, lng: -96.7970 };

const geocodeLatLng = async (lat, lng) => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
  );
  const data = await response.json();
  if (data.results && data.results[0]) {
    const components = data.results[0].address_components;
    const streetNumber = components.find((c) => c.types.includes('street_number'))?.long_name || '';
    const street = components.find((c) => c.types.includes('route'))?.long_name || '';
    const city = components.find((c) => c.types.includes('locality'))?.long_name || '';
    const state =
      components.find((c) => c.types.includes('administrative_area_level_1'))?.short_name || '';
    return `${streetNumber} ${street}, ${city}, ${state}`.trim();
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

function trimAddress(s, max = 52) {
  if (!s) return '';
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function markerIcon(color) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color || '#6366f1',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 10,
  };
}

function formatCheckInDetailTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const relative = formatDistanceToNow(d, { addSuffix: true });
  const exact = d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return `${relative} · ${exact}`;
}

function formatHistoryExactTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

export default function CheckInPage() {
  const { family, currentUser, members, getMemberColor } = useFamily();
  const queryClient = useQueryClient();
  const autocompleteRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
    libraries: ['places'],
  });

  const [locationName, setLocationName] = useState('');
  const [note, setNote] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coords, setCoords] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [userGeo, setUserGeo] = useState(null);
  const [overrideMapView, setOverrideMapView] = useState(null);
  const [infoCheckIn, setInfoCheckIn] = useState(null);
  const [liveTracking, setLiveTracking] = useState(false);
  const watchIdRef = useRef(null);
  const [locationPermission, setLocationPermission] = useState('unknown');

  const [debugHref, setDebugHref] = useState('');
  const [debugStandalone, setDebugStandalone] = useState('');
  const [debugPermissionInfo, setDebugPermissionInfo] = useState('(not read yet)');
  const [debugGeoCallback, setDebugGeoCallback] = useState('none');
  const [debugGeoErrorCode, setDebugGeoErrorCode] = useState('—');
  const [debugGeoErrorMessage, setDebugGeoErrorMessage] = useState('—');

  useEffect(() => {
    setDebugHref(window.location.href);
    const ns = window.navigator.standalone === true;
    const dm = window.matchMedia('(display-mode: standalone)').matches;
    setDebugStandalone(
      `navigator.standalone: ${String(window.navigator.standalone)} | display-mode standalone (matchMedia): ${dm} | effective PWA-ish: ${ns || dm}`
    );
    console.log('[CheckIn][mount] window.location.href', window.location.href);
    console.log('[CheckIn][mount] window.location.origin', window.location.origin);
    console.log('[CheckIn][mount] window.location.pathname', window.location.pathname);
    console.log('[CheckIn][mount] window.navigator.standalone', window.navigator.standalone);
    console.log(
      '[CheckIn][mount] matchMedia(display-mode: standalone)',
      window.matchMedia('(display-mode: standalone)').matches
    );
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          console.log('[CheckIn][mount] permissions.geolocation state', result.state, result);
          setLocationPermission(result.state);
          setDebugPermissionInfo(`geolocation: ${result.state}`);
          result.onchange = () => {
            console.log('[CheckIn][mount] permissions.geolocation onchange', result.state);
            setLocationPermission(result.state);
            setDebugPermissionInfo(`geolocation: ${result.state} (changed)`);
          };
        })
        .catch((e) => {
          console.log('[CheckIn][mount] permissions.geolocation query failed', e);
          setDebugPermissionInfo(`query failed: ${e?.message || String(e)}`);
        });
    } else {
      console.log('[CheckIn][mount] navigator.permissions not available');
      setDebugPermissionInfo('navigator.permissions not available');
    }
  }, []);

  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ['checkins', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('checkins')
        .select('*')
        .eq('family_id', family?.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!family?.id,
    refetchInterval: 60000,
  });

  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const activeCheckIns = checkins.filter((c) => !c.cleared_at && new Date(c.created_at) > eightHoursAgo);

  const activeIds = new Set(activeCheckIns.map((c) => c.id));
  const historyCheckIns = checkins.filter(
    (c) => !activeIds.has(c.id) && new Date(c.created_at) > threeDaysAgo
  );

  const historyGrouped = useMemo(() => {
    const map = new Map();
    for (const ci of historyCheckIns) {
      const d = new Date(ci.created_at);
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) {
        let label;
        if (isToday(d)) label = 'Today';
        else if (isYesterday(d)) label = 'Yesterday';
        else {
          label =
            d.getFullYear() === new Date().getFullYear()
              ? format(d, 'EEE, MMM d')
              : format(d, 'EEE, MMM d, yyyy');
        }
        map.set(key, { dateKey: key, label, items: [] });
      }
      map.get(key).items.push(ci);
    }
    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return keys.map((k) => map.get(k));
  }, [historyCheckIns]);

  const myCheckIn = activeCheckIns.find((ci) => ci.user_id === currentUser?.id);

  const getMemberForUser = useCallback(
    (userId) => members.find((m) => m.id === userId),
    [members]
  );

  const fallbackMapCenter = useMemo(() => {
    const withCoords = activeCheckIns.find(
      (c) => c.latitude != null && c.longitude != null && !Number.isNaN(Number(c.latitude))
    );
    if (withCoords) {
      return { lat: Number(withCoords.latitude), lng: Number(withCoords.longitude) };
    }
    if (userGeo) return userGeo;
    return DEFAULT_CENTER;
  }, [activeCheckIns, userGeo]);

  const mapCenter = overrideMapView?.center ?? fallbackMapCenter;
  const mapZoom = overrideMapView?.zoom ?? 14;

  useEffect(() => {
    if (infoCheckIn && !activeCheckIns.some((c) => c.id === infoCheckIn.id)) {
      setInfoCheckIn(null);
    }
  }, [activeCheckIns, infoCheckIn]);

  useEffect(() => {
    if (liveTracking) {
      if (!navigator.geolocation) return;
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const center = { lat, lng };
          setUserGeo(center);
          setOverrideMapView({ center, zoom: 14 });
          try {
            const name = await geocodeLatLng(lat, lng);
            setLocationName(name);
            setCoords(center);
          } catch {
            setCoords(center);
          }
          if (myCheckIn) {
            await supabase.from('checkins').update({
              latitude: lat,
              longitude: lng,
              location: await geocodeLatLng(lat, lng),
            }).eq('id', myCheckIn.id);
            queryClient.invalidateQueries({ queryKey: ['checkins', family?.id] });
          }
        },
        () => {},
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
  }, [liveTracking, myCheckIn]);

  const createCheckIn = useMutation({
    mutationFn: async ({ location: loc, latitude: lat, longitude: lng, note: noteVal }) => {
      if (myCheckIn) await supabase.from('checkins').update({ cleared_at: new Date().toISOString() }).eq('id', myCheckIn.id);
      const { data: newCheckIn, error } = await supabase
        .from('checkins')
        .insert({
          family_id: family.id,
          user_id: currentUser.id,
          user_name: currentUser.display_name || currentUser.full_name || currentUser.email,
          user_avatar: currentUser.avatar || String.fromCodePoint(0x1f60a),
          location: loc,
          latitude: lat,
          longitude: lng,
          note: noteVal?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return newCheckIn;
    },
    onSuccess: async (_newCheckIn, data) => {
      queryClient.invalidateQueries({ queryKey: ['checkins', family?.id] });
      await supabase.from('feed_items').insert({
        family_id: family.id,
        user_id: currentUser.id,
        user_name: currentUser.display_name || currentUser.full_name || currentUser.email,
        user_avatar: currentUser.avatar || String.fromCodePoint(0x1f60a),
        type: 'checkin',
        message: `${currentUser.display_name || currentUser.full_name || currentUser.email} checked in at ${data.location}`,
      });
      setShowForm(false);
      setCoords(null);
      setLocationName('');
      setNote('');
      setOverrideMapView(null);
    },
  });

  const clearCheckIn = useMutation({
    mutationFn: async () => {
      const latestMine = checkins.find((c) => c.user_id === currentUser?.id);
      if (!latestMine?.id) return;
      const { error } = await supabase.from('checkins').update({ cleared_at: new Date().toISOString() }).eq('id', latestMine.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins', family?.id] });
      setInfoCheckIn(null);
    },
  });

  const getLocation = () => {
    console.log('[CheckIn] getLocation: called');
    if (!navigator.geolocation) {
      console.log('[CheckIn] getLocation: navigator.geolocation missing');
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    console.log('[CheckIn] getLocation: setGettingLocation(true)');
    setGettingLocation(true);
    setDebugGeoCallback('pending');
    setDebugGeoErrorCode('—');
    setDebugGeoErrorMessage('—');
    const finish = async (lat, lng) => {
      const center = { lat, lng };
      setCoords(center);
      setUserGeo(center);
      setOverrideMapView({ center, zoom: 14 });
      try {
        const name = await geocodeLatLng(lat, lng);
        setLocationName(name);
      } catch {
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } finally {
        setGettingLocation(false);
        setShowForm(true);
      }
    };
    const geoOpts = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
    console.log('[CheckIn] getCurrentPosition: invoking', geoOpts);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('[CheckIn] getCurrentPosition: success callback', pos.coords);
        setDebugGeoCallback('success');
        setDebugGeoErrorCode('—');
        setDebugGeoErrorMessage('—');
        setLocationPermission('granted');
        finish(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.log('[CheckIn] getCurrentPosition: error callback', err.code, err.message, err);
        if (err.code === err.TIMEOUT) {
          console.log('[CheckIn] getCurrentPosition: TIMEOUT (options.timeout may have elapsed)');
        }
        setDebugGeoCallback('error');
        setDebugGeoErrorCode(String(err.code));
        setDebugGeoErrorMessage(err.message || '(no message)');
        setGettingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationPermission('denied');
          toast.error('Location permission denied. Please enable it in your browser/phone settings.');
        } else {
          toast.error('Could not get your location. Please try again.');
        }
      },
      geoOpts
    );
  };

  const handleCheckIn = () => {
    if (!coords || !locationName.trim()) return;
    createCheckIn.mutate({
      location: locationName.trim(),
      latitude: coords.lat,
      longitude: coords.lng,
      note: note.trim(),
    });
  };

  const onPlaceChanged = () => {
    const ac = autocompleteRef.current;
    if (!ac) return;
    const place = ac.getPlace();
    const loc = place.geometry?.location;
    if (!loc) return;
    const lat = loc.lat();
    const lng = loc.lng();
    const center = { lat, lng };
    setCoords(center);
    setLocationName(place.name || place.formatted_address || '');
    setOverrideMapView({ center, zoom: 15 });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setOverrideMapView(null);
    setCoords(null);
    setLocationName('');
    setNote('');
  };

  const infoWindowMember = infoCheckIn ? getMemberForUser(infoCheckIn.user_id) : null;

  if (isLoading) return <SkeletonCard count={3} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl font-bold">Check-In</h2>
        {myCheckIn ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => clearCheckIn.mutate()}
            className="rounded-full text-xs"
            disabled={clearCheckIn.isPending}
          >
            <X className="w-3 h-3 mr-1" /> Clear My Pin
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              console.log('[CheckIn] Share My Location button onClick fired');
              setDebugHref(window.location.href);
              getLocation();
            }}
            disabled={gettingLocation}
            className="rounded-full text-xs"
          >
            <Navigation className="w-3 h-3 mr-1" />
            {gettingLocation ? 'Getting location...' : locationPermission === 'denied' ? 'Location Blocked' : 'Share My Location'}
          </Button>
        )}
        {myCheckIn && (
          <button
            type="button"
            onClick={() => setLiveTracking((v) => !v)}
            className={`flex items-center gap-1 text-xs rounded-full px-3 py-1 border transition-colors ${liveTracking ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
          >
            <Radio className="w-3 h-3" />
            {liveTracking ? 'Live On' : 'Live Off'}
          </button>
        )}
      </div>

      <div className="mb-4">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '300px', borderRadius: '12px' }}
            mapContainerClassName="relative"
            center={mapCenter}
            zoom={mapZoom}
            options={{ fullscreenControl: false, mapTypeControl: false }}
          >
            <Autocomplete
              className="absolute top-3 left-0 right-0 z-10 px-3 w-full box-border"
              onLoad={(ac) => {
                autocompleteRef.current = ac;
              }}
              onPlaceChanged={onPlaceChanged}
              fields={['geometry', 'name', 'formatted_address']}
            >
              <Input
                placeholder="Search for a place..."
                className="bg-background shadow-md border-border h-10 w-full"
              />
            </Autocomplete>
            {activeCheckIns.map((checkin) => {
              if (checkin.latitude == null || checkin.longitude == null) return null;
              const member = getMemberForUser(checkin.user_id);
              const color = getMemberColor(checkin.user_id) || member?.member_color || '#6366f1';
              return (
                <Marker
                  key={checkin.id}
                  position={{ lat: Number(checkin.latitude), lng: Number(checkin.longitude) }}
                  title={checkin.user_name}
                  icon={markerIcon(color)}
                  onClick={() => setInfoCheckIn(checkin)}
                />
              );
            })}
            {infoCheckIn &&
              infoCheckIn.latitude != null &&
              infoCheckIn.longitude != null && (
                <InfoWindow
                  position={{
                    lat: Number(infoCheckIn.latitude),
                    lng: Number(infoCheckIn.longitude),
                  }}
                  onCloseClick={() => setInfoCheckIn(null)}
                >
                  <div className="max-w-[220px] text-foreground p-1">
                    <p className="font-semibold text-sm">
                      {infoWindowMember?.display_name ||
                        infoWindowMember?.full_name ||
                        infoCheckIn.user_name ||
                        'Member'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {trimAddress(infoCheckIn.location, 200)}
                    </p>
                    {infoCheckIn.note ? <p className="text-xs mt-1">{infoCheckIn.note}</p> : null}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatCheckInDetailTime(infoCheckIn.created_at)}
                    </p>
                  </div>
                </InfoWindow>
              )}
          </GoogleMap>
        ) : (
          <div
            style={{ width: '100%', height: '300px' }}
            className="bg-secondary rounded-xl flex items-center justify-center"
          >
            <p className="text-muted-foreground text-sm">Loading map...</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <Input
            placeholder="Location name (e.g. Home, Work)"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
          />
          <Input
            placeholder="What are you up to? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCheckIn}
              disabled={!locationName.trim() || createCheckIn.isPending}
              className="flex-1 rounded-xl"
            >
              <MapPin className="w-4 h-4 mr-1" /> Check In
            </Button>
            <Button variant="outline" onClick={cancelForm} className="rounded-xl">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Check-Ins</p>
        {activeCheckIns.length === 0 ? (
          <EmptyState
            emoji={String.fromCodePoint(0x1f4cd)}
            title="No active check-ins"
            description="Tap 'Share My Location' to let your family know where you are."
          />
        ) : (
          activeCheckIns.map((ci) => {
            const member = getMemberForUser(ci.user_id);
            const color = getMemberColor(ci.user_id) || member?.member_color || '#6366f1';
            const displayName = member?.display_name || member?.full_name || ci.user_name || 'Member';
            const avatar = member?.avatar ?? ci.user_avatar;
            return (
              <div
                key={ci.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                style={{ borderLeftWidth: '4px', borderLeftColor: color }}
              >
                <MemberAvatar avatar={avatar} color={color} size="sm" name={displayName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>{trimAddress(ci.location ?? '')}</span>
                  </p>
                  {ci.note ? <p className="text-xs mt-1 text-foreground/90">{ci.note}</p> : null}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-start gap-0.5 shrink-0 text-right leading-tight">
                  <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                  {formatCheckInDetailTime(ci.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2 mt-6" aria-label="Check-in history">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">History</p>
        {historyGrouped.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No recent check-in history</p>
        ) : (
          historyGrouped.map((group) => (
            <div key={group.dateKey} className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground pl-1">{group.label}</p>
              <div className="space-y-1.5">
                {group.items.map((ci) => {
                  const member = getMemberForUser(ci.user_id);
                  const color = getMemberColor(ci.user_id) || member?.member_color || '#6366f1';
                  const displayName =
                    member?.display_name || member?.full_name || ci.user_name || 'Member';
                  const avatar = member?.avatar ?? ci.user_avatar;
                  return (
                    <div
                      key={ci.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                      style={{ borderLeftWidth: '4px', borderLeftColor: color }}
                    >
                      <MemberAvatar avatar={avatar} color={color} size="sm" name={displayName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{trimAddress(ci.location ?? '')}</span>
                        </p>
                        {ci.note ? <p className="text-xs mt-1 text-foreground/90">{ci.note}</p> : null}
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
                          <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                          {formatHistoryExactTime(ci.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div
        className="mt-6 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-[10px] font-mono text-foreground break-all space-y-1"
        aria-label="Geolocation debug"
      >
        <p className="font-sans text-xs font-semibold text-amber-800 dark:text-amber-200">Geolocation debug (on-screen)</p>
        <p><span className="text-muted-foreground">location.href:</span> {debugHref || '—'}</p>
        <p><span className="text-muted-foreground">standalone:</span> {debugStandalone || '—'}</p>
        <p><span className="text-muted-foreground">permissions (geolocation):</span> {debugPermissionInfo}</p>
        <p><span className="text-muted-foreground">getCurrentPosition last callback:</span> {debugGeoCallback}</p>
        <p><span className="text-muted-foreground">last geo error code:</span> {debugGeoErrorCode}</p>
        <p><span className="text-muted-foreground">last geo error message:</span> {debugGeoErrorMessage}</p>
      </div>
    </div>
  );
}
