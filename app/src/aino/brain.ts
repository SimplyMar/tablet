import { CapacitorHttp } from '@capacitor/core';
import { isNative } from '../native/bridge';
import { getGeminiKey, loadPrefs } from './settings';
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

async function callGemini(text: string): Promise<string> {
  const key = await getGeminiKey();
  if (!key) throw new NoKeyError();
  const { model } = loadPrefs();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt() }] },
    contents: [...history.slice(-8), { role: 'user', text }].map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: { temperature: 0.7, maxOutputTokens: 220 },
  };
  const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
  let status: number; let data: unknown;
  if (isNative) {
    const r = await CapacitorHttp.post({ url, headers, data: body }); status = r.status; data = r.data;
  } else {
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) }); status = r.status; data = await r.json().catch(() => null);
  }
  if (status < 200 || status >= 300) {
    const msg = (data as { error?: { message?: string } } | null)?.error?.message ?? `HTTP ${status}`;
    throw new GeminiError(status, msg);
  }
  const out = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!out) throw new GeminiError(200, 'Jawaban kosong');
  return out;
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
      return { text: `Gemini bermasalah: ${e.message}`, offline: true };
    }
    return { text: 'Aku tidak bisa terhubung ke internet sekarang.', offline: true };
  }
}
