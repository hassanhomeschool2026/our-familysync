import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { motion, useReducedMotion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import MemberAvatar from '@/components/shared/MemberAvatar';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, CheckSquare, Megaphone, Zap, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, startOfWeek, isAfter } from 'date-fns';
import { choreNeedsReset } from '@/lib/choresRecurrence';

const alertUrl = import.meta.env.DEV
  ? 'http://localhost:8888/.netlify/functions/send-family-alert'
  : '/.netlify/functions/send-family-alert';

const HeroBannerStyles = () => (
  <style>{`
    @keyframes sunPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
    @keyframes sunAtmos { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.08);opacity:0.8} }
    @keyframes moonGlow { 0%,100%{opacity:0.3} 50%{opacity:0.5} }
    @keyframes starTwinkle { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
    @keyframes cloudDrift { 0%{transform:translateX(0)} 100%{transform:translateX(20px)} }
    @keyframes rainFall { 0%{transform:translateY(-20px) rotate(8deg);opacity:0} 10%{opacity:1} 100%{transform:translateY(300px) rotate(8deg);opacity:0} }
    @keyframes snowDrift { 0%{transform:translateY(-10px) translateX(0);opacity:0} 10%{opacity:1} 100%{transform:translateY(300px) translateX(var(--drift));opacity:0} }
    @keyframes fogDrift { 0%{transform:translateX(-8%)} 100%{transform:translateX(8%)} }
  `}</style>
);

function getSkyKind(code) {
  if (code == null || code < 0) return 'clear';
  if ([0].includes(code)) return 'clear';
  if ([1, 2, 3, 45, 48].includes(code)) return 'cloudy';
  if ([71, 73, 75, 77].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 85, 86].includes(code)) return 'rainy';
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
  if (sky === 'snow') return '❄️';
  if (sky === 'storm') return '⛈️';
  return '🌧️';
}

function getWeatherDesc(code) {
  const sky = getSkyKind(code);
  if (sky === 'clear') return 'Clear skies';
  if (sky === 'cloudy') return 'Cloudy';
  if (sky === 'snow') return 'Snow';
  if (sky === 'storm') return 'Thunderstorm';
  if (sky === 'rainy') return 'Rain';
  return 'Mixed';
}

