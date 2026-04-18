import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import MemberAvatar from '@/components/shared/MemberAvatar';
import { MapPin, Calendar, CheckSquare, Megaphone, Zap, ChevronRight } from 'lucide-react';
import { format, isToday } from 'date-fns';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getWeatherIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 3) return '☁️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

function getWeatherDesc(code) {
  if (code === 0) return 'Clear skies';
  if (code <= 2) return 'Partly cloudy';
  if (code <= 3) return 'Overcast';
  if (code <= 51) return 'Light drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Showers';
  return 'Thunderstorm';
}

const getHeaderTheme = (hour, weatherCode) => {
  const isRainy = weatherCode >= 51 && weatherCode <= 82;
  const isCloudy = weatherCode >= 2 && weatherCode <= 3;
  const isSunny = weatherCode === 0 || weatherCode === 1;

  if (isRainy) return {
    bg: 'linear-gradient(135deg, #b0bec5 0%, #90a4ae 50%, #78909c 100%)',
    textColor: 'text-white',
    subColor: 'text-white/70',
    scene: 'rainy',
  };

  if (hour >= 6 && hour < 12) return {
    bg: isCloudy
      ? 'linear-gradient(135deg, #b0c4d8 0%, #c5d5e8 100%)'
      : 'linear-gradient(135deg, #89c4e1 0%, #ffd89b 100%)',
    textColor: 'text-slate-800',
    subColor: 'text-slate-600',
    scene: isCloudy ? 'cloudy' : 'morning',
  };

  if (hour >= 12 && hour < 18) return {
    bg: isCloudy
      ? 'linear-gradient(135deg, #c9d6df 0%, #e2e8f0 100%)'
      : 'linear-gradient(135deg, #f6d365 0%, #89c4e1 100%)',
    textColor: 'text-slate-800',
    subColor: 'text-slate-600',
    scene: isCloudy ? 'cloudy' : 'afternoon',
  };

  if (hour >= 18 && hour < 22) return {
    bg: 'linear-gradient(135deg, #c9a0dc 0%, #f4a261 50%, #264653 100%)',
    textColor: 'text-white',
    subColor: 'text-white/75',
    scene: 'evening',
  };

  return {
    bg: 'linear-gradient(135deg, #0f0c29 0%, #1a1a4e 50%, #24243e 100%)',
    textColor: 'text-white',
    subColor: 'text-white/60',
    scene: 'night',
  };
};

