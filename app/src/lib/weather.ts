import { createStore } from './store';
import { DEMO, setHomeOffset } from './time';
import { WEATHER } from '../data/mock';
import { locate } from '../native/geo';
import { CapacitorHttp } from '@capacitor/core';
import { isNative } from '../native/bridge';

export type Kind = 'sun' | 'moon' | 'partly' | 'partlyNight' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
export type Hour = { h: string; t: number; kind: Kind; text: string };
export type Place = { city: string; lat: number; lon: number; manual: boolean };
export type WeatherState = {
  status: 'mock' | 'live' | 'locating' | 'denied' | 'error';
  city: string; offset: number; temp: number; feels: number; hi: number; lo: number;
  text: string; kind: Kind; rain: boolean; at: string; hourly: Hour[]; updated: number; note: string; lat?: number; lon?: number;
};

const kindText: Record<Kind, string> = { sun: 'Cerah', moon: 'Cerah', partly: 'Cerah berawan', partlyNight: 'Cerah berawan', cloud: 'Mendung', fog: 'Berkabut', drizzle: 'Gerimis', rain: 'Hujan', snow: 'Salju', storm: 'Badai petir' };

/** WMO weather code (Open-Meteo) to a kind and Indonesian label. */
export function decode(code: number, day: boolean): { kind: Kind; text: string } {
  let kind: Kind; let text: string | undefined;
  if (code === 0) kind = day ? 'sun' : 'moon';
  else if (code <= 2) kind = day ? 'partly' : 'partlyNight';
  else if (code === 3) kind = 'cloud';
  else if (code === 45 || code === 48) kind = 'fog';
  else if (code >= 51 && code <= 57) kind = 'drizzle';
  else if (code === 65 || code === 82 || code === 67) { kind = 'rain'; text = 'Hujan deras'; }
  else if ((code >= 61 && code <= 66) || (code >= 80 && code <= 81)) kind = 'rain';
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) kind = 'snow';
  else if (code >= 95) kind = 'storm';
  else kind = 'cloud';
  return { kind, text: text ?? kindText[kind] };
}
export const isWet = (k: Kind) => k === 'drizzle' || k === 'rain' || k === 'storm';

const mock = (): WeatherState => ({
  status: 'mock', city: WEATHER.city, offset: 7, temp: WEATHER.temp, feels: WEATHER.feels, hi: WEATHER.hi, lo: WEATHER.lo, text: WEATHER.text, kind: 'drizzle', rain: true,
  at: `${WEATHER.text.toLowerCase()} ${WEATHER.at}`, updated: 0, note: 'Data contoh',
  hourly: WEATHER.hourly.map((x) => ({ h: x.h, t: x.t, kind: x.k === 'cloud' ? 'cloud' : 'drizzle', text: x.k === 'cloud' ? 'Mendung' : 'Gerimis' })),
});

const CACHE = 'aino.weather';
const PLACE = 'aino.place';
export const loadPlace = (): Place | null => { try { return JSON.parse(localStorage.getItem(PLACE) ?? 'null'); } catch { return null; } };
export const savePlace = (p: Place | null) => { try { if (p) localStorage.setItem(PLACE, JSON.stringify(p)); else localStorage.removeItem(PLACE); } catch { /* ignore */ } };

function initial(): WeatherState {
  if (DEMO) return mock();
  try { const c = JSON.parse(localStorage.getItem(CACHE) ?? 'null') as WeatherState | null; if (c && c.city) { setHomeOffset(c.offset); return { ...c, status: 'live' }; } } catch { /* ignore */ }
  return { ...mock(), status: 'locating', city: 'Mencari lokasi…', note: '' };
}

export const weather = createStore<WeatherState>(initial());

type Forecast = { utc_offset_seconds: number; current: { time: string; temperature_2m: number; apparent_temperature: number; weather_code: number; is_day: number };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; is_day: number[] }; daily: { temperature_2m_max: number[]; temperature_2m_min: number[] } };

