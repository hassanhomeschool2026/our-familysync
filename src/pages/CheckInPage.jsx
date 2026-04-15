import React, { useState, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, X, Clock } from 'lucide-react';
import MemberAvatar from '@/components/shared/MemberAvatar';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { formatDistanceToNow } from 'date-fns';

function checkInLabel(ci) {
  return ci.location ?? ci.location_name ?? '';
}

async function reverseGeocode(lat, lng) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HomeSync/1.0 (https://github.com/homesync)',
      },
    }
  );
  const data = await response.json();
  return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export default function CheckInPage() {
  const { family, currentUser, getMemberName } = useFamily();
  const queryClient = useQueryClient();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  });

  const [locationName, setLocationName] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coords, setCoords] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ['checkins', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('checkins')
        .select('*')
        .eq('family_id', family?.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!family?.id,
    refetchInterval: 60000,
  });

  const activeCheckIns = useMemo(
    () =>
      checkIns.filter((ci) => {
        if (!ci.expires_at) return true;
        return new Date(ci.expires_at) > new Date();
      }),
    [checkIns]
  );

  const myCheckIn = activeCheckIns.find((ci) => ci.user_id === currentUser?.id);

  const createCheckIn = useMutation({
    mutationFn: async ({ location: loc, latitude: lat, longitude: lng }) => {
      if (myCheckIn) await supabase.from('checkins').delete().eq('id', myCheckIn.id);
      const { data: newCheckIn } = await supabase
        .from('checkins')
        .insert({
          family_id: family.id,
          user_id: currentUser.id,
          user_name: currentUser.display_name || currentUser.full_name || currentUser.email,
          user_avatar: currentUser.avatar || String.fromCodePoint(0x1f60a),
          location: loc,
          latitude: lat,
          longitude: lng,
        })
        .select()
        .single();
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
    },
  });

  const clearCheckIn = useMutation({
    mutationFn: async () => {
      await supabase.from('checkins').delete().eq('id', myCheckIn.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkins', family?.id] }),
  });

  const getLocation = () => {
    setGettingLocation(true);
    const finish = async (lat, lng) => {
      setCoords({ lat, lng });
      try {
        const name = await reverseGeocode(lat, lng);
        setLocationName(name);
      } catch {
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } finally {
        setGettingLocation(false);
        setShowForm(true);
      }
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        finish(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        finish(40.7128, -74.006);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckIn = () => {
    if (!coords || !locationName.trim()) return;
    createCheckIn.mutate({
      location: locationName.trim(),
      latitude: coords.lat,
      longitude: coords.lng,
    });
  };

  if (isLoading) return <SkeletonCard count={3} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl font-bold">Check-In</h2>
        {myCheckIn ? (
          <Button size="sm" variant="outline" onClick={() => clearCheckIn.mutate()} className="rounded-full text-xs">
            <X className="w-3 h-3 mr-1" /> Clear My Pin
          </Button>
        ) : (
          <Button size="sm" onClick={getLocation} disabled={gettingLocation} className="rounded-full text-xs">
            <Navigation className="w-3 h-3 mr-1" />
            {gettingLocation ? 'Getting location...' : 'Share My Location'}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <Input
            placeholder="Location name (e.g. Home, Work)"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleCheckIn} disabled={!locationName.trim()} className="flex-1 rounded-xl">
              <MapPin className="w-4 h-4 mr-1" /> Check In
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '300px', borderRadius: '12px' }}
            center={
              activeCheckIns.length > 0 && activeCheckIns[0].latitude
                ? { lat: activeCheckIns[0].latitude, lng: activeCheckIns[0].longitude }
                : { lat: 32.9482, lng: -96.7970 }
            }
            zoom={13}
          >
            {activeCheckIns.map((checkin) =>
              checkin.latitude && checkin.longitude ? (
                <Marker
                  key={checkin.id}
                  position={{ lat: checkin.latitude, lng: checkin.longitude }}
                  title={checkin.user_name}
                />
              ) : null
            )}
          </GoogleMap>
        ) : (
          <div style={{ width: '100%', height: '300px' }} className="bg-secondary rounded-xl flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Loading map...</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Check-Ins</p>
        {activeCheckIns.length === 0 ? (
          <EmptyState
            emoji={String.fromCodePoint(0x1f4cd)}
            title="No active check-ins"
            description="Tap 'Share My Location' to let your family know where you are."
          />
        ) : (
          activeCheckIns.map((ci) => (
            <div key={ci.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <MemberAvatar avatar={ci.user_avatar} color={ci.member_color ?? '#6366f1'} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{ci.user_name || getMemberName(ci.user_id)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {checkInLabel(ci)}
                  {(ci.note || ci.status_message) && (
                    <span> · {ci.note ?? ci.status_message}</span>
                  )}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(ci.created_at ?? ci.created_date), { addSuffix: true })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
