export const DEMO = new URLSearchParams(location.search).has('demo');
/** Sabtu, 24 Oktober 2026 17.10 WIB, the moment shown in the reference recording. */
const DEMO_NOW = Date.UTC(2026, 9, 24, 10, 10, 0);

export function now(): Date { return DEMO ? new Date(DEMO_NOW) : new Date(); }

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Wall-clock parts in a fixed UTC offset (hours). Jakarta = +7, Sydney = +11 (AEDT), Colfax = -4 per the recording. */
export function zoned(d: Date, offsetHours: number) {
  const z = new Date(d.getTime() + offsetHours * 3600_000);
  return {
    y: z.getUTCFullYear(), m: z.getUTCMonth(), day: z.getUTCDate(), dow: z.getUTCDay(),
    hh: z.getUTCHours(), mm: z.getUTCMinutes(),
  };
}

export const pad = (n: number) => String(n).padStart(2, '0');
export const hm = (p: { hh: number; mm: number }) => `${pad(p.hh)}.${pad(p.mm)}`;
export const dayName = (dow: number) => HARI[dow];
export const dayShort = (dow: number) => HARI_SHORT[dow];
export const monthName = (m: number) => BULAN[m];
export const monthShort = (m: number) => BULAN_SHORT[m];

export const WIB = 7;
export function greeting(h: number) {
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}
