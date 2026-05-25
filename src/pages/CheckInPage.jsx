import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, X, Clock } from 'lucide-react';
import MemberAvatar from '@/components/shared/MemberAvatar';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { DEFAULT_MEMBER_ACCENT } from '@/lib/memberColors';
import { playCheckInSound } from '@/lib/sounds';

const DEFAULT_CENTER = { lat: 32.9482, lng: -96.7970 };

const CLEAN_MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#fafafa' }] },
  { featureType: 'water', stylers: [{ color: '#c9e8f0' }] },
  { featureType: 'landscape', stylers: [{ color: '#f2f6f3' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#888888' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#999999' }] },
];

const FS_INSIDE_ZONES_KEY = 'fs_inside_zones';

function loadInsideZonesSetFromStorage() {
  try {
    const raw = localStorage.getItem(FS_INSIDE_ZONES_KEY);
    if (raw == null || raw === '') return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function persistInsideZonesSet(set) {
  try {
    localStorage.setItem(FS_INSIDE_ZONES_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Reverse geocode: short label for "place" line + Google's full formatted_address */
const geocodeLatLngDetailed = async (lat, lng) => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
  );
  const data = await response.json();
  if (data.results && data.results[0]) {
    const result = data.results[0];
    const formattedAddress = (result.formatted_address || '').trim();
    const components = result.address_components;
    const streetNumber = components.find((c) => c.types.includes('street_number'))?.long_name || '';
    const street = components.find((c) => c.types.includes('route'))?.long_name || '';
    const city = components.find((c) => c.types.includes('locality'))?.long_name || '';
    const state =
      components.find((c) => c.types.includes('administrative_area_level_1'))?.short_name || '';
    const shortLabel = `${streetNumber} ${street}, ${city}, ${state}`.trim();
    return {
      shortLabel: shortLabel || formattedAddress,
      formattedAddress: formattedAddress || shortLabel || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
  }
  const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return { shortLabel: fallback, formattedAddress: fallback };
};

function trimAddress(s, max = 52) {
  if (!s) return '';
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function checkInHasDistinctAddress(ci) {
  const addr = ci?.address?.trim();
  const loc = (ci?.location || '').trim();
  return Boolean(addr && addr !== loc);
}

function markerIcon(color) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color || DEFAULT_MEMBER_ACCENT,
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
  const inputRef = useRef(null);
  const placesAutocompleteRef = useRef(null);
  const formSectionRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
    libraries: ['places'],
  });

  const initPlacesSearchAutocomplete = useCallback(() => {
    const el = inputRef.current;
    if (!el || !isLoaded || placesAutocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(el, {
      fields: ['geometry', 'name', 'formatted_address'],
    });
    placesAutocompleteRef.current = autocomplete;
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const loc = place?.geometry?.location;
      if (!loc) return;
      const lat = loc.lat();
      const lng = loc.lng();
      const center = { lat, lng };
      setCoords(center);
      const formatted = (place.formatted_address || '').trim();
      const name = (place.name || '').trim();
      setLocationName(name || formatted || '');
      setLocationAddress(formatted || '');
      setOverrideMapView({ center, zoom: 15 });
      setShowForm(true);
    });
  }, [isLoaded]);

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

  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [note, setNote] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coords, setCoords] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [userGeo, setUserGeo] = useState(null);
  const [overrideMapView, setOverrideMapView] = useState(null);
  const [infoCheckIn, setInfoCheckIn] = useState(null);
  const [liveTracking, setLiveTracking] = useState(false);
  const watchIdRef = useRef(null);
  const insideZonesRef = useRef(loadInsideZonesSetFromStorage());
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [zoneMonitoring, setZoneMonitoring] = useState(false);

  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      setLocationPermission(result.state);
      result.onchange = () => setLocationPermission(result.state);
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('fs_geofence_monitoring', 'false');
    } catch {
      // Ignore storage failures; foreground-only location remains available.
    }
    const onSync = (e) => setZoneMonitoring(e.detail);
    window.addEventListener('fs_zone_monitoring_change', onSync);
    return () => window.removeEventListener('fs_zone_monitoring_change', onSync);
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
    if (!liveTracking && !zoneMonitoring) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) return;

    const checkGeofences = async (lat, lng) => {
      if (!geofences.length) return;
      const userName = currentUser?.display_name || currentUser?.full_name || 'Someone';
      const R = 6371000;
      for (const zone of geofences) {
        const dLat = ((zone.latitude - lat) * Math.PI) / 180;
        const dLng = ((zone.longitude - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((zone.latitude * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const wasInside = insideZonesRef.current.has(zone.id);
        const enterThreshold = zone.radius_meters;
        const exitThreshold = zone.radius_meters + 20;
        const inside = wasInside ? dist <= exitThreshold : dist <= enterThreshold;
        if (inside && !wasInside) {
          insideZonesRef.current.add(zone.id);
          persistInsideZonesSet(insideZonesRef.current);
          const { error: feedError } = await supabase.from('feed_items').insert({
            family_id: family.id,
            user_id: currentUser.id,
            user_name: userName,
            user_avatar: currentUser.avatar,
            type: 'checkin',
            message: `${userName} arrived at ${zone.name}`,
          });
          if (feedError) console.error('Geofence feed insert error:', feedError);

          const notifTargets = members.filter((m) => m.id !== currentUser.id);
          if (notifTargets.length > 0) {
            const { error: notifError } = await supabase.from('notifications').insert(
              notifTargets.map((m) => ({
                user_id: m.id,
                type: 'checkin',
                message: `${userName} arrived at ${zone.name}`,
                read: false,
              }))
            );
            if (notifError) console.error('Geofence notification insert error:', notifError);
          }
          toast.success(`You arrived at ${zone.name}!`);
        } else if (!inside && wasInside) {
          insideZonesRef.current.delete(zone.id);
          persistInsideZonesSet(insideZonesRef.current);
          const { error: feedError } = await supabase.from('feed_items').insert({
            family_id: family.id,
            user_id: currentUser.id,
            user_name: userName,
            user_avatar: currentUser.avatar,
            type: 'checkin',
            message: `${userName} left ${zone.name}`,
          });
          if (feedError) console.error('Geofence feed insert error:', feedError);

          const notifTargets = members.filter((m) => m.id !== currentUser.id);
          if (notifTargets.length > 0) {
            const { error: notifError } = await supabase.from('notifications').insert(
              notifTargets.map((m) => ({
                user_id: m.id,
                type: 'checkin',
                message: `${userName} left ${zone.name}`,
                read: false,
              }))
            );
            if (notifError) console.error('Geofence notification insert error:', notifError);
          }
          toast(`You left ${zone.name}.`);
        }
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (liveTracking) {
          const center = { lat, lng };
          setUserGeo(center);
          setOverrideMapView({ center, zoom: 14 });
          try {
            const geo = await geocodeLatLngDetailed(lat, lng);
            setLocationName(geo.shortLabel);
            setLocationAddress(geo.formattedAddress);
            setCoords(center);
            if (myCheckIn) {
              await supabase.from('checkins').update({
                latitude: lat,
                longitude: lng,
                location: geo.shortLabel,
                address: geo.formattedAddress,
              }).eq('id', myCheckIn.id);
              queryClient.invalidateQueries({ queryKey: ['checkins', family?.id] });
            }
          } catch {
            setCoords(center);
          }
        }
        if (zoneMonitoring) {
          checkGeofences(lat, lng);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLiveTracking(false);
          setZoneMonitoring(false);
          localStorage.setItem('fs_geofence_monitoring', 'false');
          window.dispatchEvent(new CustomEvent('fs_zone_monitoring_change', { detail: false }));
          toast.error('Location permission blocked. Live tracking and zone monitoring have been turned off.');
        } else if (err.code === err.TIMEOUT) {
          toast.error('Location timed out. Check your GPS signal.');
        } else {
          toast.error('Could not get your location.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [liveTracking, zoneMonitoring, myCheckIn, geofences, family?.id, currentUser?.id, members]);

  const createCheckIn = useMutation({
    mutationFn: async ({ location: loc, address: addr, latitude: lat, longitude: lng, note: noteVal }) => {
      if (myCheckIn) await supabase.from('checkins').update({ cleared_at: new Date().toISOString() }).eq('id', myCheckIn.id);
      const { data: newCheckIn, error } = await supabase
        .from('checkins')
        .insert({
          family_id: family.id,
          user_id: currentUser.id,
          user_name: currentUser.display_name || currentUser.full_name || currentUser.email,
          user_avatar: currentUser.avatar || String.fromCodePoint(0x1f60a),
          location: loc,
          address: addr?.trim() || null,
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
      playCheckInSound();
      queryClient.invalidateQueries({ queryKey: ['checkins', family?.id] });
      await supabase.from('feed_items').insert({
        family_id: family.id,
        user_id: currentUser.id,
        user_name: currentUser.display_name || currentUser.full_name || currentUser.email,
        user_avatar: currentUser.avatar || String.fromCodePoint(0x1f60a),
        type: 'checkin',
        message: `${currentUser.display_name || currentUser.full_name || currentUser.email} checked in at ${data.location}`,
      });
      try {
        const pushRes = await fetch('/.netlify/functions/send-checkin-alert', {
          method: 'POST',
          body: JSON.stringify({
            family_id: family.id,
            excludeUserId: currentUser.id,
            user_name:
              currentUser.display_name || currentUser.full_name || currentUser.email,
            location: locationName,
          }),
        });
        if (!pushRes.ok) {
          const errText = await pushRes.text().catch(() => '');
          console.error('send-checkin-alert:', pushRes.status, errText);
        }
      } catch (e) {
        console.error('send-checkin-alert:', e);
      }
      setShowForm(false);
      setCoords(null);
      setLocationName('');
      setLocationAddress('');
      setNote('');
      setOverrideMapView(null);
    },
    onError: (error) => {
      console.error('Check-in failed:', error);
      toast.error('Check-in failed. Please try again.');
    },
  });

  const clearCheckIn = useMutation({
    mutationFn: async () => {
      const id = myCheckIn?.id;
      if (!id) throw new Error('No active check-in to clear.');
      const { error } = await supabase.from('checkins').update({ cleared_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins', family?.id] });
      setInfoCheckIn(null);
    },
  });

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    const fallbackLabel = (lat, lng) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const finish = async (lat, lng) => {
      try {
        const center = { lat, lng };
        setCoords(center);
        setUserGeo(center);
        setOverrideMapView({ center, zoom: 14 });
        const geo = await Promise.race([
          geocodeLatLngDetailed(lat, lng),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('geocode_timeout')), 10000);
          }),
        ]).catch(() => ({
          shortLabel: fallbackLabel(lat, lng),
          formattedAddress: fallbackLabel(lat, lng),
        }));
        setLocationName(geo.shortLabel);
        setLocationAddress(geo.formattedAddress);
        setShowForm(true);
      } catch {
        const fb = fallbackLabel(lat, lng);
        setLocationName(fb);
        setLocationAddress(fb);
        setShowForm(true);
      } finally {
        setGettingLocation(false);
      }
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationPermission('granted');
        void finish(pos.coords.latitude, pos.coords.longitude).catch(() => {
          setGettingLocation(false);
          toast.error('Could not open the check-in form. Try again or use the map search.');
        });
      },
      (err) => {
        setGettingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationPermission('denied');
          toast.error('Location permission denied. Please enable it in your browser/phone settings.');
        } else {
          toast.error('Could not get your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleCheckIn = () => {
    if (!coords || !locationName.trim()) return;
    createCheckIn.mutate({
      location: locationName.trim(),
      address: locationAddress.trim() || null,
      latitude: coords.lat,
      longitude: coords.lng,
      note: note.trim(),
    });
  };

  const cancelForm = () => {
    setShowForm(false);
    setOverrideMapView(null);
    setCoords(null);
    setLocationName('');
    setLocationAddress('');
    setNote('');
  };

  useEffect(() => {
    if (!showForm) return;
    const id = window.setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }, 150);
    return () => clearTimeout(id);
  }, [showForm]);

  const infoWindowMember = infoCheckIn ? getMemberForUser(infoCheckIn.user_id) : null;

  const checkInHeaderTwinkleStars = useMemo(
    () =>
      [...Array(18)].map((_, i) => ({
        i,
        w: Math.random() * 2.5 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        dur: Math.random() * 2 + 1.5,
        opacity: Math.random() * 0.6 + 0.3,
      })),
    []
  );

  if (isLoading) return <SkeletonCard count={3} />;

  return (
    <div className="space-y-5 pb-6">
      <div
        className="rounded-2xl p-4 mb-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 50%, #1e3a8a 100%)' }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {checkInHeaderTwinkleStars.map((s) => (
            <div
              key={s.i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                width: `${s.w}px`,
                height: `${s.w}px`,
                top: `${s.top}%`,
                left: `${s.left}%`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
                opacity: s.opacity,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <MapPin className="h-[18px] w-[18px] text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-xl font-bold text-white">Check-In</h2>
              <p className="text-white/70 text-xs">Share your location with family</p>
            </div>
          </div>

          {!myCheckIn ? (
            <button
              type="button"
              onClick={getLocation}
              disabled={gettingLocation}
              className="flex items-center gap-2 bg-white dark:bg-card text-primary text-sm font-semibold px-4 py-2.5 rounded-full transition-colors border border-white/30 dark:border-white/15 shrink-0 whitespace-nowrap disabled:opacity-60"
            >
              <Navigation className="w-4 h-4 text-primary shrink-0" />
              {gettingLocation
                ? 'Finding...'
                : locationPermission === 'denied'
                  ? 'Blocked'
                  : 'Share Location'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => clearCheckIn.mutate()}
              disabled={clearCheckIn.isPending}
              className="flex items-center gap-1.5 bg-white dark:bg-card text-primary text-xs font-semibold px-3 py-2 rounded-full transition-colors border border-white/30 dark:border-white/15 shrink-0 disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5 text-primary" />
              {clearCheckIn.isPending ? 'Clearing...' : 'Clear Pin'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div
          ref={formSectionRef}
          className="scroll-mt-24 rounded-2xl p-[18px] border-2 border-teal-600 dark:border-teal-500 bg-gradient-to-b from-teal-50 via-slate-50 to-white dark:from-teal-950/45 dark:via-card dark:to-card shadow-[0_10px_40px_rgba(13,148,136,0.18)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
          role="region"
          aria-label="Confirm check-in"
        >
          <p className="font-heading text-base font-extrabold text-teal-700 dark:text-teal-400 m-0 mb-1.5">
            Confirm your check-in
          </p>
          <p className="text-xs text-muted-foreground m-0 mb-3.5 leading-snug">
            Your location was found. Check the place name below, then tap{' '}
            <strong className="text-foreground font-semibold">Check In</strong> so your family can see you on the map.
          </p>
          <Input
            placeholder="Location name (e.g. Home, Work)"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <Input
            placeholder="What are you up to? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              onClick={handleCheckIn}
              disabled={!locationName.trim() || createCheckIn.isPending}
              style={{ flex: 1 }}
            >
              <MapPin style={{ width: 16, height: 16, marginRight: 4 }} />
              {createCheckIn.isPending ? 'Checking in...' : 'Check In'}
            </Button>
            <Button variant="outline" onClick={cancelForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl px-3 py-2 mb-3 text-center bg-teal-500/[0.08] dark:bg-teal-400/10 border border-teal-500/25 dark:border-teal-400/20">
        <p className="text-xs m-0 text-foreground">
          Share your location with family for check-ins they can trust. Live tracking and geofencing are available in the native app — coming soon.
        </p>
      </div>

      <div className="rounded-2xl p-3 mt-1 bg-card border border-border shadow-md">
        <p className="text-[13px] font-bold text-foreground mb-2.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
          Your Location
        </p>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '280px', borderRadius: '12px' }}
            mapContainerClassName="relative"
            center={mapCenter}
            zoom={mapZoom}
            options={{ fullscreenControl: false, mapTypeControl: false, styles: CLEAN_MAP_STYLE }}
          >
            <Input
              ref={searchInputRef}
              placeholder="Search for a place..."
              className="absolute top-3 left-0 right-0 z-10 px-3 w-full box-border bg-background shadow-md border-border h-10"
            />
            {activeCheckIns.map((checkin) => {
              if (checkin.latitude == null || checkin.longitude == null) return null;
              const member = getMemberForUser(checkin.user_id);
              const color = getMemberColor(checkin.user_id);
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
                    {checkInHasDistinctAddress(infoCheckIn) ? (
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        {trimAddress(infoCheckIn.address, 240)}
                      </p>
                    ) : null}
                    {infoCheckIn.note ? <p className="text-xs mt-1 text-foreground">{infoCheckIn.note}</p> : null}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatCheckInDetailTime(infoCheckIn.created_at)}
                    </p>
                  </div>
                </InfoWindow>
              )}
          </GoogleMap>
        ) : (
          <div
            style={{ width: '100%', height: '280px' }}
            className="bg-secondary rounded-xl flex items-center justify-center"
          >
            <p className="text-muted-foreground text-sm">Loading map...</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-md overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
            <p className="text-sm font-extrabold text-foreground">Active Check-Ins</p>
          </div>
          <button
            type="button"
            onClick={() => setHistoryExpanded((s) => !s)}
            className="flex items-center gap-1 text-[11px] font-bold rounded-lg px-2.5 py-1 bg-secondary text-secondary-foreground border-0 cursor-pointer"
          >
            <Clock className="w-[11px] h-[11px] shrink-0" aria-hidden />
            {historyExpanded ? 'Less' : 'History'}
          </button>
        </div>

        {activeCheckIns.length === 0 ? (
          <div className="px-4 py-3.5">
            <p className="text-xs text-muted-foreground m-0">
              No active check-ins tap <strong className="text-primary font-semibold">Share Location</strong> to appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activeCheckIns.map((ci) => {
              const member = getMemberForUser(ci.user_id);
              const color = getMemberColor(ci.user_id) || member?.member_color || '#6366f1';
              const displayName = member?.display_name || member?.full_name || ci.user_name || 'Member';
              const avatar = member?.avatar ?? ci.user_avatar;
              return (
                <div
                  key={ci.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="relative shrink-0">
                    <MemberAvatar
                      avatar={avatar}
                      avatarUrl={member?.avatar_url}
                      color={color}
                      size="md"
                      name={displayName}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card"
                      aria-hidden
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground mb-0.5">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 shrink-0 text-muted-foreground" aria-hidden />
                      {trimAddress(ci.location ?? '')}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground shrink-0 text-right">
                    {formatCheckInDetailTime(ci.created_at).split('·')[0].trim()}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {historyExpanded && (
          <div className="border-t border-border px-4 py-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2.5">
              History
            </p>
            <div className="space-y-2" aria-label="Check-in history">
              {historyGrouped.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No recent check-in history</p>
              ) : (
                historyGrouped.map((group) => (
                  <div key={group.dateKey} className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground pl-1">{group.label}</p>
                    <div className="space-y-1.5">
                      {group.items.map((ci) => {
                        const member = getMemberForUser(ci.user_id);
                        const color = getMemberColor(ci.user_id);
                        const displayName =
                          member?.display_name || member?.full_name || ci.user_name || 'Member';
                        const avatar = member?.avatar ?? ci.user_avatar;
                        return (
                          <div
                            key={ci.id}
                            className="flex items-center gap-3 p-3 surface-2"
                            style={{ borderLeftWidth: '4px', borderLeftColor: color }}
                          >
                            <MemberAvatar
                              avatar={avatar}
                              avatarUrl={member?.avatar_url}
                              color={color}
                              size="sm"
                              name={displayName}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{displayName}</p>
                              <p className="text-sm text-foreground flex items-start gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
                                <span className="min-w-0">{trimAddress(ci.location ?? '')}</span>
                              </p>
                              {checkInHasDistinctAddress(ci) ? (
                                <p className="text-xs text-muted-foreground mt-0.5 pl-4 leading-snug">{ci.address}</p>
                              ) : null}
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
          </div>
        )}
      </div>
    </div>
  );
}
