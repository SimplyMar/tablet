# Aino Dash: dokumen handoff

Versi saat ini: **0.2.4** (versionCode 6). Paket Android: `id.simplymar.tablet`.
Repo: `SimplyMar/tablet`, branch `claude/skills-connectors-plugins-u3lhd5` (tidak ada pull request).

## 1. Apa ini

Dasbor tablet landscape untuk Samsung Galaxy Tab S10 Lite, dibuat ulang dari rekaman layar 67 detik (1152x718, UI berbahasa Indonesia, asisten bernama **Aino**). Tujuan utama: UI dan animasi sama persis dengan video, dengan animasi yang mengalir. Rekaman aslinya tidak ada di repo (hanya unggahan lokal); ringkasan ukurannya ada di `docs/video-spec.md` dan tangkapan layar tiap keadaan ada di `docs/screens/`.

Stack: Capacitor 7 membungkus UI web (TypeScript tanpa framework, Vite 8, CSS biasa dengan token, Web Animations API). Panggung tetap 1152x718 yang diskalakan ke layar (`fit()` di `app/src/main.ts`).

## 2. Isi zip

| Lokasi | Isi |
|---|---|
| `releases/aino-dash-0.2.4-debug.apk` | APK debug siap pasang (sideload) |
| `app/` | Proyek: `src/` (web), `android/` (native), `tools/` (tes dan tangkapan layar) |
| `docs/video-spec.md`, `docs/screens/` | Spesifikasi dari video dan tangkapan semua layar |
| `PRODUCT.md` | Catatan produk untuk skill impeccable |
| `scripts/setup-android-cloud.sh` | Memasang Android SDK di container cloud baru |
| `.claude/skills/`, `.claude/agents/` | Skill `watch` dan `impeccable` beserta agennya (pihak ketiga, disalin) |
| `HANDOFF.md` | Dokumen ini |

Tidak ikut: `node_modules`, hasil build (`dist`, `android/**/build`), video sumber, dan kunci API apa pun.

## 3. Cara menjalankan dan membangun

```bash
cd app
npm install
npm run dev                         # http://localhost:5173/?demo  (jam dibekukan 17.10, Sabtu 24 Oktober 2026)
npm run typecheck
npm run build && npx vite preview --port 4173 &
node tools/smoke.mjs                # tes UI headless (butuh Playwright)
node tools/smoke-live.mjs           # jalur cuaca/GPS dengan stub, jalankan ke URL non-demo
node tools/shots.mjs home work music clock calendar chat settings apps notifs rest coffee
```

Membangun APK (butuh JDK 21, Node 22, Android SDK):

```bash
./scripts/setup-android-cloud.sh    # sekali per container baru
cd app && export ANDROID_HOME=/opt/android-sdk ANDROID_SDK_ROOT=/opt/android-sdk
npm run apk                         # hasil: app/android/app/build/outputs/apk/debug/app-debug.apk
```

Catatan build:
- Maven Central kadang membalas 429 lewat proxy cloud. Ulangi saja; Gradle melanjutkan dari cache. Skrip `apk` sudah memakai `--max-workers=1`.
- Naikkan `versionCode` dan `versionName` di `app/android/app/build.gradle` tiap rilis supaya APK bisa dipasang di atas versi lama.
- Playwright terpasang global; impor lewat `createRequire(import.meta.url)('playwright')` atau `NODE_PATH=$(npm root -g)`.
- Jangan pakai `pkill -f "vite preview"` (membunuh shell sendiri). Jalankan preview dengan `nohup`.

## 4. Peta kode

Web (`app/src/`):
- `main.ts`: titik masuk, `fit()`, memulai now-playing, cuaca, keep-awake.
- `ui/dashboard.ts`: pengendali utama: mode (home/work/rest/coffee), panel overlay (music, clock, calendar, chat, settings, apps, notifs), popover, alur Aino (`converse`, `respond`, `applyIntent`), `reveal()` untuk kemunculan bertahap.
- `ui/chrome.ts`: bilah atas (tombol keep-awake, volume, pemilih mode, avatar), blok cuaca, pil now-playing, FAB.
- `ui/aino.ts`: wajah Aino (kedip, bicara, mendengar) dan judul yang berganti.
- `ui/cards.ts`, `work.ts`, `modes.ts`: widget tiap mode. `ui/panels.ts`: musik, jam dunia, kalender. `ui/sheets.ts`: obrolan, Pengaturan, aplikasi, notifikasi. `ui/art.ts`: sampul album prosedural.
- `lib/`: `h.ts` (pembuat DOM), `icons.ts`, `motion.ts` (easing), `store.ts`, `player.ts`, `timer.ts`, `time.ts` (flag `?demo`, zona waktu rumah), `weather.ts` (Open-Meteo, geocoding, cache).
- `aino/brain.ts`: Gemini + perintah lokal tanpa internet. `aino/settings.ts`: preferensi dan daftar model.
- `native/`: `bridge.ts` (antarmuka plugin + cadangan web), `nowplaying.ts`, `awake.ts`, `geo.ts`.
- `styles/`: `tokens.css`, `base.css`, `home.css`, `panels.css`, `work.css`, `sheets.css`.

