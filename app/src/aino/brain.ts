import { CapacitorHttp } from '@capacitor/core';
import { isNative } from '../native/bridge';
import { DEFAULT_MODEL, getGeminiKey, loadPrefs, savePrefs } from './settings';
import { player } from '../lib/player';
import { CITIES, EVENTS } from '../data/mock';
import { weather } from '../lib/weather';
import { dayName, hm, monthName, now, homeOffset, zoned, zoneLabel } from '../lib/time';

export type Turn = { role: 'user' | 'model'; text: string };
export type Intent =
  | { kind: 'media'; action: 'toggle' | 'play' | 'pause' | 'next' | 'prev' }
  | { kind: 'mode'; mode: 'home' | 'work' }
  | { kind: 'open'; panel: 'music' | 'clock' | 'calendar' }
  | { kind: 'volume'; delta: number };

export type Reply = { text: string; intent?: Intent; offline?: boolean };

const has = (s: string, re: RegExp) => re.test(s);

/** Fast local commands so common requests work without a key or network. */
export function localIntent(raw: string): Reply | null {
  const t = raw.toLowerCase();
  const name = loadPrefs().name;
  if (has(t, /\b(jeda|pause|berhenti|stop)\b/)) return { text: 'Oke, kujeda dulu musiknya.', intent: { kind: 'media', action: 'pause' } };
  if (has(t, /\b(lagu|musik)?\s*(berikutnya|selanjutnya|next|lewati|skip)\b/)) return { text: 'Lanjut ke lagu berikutnya.', intent: { kind: 'media', action: 'next' } };
  if (has(t, /\b(sebelumnya|previous|ulang lagu)\b/)) return { text: 'Kembali ke lagu sebelumnya.', intent: { kind: 'media', action: 'prev' } };
  if (has(t, /\b(putar|play|lanjutkan|nyalakan musik)\b/)) return { text: 'Siap, musik diputar.', intent: { kind: 'media', action: 'play' } };
  if (has(t, /volume.*(naik|keras|besar|tambah)|(naikkan|keraskan|tambah).*volume/)) return { text: 'Volume kunaikkan.', intent: { kind: 'volume', delta: 0.1 } };
  if (has(t, /volume.*(turun|kecil|pelan|kurang)|(turunkan|kecilkan|pelankan).*volume/)) return { text: 'Volume kuturunkan.', intent: { kind: 'volume', delta: -0.1 } };
  if (has(t, /mode kerja|fokus kerja/)) return { text: 'Mode kerja aktif. Kabar yang tidak penting aku tahan dulu.', intent: { kind: 'mode', mode: 'work' } };
  if (has(t, /beranda|ringkasan|halaman utama/)) return { text: `Kembali ke beranda, ${name}.`, intent: { kind: 'mode', mode: 'home' } };
  if (has(t, /kalender|jadwal|agenda|acara/)) return { text: describeAgenda(), intent: { kind: 'open', panel: 'calendar' } };
  if (has(t, /jam dunia|sydney|colfax|zona waktu/)) return { text: 'Kubuka jam dunia. Di situ terlihat kapan jam kerja kalian bertemu.', intent: { kind: 'open', panel: 'clock' } };
  if (has(t, /buka musik|tampilkan musik|lagu apa/)) { const s = player.get(); return { text: `Sedang diputar ${s.track.title} dari ${s.track.artist}.`, intent: { kind: 'open', panel: 'music' } }; }
  if (has(t, /jam berapa|pukul berapa|waktu sekarang/)) { const j = zoned(now(), homeOffset()); return { text: `Sekarang pukul ${hm(j).replace('.', ' lewat ')}.` }; }
  if (has(t, /hari apa|tanggal berapa|tanggal hari ini/)) { const j = zoned(now(), homeOffset()); return { text: `Hari ini ${dayName(j.dow)}, ${j.day} ${monthName(j.m)} ${j.y}.` }; }
  if (has(t, /cuaca|hujan|gerimis|suhu/)) { const w = weather.get(); return { text: `Di ${w.city} sekarang ${w.text.toLowerCase()}, suhu ${w.temp} derajat, terasa ${w.feels} derajat. ${w.at.charAt(0).toUpperCase() + w.at.slice(1)}.` }; }
  return null;
}

