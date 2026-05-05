// =============================================================================
// useWeatherForecast — Open-Meteo API (no key, gratuit) — Chantier D 2026-05-05
//
// Pipeline en 2 calls :
//   1. Geocoding /v1/search → { latitude, longitude, name, country }
//   2. Forecast /v1/forecast → 5 jours (today + 4) avec :
//        - current.temperature_2m + weathercode (météo live)
//        - daily.temperature_2m_max/min + weathercode + time
//
// Cache mémoire 30 min (clé = ville normalisée). Rafraîchit côté UI à
// l'ouverture du popup. Pas de localStorage : on veut du frais à
// chaque session.
//
// Aucune clé API. Limite Open-Meteo non-commercial : 10 000 req/jour
// largement suffisant pour quelques distri.
// =============================================================================

import { useEffect, useState, useCallback } from "react";

export interface WeatherDay {
  /** ISO date YYYY-MM-DD */
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  /** Emoji + label dérivés du WMO code */
  emoji: string;
  label: string;
  /** Indice 0 = aujourd'hui */
  index: number;
}

export interface WeatherForecast {
  city: string;
  country?: string;
  current: {
    temp: number;
    weatherCode: number;
    emoji: string;
    label: string;
  };
  days: WeatherDay[]; // 5 entries (today + 4)
  fetchedAt: number;
}

export interface UseWeatherResult {
  forecast: WeatherForecast | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── WMO weather code mapping (Open-Meteo standard) ───────────────────
// Source : https://open-meteo.com/en/docs (section Weather variables)
const WMO_MAP: Record<number, { emoji: string; label: string }> = {
  0: { emoji: "☀️", label: "Ciel clair" },
  1: { emoji: "🌤", label: "Plutôt dégagé" },
  2: { emoji: "⛅", label: "Partiellement nuageux" },
  3: { emoji: "☁️", label: "Couvert" },
  45: { emoji: "🌫", label: "Brouillard" },
  48: { emoji: "🌫", label: "Brouillard givrant" },
  51: { emoji: "🌦", label: "Bruine légère" },
  53: { emoji: "🌦", label: "Bruine modérée" },
  55: { emoji: "🌦", label: "Bruine dense" },
  61: { emoji: "🌧", label: "Pluie faible" },
  63: { emoji: "🌧", label: "Pluie modérée" },
  65: { emoji: "🌧", label: "Pluie forte" },
  71: { emoji: "🌨", label: "Neige faible" },
  73: { emoji: "🌨", label: "Neige modérée" },
  75: { emoji: "🌨", label: "Neige forte" },
  77: { emoji: "🌨", label: "Grains de neige" },
  80: { emoji: "🌧", label: "Averses faibles" },
  81: { emoji: "🌧", label: "Averses modérées" },
  82: { emoji: "🌧", label: "Averses violentes" },
  85: { emoji: "🌨", label: "Averses de neige" },
  86: { emoji: "🌨", label: "Fortes averses de neige" },
  95: { emoji: "⛈", label: "Orage" },
  96: { emoji: "⛈", label: "Orage avec grêle" },
  99: { emoji: "⛈", label: "Orage violent" },
};

function describeCode(code: number): { emoji: string; label: string } {
  return WMO_MAP[code] ?? { emoji: "🌤", label: "—" };
}

// Cache en mémoire module-level (partagé entre composants, vidé au refresh)
const cache = new Map<string, { data: WeatherForecast; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cacheKey(city: string) {
  return city.trim().toLowerCase();
}

async function fetchGeocoding(city: string): Promise<{
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
} | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=fr&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const json = await res.json();
  const hit = json?.results?.[0];
  if (!hit) return null;
  return {
    latitude: hit.latitude,
    longitude: hit.longitude,
    name: hit.name,
    country: hit.country,
  };
}

async function fetchForecast(lat: number, lon: number): Promise<{
  current: { temperature_2m: number; weather_code: number };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
}> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`);
  return res.json();
}

/**
 * Hook météo 5 jours pour la ville donnée.
 *
 * @param city Nom de ville (ex. "Paris", "Lyon"). Si null/empty → pas de
 *   fetch, état vide.
 * @param enabled Permet de différer le fetch (ex. ne fetch que quand le
 *   popup est ouvert pour éviter de spammer l'API au load Co-pilote).
 */
export function useWeatherForecast(
  city: string | null | undefined,
  enabled = true
): UseWeatherResult {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled || !city || !city.trim()) {
      setForecast(null);
      return;
    }
    const key = cacheKey(city);
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      setForecast(cached.data);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const geo = await fetchGeocoding(city);
        if (!geo) {
          throw new Error(`Ville "${city}" introuvable`);
        }
        const fc = await fetchForecast(geo.latitude, geo.longitude);
        const days: WeatherDay[] = fc.daily.time.map((d, i) => {
          const meta = describeCode(fc.daily.weather_code[i]);
          return {
            date: d,
            tempMax: Math.round(fc.daily.temperature_2m_max[i]),
            tempMin: Math.round(fc.daily.temperature_2m_min[i]),
            weatherCode: fc.daily.weather_code[i],
            emoji: meta.emoji,
            label: meta.label,
            index: i,
          };
        });
        const currentMeta = describeCode(fc.current.weather_code);
        const data: WeatherForecast = {
          city: geo.name,
          country: geo.country,
          current: {
            temp: Math.round(fc.current.temperature_2m),
            weatherCode: fc.current.weather_code,
            emoji: currentMeta.emoji,
            label: currentMeta.label,
          },
          days,
          fetchedAt: Date.now(),
        };
        cache.set(key, { data, expiresAt: now + CACHE_TTL_MS });
        if (!cancelled) {
          setForecast(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur météo");
          setForecast(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [city, enabled, tick]);

  return { forecast, loading, error, refetch };
}

/** Format jour court FR : "Auj.", "Mer.", "Jeu."… (utilisé par WeatherPopup). */
export function shortDayLabel(isoDate: string, todayIso: string): string {
  if (isoDate === todayIso) return "Auj.";
  const d = new Date(isoDate + "T00:00:00");
  const labels = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
  return labels[d.getDay()];
}
