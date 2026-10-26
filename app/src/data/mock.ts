export type Headline = { title: string; section: string; source: string; ago: string; tag: string };

export const HEADLINES: Headline[] = [
  { title: 'Haji Isam Mencengkeram Bisnis Tambang', section: 'Bisnis', source: 'investor.id', ago: '7 jam lalu', tag: 'Berita' },
  { title: 'Rekomendasi Film Halloween: Exhuma , Film Horor Korea yang Ungkap Kutukan Mengerikan di Balik …', section: 'Film', source: 'spotlight.indozone.id', ago: '7 jam lalu', tag: 'Berita' },
  { title: 'Trump Isyaratkan Operasi Militer Baru AS terhadap Iran', section: 'Berita utama Indonesia', source: 'detikNews', ago: '7 jam lalu', tag: 'Berita' },
];

export type Track = { title: string; artist: string; art: string; length: number };

export const QUEUE: Track[] = [
  { title: 'Breathe No More (B-Side Version)', artist: 'Evanescence', art: 'smoke', length: 228 },
  { title: 'Falling Away from Me', artist: 'Korn', art: 'ember', length: 270 },
  { title: 'Eat You Alive', artist: 'Limp Bizkit', art: 'bloom', length: 214 },
  { title: 'CASTLE OF GLASS', artist: 'Linkin Park', art: 'glass', length: 205 },
];

export const WEATHER = {
  city: 'Jakarta', temp: 29, feels: 34, hi: 34, lo: 25, text: 'Gerimis', at: '18.00',
  hourly: [
    { h: '18.00', t: 28, k: 'drizzle' }, { h: '19.00', t: 27, k: 'drizzle' }, { h: '20.00', t: 27, k: 'drizzle' },
    { h: '21.00', t: 27, k: 'cloud' }, { h: '22.00', t: 27, k: 'cloud' },
  ],
};

export type City = {
  id: string; name: string; offset: number; delta: string; temp: number; hi: number; lo: number; text: string;
  night: boolean; hourly: { h: string; t: number }[];
};

export const CITIES: City[] = [
  { id: 'jkt', name: 'Jakarta', offset: 7, delta: '', temp: 29, hi: 34, lo: 25, text: 'Gerimis', night: false,
    hourly: [{ h: '18.00', t: 28 }, { h: '19.00', t: 27 }, { h: '20.00', t: 27 }, { h: '21.00', t: 27 }, { h: '22.00', t: 27 }] },
  { id: 'syd', name: 'Sydney', offset: 11, delta: '+4 jam', temp: 21, hi: 24, lo: 16, text: 'Cerah', night: true,
    hourly: [{ h: '22.00', t: 21 }, { h: '23.00', t: 21 }, { h: '00.00', t: 20 }, { h: '01.00', t: 20 }, { h: '02.00', t: 20 }] },
  { id: 'cfx', name: 'Colfax', offset: -4, delta: '-11 jam', temp: 17, hi: 21, lo: 12, text: 'Berawan', night: true,
    hourly: [{ h: '07.00', t: 17 }, { h: '08.00', t: 18 }, { h: '09.00', t: 19 }, { h: '10.00', t: 20 }, { h: '11.00', t: 21 }] },
];

export type Evt = { day: number; time: string; title: string; allDay?: boolean };
/** Sample events keyed by day of month; shown in whatever month is on screen. */
export const EVENTS: Evt[] = [
  { day: 1, time: '18.30', title: 'Drift review' },
  { day: 2, time: '13.00', title: 'final check-in' },
  { day: 16, time: '20.00', title: 'Weekly sync' },
  { day: 19, time: '14.15', title: 'Webflow handoff' },
  { day: 20, time: '08.30', title: 'Final QA pass' },
  { day: 27, time: 'Seharian', title: 'Send Aquaria Invoice', allDay: true },
];

export const DECK = [
  { id: 'prev', icon: 'prev', label: 'Sebelumnya' }, { id: 'play', icon: 'play', label: 'Putar/jeda' },
  { id: 'next', icon: 'next', label: 'Berikutnya' }, { id: 'mute', icon: 'volx', label: 'Bisukan' },
  { id: 'vdown', icon: 'vol0', label: 'Volume -' }, { id: 'vup', icon: 'vol2', label: 'Volume +' },
  { id: 'ytm', icon: 'ytm', label: 'YouTube Music' }, { id: 'yt', icon: 'yt', label: 'YouTube' },
] as const;

export const WORK_DECK = [
  { id: 'micmute', icon: 'micOff', label: 'Mute mic', tone: 'rose' }, { id: 'vdown', icon: 'vol0', label: 'Volume –', tone: 'sky' },
  { id: 'vup', icon: 'vol2', label: 'Volume +', tone: 'sky' }, { id: 'play', icon: 'play', label: 'Putar/jeda', tone: 'lilac' },
  { id: 'shot', icon: 'camera', label: 'Screenshot', tone: 'blue' }, { id: 'desk', icon: 'monitor', label: 'Desktop', tone: 'mint' },
  { id: 'lock', icon: 'lock', label: 'Kunci PC', tone: 'amber' }, { id: 'focus', icon: 'timer', label: 'Fokus', tone: 'lime' },
] as const;

export const TUMRA = { hours: '13j 6m', note: 'jam kerja tercatat', invoice: 'Tidak ada invoice jatuh tempo' };
