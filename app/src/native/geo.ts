import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

/** Coarse position is plenty for weather. Throws 'location-denied' when the user says no. */
export async function locate(): Promise<{ lat: number; lon: number }> {
  try {
    if (Capacitor.isNativePlatform()) {
      let perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') perm = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') throw new Error('location-denied');
    }
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 20_000, maximumAge: 15 * 60_000 });
    return { lat: p.coords.latitude, lon: p.coords.longitude };
  } catch (e) {
    const err = e as { message?: string; code?: number };
    const msg = String(err?.message ?? e).toLowerCase();
    if (err?.code === 1 || msg.includes('denied') || msg.includes('permission')) throw new Error('location-denied');
    throw e;
  }
}