function getHeroTheme(hour, sky) {
  if (sky === 'storm') return {
    skyBg: 'linear-gradient(180deg, #0a0a0f 0%, #141820 30%, #1a2030 60%, #22293c 100%)',
    midLayer: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(20,30,50,0.3) 100%)',
    glowLayer: null,
    textColor: '#ffffff',
    subColor: 'rgba(180,200,230,0.75)',
    textShadow: '0 2px 14px rgba(0,0,0,0.9)',
    scene: 'storm',
    sunPos: null, moonPos: null,
  };
  if (sky === 'rainy') return {
    skyBg: 'linear-gradient(180deg, #1c2833 0%, #2c3e50 25%, #4a6174 60%, #607880 100%)',
    midLayer: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 50%)',
    glowLayer: null,
    textColor: '#ffffff',
    subColor: 'rgba(200,220,235,0.8)',
    textShadow: '0 2px 12px rgba(0,0,0,0.7)',
    scene: 'rainy',
    sunPos: null, moonPos: null,
  };
  if (sky === 'snow') return {
    skyBg: 'linear-gradient(180deg, #b0bec5 0%, #cfd8dc 30%, #dde4e8 60%, #eff3f5 100%)',
    midLayer: 'linear-gradient(180deg, transparent 50%, rgba(255,255,255,0.3) 100%)',
    glowLayer: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 50%)',
    textColor: '#1a2a3a',
    subColor: 'rgba(26,42,58,0.7)',
    textShadow: '0 2px 8px rgba(255,255,255,0.6)',
    scene: 'snow',
    sunPos: null, moonPos: null,
  };

  const isCloudy = sky === 'cloudy';

  if (hour >= 22 || hour < 5) return {
    skyBg: isCloudy
      ? 'linear-gradient(180deg, #1c2340 0%, #0f1628 50%, #080e1e 100%)'
      : 'linear-gradient(180deg, #020408 0%, #050d1a 20%, #071428 50%, #102850 100%)',
    midLayer: isCloudy
      ? 'radial-gradient(ellipse at 50% 0%, rgba(60,70,120,0.3) 0%, transparent 60%)'
      : 'radial-gradient(ellipse at 30% 20%, rgba(60,40,120,0.3) 0%, transparent 50%)',
    glowLayer: null,
    textColor: '#ffffff',
    subColor: 'rgba(180,200,255,0.7)',
    textShadow: '0 2px 12px rgba(0,0,0,0.9)',
    scene: isCloudy ? 'night-cloudy' : 'night',
    sunPos: null,
    moonPos: isCloudy ? null : { x: '72%', y: '22%' },
  };

  if (hour >= 5 && hour < 7) return {
    skyBg: 'linear-gradient(180deg, #1a0533 0%, #4a1060 15%, #8b2252 30%, #c45c7a 45%, #e8956d 62%, #f5c97a 78%, #fde8b0 92%, #fff5d6 100%)',
    midLayer: 'linear-gradient(180deg, transparent 40%, rgba(255,140,80,0.3) 70%, rgba(255,200,100,0.5) 100%)',
    glowLayer: 'radial-gradient(ellipse at 50% 90%, rgba(255,160,60,0.6) 0%, rgba(255,100,80,0.3) 30%, transparent 65%)',
    textColor: '#ffffff',
    subColor: 'rgba(255,230,200,0.85)',
    textShadow: '0 2px 12px rgba(80,20,0,0.6)',
    scene: 'dawn',
    sunPos: { x: '50%', y: '88%', color: '#FFCC02', glow: 'rgba(255,160,60,0.9)', size: 50 },
    moonPos: null,
  };

  if (hour >= 7 && hour < 12) return {
    skyBg: isCloudy
      ? 'linear-gradient(180deg, #546e7a 0%, #78909c 25%, #90a4ae 50%, #cfd8dc 80%, #eceff1 100%)'
      : 'linear-gradient(180deg, #0a4a8f 0%, #1565c0 20%, #2196f3 40%, #42a5f5 60%, #81d4fa 80%, #e1f5fe 95%, #fff8e1 100%)',
    midLayer: isCloudy
      ? 'linear-gradient(180deg, transparent 50%, rgba(255,255,255,0.2) 100%)'
      : 'linear-gradient(180deg, transparent 60%, rgba(255,220,100,0.2) 85%, rgba(255,240,180,0.3) 100%)',
    glowLayer: isCloudy
      ? 'radial-gradient(ellipse at 60% 95%, rgba(255,255,255,0.35) 0%, transparent 50%)'
      : 'radial-gradient(ellipse at 76% 88%, rgba(255,230,80,0.65) 0%, rgba(255,200,50,0.3) 25%, transparent 55%)',
    textColor: isCloudy ? '#1c2e3d' : '#0d2137',
    subColor: isCloudy ? 'rgba(28,46,61,0.7)' : 'rgba(13,33,55,0.7)',
    textShadow: isCloudy ? '0 2px 8px rgba(255,255,255,0.5)' : '0 2px 10px rgba(255,255,255,0.6)',
    scene: isCloudy ? 'cloudy' : 'morning',
    sunPos: isCloudy ? null : { x: '76%', y: '85%', color: '#FFF9C4', glow: 'rgba(255,230,80,0.8)', size: 52 },
    moonPos: null,
  };

  if (hour >= 12 && hour < 17) return {
    skyBg: isCloudy
      ? 'linear-gradient(180deg, #455a64 0%, #607d8b 30%, #78909c 60%, #b0bec5 90%, #cfd8dc 100%)'
      : 'linear-gradient(180deg, #0277bd 0%, #0288d1 20%, #29b6f6 45%, #81d4fa 70%, #e1f5fe 92%, #f5fbff 100%)',
    midLayer: isCloudy
      ? 'linear-gradient(180deg, transparent 50%, rgba(255,255,255,0.1) 100%)'
      : 'linear-gradient(180deg, transparent 70%, rgba(255,255,255,0.08) 100%)',
    glowLayer: isCloudy
      ? null
      : 'radial-gradient(ellipse at 82% 6%, rgba(255,250,200,0.45) 0%, rgba(255,230,100,0.2) 20%, transparent 45%)',
    textColor: isCloudy ? '#1c2e3d' : '#012a4a',
    subColor: isCloudy ? 'rgba(28,46,61,0.7)' : 'rgba(1,42,74,0.65)',
    textShadow: isCloudy ? '0 2px 8px rgba(255,255,255,0.4)' : '0 2px 10px rgba(255,255,255,0.5)',
    scene: isCloudy ? 'cloudy' : 'afternoon',
    sunPos: isCloudy ? null : { x: '82%', y: '10%', color: '#FFF9C4', glow: 'rgba(255,235,100,0.7)', size: 48 },
    moonPos: null,
  };

  if (hour >= 17 && hour < 20) return {
    skyBg: isCloudy
      ? 'linear-gradient(180deg, #3d4a6b 0%, #4a5568 40%, #556070 100%)'
      : 'linear-gradient(180deg, #0d1b3e 0%, #1a237e 12%, #7b3fa0 30%, #b5531a 50%, #e8761a 65%, #f5a623 75%, #fcd97a 85%, #fffde7 100%)',
    midLayer: isCloudy
      ? 'linear-gradient(180deg, transparent 50%, rgba(150,130,180,0.15) 100%)'
      : 'linear-gradient(180deg, transparent 35%, rgba(240,120,20,0.25) 65%, rgba(255,200,50,0.4) 100%)',
    glowLayer: isCloudy
      ? null
      : 'radial-gradient(ellipse at 55% 92%, rgba(255,160,30,0.75) 0%, rgba(255,100,20,0.4) 25%, rgba(180,50,100,0.2) 50%, transparent 70%)',
    textColor: '#ffffff',
    subColor: isCloudy ? 'rgba(220,220,255,0.75)' : 'rgba(255,220,160,0.9)',
    textShadow: isCloudy ? '0 2px 10px rgba(0,0,0,0.6)' : '0 2px 14px rgba(100,30,0,0.7)',
    scene: isCloudy ? 'cloudy' : 'golden-hour',
    sunPos: isCloudy ? null : { x: '55%', y: '90%', color: '#FFCC02', glow: 'rgba(255,160,30,0.9)', size: 60 },
    moonPos: null,
  };

  return {
    skyBg: isCloudy
      ? 'linear-gradient(180deg, #1e2840 0%, #2c3a55 50%, #3d4a6b 100%)'
      : 'linear-gradient(180deg, #0a0a1a 0%, #0d1b3e 20%, #2d1b69 50%, #4a1942 100%)',
    midLayer: isCloudy
      ? 'linear-gradient(180deg, transparent 50%, rgba(100,120,180,0.15) 100%)'
      : 'linear-gradient(180deg, transparent 40%, rgba(180,80,160,0.15) 100%)',
    glowLayer: null,
    textColor: '#ffffff',
    subColor: isCloudy ? 'rgba(200,210,255,0.7)' : 'rgba(180,200,255,0.65)',
    textShadow: '0 2px 12px rgba(0,0,0,0.8)',
    scene: isCloudy ? 'night-cloudy' : 'evening',
    sunPos: null,
    moonPos: isCloudy ? null : { x: '70%', y: '20%' },
  };
}