Native (`app/android/app/src/main/java/id/simplymar/tablet/`):
- `AinoNativePlugin.java`: penyimpanan terenkripsi, speech-to-text (id-ID), text-to-speech, sesi media, volume, keep-awake, buka aplikasi, info aplikasi.
- `AinoNotificationListener.java`: layanan agar sesi media bisa dibaca.
- `MainActivity.java`: mendaftarkan plugin, layar tetap menyala, mode imersif.
- `AndroidManifest.xml`: sensorLandscape, RECORD_AUDIO, lokasi kasar dan akurat, layanan listener, `queries` untuk paket aplikasi.

## 5. Keputusan penting (dari wawancara awal)

- Capacitor + web; data tiruan dulu; layar yang tidak ada di video didesain dengan gaya yang sama.
- Aino memakai Gemini sungguhan. Kunci diketik di Pengaturan dan disimpan terenkripsi di perangkat, tidak pernah di git.
- Suara: speech-to-text Android, Gemini, lalu text-to-speech Android.
- Kartu musik membaca dan mengendalikan musik yang sedang diputar di tablet. Deck hanya visual.
- Pengiriman: APK debug dari cloud, dipasang manual.

## 6. Model animasi (hasil ukur dari video)

- Judul bergantian: crossfade ~420 ms dengan blur.
- Ganti mode: kartu memudar 150 ms, permukaan kosong muncul, lalu isi muncul bertahap (~750 ms).
- Buka overlay: beranda memburam dan meredup, panel dari skala .93 + blur selesai ~400 ms. Tutup: panel turun `translateY(34%)` skala .58 selama 460 ms, beranda kembali, isi muncul bertahap.
- Wajah Aino (kedip, bicara, mendengar), hujan, cincin musik berputar.
- Teknik tangkap: jeda semua animasi lalu geser `currentTime` per frame (lihat `tools/shots.mjs`, skenario `seq-*`).
- Jebakan yang sudah pernah terjadi: animasi `fill: 'forwards'` yang menempel pada elemen yang dipakai ulang membuat kartu tidak terlihat. Setelah animasi keluar selesai, selalu `cancel()` (lihat `dashboard.ts`), dan `closePanel` membatalkan animasi `home`. Ada tes regresinya di `smoke.mjs`.

## 7. Gemini (`app/src/aino/`)

- Endpoint: `v1beta/models/{model}:generateContent`, header `x-goog-api-key` (kunci tidak pernah di URL). Di Android lewat `CapacitorHttp`, di web lewat `fetch`.
- Model bawaan: `gemini-3.6-flash`. Pemilih di Pengaturan: 3.6 Flash, 3.5 Flash, 3.5 Flash Lite, 3.1 Flash Lite (tersimpan saat diketuk). Model Lite punya kuota gratis terpisah dan lebih longgar.
- Model 2.x sudah ditutup Google untuk kunci baru; pilihan lama 1.x/2.x dan 3.7/3.8 dari 0.2.1 dipindahkan sekali ke bawaan. `PREFS_VERSION` di `settings.ts` mengatur migrasi itu.
- Ketahanan: batas waktu 12 detik per percobaan, maksimal 4 percobaan. Kalau model dihapus (404), sibuk (503), lambat, atau kena kuota (429), aplikasi mengambil daftar model dari Google dan pindah ke yang terdekat versinya (lalu Lite). Model cadangan yang berhasil diingat 30 menit (`aino.good`). Pilihan pengguna hanya diganti kalau model benar-benar sudah dihapus.
- Tingkat berpikir: Gemini 3 memakai anggaran token untuk "berpikir", sehingga jawaban terpotong. Aplikasi mencoba `minimal`, lalu `low`, lalu tanpa pengaturan (3.7 dan 3.8 menolak `minimal`). Batas keluaran 1024 token.
- Perintah lokal (`localIntent`) berjalan tanpa kunci dan tanpa internet: jeda/putar/berikutnya, volume, mode kerja, kalender, jam dunia, jam, tanggal, cuaca. Hati-hati: kata seperti "berikutnya" memicu perintah lokal sebelum Gemini.
- Batas gratis: kunci di tier gratis hanya mendapat sekitar 20 permintaan per hari untuk model baru (dikonfirmasi di pesan error `gemini-3.8-flash`). Langganan Google AI Pro tidak menambah kuota API (menurut utas forum Google, bukan pernyataan resmi). Solusi: pakai model Lite, atau aktifkan penagihan pada proyek Google Cloud pemilik kunci.

