# Aino Dash

Landscape tablet dashboard (Samsung Galaxy Tab S10 Lite) rebuilt from a reference recording. Plain TypeScript, Vite, Capacitor 7. Reference notes and measured motion timings are in `../docs/video-spec.md`.

## Run and test

```bash
npm install
npm run dev                 # http://localhost:5173/?demo  (demo freezes the clock at 17.10, Sabtu 24 Oktober 2026)
npm run build && npx vite preview --port 4173 &
node tools/smoke.mjs        # headless UI smoke test (needs Playwright)
node tools/smoke-live.mjs   # live weather path (GPS, geocoding, forecast all stubbed), run against a non-demo URL
node tools/shots.mjs home work music clock calendar chat settings apps notifs rest coffee
node tools/shots.mjs seq-music-open seq-music-close seq-headline   # paused-animation frame sequences
python3 -I tools/compare.py REF.png SHOT.png OUT.png               # side-by-side with the reference frame
```

## Build the APK (cloud or local)

```bash
../scripts/setup-android-cloud.sh   # once per fresh container: Android SDK
npm run apk                         # -> android/app/build/outputs/apk/debug/app-debug.apk
```

Maven Central sometimes answers 429 through the cloud proxy; rerun and Gradle resumes from its cache.

## Native bridge (`android/.../AinoNativePlugin.java`)

- Encrypted storage for the Gemini key (`EncryptedSharedPreferences`).
- Speech to text (`SpeechRecognizer`, `id-ID`) and text to speech (`TextToSpeech`).
- Now playing: reads and controls the active media session through a notification listener. Grant it once under Pengaturan > Musik.
- Volume, and launching other apps.

The web layer works without the plugin (Web Speech API, `localStorage`, mock player), which is what the cloud tests exercise. The native paths compile in CI but have not been run on a device from the cloud.