// Sun component
function HeroSun({ pos }) {
  if (!pos) return null;
  return (
    <div style={{
      position: 'absolute', left: pos.x, top: pos.y,
      transform: 'translate(-50%, -50%)',
      width: pos.size * 2.8, height: pos.size * 2.8,
      pointerEvents: 'none', zIndex: 1,
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `radial-gradient(circle, ${pos.glow} 0%, ${pos.glow.replace(/[\d.]+\)$/, '0.25)')} 35%, transparent 70%)`,
        animation: 'sunAtmos 4s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: '22%', borderRadius: '50%',
        background: `radial-gradient(circle, #FFFDE7 0%, ${pos.color} 40%, ${pos.glow} 75%, transparent 100%)`,
        animation: 'sunPulse 3s ease-in-out infinite',
        boxShadow: `0 0 ${pos.size}px ${pos.glow}, 0 0 ${pos.size * 2}px ${pos.glow.replace(/[\d.]+\)$/, '0.35)')}`,
      }} />
    </div>
  );
}

// Moon component
function HeroMoon({ pos }) {
  if (!pos) return null;
  return (
    <div style={{
      position: 'absolute', left: pos.x, top: pos.y,
      transform: 'translate(-50%, -50%)',
      width: 72, height: 72,
      pointerEvents: 'none', zIndex: 1,
    }}>
      <div style={{
        position: 'absolute', inset: -18, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,215,255,0.18) 0%, transparent 70%)',
        animation: 'moonGlow 5s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 14, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #f0f4ff 0%, #d8e0f0 40%, #b8c4e0 70%, #8090b8 100%)',
        boxShadow: 'inset -7px -3px 14px rgba(0,0,0,0.45), 0 0 18px rgba(180,200,255,0.3)',
      }} />
      <div style={{
        position: 'absolute', inset: 14, borderRadius: '50%',
        background: 'radial-gradient(circle at 68% 38%, rgba(0,5,20,0.5) 0%, transparent 52%)',
      }} />
    </div>
  );
}

