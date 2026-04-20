import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { motion, useReducedMotion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import MemberAvatar from '@/components/shared/MemberAvatar';
import { MapPin, Calendar, CheckSquare, Megaphone, Zap, ChevronRight } from 'lucide-react';
import { format, isToday } from 'date-fns';

const CLEAR_CODES = new Set([0]);
const CLOUDY_CODES = new Set([1, 2, 3, 45, 48]);
const RAINY_CODES = new Set([51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);

function getSkyKind(code) {
  if (code == null || code < 0) return 'clear';
  if (CLEAR_CODES.has(code)) return 'clear';
  if (CLOUDY_CODES.has(code)) return 'cloudy';
  if (RAINY_CODES.has(code)) return 'rainy';
  return 'cloudy';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 22 || h < 6) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getWeatherIcon(code) {
  const sky = getSkyKind(code);
  if (sky === 'clear') return '☀️';
  if (sky === 'cloudy') return '☁️';
  if ([71, 73, 75, 77].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌧️';
}

function getWeatherDesc(code) {
  const sky = getSkyKind(code);
  if (sky === 'clear') return 'Clear skies';
  if (sky === 'cloudy') return 'Cloudy';
  if ([71, 73, 75, 77].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  if (sky === 'rainy') return 'Rain';
  return 'Mixed';
}

function getHeaderTheme(hour, weatherCode, isDark) {
  const sky = getSkyKind(weatherCode);
  const isCloudy = sky === 'cloudy';

  if (isDark) {
    if (sky === 'rainy') {
      return {
        bg: 'linear-gradient(135deg, #2a3846 0%, #1D2A36 45%, #15202a 100%)',
        textColor: 'text-[#F5F7FA]',
        subColor: 'text-[#AAB4C3]',
        scene: 'rainy',
      };
    }
    if (hour >= 22 || hour < 6) {
      return {
        bg: 'linear-gradient(135deg, #243041 0%, #1D2A36 50%, #0F1720 100%)',
        textColor: 'text-[#F5F7FA]',
        subColor: 'text-[#AAB4C3]',
        scene: 'night',
      };
    }
    const scene =
      hour >= 6 && hour < 12 ? (isCloudy ? 'cloudy' : 'morning')
      : hour >= 12 && hour < 18 ? (isCloudy ? 'cloudy' : 'afternoon')
      : 'evening';
    return {
      bg: 'linear-gradient(135deg, #232c36 0%, #18212B 50%, #152028 100%)',
      textColor: 'text-[#F5F7FA]',
      subColor: 'text-[#AAB4C3]',
      scene,
    };
  }

  if (sky === 'rainy') {
    return {
      bg: 'linear-gradient(135deg, #7d8fa3 0%, #5c6b7a 45%, #4a5d6a 100%)',
      textColor: 'text-white',
      subColor: 'text-white/80',
      scene: 'rainy',
    };
  }

  const isClear = sky === 'clear';

  if (hour >= 22 || hour < 6) {
    return {
      bg: isCloudy
        ? 'linear-gradient(135deg, #1e2888 0%, #37474f 55%, #263238 100%)'
        : 'linear-gradient(135deg, #0f0c29 0%, #1a1a4e 50%, #24243e 100%)',
      textColor: 'text-white',
      subColor: 'text-white/65',
      scene: 'night',
    };
  }

  if (hour >= 6 && hour < 12) {
    return {
      bg: isCloudy
        ? 'linear-gradient(135deg, #bac7d0 0%, #cfd8dc 55%, #eceff1 100%)'
        : isClear
          ? 'linear-gradient(135deg, #7ec8f0 0%, #f0d78c 50%, #fff4d6 100%)'
          : 'linear-gradient(135deg, #89c4e1 0%, #ffd89b 100%)',
      textColor: 'text-slate-800',
      subColor: 'text-slate-600',
      scene: isCloudy ? 'cloudy' : 'morning',
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      bg: isCloudy
        ? 'linear-gradient(135deg, #d8e0e5 0%, #b0bec5 100%)'
        : 'linear-gradient(135deg, #fff8e7 0%, #b2dfdb 50%, #e8f5e9 100%)',
      textColor: 'text-slate-800',
      subColor: 'text-slate-600',
      scene: isCloudy ? 'cloudy' : 'afternoon',
    };
  }

  return {
    bg: isCloudy
      ? 'linear-gradient(135deg, #9599b0 0%, #6d597a 55%, #4a5568 100%)'
      : 'linear-gradient(135deg, #c9a0dc 0%, #f4a261 45%, #6d597a 100%)',
    textColor: 'text-white',
    subColor: 'text-white/75',
    scene: 'evening',
  };
}

function HeaderScene({ scene, reduceMotion }) {
  const id = React.useId().replace(/:/g, '');
  const blurBack = `heroCb${id}`;
  const blurFront = `heroCf${id}`;

  const driftSlow = reduceMotion
    ? {}
    : { x: [0, 5, -2, 0] };
  const driftFast = reduceMotion
    ? {}
    : { x: [0, -6, 3, 0] };
  const tSlow = { duration: 32, repeat: Infinity, ease: 'easeInOut' };
  const tFast = { duration: 20, repeat: Infinity, ease: 'easeInOut' };

  const defs = (
    <defs>
      <filter id={blurBack} x="-45%" y="-45%" width="190%" height="190%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
        </feMerge>
      </filter>
      <filter id={blurFront} x="-35%" y="-35%" width="170%" height="170%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.05" result="f" />
        <feMerge>
          <feMergeNode in="f" />
        </feMerge>
      </filter>
    </defs>
  );

  if (scene === 'morning' || scene === 'afternoon')
    return (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-[0.72]">
        {defs}
        <circle cx="60" cy="20" r="14" fill="#FCD34D" opacity="0.9" />
        <motion.g filter={`url(#${blurBack})`} opacity={0.2} animate={driftSlow} transition={tSlow}>
          <ellipse cx="12" cy="42" rx="20" ry="9" fill="white" />
          <ellipse cx="52" cy="50" rx="18" ry="8" fill="white" />
        </motion.g>
        <motion.g filter={`url(#${blurFront})`} opacity={0.3} animate={driftFast} transition={tFast}>
          <ellipse cx="18" cy="40" rx="16" ry="7" fill="white" />
          <ellipse cx="58" cy="47" rx="14" ry="6" fill="white" />
          <ellipse cx="68" cy="45" rx="11" ry="5" fill="white" />
        </motion.g>
      </svg>
    );

  if (scene === 'evening')
    return (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-[0.78]">
        {defs}
        <ellipse cx="40" cy="55" rx="30" ry="8" fill="#F4A261" opacity="0.4" />
        <circle cx="40" cy="42" r="16" fill="#F4A261" opacity="0.6" />
        <motion.g filter={`url(#${blurBack})`} opacity={0.18} animate={driftSlow} transition={tSlow}>
          <ellipse cx="8" cy="32" rx="16" ry="7" fill="white" />
          <ellipse cx="62" cy="28" rx="14" ry="6" fill="white" />
        </motion.g>
        <motion.g filter={`url(#${blurFront})`} opacity={0.26} animate={driftFast} transition={tFast}>
          <ellipse cx="12" cy="30" rx="13" ry="6" fill="white" />
          <ellipse cx="66" cy="26" rx="11" ry="5" fill="white" />
        </motion.g>
      </svg>
    );

  if (scene === 'night')
    return (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-90">
        <path d="M55 10 Q65 20 55 35 Q40 28 45 15 Q50 8 55 10Z" fill="white" opacity="0.85" />
        <circle cx="20" cy="12" r="1.5" fill="white" opacity="0.8" />
        <circle cx="35" cy="5" r="1" fill="white" opacity="0.7" />
        <circle cx="10" cy="25" r="1" fill="white" opacity="0.6" />
        <circle cx="70" cy="8" r="1.5" fill="white" opacity="0.75" />
        <circle cx="60" cy="45" r="1" fill="white" opacity="0.5" />
        <circle cx="25" cy="42" r="1" fill="white" opacity="0.4" />
      </svg>
    );

  if (scene === 'rainy')
    return (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-[0.68]">
        {defs}
        <motion.g filter={`url(#${blurBack})`} opacity={0.22} animate={driftSlow} transition={tSlow}>
          <ellipse cx="38" cy="20" rx="30" ry="13" fill="white" />
          <ellipse cx="52" cy="16" rx="22" ry="11" fill="white" />
        </motion.g>
        <motion.g filter={`url(#${blurFront})`} opacity={0.32} animate={driftFast} transition={tFast}>
          <ellipse cx="42" cy="19" rx="24" ry="11" fill="white" />
          <ellipse cx="54" cy="15" rx="18" ry="9" fill="white" />
        </motion.g>
        <g>
          <line x1="20" y1="35" x2="16" y2="48" stroke="white" strokeWidth="1.5" opacity="0.45" strokeLinecap="round" />
          <line x1="32" y1="33" x2="28" y2="46" stroke="white" strokeWidth="1.5" opacity="0.45" strokeLinecap="round" />
          <line x1="44" y1="35" x2="40" y2="48" stroke="white" strokeWidth="1.5" opacity="0.45" strokeLinecap="round" />
          <line x1="56" y1="33" x2="52" y2="46" stroke="white" strokeWidth="1.5" opacity="0.45" strokeLinecap="round" />
        </g>
      </svg>
    );

  if (scene === 'cloudy')
    return (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-[0.62]">
        {defs}
        <motion.g filter={`url(#${blurBack})`} opacity={0.2} animate={driftSlow} transition={tSlow}>
          <ellipse cx="32" cy="28" rx="26" ry="12" fill="white" />
          <ellipse cx="18" cy="42" rx="18" ry="8" fill="white" />
          <ellipse cx="62" cy="44" rx="16" ry="7" fill="white" />
        </motion.g>
        <motion.g filter={`url(#${blurFront})`} opacity={0.3} animate={driftFast} transition={tFast}>
          <ellipse cx="36" cy="26" rx="22" ry="10" fill="white" />
          <ellipse cx="52" cy="22" rx="17" ry="9" fill="white" />
          <ellipse cx="22" cy="40" rx="15" ry="7" fill="white" />
          <ellipse cx="60" cy="42" rx="13" ry="6" fill="white" />
        </motion.g>
      </svg>
    );

  return null;
}

const cardSurface = 'shadow-sm hover:shadow-md transition-shadow duration-300 ease-out';

/** Brand: teal = action, purple = identity/highlight, gradient = premium sparingly */
const BRAND = {
  purple: '#7f30cb',
  gradient: 'linear-gradient(90deg, #7f30cb, #01dcba)',
};

const actionLinkClass =
  'font-medium text-[#2f9db6] transition-colors hover:text-[#247a8f] active:text-[#1e6979]';

export default function HomePage() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const { currentUser, family, members, isAdmin, getMemberColor } = useFamily();
  const [weather, setWeather] = useState(null);
  const [cityName, setCityName] = useState('');
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const easeOut = useMemo(() => [0.22, 1, 0.36, 1], []);

  const containerVariants = useMemo(
    () => ({
      hidden: {},
      show: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.08,
          delayChildren: reduceMotion ? 0 : 0.045,
        },
      },
    }),
    [reduceMotion]
  );

  const heroVariants = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.52, ease: [0.16, 1, 0.32, 1] },
      },
    }),
    [reduceMotion]
  );

  const itemVariants = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.42, ease: easeOut },
      },
    }),
    [reduceMotion, easeOut]
  );

  const gridParentVariants = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
      show: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.42,
          ease: easeOut,
          staggerChildren: reduceMotion ? 0 : 0.075,
        },
      },
    }),
    [reduceMotion, easeOut]
  );

  const tapSmall = reduceMotion ? {} : { scale: 0.97 };
  const hoverCard = reduceMotion ? {} : { y: -2, transition: { duration: 0.22, ease: easeOut } };

  useEffect(() => {
    const fetchWeather = async (lat, lng) => {
      try {
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=fahrenheit`
        );
        const weatherData = await weatherRes.json();
        setWeather(weatherData.current_weather);
      } catch {}
    };

    const fetchCityName = async (lat, lng) => {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const geoData = await geoRes.json();
        setCityName(
          geoData.address?.city ||
          geoData.address?.town ||
          geoData.address?.village ||
          geoData.address?.county ||
          ''
        );
      } catch {}
    };

    const tryGPS = () => {
      if (!navigator.geolocation) {
        fallbackToIP();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          await Promise.all([fetchWeather(lat, lng), fetchCityName(lat, lng)]);
        },
        () => {
          fallbackToIP();
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
      );
    };

    const fallbackToIP = async () => {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        const { latitude: lat, longitude: lng, city } = ipData;
        if (!lat || !lng) return;
        await fetchWeather(lat, lng);
        setCityName(city || '');
      } catch {}
    };

    tryGPS();
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

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: feedItems = [] } = useQuery({
    queryKey: ['feed', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('feed_items')
        .select('*')
        .eq('family_id', family?.id)
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!family?.id,
  });

  const todayEvents = events.filter((e) => isToday(new Date(`${e.date}T00:00:00`)));
  const dueTasks = tasks.filter((t) => !t.completed).slice(0, 3);
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
  const activeCheckIns = checkins.filter((c) => !c.cleared_at && new Date(c.created_at) > eightHoursAgo);
  const completedChores = chores.filter((c) => c.completed);
  const totalChores = chores.length;
  const choreProgressPct = totalChores ? (completedChores.length / totalChores) * 100 : 0;

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
    .map(([id, pts]) => ({ id, pts, member: members.find((m) => m.id === id) }))
    .filter((x) => x.member)
    .sort((a, b) => b.pts - a.pts)[0];

  const maxStreak = chores.length ? Math.max(...chores.map((c) => c.streak_count || 0)) : 0;
  const name = currentUser?.display_name || currentUser?.full_name || 'there';
  const firstName = name.split(' ')[0];

  const hour = new Date().getHours();
  const isDarkMode = themeMounted && resolvedTheme === 'dark';
  const theme = getHeaderTheme(hour, weather?.weathercode ?? -1, isDarkMode);

  const heroLightForeground =
    isDarkMode ||
    theme.textColor.includes('white') ||
    theme.textColor.includes('F5F7FA');

  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };

  const weatherSearchUrl = `https://www.google.com/search?q=weather+${encodeURIComponent(cityName || 'today')}`;

  return (
    <motion.div
      className="space-y-4 pb-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div
        variants={heroVariants}
        whileHover={reduceMotion ? undefined : hoverCard}
        className={`rounded-2xl p-5 relative overflow-hidden shadow-md ${cardSurface}`}
        style={{ background: theme.bg }}
      >
        <div className="absolute inset-0 opacity-10 bg-white/5" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(127,48,203,0.045) 0%, transparent 42%, rgba(47,157,182,0.065) 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none z-[1] mix-blend-soft-light opacity-[0.35] dark:opacity-[0.22]"
          style={{
            background:
              'radial-gradient(ellipse 85% 65% at 18% 22%, rgba(255,255,255,0.5) 0%, transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 42%, rgba(0,0,0,0.04) 100%)',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 pointer-events-none z-[2]"
          style={{
            background: isDarkMode
              ? 'linear-gradient(to bottom, transparent 0%, transparent 45%, rgba(0,0,0,0.28) 82%, rgba(0,0,0,0.42) 100%)'
              : 'linear-gradient(to bottom, transparent 0%, transparent 52%, rgba(15,23,32,0.12) 88%, rgba(15,23,32,0.2) 100%)',
          }}
          aria-hidden
        />
        <motion.div
          className="absolute bottom-0 right-0 z-[3] opacity-[0.52] pointer-events-none"
          aria-hidden
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 0.52, scale: 1 }}
          transition={{ delay: 0.22, duration: 0.65, ease: easeOut }}
        >
          <HeaderScene scene={theme.scene} reduceMotion={reduceMotion} />
        </motion.div>
        <div className="flex items-start justify-between relative z-10">
          <div
            className={`flex-1 min-w-0 ${
              heroLightForeground
                ? '[filter:drop-shadow(0_1px_8px_rgba(0,0,0,0.28))]'
                : '[filter:drop-shadow(0_1px_6px_rgba(255,255,255,0.55))]'
            }`}
          >
            <p className={`text-sm ${theme.subColor}`}>{getGreeting()},</p>
            <h1 className={`font-heading text-2xl font-bold ${theme.textColor}`}>{firstName}!</h1>
            <p className={`text-xs mt-1 ${theme.subColor}`}>
              {activeCheckIns.length === members.length && members.length > 0
                ? 'Everyone is where they should be.'
                : `${activeCheckIns.length} of ${members.length} members checked in`}
            </p>
          </div>
          {weather && (
            <motion.a
              href={weatherSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={tapSmall}
              className="rounded-xl px-3 py-2 text-right ml-3 flex-shrink-0 cursor-pointer transition-[filter,box-shadow,background-color] no-underline relative overflow-hidden min-w-[5.5rem] border border-white/22 shadow-[0_6px_30px_rgba(0,0,0,0.075),0_0_36px_rgba(255,255,255,0.16),0_1px_0_rgba(255,255,255,0.16)_inset] backdrop-blur-lg backdrop-saturate-125 ring-1 ring-white/10 dark:border-white/20 dark:shadow-[0_8px_36px_rgba(0,0,0,0.38),0_0_32px_rgba(255,255,255,0.07),0_1px_0_rgba(255,255,255,0.08)_inset] dark:ring-white/8 bg-white/24 hover:bg-white/32 hover:ring-[rgba(47,157,182,0.26)] dark:bg-white/17 dark:hover:bg-white/22 dark:hover:ring-[rgba(47,157,182,0.36)]"
            >
              <div className="relative z-10 contrast-[1.07]">
                <div className={`text-xs mb-0.5 font-medium ${theme.subColor}`}>
                  {getWeatherIcon(weather.weathercode)} Forecast
                </div>
                <div className={`text-lg font-bold tracking-tight ${theme.textColor}`}>
                  {Math.round(weather.temperature)}°F
                </div>
                <div className={`text-[10px] font-medium ${theme.subColor}`}>
                  {getWeatherDesc(weather.weathercode)}
                </div>
                {cityName ? (
                  <div className={`text-[10px] font-medium ${theme.subColor}`}>{cityName}</div>
                ) : null}
              </div>
            </motion.a>
          )}
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        whileHover={reduceMotion ? undefined : hoverCard}
        className={`bg-gradient-to-br from-card to-[#2f9db6]/[0.05] border border-border rounded-xl p-4 ${cardSurface}`}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Family check-ins</p>
          <motion.button
            type="button"
            onClick={() => navigate('/checkin')}
            whileTap={tapSmall}
            className={`text-xs flex items-center gap-0.5 ${actionLinkClass}`}
          >
            View Map <ChevronRight className="w-3 h-3" />
          </motion.button>
        </div>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground">No members yet.</p>
        ) : (
          <div className="flex gap-4 flex-wrap">
            {members.map((m) => {
              const checkin = activeCheckIns.find((c) => c.user_id === m.id);
              return (
                <div key={m.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                  <div className="relative">
                    <MemberAvatar
                      avatar={m.avatar}
                      avatarUrl={m?.avatar_url}
                      color={m.member_color}
                      size="lg"
                      name={m.display_name || m.full_name}
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${checkin ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                      style={{
                        boxShadow: `0 0 0 1px ${getMemberColor(m.id)}`,
                      }}
                    />
                  </div>
                  <p className="text-xs font-medium text-center">{(m.display_name || m.full_name)?.split(' ')[0]}</p>
                  <p className="text-[9px] text-muted-foreground text-center">
                    {checkin ? checkin.location?.split(',')[0] : 'No check-in'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div variants={gridParentVariants} className="grid grid-cols-2 gap-3">
        <motion.div
          variants={itemVariants}
          whileHover={reduceMotion ? undefined : hoverCard}
          className={`bg-gradient-to-br from-card to-[#7f30cb]/[0.04] border border-border rounded-xl p-3 ${cardSurface}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#247a8f]">Today&apos;s events</p>
            <motion.span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(47,157,182,0.14)] text-[#247a8f]"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08, duration: 0.28, ease: easeOut }}
            >
              {todayEvents.length}
            </motion.span>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No events today</p>
          ) : (
            <div className="space-y-1.5">
              {todayEvents.slice(0, 3).map((ev) => (
                <div key={ev.id} className="flex items-center gap-1.5">
                  <div
                    className="w-1 h-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getMemberColor(ev.created_by) }}
                  />
                  <div>
                    <p className="text-[10px] font-semibold truncate">{ev.title}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {ev.start_time ? format(new Date(`2000-01-01T${ev.start_time}`), 'h:mm a') : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <motion.button
            type="button"
            onClick={() => navigate('/calendar')}
            whileTap={tapSmall}
            className={`text-[10px] mt-2 flex items-center gap-0.5 ${actionLinkClass}`}
          >
            View Calendar <ChevronRight className="w-2.5 h-2.5" />
          </motion.button>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={reduceMotion ? undefined : hoverCard}
          className={`bg-gradient-to-br from-card to-[#2f9db6]/[0.06] border border-border rounded-xl p-3 ${cardSurface}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#247a8f]">Tasks due</p>
            <motion.span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(47,157,182,0.14)] text-[#247a8f]"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08, duration: 0.28, ease: easeOut }}
            >
              {dueTasks.length}
            </motion.span>
          </div>
          {dueTasks.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">All caught up!</p>
          ) : (
            <div className="space-y-1.5">
              {dueTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-1.5 pl-1 border-l-[3px]" style={{ borderLeftColor: getMemberColor(t.assigned_to) }}>
                  <span
                    className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${priorityColors[t.priority] || 'bg-muted text-muted-foreground'}`}
                  >
                    {t.priority || 'low'}
                  </span>
                  <p className="text-[10px] font-medium truncate">{t.title}</p>
                </div>
              ))}
            </div>
          )}
          <motion.button
            type="button"
            onClick={() => navigate('/todo')}
            whileTap={tapSmall}
            className={`text-[10px] mt-2 flex items-center gap-0.5 ${actionLinkClass}`}
          >
            Go to To-Do <ChevronRight className="w-2.5 h-2.5" />
          </motion.button>
        </motion.div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        whileHover={reduceMotion ? undefined : hoverCard}
        className={`bg-gradient-to-br from-card to-[#7f30cb]/[0.05] border border-border rounded-xl p-4 ${cardSurface}`}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Chore progress</p>
          {maxStreak > 0 && (
            <motion.span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(127,48,203,0.14)] text-[#7f30cb]"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.06, duration: 0.3, ease: easeOut }}
            >
              {maxStreak}-day streak
            </motion.span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {completedChores.length} of {totalChores} completed today
        </p>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-3">
          <motion.div
            key={`chore-fill-${completedChores.length}-${totalChores}`}
            className="h-full rounded-full"
            style={{ transformOrigin: 'center center', background: BRAND.gradient }}
            initial={
              reduceMotion
                ? { width: `${choreProgressPct}%`, scaleY: 1 }
                : { width: 0, scaleY: 1 }
            }
            animate={{
              width: `${choreProgressPct}%`,
              scaleY: reduceMotion ? 1 : [1, 1.06, 1],
              boxShadow: reduceMotion
                ? '0 0 0 0 transparent'
                : [
                    '0 0 0 0 rgba(127, 48, 203, 0)',
                    '0 0 16px 2px rgba(47, 157, 182, 0.28)',
                    '0 0 0 0 rgba(1, 220, 186, 0)',
                  ],
            }}
            transition={{
              width: { duration: reduceMotion ? 0.2 : 0.75, ease: easeOut },
              scaleY: {
                duration: reduceMotion ? 0 : 0.55,
                ease: easeOut,
                times: [0, 0.38, 1],
              },
              boxShadow: {
                duration: reduceMotion ? 0 : 0.65,
                ease: easeOut,
                times: [0, 0.32, 1],
              },
            }}
          />
        </div>
        {topHelper && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-[rgba(127,48,203,0.08)]">
            <MemberAvatar
              avatar={topHelper.member.avatar}
              avatarUrl={topHelper.member?.avatar_url}
              color={topHelper.member.member_color}
              size="sm"
              name={topHelper.member.display_name || topHelper.member.full_name}
            />
            <p className="text-xs font-medium flex-1 text-[#7f30cb]">
              Top helper: {topHelper.member.display_name || topHelper.member.full_name}
            </p>
            <p className="text-xs font-bold text-[#7f30cb]">⭐ {topHelper.pts} pts</p>
          </div>
        )}
        <motion.button
          type="button"
          onClick={() => navigate('/chores')}
          whileTap={tapSmall}
          className={`text-xs mt-2 flex items-center gap-0.5 ${actionLinkClass}`}
        >
          View Chores <ChevronRight className="w-3 h-3" />
        </motion.button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <motion.span
            className="inline-flex"
            initial={reduceMotion ? false : { opacity: 0, rotate: -6 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 0.32, ease: easeOut }}
          >
            <Zap className="w-4 h-4 text-[#2f9db6]" />
          </motion.span>
          Quick actions
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: 'Add Event',
              icon: Calendar,
              tileBg: 'rgba(47, 157, 182, 0.06)',
              iconClass: 'text-[#247a8f] bg-[rgba(47,157,182,0.12)]',
              action: () => navigate('/calendar'),
            },
            {
              label: 'Add Task',
              icon: CheckSquare,
              tileBg: 'rgba(47, 157, 182, 0.09)',
              iconClass: 'text-[#2f9db6] bg-[rgba(47,157,182,0.14)]',
              action: () => navigate('/todo'),
            },
            {
              label: 'Check In',
              icon: MapPin,
              tileBg: 'linear-gradient(145deg, rgba(127,48,203,0.07), rgba(47,157,182,0.1))',
              iconClass: 'text-[#247a8f] bg-[rgba(47,157,182,0.15)]',
              action: () => navigate('/checkin'),
            },
            {
              label: 'Send Alert',
              icon: Megaphone,
              tileBg: 'rgba(245, 158, 11, 0.08)',
              iconClass: 'text-[#c2410c] bg-[rgba(245,158,11,0.14)]',
              action: () => navigate('/admin'),
              show: isAdmin,
            },
          ]
            .filter((a) => a.show !== false)
            .map((a) => (
              <motion.button
                key={a.label}
                type="button"
                onClick={a.action}
                whileTap={tapSmall}
                whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                transition={{ duration: 0.18, ease: easeOut }}
                style={{ background: a.tileBg }}
                className={`border border-border rounded-xl p-3 flex flex-col items-center gap-1.5 hover:brightness-[0.98] transition-[filter,box-shadow] ${cardSurface}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.iconClass}`}>
                  <a.icon className="w-4 h-4" />
                </div>
                <p className="text-[9px] font-semibold text-center text-muted-foreground">{a.label}</p>
              </motion.button>
            ))}
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        whileHover={reduceMotion ? undefined : hoverCard}
        className={`bg-gradient-to-br from-card to-[#2f9db6]/[0.04] border border-border rounded-2xl p-4 mb-4 ${cardSurface}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-sm">Recent Activity</h3>
          <motion.button
            type="button"
            onClick={() => navigate('/feed')}
            whileTap={tapSmall}
            className={`text-xs ${actionLinkClass}`}
          >
            View all
          </motion.button>
        </div>
        {feedItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {feedItems.map((item, i) => (
              <motion.div
                key={item.id}
                className="flex items-center gap-2 pl-2 border-l-[3px]"
                style={{ borderLeftColor: getMemberColor(item.user_id) }}
                initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.32,
                  ease: easeOut,
                  delay: reduceMotion ? 0 : i * 0.042,
                }}
              >
                <MemberAvatar
                  avatar={item.user_avatar}
                  avatarUrl={members.find((mem) => mem.id === item.user_id)?.avatar_url}
                  color={getMemberColor(item.user_id)}
                  size="sm"
                  name={item.user_name}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{item.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(item.created_at), 'h:mm a')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
