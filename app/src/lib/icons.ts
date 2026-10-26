import {
  createElement, AlertTriangle, ArrowRight, BookOpen, Bell, Briefcase, Calendar, ChevronLeft,
  ChevronRight, Coffee, CloudDrizzle, CloudMoon, Cloud, CloudRain, ExternalLink, Home, LayoutGrid,
  Lock, MessageSquare, Mic, MicOff, Monitor, Moon, Pause, Play, Camera, Repeat, Shuffle, SkipBack,
  SkipForward, SlidersHorizontal, Sun, Timer, Volume, Volume1, Volume2, VolumeX, X, Plus,
  MoreHorizontal, MessagesSquare, Link2, Maximize2, Send, Settings, Wifi, Battery, Bluetooth, Moon as MoonIcon,
  Sparkles, Check, CloudSun, CloudFog, CloudSnow, CloudLightning, Lightbulb, LightbulbOff, LocateFixed, Search, Trash2, Clock, Newspaper, Navigation, MapPin, Eye, EyeOff, KeyRound, Globe,
} from 'lucide';

const map = {
  warn: AlertTriangle, arrowRight: ArrowRight, book: BookOpen, bell: Bell, briefcase: Briefcase,
  calendar: Calendar, left: ChevronLeft, right: ChevronRight, coffee: Coffee, drizzle: CloudDrizzle,
  cloudMoon: CloudMoon, cloud: Cloud, rain: CloudRain, open: ExternalLink, home: Home, grid: LayoutGrid,
  lock: Lock, chat: MessagesSquare, mic: Mic, micOff: MicOff, monitor: Monitor, moon: Moon, pause: Pause,
  play: Play, camera: Camera, repeat: Repeat, shuffle: Shuffle, prev: SkipBack, next: SkipForward,
  sliders: SlidersHorizontal, sun: Sun, timer: Timer, vol0: Volume, vol1: Volume1, vol2: Volume2,
  volx: VolumeX, close: X, plus: Plus, more: MoreHorizontal, link: Link2, expand: Maximize2, send: Send,
  settings: Settings, wifi: Wifi, battery: Battery, bluetooth: Bluetooth, sparkles: Sparkles, check: Check,
  trash: Trash2, clock: Clock, news: Newspaper, nav: Navigation, pin: MapPin, eye: Eye, eyeOff: EyeOff,
  key: KeyRound, globe: Globe, moonAlt: MoonIcon,
  cloudSun: CloudSun, fog: CloudFog, snow: CloudSnow, storm: CloudLightning, bulb: Lightbulb, bulbOff: LightbulbOff, locate: LocateFixed, search: Search,
} as const;

export type IconName = keyof typeof map | 'dots';

export function icon(name: IconName, size = 20, stroke = 2): SVGElement {
  if (name === 'dots') return dots(size);
  const el = createElement(map[name as keyof typeof map] as never, {
    width: size, height: size, 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }) as unknown as SVGElement;
  el.classList.add('ic');
  return el;
}

/** Filled glyphs the reference uses for transport controls (lucide only ships outlines). */
export function filled(name: 'play' | 'pause' | 'prev' | 'next', size = 20): SVGElement {
  const paths: Record<string, string> = {
    play: '<path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12-7.4a1 1 0 0 0 0-1.72l-12-7.4A1 1 0 0 0 7 4.6Z"/>',
    pause: '<rect x="6" y="4.5" width="4.4" height="15" rx="1.4"/><rect x="13.6" y="4.5" width="4.4" height="15" rx="1.4"/>',
    prev: '<path d="M18.5 5.2v13.6a.9.9 0 0 1-1.4.75l-9.6-6.8a.9.9 0 0 1 0-1.5l9.6-6.8a.9.9 0 0 1 1.4.75Z"/><rect x="4" y="4.6" width="2.6" height="14.8" rx="1.1"/>',
    next: '<path d="M5.5 5.2v13.6a.9.9 0 0 0 1.4.75l9.6-6.8a.9.9 0 0 0 0-1.5L6.9 4.45a.9.9 0 0 0-1.4.75Z"/><rect x="17.4" y="4.6" width="2.6" height="14.8" rx="1.1"/>',
  };
  const t = document.createElement('template');
  t.innerHTML = `<svg class="ic ic-filled" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">${paths[name]}</svg>`;
  return t.content.firstElementChild as SVGElement;
}

function dots(size: number): SVGElement {
  const t = document.createElement('template');
  const cs = [5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => `<circle cx="${x}" cy="${y}" r="1.7"/>`)).join('');
  t.innerHTML = `<svg class="ic" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">${cs}</svg>`;
  return t.content.firstElementChild as SVGElement;
}
