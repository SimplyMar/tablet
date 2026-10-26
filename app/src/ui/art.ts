/** Procedural album art so the app ships without copyrighted imagery. Returns a CSS background value. */
const PALETTES = {
  smoke: { bg: '#02070b', glow: '#14414f', a: '#4f9db6', b: '#9fd9e6', seed: 7 },
  ember: { bg: '#1c110c', glow: '#6b3216', a: '#e08a3c', b: '#ffd7a0', seed: 21 },
  bloom: { bg: '#0b0f18', glow: '#233a72', a: '#5f86d6', b: '#c9d8f7', seed: 33 },
  glass: { bg: '#0b0d10', glow: '#3a434d', a: '#aab4be', b: '#eef1f4', seed: 45 },
} as const;

const cache = new Map<string, string>();

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function wisps(seed: number, color: string, count: number, minW: number, maxW: number, minO: number, maxO: number) {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const y0 = 130 + r() * 150;
    const x0 = 196 + r() * 8;
    const dir = r() < 0.5 ? -1 : 1;
    const c1x = x0 - dir * (40 + r() * 90), c1y = y0 + (r() - 0.5) * 220;
    const c2x = x0 - dir * (90 + r() * 130), c2y = y0 + (r() - 0.5) * 300;
    const x1 = x0 - dir * (60 + r() * 150), y1 = y0 + (r() - 0.5) * 340;
    // keep each wisp on the left half; the right half is its mirror
    const m = (x: number) => Math.min(200, Math.max(-20, dir === -1 ? 400 - x : x));
    d += `<path d="M${m(x0)} ${y0.toFixed(1)} C${m(c1x).toFixed(1)} ${c1y.toFixed(1)} ${m(c2x).toFixed(1)} ${c2y.toFixed(1)} ${m(x1).toFixed(1)} ${y1.toFixed(1)}" stroke="${color}" stroke-width="${(minW + r() * (maxW - minW)).toFixed(1)}" stroke-opacity="${(minO + r() * (maxO - minO)).toFixed(2)}" stroke-linecap="round" fill="none"/>`;
  }
  return d;
}

export function artUrl(kind: keyof typeof PALETTES): string {
  const hit = cache.get(kind);
  if (hit) return hit;
  const p = PALETTES[kind];
  const half = `<g filter="url(#b1)">${wisps(p.seed, p.a, 14, 14, 34, 0.22, 0.5)}</g><g filter="url(#b2)">${wisps(p.seed + 3, p.a, 18, 5, 14, 0.25, 0.6)}</g><g filter="url(#b3)">${wisps(p.seed + 8, p.b, 14, 2, 6, 0.3, 0.75)}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<defs>
<filter id="b1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="b2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="b3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>
<radialGradient id="g" cx="50%" cy="47%" r="52%"><stop offset="0" stop-color="${p.glow}" stop-opacity=".95"/><stop offset="1" stop-color="${p.bg}" stop-opacity="0"/></radialGradient>
<radialGradient id="e" cx="50%" cy="50%" r="70%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></radialGradient>
<clipPath id="l"><rect width="200" height="400"/></clipPath>
</defs>
<rect width="400" height="400" fill="${p.bg}"/><rect width="400" height="400" fill="url(#g)"/>
<g clip-path="url(#l)">${half}</g>
<g transform="translate(400 0) scale(-1 1)" clip-path="url(#l)">${half}</g>
<rect y="176" width="400" height="48" fill="#02060a" opacity=".5"/>
<rect width="400" height="400" fill="url(#e)"/>
</svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  cache.set(kind, url);
  return url;
}
