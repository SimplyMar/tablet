# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Capacitor 7 wrapping a plain web UI (HTML, CSS, TypeScript via Vite) as an Android debug APK, built in the cloud and sideloaded. Chosen by the user from four options.

## Users
One person (the owner) using a Samsung Galaxy Tab S10 Lite in landscape as an always-on desk dashboard next to a PC. The job is a glanceable overview of the day (time, weather, calendar, music, focus timer, weekly work hours) plus quick control of music and a voice assistant.

## Product Purpose
Rebuild a reference tablet dashboard shown in a screen recording (docs/video-spec.md, source video threadsdownloader.com_0f23ee.mp4, 1152x718, 67s) so it runs on the user's own tablet. Success means the UI and animation match the video 1:1 and the assistant "Aino" is genuinely useful.

## Positioning
A personal ambient dashboard with a talking assistant face, an Indonesian-language UI, and widgets that expand fluidly into full-screen overlays.

## Operating Context
- Landscape tablet, 1152x718 CSS-px reference frame; Samsung Tab S10 Lite is the real target.
- Indonesian UI copy and locale (Jakarta, WIB). Other cities in the video: Sydney, Colfax.
- Build and test happen in a cloud container: Android SDK, Gradle, Playwright screenshots at 1152x718. There is no emulator in the cloud; the user tests the APK on the tablet.

## Capabilities and Constraints
- v1 uses mock data for weather, calendar, news headlines, world clock, Tumra hours and Deck. Real weather, calendar and news are decided later.
- Music card reads the tablet's now-playing state and controls it through Android's media session. Deck stays visual.
- Aino: Android speech-to-text, then the Gemini API for the answer, then Android text-to-speech, in Indonesian. The user pastes their own Gemini key in Settings; it is stored on-device and never committed to git.
- Screens never shown in the video (home and coffee modes, apps grid, notifications, more menu, settings, chat panel) are designed to match the same visual language and shown to the user before being built.
- Fluid animation is a hard requirement: widget-to-overlay transitions, carousel crossfades, robot face states, rain, rotating music ring.
- Undecided: app name beyond "Aino" assistant, which data sources go live first, real calendar source.

## Brand Commitments
The reference video is binding for layout, copy tone, colours and motion. The assistant is named Aino; the UI is Indonesian.

## Evidence on Hand
- Reference video (local upload only, not in the repo) and docs/video-spec.md derived from 26 sampled frames.
- No logos, fonts or image assets exist; the album art, avatar and robot face must be recreated.
- No audio track in the video.

## Product Principles
1. Match the reference exactly before improving anything.
2. Motion is continuous and interruptible; nothing snaps.
3. Glanceable from a desk: large type, few words, calm surfaces.
4. Aino is the personality; the rest stays quiet.
5. Secrets stay on the device.

## Accessibility & Inclusion
Indonesian language. Touch targets suitable for a tablet; respect reduced-motion for the decorative animations only where it does not break 1:1 playback (to confirm with the user).
