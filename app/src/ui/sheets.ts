import { h } from '../lib/h';
import { icon, type IconName } from '../lib/icons';
import { EASE_OUT, EASE_IN } from '../lib/motion';
import { DEFAULT_MODEL, loadPrefs, savePrefs, getGeminiKey, setGeminiKey, clearGeminiKey } from '../aino/settings';
import { ask, resetHistory, type Reply } from '../aino/brain';
import { canListen, isNative, listen, nowPlaying, notificationStatus, openApp, openAppSettings, openNotificationAccessSettings, speak, stopSpeaking } from '../native/bridge';
import { weather, refreshWeather, savePlace, searchPlaces } from '../lib/weather';
import type { Panel } from './panels';

const closeBtn = (onClose: () => void) => h('button', { class: 'cbtn', 'aria-label': 'Tutup', onClick: onClose }, icon('close', 22, 1.8));

/* ------------------------------------------------------------------- chat */
export type ChatCtx = { onReply: (r: Reply) => void; setListening: (on: boolean) => void };

export function chatPanel(onClose: () => void, ctx: ChatCtx): Panel {
  const log = h('div', { class: 'chatlog', role: 'log', 'aria-live': 'polite' });
  const input = h('input', { class: 'chatin', type: 'text', placeholder: 'Tanya Aino atau beri perintah…', autocomplete: 'off', enterkeyhint: 'send' }) as HTMLInputElement;
  const empty = h('div', { class: 'chatempty' }, h('b', {}, 'Halo, aku Aino.'), h('span', {}, 'Tanya apa saja, atau minta aku memutar musik, membuka kalender, atau pindah ke mode kerja.'));
  log.append(empty);
  const bubble = (who: 'me' | 'aino', text: string) => {
    empty.remove();
    const b = h('div', { class: `msg ${who}` }, text);
    log.append(b); log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
    b.animate([{ opacity: 0, transform: 'translateY(10px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE_OUT });
    return b;
  };
  async function send(text: string) {
    text = text.trim(); if (!text) return;
    input.value = ''; bubble('me', text);
    const dots = bubble('aino', '…'); dots.classList.add('typing');
    const r = await ask(text);
    dots.classList.remove('typing'); dots.textContent = r.text;
    ctx.onReply(r);
    if (loadPrefs().speak && !r.offline) void speak(r.text);
  }
  const mic = h('button', { class: 'cbtn', 'aria-label': 'Bicara', onClick: async () => {
    if (!canListen()) { bubble('aino', 'Pengenalan suara belum tersedia di perangkat ini. Ketik saja pertanyaannya.'); return; }
    mic.classList.add('hot'); ctx.setListening(true);
    try { await send(await listen()); } catch { /* cancelled or silent */ } finally { mic.classList.remove('hot'); ctx.setListening(false); }
  } }, icon('mic', 22, 1.8));
  const form = h('form', { class: 'composer', onSubmit: (e: Event) => { e.preventDefault(); void send(input.value); } }, input, mic,
    h('button', { class: 'pill-dark', type: 'submit', 'aria-label': 'Kirim' }, icon('send', 18, 2), 'Kirim'));
  const chips = h('div', { class: 'chips' }, ...['Jadwal hari ini', 'Cuaca sekarang', 'Mode kerja', 'Jam berapa sekarang?'].map((c) => h('button', { class: 'chip-btn', onClick: () => void send(c) }, c)));
  const el = h('section', { class: 'panel chat', 'aria-label': 'Obrolan Aino' },
    h('div', { class: 'bar' }, h('h2', {}, 'Obrolan'), h('span', { class: 'who' }, h('i'), 'Aino'), h('i', { class: 'grow' }),
      h('button', { class: 'pill-ghost', onClick: () => { resetHistory(); log.replaceChildren(empty); } }, 'Mulai baru'), closeBtn(onClose)),
    log, chips, form);
  setTimeout(() => input.focus({ preventScroll: true }), 500);
  return { el, mini: h('div'), destroy: () => { void stopSpeaking(); } };
}

/* --------------------------------------------------------------- settings */
export function settingsPanel(onClose: () => void): Panel {
  const prefs = loadPrefs();
  const status = h('div', { class: 'status' });
  const key = h('input', { class: 'field', type: 'password', placeholder: 'Tempel kunci dari Google AI Studio', autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement;
  const show = h('button', { class: 'cbtn small', 'aria-label': 'Tampilkan kunci', onClick: () => { key.type = key.type === 'password' ? 'text' : 'password'; } }, icon('eye', 18, 1.8));
  const model = h('input', { class: 'field', type: 'text', value: prefs.model, spellcheck: 'false' }) as HTMLInputElement;
  const name = h('input', { class: 'field', type: 'text', value: prefs.name, maxlength: '24' }) as HTMLInputElement;
  const voice = h('button', { class: 'switch', role: 'switch', 'aria-checked': String(prefs.speak), onClick: () => { const v = voice.getAttribute('aria-checked') !== 'true'; voice.setAttribute('aria-checked', String(v)); savePrefs({ speak: v }); } }, h('i'));
  const access = h('div', { class: 'status' });
  const probe = h('div', { class: 'status mono' });
  const where = h('div', { class: 'status' });
  const hits = h('div', { class: 'hits' });
  const place = h('input', { class: 'field', type: 'text', placeholder: 'Cari kota, mis. Bandung', autocomplete: 'off' }) as HTMLInputElement;

  const refreshKey = async () => {
    const has = !!(await getGeminiKey());
    status.textContent = has ? 'Kunci tersimpan di perangkat ini.' : 'Belum ada kunci. Aino hanya memahami perintah dasar.';
    status.dataset.ok = String(has);
  };

  const refreshAccess = async () => {
    if (!isNative) { access.textContent = 'Hanya tersedia di aplikasi Android.'; access.dataset.ok = 'false'; return; }
    const s = await notificationStatus();
    access.dataset.ok = String(s.connected);
    access.textContent = s.connected ? 'Aktif. Kartu musik membaca pemutar yang sedang berjalan.'
      : s.granted ? 'Izin sudah diberikan, sedang menyambung. Jika tidak berubah dalam beberapa detik, tutup aplikasi dari daftar terbaru lalu buka lagi.'
      : 'Belum diizinkan. Tekan "Beri akses", nyalakan Aino Dash di daftar, lalu kembali ke sini.';
  };
  const refreshWhere = () => {
    const w = weather.get();
    where.dataset.ok = String(w.status === 'live');
    where.textContent = w.status === 'live' ? `${w.city} · ${w.note}${w.updated ? ` · diperbarui ${new Date(w.updated).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}`
      : w.status === 'locating' ? 'Mencari lokasi…' : w.status === 'denied' ? 'Izin lokasi ditolak. Izinkan di pengaturan Android, atau cari kota di bawah.' : w.status === 'error' ? 'Cuaca gagal dimuat. Cek koneksi internet.' : 'Memakai data contoh.';
  };
  const offW = weather.on(refreshWhere);
  const timer = window.setInterval(() => { void refreshAccess(); }, 2000);
  const onVis = () => { if (!document.hidden) void refreshAccess(); };
  document.addEventListener('visibilitychange', onVis);

  const save = h('button', { class: 'pill-dark', onClick: async () => {
    if (key.value.trim()) { await setGeminiKey(key.value); key.value = ''; }
    savePrefs({ model: model.value.trim() || DEFAULT_MODEL, name: name.value.trim() || 'isni' });
    await refreshKey(); save.textContent = 'Tersimpan'; setTimeout(() => (save.textContent = 'Simpan'), 1400);
  } }, 'Simpan');
  const clear = h('button', { class: 'pill-ghost', onClick: async () => { await clearGeminiKey(); await refreshKey(); } }, 'Hapus kunci');
  const grant = h('button', { class: 'pill-dark', onClick: () => { void openNotificationAccessSettings(); } }, 'Beri akses');
  const appInfo = h('button', { class: 'pill-ghost', onClick: () => { void openAppSettings(); } }, 'Info aplikasi');
  const test = h('button', { class: 'pill-ghost', onClick: async () => {
    probe.textContent = 'Memeriksa…';
    try { const n = await nowPlaying(); probe.textContent = n ? (n.active ? `Terbaca: ${n.title} · ${n.artist} (${n.app}, ${n.playing ? 'diputar' : 'jeda'})` : `Belum ada lagu. ${n.debug ?? ''}`) : 'Bukan aplikasi Android.'; }
    catch (e) { probe.textContent = `Gagal: ${e instanceof Error ? e.message : String(e)}`; }
  } }, 'Uji sekarang');

  const gps = h('button', { class: 'pill-dark', onClick: () => { place.value = ''; hits.replaceChildren(); savePlace(null); void refreshWeather({ forceGps: true }); } }, icon('locate', 18, 2), 'Pakai GPS');
  const find = async () => {
    const q = place.value.trim(); if (q.length < 2) return;
    hits.replaceChildren(h('span', { class: 'status' }, 'Mencari…'));
    try {
      const r = await searchPlaces(q);
      hits.replaceChildren(...(r.length ? r.map((x) => h('button', { class: 'hit', onClick: () => { savePlace({ city: x.name, lat: x.lat, lon: x.lon, manual: true }); hits.replaceChildren(); place.value = ''; void refreshWeather(); } }, h('b', {}, x.name), h('span', {}, x.admin))) : [h('span', { class: 'status' }, 'Kota tidak ditemukan.')]));
    } catch { hits.replaceChildren(h('span', { class: 'status' }, 'Pencarian gagal. Cek koneksi internet.')); }
  };
  place.addEventListener('keydown', (e) => { if (e.key === 'Enter') void find(); });

  const row = (label: string, hint: string, ctl: Node) => h('div', { class: 'srow' }, h('div', {}, h('b', {}, label), h('span', {}, hint)), ctl);
  const el = h('section', { class: 'panel settings', 'aria-label': 'Pengaturan' },
    h('div', { class: 'bar' }, h('h2', {}, 'Pengaturan'), h('i', { class: 'grow' }), closeBtn(onClose)),
    h('div', { class: 'scroll' },
      h('div', { class: 'scard' }, h('h3', {}, 'Lokasi dan cuaca'),
        h('div', { class: 'srow col' }, h('div', {}, h('b', {}, 'Lokasi saat ini'), h('span', {}, 'Cuaca, jam, dan zona waktu mengikuti lokasi ini. Lokasi dipakai kasar saja dan hanya dikirim ke layanan cuaca.')), where,
          h('div', { class: 'keyline' }, place, h('button', { class: 'pill-ghost', onClick: () => void find() }, icon('search', 18, 2), 'Cari'), gps), hits)),
      h('div', { class: 'scard' }, h('h3', {}, 'Musik'),
        h('div', { class: 'srow col' }, h('div', {}, h('b', {}, 'Akses notifikasi'), h('span', {}, 'Dibutuhkan agar kartu musik membaca dan mengendalikan lagu dari YouTube Music. Android 13 ke atas memblokir tombolnya untuk aplikasi yang dipasang manual: buka Info aplikasi, tekan titik tiga di kanan atas, pilih "Izinkan setelan terbatas", lalu ulangi.')), access,
          h('div', { class: 'actions left' }, grant, appInfo, test), probe)),
      h('div', { class: 'scard' }, h('h3', {}, 'Aino'),
        row('Nama panggilan', 'Dipakai Aino untuk menyapamu.', name),
        h('div', { class: 'srow col' }, h('div', {}, h('b', {}, 'Kunci Gemini'), h('span', {}, 'Dari aistudio.google.com/apikey. Disimpan terenkripsi di tablet ini, tidak pernah masuk ke git.')), h('div', { class: 'keyline' }, key, show), status),
        row('Model', 'Nama model Gemini yang dipakai untuk menjawab.', model),
        row('Suara Aino', 'Bacakan jawaban dengan suara.', voice),
        h('div', { class: 'actions' }, clear, save)),
      h('div', { class: 'scard' }, h('h3', {}, 'Tentang'), h('div', { class: 'srow' }, h('div', {}, h('b', {}, 'Aino Dash'), h('span', {}, 'Versi 0.2 · dasbor tablet landscape')), h('span', { class: 'ver' }, 'id.simplymar.tablet')))));
  void refreshKey(); void refreshAccess(); refreshWhere();
  return { el, mini: h('div'), destroy: () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVis); offW(); } };
}

/* ------------------------------------------------------------------- apps */
const APPS: { label: string; icon: IconName; pkg: string; tone: string }[] = [
  { label: 'YouTube Music', icon: 'play', pkg: 'com.google.android.apps.youtube.music', tone: 'rose' },
  { label: 'YouTube', icon: 'play', pkg: 'com.google.android.youtube', tone: 'rose' },
  { label: 'Maps', icon: 'pin', pkg: 'com.google.android.apps.maps', tone: 'mint' },
  { label: 'Kalender', icon: 'calendar', pkg: 'com.google.android.calendar', tone: 'sky' },
  { label: 'Jam', icon: 'clock', pkg: 'com.sec.android.app.clockpackage', tone: 'lilac' },
  { label: 'Chrome', icon: 'globe', pkg: 'com.android.chrome', tone: 'blue' },
  { label: 'Berita', icon: 'news', pkg: 'com.google.android.apps.magazines', tone: 'amber' },
  { label: 'Pengaturan', icon: 'settings', pkg: 'com.android.settings', tone: 'lime' },
];

export function appsPanel(onClose: () => void): Panel {
  const note = h('div', { class: 'appnote' });
  const tiles = APPS.map((a) => h('button', { class: `app tone-${a.tone}`, onClick: () => { if (isNative) void openApp(a.pkg); else { note.textContent = `${a.label} hanya bisa dibuka dari tablet.`; note.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 }); } } }, h('i', {}, icon(a.icon, 30, 1.7)), h('span', {}, a.label)));
  const el = h('section', { class: 'panel apps', 'aria-label': 'Aplikasi' },
    h('div', { class: 'bar' }, h('h2', {}, 'Aplikasi'), h('i', { class: 'grow' }), closeBtn(onClose)),
    h('div', { class: 'appgrid' }, ...tiles), note);
  tiles.forEach((t, i) => t.animate([{ opacity: 0, transform: 'translateY(14px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 120 + i * 40, easing: EASE_OUT, fill: 'backwards' }));
  return { el, mini: h('div') };
}

/* ---------------------------------------------------------- notifications */
const SAMPLE_NOTIFS = [
  { app: 'Kalender', title: 'Send Aquaria Invoice', body: 'Selasa 27 Oktober · seharian', ago: '2 jam lalu', tone: 'sky' },
  { app: 'YouTube Music', title: 'Mix baru untukmu', body: 'Breathe No More dan 24 lagu lainnya', ago: '5 jam lalu', tone: 'rose' },
  { app: 'Tumra', title: 'Minggu ini 13j 6m', body: 'Tidak ada invoice jatuh tempo', ago: 'kemarin', tone: 'lime' },
];

export function notifsPanel(onClose: () => void): Panel {
  const list = h('div', { class: 'nlist' });
  const render = () => {
    list.replaceChildren(...(SAMPLE_NOTIFS.length ? SAMPLE_NOTIFS.map((n, i) => {
      const card = h('div', { class: 'ncard' }, h('i', { class: `dot tone-${n.tone}` }), h('div', { class: 'nbody' }, h('small', {}, `${n.app} · ${n.ago}`), h('b', {}, n.title), h('span', {}, n.body)),
        h('button', { class: 'cbtn small', 'aria-label': 'Hapus', onClick: () => { card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(40px)' }], { duration: 240, easing: EASE_IN, fill: 'forwards' }).finished.then(() => { SAMPLE_NOTIFS.splice(i, 1); render(); }); } }, icon('close', 16, 2)));
      return card;
    }) : [h('div', { class: 'nempty' }, icon('bell', 36, 1.5), h('b', {}, 'Semua sudah dibaca'), h('span', {}, 'Notifikasi penting akan muncul di sini.'))]));
  };
  render();
  const el = h('section', { class: 'panel notifs', 'aria-label': 'Notifikasi' },
    h('div', { class: 'bar' }, h('h2', {}, 'Notifikasi'), h('i', { class: 'grow' }), h('button', { class: 'pill-ghost', onClick: () => { SAMPLE_NOTIFS.length = 0; render(); } }, 'Bersihkan semua'), closeBtn(onClose)), list);
  return { el, mini: h('div') };
}
