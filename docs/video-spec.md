# Reference video: tablet dashboard (1152x718, 67s, Indonesian UI)

Source: threadsdownloader.com_0f23ee.mp4. Frames were sampled with the watch skill, so timings below are approximate.

## Screens
- **Home (dashboard):** greeting row (Aino robot face + headline), top bar, bento grid of widgets.
- **Work mode:** top-bar briefcase toggle. Greeting reads "Mode kerja aktif. Kabar yang tidak penting aku tahan dulu." Grid becomes navigation card, large clock, music card, week strip, and Deck with colour-tinted buttons.
- **Music overlay:** album art, title, artist, seek bar, shuffle/prev/play/next/repeat, volume, "Cahaya ikut musik" (Penuh / Lembut / Mati), queue.
- **World clock overlay (Jam dunia):** tabs Sydney / Colfax, two city cards with hourly forecast, "Jam kerja bersama" overlap chart, assistant bubble with "Jadwalkan meeting" button.
- **Calendar overlay:** Bulan / Minggu / Hari tabs, month grid with event chips, Agenda side panel, "+ Acara", "Hari ini", prev/next.

## Home widgets
Date header; mode toggle (grid, briefcase, home, coffee); icons for volume, apps grid, bell, more, settings sliders; avatar "I". Weather (29°, Gerimis, Jakarta, rain animation over clouds) with a now-playing pill. World clock (Jakarta 17.10, Sydney +4j, Colfax -11j). Round music card with progress ring and spinning art. Istirahat timer (05:00, "Mulai"). Calendar. Deck (prev, play, next, mute, vol-, vol+, YouTube Music, YouTube). Tumra weekly hours (13j 6m, invoice link). Chat FAB bottom right.

## Animations seen
- Headline carousel: news title crossfades with source line (domain, "7 jam lalu", "Berita" tag).
- Greeting text swaps with typed-style lines from Aino; green status dot + "Aino" / "Mendengarkan".
- Robot face blinks, eyes change, waveform bars in the mouth while listening; mic button turns green.
- Tapping a widget scales it into a full overlay and back; overlays fade out with a blur.
- Mode switch reflows the grid; widgets fade/slide to the new layout.
- Deck buttons tint on press; music ring and album art rotate while playing; track change swaps art and the now-playing pill.
- Status bar (time, notification icons, green mic indicator) appears while listening.
- Weather rain falls over the cloud.

## Not shown in the video
Home and coffee mode contents, apps grid, notifications, more menu, settings, chat panel. These will be designed in the same style.

## Motion spec (measured by frame-stepping at 10-15 fps)

All timings are from the video. Easing is an exponential ease-out unless noted.

| Moment | What happens | Duration |
|---|---|---|
| Headline carousel | Old title and meta fade out with a slight blur (about 170 ms), new title fades in (about 250 ms). The robot face blinks (eyes squash to a line for about 80 ms) right after. | ~420 ms |
| Mode switch (home to work and back) | The active pill slides to the new segment. The greeting text swaps. Every widget fades out together, blank card surfaces appear in the new layout, then card surfaces and their contents fade in staggered about 50 ms apart (navigation or clock first, deck last). | ~750 ms |
| Overlay open (music, world clock, calendar) | The home screen blurs, dims and shrinks slightly. The overlay panel arrives from slightly smaller and blurred and settles. A small Aino face with a speech bubble sits at the bottom-left, then fades out after about 500 ms. | ~280 ms |
| Overlay close | The panel shrinks and slides down toward the bottom while fading and blurring. Home comes back with blank card surfaces first, then contents, staggered. | ~450 ms close, ~300 ms return |
| Face states | Idle: two rounded eyes. Speaking: eyes plus a short dash mouth. Listening: green mic button, eyes plus waveform bars, status line "Mendengarkan". | |
| Deck keys | Pressed key tints pale green for about 150 ms. | 150 ms |
| Music ring | Progress ring plus rotating album art while playing; track change swaps the art and the now-playing pill. | |

The Android status bar visible during listening in the video belongs to the OS, so the app does not draw it.
