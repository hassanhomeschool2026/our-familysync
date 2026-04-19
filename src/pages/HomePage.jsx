import React, { useEffect, useState } from 'react';
import CalendarPage from './CalendarPage';

export default function HomePage() {
  const [_weather, setWeather] = useState(null);
  const [_cityName, setCityName] = useState('');

  useEffect(() => {
    const fetchWeatherByIP = async () => {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        const { latitude: lat, longitude: lng, city } = ipData;
        if (!lat || !lng) return;
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=fahrenheit`
        );
        const weatherData = await weatherRes.json();
        setWeather(weatherData.current_weather);
        setCityName(city || '');
      } catch {}
    };
    fetchWeatherByIP();
  }, []);

  return (
    <>
      <CalendarPage />
    </>
  );
}