// Stars
function HeroStars() {
  const stars = [
    {x:'8%',y:'10%',s:2.2,o:0.9,d:0},{x:'18%',y:'6%',s:1.4,o:0.7,d:0.8},
    {x:'32%',y:'14%',s:1.8,o:0.85,d:1.5},{x:'45%',y:'7%',s:1.4,o:0.75,d:0.4},
    {x:'55%',y:'16%',s:2.2,o:0.9,d:2},{x:'67%',y:'5%',s:1.4,o:0.8,d:0.6},
    {x:'78%',y:'12%',s:1.8,o:0.7,d:1.2},{x:'88%',y:'8%',s:1.4,o:0.85,d:1.8},
    {x:'12%',y:'24%',s:1.4,o:0.6,d:0.3},{x:'25%',y:'30%',s:1.8,o:0.75,d:1.1},
    {x:'38%',y:'22%',s:1.4,o:0.8,d:2.2},{x:'52%',y:'28%',s:2.2,o:0.9,d:0.7},
    {x:'63%',y:'20%',s:1.4,o:0.65,d:1.4},{x:'85%',y:'24%',s:1.4,o:0.7,d:1.7},
    {x:'42%',y:'38%',s:1.8,o:0.85,d:0.5},{x:'92%',y:'34%',s:1.4,o:0.75,d:2.5},
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: s.x, top: s.y,
          width: s.s, height: s.s, borderRadius: '50%',
          background: 'white', opacity: s.o,
          boxShadow: `0 0 ${s.s * 2}px rgba(180,200,255,0.9)`,
          animation: `starTwinkle ${2 + s.d * 0.4}s ease-in-out infinite`,
          animationDelay: `${s.d}s`,
        }} />
      ))}
    </div>
  );
}