function describeAgenda(): string {
  const today = zoned(now(), homeOffset()).day;
  const next = EVENTS.filter((e) => e.day >= today).sort((a, b) => a.day - b.day)[0];
  if (!next) return 'Tidak ada acara dalam waktu dekat. Hari yang lowong.';
  return next.day === today ? `Hari ini ada ${next.title} pukul ${next.time}.` : `Hari ini tidak ada acara. Berikutnya tanggal ${next.day}: ${next.title}.`;
}

function systemPrompt(): string {
  const d = now(); const j = zoned(d, homeOffset()); const s = player.get(); const p = loadPrefs();
  return [
    `Kamu adalah Aino, asisten suara di dasbor tablet milik ${p.name}. Jawab dalam bahasa Indonesia yang santai, hangat, dan singkat (maksimal dua kalimat) karena jawabanmu dibacakan keras.`,
    'Jangan memakai markdown, daftar, atau emoji. Jika tidak yakin, katakan terus terang.',
    `Konteks saat ini: ${dayName(j.dow)}, ${j.day} ${monthName(j.m)} ${j.y}, pukul ${hm(j)} ${zoneLabel()} di ${weather.get().city}.`,
    `Cuaca ${weather.get().city}: ${weather.get().text}, ${weather.get().temp}°C (terasa ${weather.get().feels}°C), hari ini ${weather.get().lo}–${weather.get().hi}°C.`,
    `Zona waktu lain: ${CITIES.slice(1).map((c) => `${c.name} ${hm(zoned(d, c.offset))}`).join(', ')}.`,
    `Acara bulan ini: ${EVENTS.map((e) => `tgl ${e.day} ${e.time} ${e.title}`).join('; ')}.`,
    `Musik: ${s.playing ? 'memutar' : 'jeda'} "${s.track.title}" oleh ${s.track.artist}.`,
  ].join('\n');
}

const history: Turn[] = [];
export const resetHistory = () => { history.length = 0; };

export class NoKeyError extends Error { constructor() { super('no-key'); } }
export class GeminiError extends Error { constructor(public status: number, msg: string) { super(msg); } }

const API = 'https://generativelanguage.googleapis.com/v1beta';
const TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 4;

async function request(url: string, key: string, body?: unknown): Promise<{ status: number; data: unknown }> {
  const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
  try {
    if (isNative) {
      const o = { url, headers, connectTimeout: TIMEOUT_MS, readTimeout: TIMEOUT_MS };
      const r = body === undefined ? await CapacitorHttp.get(o) : await CapacitorHttp.post({ ...o, data: body });
      return { status: r.status, data: r.data };
    }
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(url, body === undefined ? { headers, signal: ctl.signal } : { method: 'POST', headers, body: JSON.stringify(body), signal: ctl.signal });
      return { status: r.status, data: await r.json().catch(() => null) };
    } finally { clearTimeout(t); }
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if ((e as Error)?.name === 'AbortError' || /timed? ?out|timeout/i.test(msg)) throw new GeminiError(0, 'timeout');
    throw e;
  }
}

const errorMessage = (data: unknown, status: number) => (data as { error?: { message?: string } } | null)?.error?.message ?? `HTTP ${status}`;

/** The model was retired or never existed for this key. */
const isGone = (e: GeminiError) => e.status === 404 || /no longer available|not found|not supported/i.test(e.message);
/** Worth trying another model: retired, overloaded, rate limited or too slow. */
const canSwitch = (e: GeminiError) => isGone(e) || e.status === 0 || e.status === 429 || e.status >= 500;

/**
 * Fallback candidates this key can call: plain flash models nearest the preferred version first (3.6 -> 3.5, 3.7, 3.8),
 * then the flash-lite models, which have their own quota. Newest first when the preferred model has no version.
 */