## 8. Data: yang nyata dan yang masih tiruan

Nyata:
- Cuaca, nama kota, rentang suhu, zona waktu rumah: dari GPS (atau kota yang dicari di Pengaturan) lewat Open-Meteo, geocoding Open-Meteo, dan BigDataCloud untuk nama tempat. Tanpa kunci. Diperbarui tiap 20 menit dan di-cache.
- Cuaca Sydney di panel jam dunia (Open-Meteo).
- Obrolan Aino (Gemini).

Masih tiruan (`app/src/data/mock.ts` dan sejenisnya): cuaca Colfax (kota tidak jelas), kalender, berita, angka Tumra, Deck, antrean musik cadangan, notifikasi contoh.

## 9. Status uji

Diuji otomatis di cloud (headless Chromium, 1152x718): navigasi semua layar, kartu tetap terlihat setelah kembali ke mode, keep-awake, obrolan offline dan dengan stub Gemini, migrasi model, fallback saat sibuk/dihapus, pemilih model, cuaca dengan GPS/geocoding stub, izin lokasi ditolak. Juga diuji sekali langsung ke API Gemini asli lewat versi web.

**Belum pernah dijalankan di perangkat dari cloud** (tidak ada emulator). Perlu dikonfirmasi di tablet:
1. Membaca dan mengendalikan musik YouTube Music lewat sesi media. Butuh akses notifikasi; di Android 13+ untuk APK manual tombolnya bisa terkunci: Info aplikasi, titik tiga, "Izinkan setelan terbatas". Pengaturan > Musik punya status dan tombol "Uji sekarang" yang menampilkan apa yang dilaporkan Android.
2. Speech-to-text dan text-to-speech Android dalam bahasa Indonesia.
3. Penyimpanan kunci terenkripsi (`EncryptedSharedPreferences`).
4. Izin lokasi dan GPS pada tablet.
5. Tombol keep-awake (flag layar menyala sudah dipakai sejak awal).
6. Peluncuran aplikasi lain (nama paket di daftar `APPS` di `sheets.ts`, mis. jam Samsung, mungkin perlu disesuaikan).

## 10. Riwayat rilis

| Versi | Perubahan |
|---|---|
| 0.1.0 | Rilis awal: semua layar, animasi, Aino, jembatan native |
| 0.2.0 | Perbaikan layar kosong saat pindah mode; tombol keep-awake; cuaca dari GPS; diagnosis akses notifikasi |
| 0.2.1 | Model Gemini bawaan dipindah dari 2.5-flash yang sudah ditutup |
| 0.2.2 | Batas waktu, cadangan model, berpikir minimal (obrolan tidak lagi menggantung dan terpotong) |
| 0.2.3 | Bawaan 3.6-flash, urutan cadangan berdasarkan versi terdekat, migrasi sekali |
| 0.2.4 | Pemilih model dengan 3.5 Flash Lite dan 3.1 Flash Lite |

## 11. Langkah berikutnya yang disarankan

1. Umpan balik dari tablet untuk butir-butir di bagian 9 (terutama musik dan akses notifikasi). Kalau musik tetap tidak berubah, minta isi baris "Uji sekarang".
2. Ubah urutan cadangan Gemini: Lite lebih awal, dan ingat model yang kuotanya habis untuk sehari (usulan yang belum dikerjakan).
3. Pilih data tiruan yang akan dibuat nyata dulu: kalender (Google Calendar atau kalender perangkat), berita, angka Tumra. Tentukan kota "Colfax" yang dimaksud.
4. Minta persetujuan desain layar yang tidak ada di video (beranda, kopi, aplikasi, notifikasi, menu lainnya, pengaturan, obrolan).
5. Opsional: tanda tangan rilis (keystore) dan APK release, bukan debug.
6. Opsional: SessionStart hook atau skrip setup lingkungan supaya `yt-dlp`, Android SDK, dan skill otomatis ada di tiap sesi cloud.

## 12. Keamanan

- Kunci Gemini tidak ada di repo, APK, atau zip ini. Kunci disimpan terenkripsi di perangkat.
- Kunci API pernah ditempel di percakapan dengan Claude untuk pengujian. Sebaiknya hapus kunci itu di Google AI Studio dan buat yang baru, lalu masukkan di Pengaturan.
- Permintaan cuaca mengirim koordinat kasar ke Open-Meteo dan BigDataCloud (tanpa akun, tanpa kunci).