async function getJson<T>(url: string): Promise<T> {
  if (isNative) { const r = await CapacitorHttp.get({ url }); if (r.status !== 200) throw new Error(`HTTP ${r.status}`); return r.data as T; }
  const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<T>;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Live conditions for any coordinates (used for the home location and for other cities in the world clock). */
export async function fetchForecast(lat: number, lon: number) {
  const f = await getJson<Forecast>(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,apparent_temperature,weather_code,is_day&hourly=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=2`);
  const cur = decode(f.current.weather_code, !!f.current.is_day);
  const next = f.hourly.time.findIndex((t) => t > f.current.time);
  const start = next < 0 ? 0 : next;
  const hourly: Hour[] = f.hourly.time.slice(start, start + 5).map((t, i) => {
    const d = decode(f.hourly.weather_code[start + i], !!f.hourly.is_day[start + i]);
    return { h: `${t.slice(11, 13)}.${t.slice(14, 16)}`, t: Math.round(f.hourly.temperature_2m[start + i]), kind: d.kind, text: d.text };
  });
  return {
    offset: f.utc_offset_seconds / 3600, temp: Math.round(f.current.temperature_2m), feels: Math.round(f.current.apparent_temperature),
    hi: Math.round(f.daily.temperature_2m_max[0]), lo: Math.round(f.daily.temperature_2m_min[0]), text: cur.text, kind: cur.kind, rain: isWet(cur.kind), hourly,
    at: hourly[0] ? `${hourly[0].text.toLowerCase()} ${hourly[0].h}` : cur.text.toLowerCase(),
  };
}

async function cityName(lat: number, lon: number): Promise<string> {
  try {
    const r = await getJson<{ city?: string; locality?: string; principalSubdivision?: string }>(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
    return r.city || r.locality || r.principalSubdivision || 'Lokasi saya';
  } catch { return 'Lokasi saya'; }
}

export type GeoHit = { name: string; admin: string; lat: number; lon: number };
export async function searchPlaces(q: string): Promise<GeoHit[]> {
  const r = await getJson<{ results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[] }>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=id`);
  return (r.results ?? []).map((x) => ({ name: x.name, admin: [x.admin1, x.country].filter(Boolean).join(', '), lat: x.latitude, lon: x.longitude }));
}

let inflight: Promise<void> | null = null;
/** Resolve the place (saved manual choice, else GPS), then pull the forecast. Cached so the UI paints instantly next launch. */
export function refreshWeather(opts: { forceGps?: boolean } = {}): Promise<void> {
  if (DEMO) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      let place = opts.forceGps ? null : loadPlace();
      if (!place) {
        if (weather.get().status !== 'live') weather.set({ status: 'locating' });
        const pos = await locate();
        place = { city: await cityName(pos.lat, pos.lon), lat: pos.lat, lon: pos.lon, manual: false };
        savePlace(place);
      }
      const f = await fetchForecast(place.lat, place.lon);
      setHomeOffset(f.offset);
      const next: WeatherState = { status: 'live', city: place.city, lat: place.lat, lon: place.lon, updated: Date.now(), note: place.manual ? 'Lokasi dipilih manual' : 'Lokasi dari GPS', ...f };
      weather.set(next);
      try { localStorage.setItem(CACHE, JSON.stringify(next)); } catch { /* ignore */ }
    } catch (e) {
      const denied = e instanceof Error && e.message === 'location-denied';
      weather.set({ status: denied ? 'denied' : 'error', note: denied ? 'Izin lokasi ditolak' : 'Gagal memuat cuaca' });
    } finally { inflight = null; }
  })();
  return inflight;
}

export function startWeather() {
  if (DEMO) return;
  void refreshWeather();
  setInterval(() => void refreshWeather(), 20 * 60_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - weather.get().updated > 10 * 60_000) void refreshWeather(); });
}

export const kindIcon = (k: Kind) => ({ sun: 'sun', moon: 'moon', partly: 'cloudSun', partlyNight: 'cloudMoon', cloud: 'cloud', fog: 'fog', drizzle: 'drizzle', rain: 'rain', snow: 'snow', storm: 'storm' } as const)[k];