async function discoverModels(key: string, pref: string): Promise<string[]> {
  const { status, data } = await request(`${API}/models?pageSize=200`, key);
  if (status < 200 || status >= 300) return [];
  const list = (data as { models?: { name?: string; supportedGenerationMethods?: string[] }[] } | null)?.models ?? [];
  const ids = list.filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => (m.name ?? '').replace(/^models\//, ''));
  const ver = (id: string, re: RegExp) => parseFloat(id.match(re)?.[1] ?? '');
  const FLASH = /^gemini-(\d+(?:\.\d+)?)-flash$/; const LITE = /^gemini-(\d+(?:\.\d+)?)-flash-lite$/;
  const want = ver(pref, /^gemini-(\d+(?:\.\d+)?)/);
  const dist = (id: string) => (Number.isNaN(want) ? -ver(id, FLASH) : Math.abs(ver(id, FLASH) - want) + (ver(id, FLASH) > want ? 0.001 : 0));
  const flash = ids.filter((id) => FLASH.test(id)).sort((x, y) => dist(x) - dist(y));
  const lite = ids.filter((id) => LITE.test(id)).sort((x, y) => ver(y, LITE) - ver(x, LITE));
  return [...flash, ...lite];
}

/** A fallback that worked recently, so an overloaded favourite does not cost 12 s on every question. */
const GOOD = 'aino.good';
function recentGood(pref: string): string | null {
  try {
    const g = JSON.parse(localStorage.getItem(GOOD) ?? 'null') as { model: string; pref: string; at: number } | null;
    return g && g.pref === pref && Date.now() - g.at < 30 * 60_000 ? g.model : null;
  } catch { return null; }
}
const rememberGood = (model: string, pref: string) => { try { localStorage.setItem(GOOD, JSON.stringify({ model, pref, at: Date.now() })); } catch { /* ignore */ } };

/** Thinking levels to try in order; some models (3.7, 3.8) refuse "minimal", and older ones take no setting at all. */
const LEVELS: (string | null)[] = ['minimal', 'low', null];

async function generate(key: string, model: string, text: string, level = 0): Promise<string> {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt() }] },
    contents: [...history.slice(-8), { role: 'user', text }].map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    // Gemini 3 models spend the output budget on hidden thinking unless it is turned down; replies are two spoken sentences.
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024, ...(LEVELS[level] ? { thinkingConfig: { thinkingLevel: LEVELS[level] } } : {}) },
  };
  const { status, data } = await request(`${API}/models/${encodeURIComponent(model)}:generateContent`, key, body);
  if (status === 400 && level < LEVELS.length - 1 && /thinking/i.test(errorMessage(data, status))) return generate(key, model, text, level + 1);
  if (status < 200 || status >= 300) throw new GeminiError(status, errorMessage(data, status));
  const out = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!out) throw new GeminiError(200, 'Jawaban kosong');
  return out;
}

async function callGemini(text: string): Promise<string> {
  const key = await getGeminiKey();
  if (!key) throw new NoKeyError();
  const { model: pref } = loadPrefs();
  const queue = [recentGood(pref) ?? pref]; const tried = new Set<string>();
  let looked = false; let last: GeminiError | null = null;
  while (queue.length && tried.size < MAX_ATTEMPTS) {
    const model = queue.shift()!; if (tried.has(model)) continue; tried.add(model);
    try {
      const out = await generate(key, model, text);
      if (model !== pref) { if (last && isGone(last)) savePrefs({ model }); else rememberGood(model, pref); }
      return out;
    } catch (e) {
      if (!(e instanceof GeminiError) || !canSwitch(e)) throw e;
      last = e;
      if (!looked) { looked = true; queue.push(...(await discoverModels(key, pref).catch(() => []))); }
    }
  }
  throw last ?? new GeminiError(0, 'timeout');
}

export async function ask(text: string): Promise<Reply> {
  const local = localIntent(text);
  if (local) { history.push({ role: 'user', text }, { role: 'model', text: local.text }); return local; }
  try {
    const out = await callGemini(text);
    history.push({ role: 'user', text }, { role: 'model', text: out });
    return { text: out };
  } catch (e) {
    if (e instanceof NoKeyError) return { text: 'Aku belum punya kunci Gemini. Tambahkan di Pengaturan supaya bisa menjawab apa saja.', offline: true };
    if (e instanceof GeminiError) {
      if (e.status === 400 || e.status === 403) return { text: 'Kunci Gemini ditolak. Cek lagi kuncinya di Pengaturan.', offline: true };
      if (e.status === 429) return { text: 'Kuota Gemini habis sebentar. Coba lagi nanti.', offline: true };
      if (e.status === 0 || e.status >= 500) return { text: 'Gemini sedang sibuk atau lambat. Coba lagi sebentar lagi.', offline: true };
      return { text: `Gemini bermasalah: ${e.message}`, offline: true };
    }
    return { text: 'Aku tidak bisa terhubung ke internet sekarang.', offline: true };
  }
}