// Clouds
function HeroClouds({ heavy, dark }) {
  const clouds = heavy ? [
    { top: '-5%', left: '-8%', w: 260, h: 80, o: 0.92, blur: 8, delay: 0 },
    { top: '-8%', left: '28%', w: 220, h: 68, o: 0.88, blur: 7, delay: 10 },
    { top: '5%', left: '58%', w: 180, h: 58, o: 0.82, blur: 6, delay: 5 },
    { top: '20%', left: '-5%', w: 160, h: 50, o: 0.72, blur: 5, delay: 15 },
    { top: '22%', left: '42%', w: 150, h: 46, o: 0.68, blur: 5, delay: 8 },
    { top: '35%', left: '68%', w: 130, h: 40, o: 0.62, blur: 4, delay: 20 },
  ] : [
    { top: '5%', left: '-3%', w: 180, h: 50, o: 0.82, blur: 6, delay: 0 },
    { top: '3%', left: '28%', w: 145, h: 40, o: 0.68, blur: 5, delay: 12 },
    { top: '18%', left: '58%', w: 120, h: 35, o: 0.58, blur: 4, delay: 7 },
    { top: '28%', left: '72%', w: 85, h: 26, o: 0.42, blur: 3, delay: 5 },
  ];

  const base = dark ? '#1e2836' : '#e8eef2';
  const highlight = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)';

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {clouds.map((c, i) => (
        <div key={i} style={{
          position: 'absolute', top: c.top, left: c.left,
          width: c.w, height: c.h,
          animation: `cloudDrift ${20 + c.delay}s ease-in-out infinite alternate`,
          animationDelay: `${c.delay * -1}s`,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 30% 40%, ${highlight} 0%, ${base} 65%)`,
            borderRadius: '50% 60% 40% 55% / 45% 50% 55% 40%',
            opacity: c.o, filter: `blur(${c.blur}px)`,
          }} />
          <div style={{
            position: 'absolute', top: '8%', left: '18%',
            width: '52%', height: '72%',
            background: `radial-gradient(circle, ${highlight} 0%, ${base} 72%)`,
            borderRadius: '50%', opacity: c.o * 0.7,
            filter: `blur(${c.blur - 1}px)`,
          }} />
          <div style={{
            position: 'absolute', top: '4%', left: '44%',
            width: '36%', height: '62%',
            background: `radial-gradient(circle, ${highlight} 0%, ${base} 72%)`,
            borderRadius: '50%', opacity: c.o * 0.62,
            filter: `blur(${c.blur - 1}px)`,
          }} />
        </div>
      ))}
    </div>
  );
}

// Rain
function HeroRain({ heavy }) {
  const count = heavy ? 32 : 20;
  const drops = Array.from({ length: count }, (_, i) => ({
    x: `${(i * (heavy ? 3.2 : 5.1)) % 100}%`,
    delay: (i * 0.13) % 1.5,
    dur: heavy ? 0.55 + (i % 3) * 0.1 : 0.85 + (i % 4) * 0.15,
    op: heavy ? 0.45 + (i % 3) * 0.1 : 0.3 + (i % 4) * 0.08,
    len: heavy ? 13 : 9,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}>
      {drops.map((d, i) => (
        <div key={i} style={{
          position: 'absolute', left: d.x, top: '-20px',
          width: 1.2, height: d.len,
          background: `linear-gradient(180deg, transparent, rgba(174,214,241,${d.op}))`,
          borderRadius: 2,
          animation: `rainFall ${d.dur}s linear infinite`,
          animationDelay: `${d.delay}s`,
          transform: 'rotate(8deg)',
        }} />
      ))}
    </div>
  );
}

// Snow
function HeroSnow() {
  const flakes = Array.from({ length: 22 }, (_, i) => ({
    x: `${(i * 4.6) % 100}%`,
    size: 3 + (i % 4),
    delay: (i * 0.32) % 4,
    dur: 3 + (i % 5) * 0.9,
    op: 0.6 + (i % 3) * 0.13,
    drift: `${(i % 2 === 0 ? 1 : -1) * (5 + (i % 4) * 3)}px`,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}>
      {flakes.map((f, i) => (
        <div key={i} style={{
          position: 'absolute', left: f.x, top: '-10px',
          width: f.size, height: f.size, borderRadius: '50%',
          background: 'white', opacity: f.op,
          filter: 'blur(0.5px)',
          boxShadow: `0 0 ${f.size}px rgba(255,255,255,0.8)`,
          animation: `snowDrift ${f.dur}s ease-in-out infinite`,
          animationDelay: `${f.delay}s`,
          '--drift': f.drift,
        }} />
      ))}
    </div>
  );
}

// Lightning
function HeroLightning() {
  const [flash, setFlash] = React.useState(false);
  React.useEffect(() => {
    const strike = () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 110);
      setTimeout(() => { setFlash(true); setTimeout(() => setFlash(false), 75); }, 190);
    };
    const id = setInterval(strike, 3500 + Math.random() * 3500);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
      background: 'rgba(200,220,255,0.55)',
      opacity: flash ? 1 : 0,
      transition: flash ? 'none' : 'opacity 0.35s',
    }} />
  );
}

// Fog
function HeroFog() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          position: 'absolute', left: '-20%', right: '-20%',
          top: `${12 + i * 22}%`, height: '38%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.38), rgba(255,255,255,0.48), rgba(255,255,255,0.33), transparent)',
          filter: 'blur(14px)',
          animation: `fogDrift ${8 + i * 3}s ease-in-out infinite alternate`,
          animationDelay: `${i * -2}s`,
          opacity: 0.7 - i * 0.08,
        }} />
      ))}
    </div>
  );
}


const cardSurface = 'shadow-sm hover:shadow-md transition-shadow duration-300 ease-out';

/** Brand: teal = action, purple = identity/highlight, gradient = premium sparingly */
const BRAND = {
  purple: '#7f30cb',
  gradient: 'linear-gradient(90deg, #7f30cb, #01dcba)',
};

const secondaryCardNavButtonClass =
  'flex items-center gap-1 rounded-lg border-0 bg-[#e8edf8] dark:bg-secondary py-[5px] px-[12px] font-bold text-[#1e3a8a] dark:text-primary shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]/25 dark:focus-visible:ring-primary/35';

const GRADIENT_HEADER_STAR_TWINKLE_CSS = `
@keyframes starTwinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
`;

const GRADIENT_HEADER_STARS = [
  { left: '5%', top: '25%', size: 1.8, delay: '0s', dur: '2.2s' },
  { left: '12%', top: '65%', size: 1.4, delay: '0.6s', dur: '3s' },
  { left: '22%', top: '30%', size: 2.2, delay: '1.1s', dur: '2.5s' },
  { left: '33%', top: '70%', size: 1.4, delay: '0.3s', dur: '2.8s' },
  { left: '45%', top: '20%', size: 1.8, delay: '1.5s', dur: '2s' },
  { left: '56%', top: '68%', size: 1.4, delay: '0.8s', dur: '3.2s' },
  { left: '66%', top: '28%', size: 2, delay: '0.4s', dur: '2.4s' },
  { left: '76%', top: '72%', size: 1.4, delay: '1.3s', dur: '2.7s' },
  { left: '86%', top: '35%', size: 2.2, delay: '0.2s', dur: '2.1s' },
  { left: '94%', top: '68%', size: 1.4, delay: '1.8s', dur: '3.1s' },
];

function GradientHeaderStarField() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        borderRadius: 'inherit',
        zIndex: 0,
      }}
    >
      {GRADIENT_HEADER_STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: 'white',
            animation: `starTwinkle ${s.dur} ease-in-out infinite`,
            animationDelay: s.delay,
            boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,0.8)`,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const { currentUser, family, members, isAdmin, getMemberColor } = useFamily();
  const [showAlertSheet, setShowAlertSheet] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);
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
  const completedTodayCount = chores.filter(
    (c) => c.completed && c.completed_at && isToday(new Date(c.completed_at))
  ).length;
  const totalChores = chores.length;
  const choreProgressPct = totalChores ? (completedTodayCount / totalChores) * 100 : 0;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const pointsByMember = {};
  for (const c of chores) {
    if (!c.completed || !c.completed_at || choreNeedsReset(c)) continue;
    const completedAt = new Date(c.completed_at);
    if (!(isAfter(completedAt, weekStart) || completedAt.getTime() === weekStart.getTime())) continue;
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
  const sky = getSkyKind(weather?.weathercode ?? -1);
  const theme = getHeroTheme(hour, sky);

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
        className={`shadow-md rounded-2xl ${cardSurface}`}
      >
        <HeroBannerStyles />
        <div className="rounded-2xl relative overflow-hidden" style={{ height: 148, background: theme.skyBg }}>
          {/* Atmospheric layers */}
          {theme.midLayer && (
            <div style={{ position: 'absolute', inset: 0, background: theme.midLayer, pointerEvents: 'none' }} />
          )}
          {theme.glowLayer && (
            <div style={{ position: 'absolute', inset: 0, background: theme.glowLayer, pointerEvents: 'none' }} />
          )}

          {/* Celestial bodies */}
          <HeroSun pos={theme.sunPos} />
          <HeroMoon pos={theme.moonPos} />

          {/* Stars — night only */}
          {(theme.scene === 'night' || theme.scene === 'evening') && <HeroStars />}

          {/* Clouds */}
          {['cloudy','night-cloudy','morning-cloudy','afternoon-cloudy'].includes(theme.scene) && (
            <HeroClouds heavy={true} dark={['night-cloudy'].includes(theme.scene)} />
          )}
          {['morning','afternoon','golden-hour','dusk'].includes(theme.scene) && (
            <HeroClouds heavy={false} dark={false} />
          )}
          {theme.scene === 'storm' && <HeroClouds heavy={true} dark={true} />}

          {/* Weather effects */}
          {theme.scene === 'rainy' && <HeroRain heavy={false} />}
          {theme.scene === 'storm' && <HeroRain heavy={true} />}
          {theme.scene === 'storm' && <HeroLightning />}
          {theme.scene === 'snow' && <HeroSnow />}

          {/* Bottom fade for depth */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.12) 0%, transparent 100%)',
            pointerEvents: 'none', zIndex: 1,
          }} />

          {/* Content */}
          <div className="absolute inset-0 flex items-start justify-between p-5" style={{ zIndex: 10 }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: theme.subColor, textShadow: theme.textShadow, marginBottom: 2 }}>
                {getGreeting()},
              </p>
              <h1 className="font-heading text-2xl font-bold" style={{ color: theme.textColor, textShadow: theme.textShadow, lineHeight: 1.15, marginBottom: 4 }}>
                {firstName}!
              </h1>
              <p className="text-xs" style={{ color: theme.subColor, textShadow: theme.textShadow }}>
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
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
                  borderRadius: 14, padding: '9px 13px', textAlign: 'right',
                  minWidth: 85, flexShrink: 0, marginLeft: 12,
                  textDecoration: 'none', display: 'block',
                }}
              >
                <div className="text-xs font-semibold" style={{ color: theme.subColor, textShadow: theme.textShadow, marginBottom: 3 }}>
                  {getWeatherIcon(weather.weathercode)} Forecast
                </div>
                <div className="font-bold text-lg" style={{ color: theme.textColor, textShadow: theme.textShadow, lineHeight: 1 }}>
                  {Math.round(weather.temperature)}°F
                </div>
                <div className="text-[10px]" style={{ color: theme.subColor, textShadow: theme.textShadow, marginTop: 3 }}>
                  {getWeatherDesc(weather.weathercode)}
                </div>
                {cityName ? (
                  <div className="text-[10px]" style={{ color: theme.subColor, textShadow: theme.textShadow, marginTop: 1 }}>
                    {cityName}
                  </div>
                ) : null}
              </motion.a>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        whileHover={reduceMotion ? undefined : hoverCard}
        className={`surface-1 p-4 ${cardSurface}`}
      >
        <div className="rounded-xl overflow-hidden border border-border">
          <div
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
              boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
              padding: '12px 16px',
            }}
          >
            <GradientHeaderStarField />
            <style>{GRADIENT_HEADER_STAR_TWINKLE_CSS}</style>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
              }}
            />
            <div className="relative z-[1] flex items-center justify-between">
              <p className="font-heading text-sm font-bold" style={{ color: '#ffffff' }}>
                {family?.name ? `${family.name} Family Check-ins` : 'Family Check-ins'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/checkin')}
                className={`text-xs w-fit ${secondaryCardNavButtonClass}`}
              >
                View Map <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />
              </button>
            </div>
          </div>
          <div className="p-4 bg-card">
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
          </div>
        </div>
      </motion.div>

      <motion.div variants={gridParentVariants} className="grid grid-cols-2 gap-3">
        <motion.div
          variants={itemVariants}
          whileHover={reduceMotion ? undefined : hoverCard}
          className={`surface-1 p-3 ${cardSurface}`}
        >
          <div className="rounded-xl overflow-hidden border border-border">
            <div
              className="relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
                boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
                padding: '12px 16px',
              }}
            >
              <GradientHeaderStarField />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
                }}
              />
              <div className="relative z-[1] flex items-center justify-between">
                <p className="font-heading text-xs font-bold" style={{ color: '#ffffff' }}>Today&apos;s events</p>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
                >
                  {todayEvents.length}
                </span>
              </div>
            </div>
            <div className="p-3 bg-card">
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
            className={`text-[10px] mt-2 w-fit ${secondaryCardNavButtonClass}`}
          >
            View Calendar <ChevronRight className="w-2.5 h-2.5 shrink-0" aria-hidden />
          </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={reduceMotion ? undefined : hoverCard}
          className={`surface-1 p-3 ${cardSurface}`}
        >
          <div className="rounded-xl overflow-hidden border border-border">
            <div
              className="relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
                boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
                padding: '12px 16px',
              }}
            >
              <GradientHeaderStarField />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
                }}
              />
              <div className="relative z-[1] flex items-center justify-between">
                <p className="font-heading text-xs font-bold" style={{ color: '#ffffff' }}>Tasks due</p>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
                >
                  {dueTasks.length}
                </span>
              </div>
            </div>
            <div className="p-3 bg-card">
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
            className={`text-[10px] mt-2 w-fit ${secondaryCardNavButtonClass}`}
          >
            Go to To-Do <ChevronRight className="w-2.5 h-2.5 shrink-0" aria-hidden />
          </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        whileHover={reduceMotion ? undefined : hoverCard}
        className={`surface-1 p-4 ${cardSurface}`}
      >
        <div
          className="relative overflow-hidden mb-2 rounded-xl border border-border"
          style={{
            background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
            boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
            padding: '12px 16px',
          }}
        >
          <GradientHeaderStarField />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
            }}
          />
          <div className="relative z-[1] flex items-center justify-between">
            <p className="font-heading text-sm font-bold" style={{ color: '#ffffff' }}>Chore progress</p>
            {maxStreak > 0 && (
              <motion.span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.06, duration: 0.3, ease: easeOut }}
              >
                {maxStreak}-day streak
              </motion.span>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {completedTodayCount} of {totalChores} completed today
        </p>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-3">
          <motion.div
            key={`chore-fill-${completedTodayCount}-${totalChores}`}
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
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-[rgba(127,48,203,0.08)] dark:bg-[rgba(167,139,250,0.1)]">
            <MemberAvatar
              avatar={topHelper.member.avatar}
              avatarUrl={topHelper.member?.avatar_url}
              color={topHelper.member.member_color}
              size="sm"
              name={topHelper.member.display_name || topHelper.member.full_name}
            />
            <p className="text-xs font-medium flex-1 text-[#7f30cb] dark:text-violet-300">
              Top helper: {topHelper.member.display_name || topHelper.member.full_name}
            </p>
            <p className="text-xs font-bold text-[#7f30cb] dark:text-violet-300">⭐ {topHelper.pts} pts</p>
          </div>
        )}
        <motion.button
          type="button"
          onClick={() => navigate('/chores')}
          whileTap={tapSmall}
          className={`text-xs mt-2 w-fit ${secondaryCardNavButtonClass}`}
        >
          View Chores <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />
        </motion.button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div
          className="relative overflow-hidden mb-2 rounded-xl border border-border"
          style={{
            background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
            boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
            padding: '12px 16px',
          }}
        >
          <GradientHeaderStarField />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
            }}
          />
          <p className="relative z-[1] text-sm font-semibold flex items-center gap-1.5" style={{ color: '#ffffff' }}>
            <motion.span
              className="inline-flex"
              initial={reduceMotion ? false : { opacity: 0, rotate: -6 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.32, ease: easeOut }}
            >
              <Zap className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.9)' }} />
            </motion.span>
            Quick actions
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: 'Add Event',
              icon: Calendar,
              action: () => navigate('/calendar'),
            },
            {
              label: 'Add Task',
              icon: CheckSquare,
              action: () => navigate('/todo'),
            },
            {
              label: 'Check In',
              icon: MapPin,
              action: () => navigate('/checkin'),
            },
            {
              label: 'Send Alert',
              icon: Megaphone,
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
                className="flex flex-col items-center p-3 gap-1.5 h-auto w-full rounded-2xl border border-border/60 dark:border-white/10 bg-gradient-to-br from-teal-500/[0.12] to-sky-500/[0.10] dark:from-teal-400/20 dark:to-sky-500/15 shadow-[0_6px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/25 dark:focus-visible:ring-primary/40"
              >
                <div
                  className="flex items-center justify-center shrink-0 rounded-full bg-white p-2 shadow-md dark:bg-card dark:shadow-black/20"
                >
                  <a.icon className="w-4 h-4 shrink-0 text-primary" aria-hidden />
                </div>
                <p className="text-[9px] font-bold text-center text-foreground leading-tight">{a.label}</p>
              </motion.button>
            ))}
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        whileHover={reduceMotion ? undefined : hoverCard}
        className={`bg-gradient-to-br from-card to-[#2f9db6]/[0.04] border border-border rounded-2xl p-4 mb-4 ${cardSurface}`}
      >
        <div
          className="relative overflow-hidden mb-3 rounded-xl border border-border"
          style={{
            background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
            boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
            padding: '12px 16px',
          }}
        >
          <GradientHeaderStarField />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
            }}
          />
          <div className="relative z-[1] flex items-center justify-between">
            <h3 className="font-heading font-semibold text-sm" style={{ color: '#ffffff' }}>Recent Activity</h3>
            <motion.button
              type="button"
              onClick={() => navigate('/feed')}
              whileTap={tapSmall}
              className={`text-xs w-fit ${secondaryCardNavButtonClass}`}
            >
              View all
            </motion.button>
          </div>
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

      <button
        type="button"
        onClick={() => setShowAlertSheet(true)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center bg-red-500"
        aria-label="Send Family Alert"
      >
        <Megaphone className="w-6 h-6" />
      </button>

      {showAlertSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowAlertSheet(false)}
        >
          <div
            className="w-full bg-card rounded-t-2xl p-5 pb-24 space-y-4 border-t border-border max-w-lg mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-purple-500" />
                </div>
                <p className="font-heading font-bold text-base">Family Update</p>
              </div>
              <button type="button" onClick={() => setShowAlertSheet(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <textarea
              className="w-full border border-border rounded-xl p-3 text-sm resize-none h-24 bg-background"
              placeholder="Type a message to send to your family..."
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
            />
            <Button
              className="w-full rounded-full text-white font-semibold border-0 hover:opacity-95"
              style={{ background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #7f30cb 100%)' }}
              disabled={!alertMessage.trim() || sendingAlert}
              onClick={async () => {
                setSendingAlert(true);
                try {
                  await supabase.from('feed_items').insert({
                    family_id: family.id,
                    user_id: currentUser.id,
                    user_name: currentUser.display_name || currentUser.full_name,
                    user_avatar: currentUser.avatar,
                    type: 'family_alert',
                    message: `Family Update: ${alertMessage.trim()}`,
                  });
                  const pushRes = await fetch(alertUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                      family_id: family.id,
                      title: 'Family Update',
                      body: alertMessage.trim(),
                    }),
                  });
                  if (!pushRes.ok) {
                    const errText = await pushRes.text().catch(() => '');
                    throw new Error(errText || `push ${pushRes.status}`);
                  }
                  toast.success('Update sent!');
                  setAlertMessage('');
                  setShowAlertSheet(false);
                } catch {
                  toast.error('Failed to send update.');
                } finally {
                  setSendingAlert(false);
                }
              }}
            >
              {sendingAlert ? 'Sending...' : 'Send Update'}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