const HeaderScene = ({ scene }) => {
  if (scene === 'morning' || scene === 'afternoon') return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-80">
      <circle cx="60" cy="20" r="14" fill="#FCD34D" opacity="0.9"/>
      <ellipse cx="15" cy="40" rx="18" ry="8" fill="white" opacity="0.4"/>
      <ellipse cx="25" cy="38" rx="14" ry="7" fill="white" opacity="0.3"/>
      <ellipse cx="55" cy="48" rx="16" ry="7" fill="white" opacity="0.3"/>
      <ellipse cx="65" cy="46" rx="12" ry="6" fill="white" opacity="0.25"/>
    </svg>
  );

  if (scene === 'evening') return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-85">
      <ellipse cx="40" cy="55" rx="30" ry="8" fill="#F4A261" opacity="0.4"/>
      <circle cx="40" cy="42" r="16" fill="#F4A261" opacity="0.6"/>
      <ellipse cx="10" cy="30" rx="14" ry="6" fill="white" opacity="0.25"/>
      <ellipse cx="65" cy="25" rx="12" ry="5" fill="white" opacity="0.2"/>
    </svg>
  );

  if (scene === 'night') return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-90">
      <path d="M55 10 Q65 20 55 35 Q40 28 45 15 Q50 8 55 10Z" fill="white" opacity="0.85"/>
      <circle cx="20" cy="12" r="1.5" fill="white" opacity="0.8"/>
      <circle cx="35" cy="5" r="1" fill="white" opacity="0.7"/>
      <circle cx="10" cy="25" r="1" fill="white" opacity="0.6"/>
      <circle cx="70" cy="8" r="1.5" fill="white" opacity="0.75"/>
      <circle cx="60" cy="45" r="1" fill="white" opacity="0.5"/>
      <circle cx="25" cy="42" r="1" fill="white" opacity="0.4"/>
    </svg>
  );

  if (scene === 'rainy') return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-80">
      <ellipse cx="40" cy="18" rx="28" ry="12" fill="white" opacity="0.4"/>
      <ellipse cx="50" cy="14" rx="20" ry="10" fill="white" opacity="0.35"/>
      <line x1="20" y1="35" x2="16" y2="48" stroke="white" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
      <line x1="32" y1="33" x2="28" y2="46" stroke="white" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
      <line x1="44" y1="35" x2="40" y2="48" stroke="white" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
      <line x1="56" y1="33" x2="52" y2="46" stroke="white" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
    </svg>
  );

  if (scene === 'cloudy') return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-75">
      <ellipse cx="35" cy="25" rx="24" ry="11" fill="white" opacity="0.5"/>
      <ellipse cx="50" cy="20" rx="18" ry="9" fill="white" opacity="0.4"/>
      <ellipse cx="20" cy="40" rx="16" ry="7" fill="white" opacity="0.35"/>
      <ellipse cx="60" cy="42" rx="14" ry="6" fill="white" opacity="0.3"/>
    </svg>
  );

  return null;
};

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, family, members, isAdmin, getMemberColor } = useFamily();
  const [weather, setWeather] = useState(null);
  const [cityName, setCityName] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=fahrenheit`),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          ]);
          const weatherData = await weatherRes.json();
          const geoData = await geoRes.json();
          setWeather(weatherData.current_weather);
          setCityName(geoData.address?.city || geoData.address?.town || geoData.address?.village || '');
        } catch {}
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  const { data: events = [] } = useQuery({
    queryKey: ['events-home', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('family_id', family?.id)
        .order('date', { ascending: true });
      return data || [];
    },
    enabled: !!family?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-home', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', family?.id)
        .eq('completed', false)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!family?.id,
  });

  const { data: chores = [] } = useQuery({
    queryKey: ['chores-home', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('chores')
        .select('*')
        .eq('family_id', family?.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!family?.id,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ['checkins-home', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('checkins')
        .select('*')
        .eq('family_id', family?.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!family?.id,
  });

  const { data: feedItems = [] } = useQuery({
    queryKey: ['feed-home', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('feed_items')
        .select('*')
        .eq('family_id', family?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!family?.id,
  });

  const todayEvents = events.filter(e => isToday(new Date(e.date + 'T00:00:00')));
  const dueTasks = tasks.filter(t => !t.completed).slice(0, 3);
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
  const activeCheckIns = checkins.filter(c => !c.cleared_at && new Date(c.created_at) > eightHoursAgo);
  const completedChores = chores.filter(c => c.completed);
  const totalChores = chores.length;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const pointsByMember = {};
  for (const c of chores) {
    if (!c.completed || !c.completed_at) continue;
    if (new Date(c.completed_at) < weekStart) continue;
    const uid = c.completed_by;
    if (!uid) continue;
    pointsByMember[uid] = (pointsByMember[uid] || 0) + (c.point_value ?? 1);
  }
  const topHelper = Object.entries(pointsByMember)
    .map(([id, pts]) => ({ id, pts, member: members.find(m => m.id === id) }))
    .filter(x => x.member)
    .sort((a, b) => b.pts - a.pts)[0];

  const maxStreak = chores.length ? Math.max(...chores.map(c => c.streak_count || 0)) : 0;
  const name = currentUser?.display_name || currentUser?.full_name || 'there';
  const firstName = name.split(' ')[0];

  const hour = new Date().getHours();
  const theme = getHeaderTheme(hour, weather?.weathercode ?? -1);

  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: theme.bg }}
      >
        <div className="absolute inset-0 opacity-10 bg-white/5" />
        <div className="absolute bottom-0 right-0 opacity-60 pointer-events-none">
          <HeaderScene scene={theme.scene} />
        </div>
        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1">
            <p className={`text-sm ${theme.subColor}`}>{getGreeting()},</p>
            <h1 className={`font-heading text-2xl font-bold ${theme.textColor}`}>{firstName}!</h1>
            <p className={`text-xs mt-1 ${theme.subColor}`}>
              {activeCheckIns.length === members.length && members.length > 0
                ? 'Everyone is where they should be.'
                : `${activeCheckIns.length} of ${members.length} members checked in`}
            </p>
          </div>
          {weather && (
            <a
              href={`https://www.google.com/search?q=weather+${encodeURIComponent(cityName || 'today')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 text-right ml-3 flex-shrink-0 block hover:bg-white/25 transition-colors cursor-pointer"
            >
              <div className={`text-lg font-bold ${theme.textColor}`}>{Math.round(weather.temperature)}°F</div>
              <div className={`text-[10px] ${theme.subColor}`}>{getWeatherDesc(weather.weathercode)}</div>
              {cityName && <div className={`text-[10px] ${theme.subColor}`}>{cityName}</div>}
            </a>
          )}
        </div>
      </div>

      {/* Family Check-ins */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Family check-ins</p>
          <button onClick={() => navigate('/checkin')} className="text-xs text-primary font-medium flex items-center gap-0.5">
            View Map <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground">No members yet.</p>
        ) : (
          <div className="flex gap-4 flex-wrap">
            {members.map(m => {
              const checkin = activeCheckIns.find(c => c.user_id === m.id);
              return (
                <div key={m.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                  <div className="relative">
                    <MemberAvatar
                      avatar={m.avatar}
                      avatarUrl={m.avatar_url}
                      color={m.member_color}
                      size="lg"
                      name={m.display_name || m.full_name}
                    />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${checkin ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  </div>
                  <p className="text-xs font-medium text-center">{(m.display_name || m.full_name)?.split(' ')[0]}</p>
                  <p className="text-[9px] text-muted-foreground text-center">{checkin ? checkin.location?.split(',')[0] : 'No check-in'}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Events + Tasks */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-primary">Today's events</p>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{todayEvents.length}</span>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No events today</p>
          ) : (
            <div className="space-y-1.5">
              {todayEvents.slice(0, 3).map(ev => (
                <div key={ev.id} className="flex items-center gap-1.5">
                  <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: getMemberColor(ev.created_by) }} />
                  <div>
                    <p className="text-[10px] font-semibold truncate">{ev.title}</p>
                    <p className="text-[9px] text-muted-foreground">{ev.start_time ? format(new Date(`2000-01-01T${ev.start_time}`), 'h:mm a') : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate('/calendar')} className="text-[10px] text-primary mt-2 flex items-center gap-0.5">
            View Calendar <ChevronRight className="w-2.5 h-2.5" />
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-primary">Tasks due</p>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{dueTasks.length}</span>
          </div>
          {dueTasks.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">All caught up!</p>
          ) : (
            <div className="space-y-1.5">
              {dueTasks.map(t => (
                <div key={t.id} className="flex items-center gap-1.5">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${priorityColors[t.priority] || 'bg-muted text-muted-foreground'}`}>
                    {t.priority || 'low'}
                  </span>
                  <p className="text-[10px] font-medium truncate">{t.title}</p>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate('/todo')} className="text-[10px] text-primary mt-2 flex items-center gap-0.5">
            Go to To-Do <ChevronRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Chore Progress */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Chore progress</p>
          {maxStreak > 0 && (
            <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
              {maxStreak}-day streak
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-2">{completedChores.length} of {totalChores} completed today</p>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: totalChores ? `${(completedChores.length / totalChores) * 100}%` : '0%' }}
          />
        </div>
        {topHelper && (
          <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
            <MemberAvatar
              avatar={topHelper.member.avatar}
              avatarUrl={topHelper.member.avatar_url}
              color={topHelper.member.member_color}
              size="sm"
              name={topHelper.member.display_name || topHelper.member.full_name}
            />
            <p className="text-xs text-primary font-medium flex-1">
              Top helper: {topHelper.member.display_name || topHelper.member.full_name}
            </p>
            <p className="text-xs font-bold text-primary">⭐ {topHelper.pts} pts</p>
          </div>
        )}
        <button onClick={() => navigate('/chores')} className="text-xs text-primary mt-2 flex items-center gap-0.5">
          View Chores <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Quick actions</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Add Event', icon: Calendar, color: 'text-primary bg-primary/10', action: () => navigate('/calendar') },
            { label: 'Add Task', icon: CheckSquare, color: 'text-teal-600 bg-teal-50', action: () => navigate('/todo') },
            { label: 'Check In', icon: MapPin, color: 'text-orange-500 bg-orange-50', action: () => navigate('/checkin') },
            { label: 'Send Alert', icon: Megaphone, color: 'text-red-500 bg-red-50', action: () => navigate('/admin'), show: isAdmin },
          ].filter(a => a.show !== false).map((a) => (
            <button key={a.label} onClick={a.action} className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-secondary transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.color}`}>
                <a.icon className="w-4 h-4" />
              </div>
              <p className="text-[9px] font-semibold text-center text-muted-foreground">{a.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Recent activity</p>
          <button onClick={() => navigate('/feed')} className="text-xs text-primary font-medium flex items-center gap-0.5">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {feedItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {feedItems.map(item => {
              const member = members.find(m => m.id === item.user_id);
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <MemberAvatar
                    avatar={item.user_avatar}
                    avatarUrl={member?.avatar_url}
                    color={getMemberColor(item.user_id)}
                    size="sm"
                    name={item.user_name}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{item.message}</p>
                    <p className="text-[9px] text-muted-foreground">{format(new Date(item.created_at), 'h:mm a')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
