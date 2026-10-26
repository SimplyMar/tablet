package id.simplymar.tablet;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;

import androidx.core.app.NotificationManagerCompat;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(
    name = "AinoNative",
    permissions = { @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class AinoNativePlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private SharedPreferences secrets;
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private MediaSessionManager sessions;
    private MediaController watched;
    private final MediaController.Callback watchCallback = new MediaController.Callback() {
        @Override public void onPlaybackStateChanged(PlaybackState state) { pushNowPlaying(); }
        @Override public void onMetadataChanged(MediaMetadata metadata) { pushNowPlaying(); }
    };

    private ComponentName listener() { return new ComponentName(getContext(), AinoNotificationListener.class); }

    @Override
    public void load() {
        try {
            MasterKey key = new MasterKey.Builder(getContext()).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build();
            secrets = EncryptedSharedPreferences.create(getContext(), "aino_secrets", key,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
        } catch (Exception e) {
            secrets = null;
        }
        sessions = (MediaSessionManager) getContext().getSystemService(Context.MEDIA_SESSION_SERVICE);
        main.post(this::watchSessions);
    }

    /* ------------------------------------------------------------ secrets */
    @PluginMethod
    public void getSecret(PluginCall call) {
        JSObject r = new JSObject();
        r.put("value", secrets == null ? null : secrets.getString(call.getString("key", ""), null));
        call.resolve(r);
    }

    @PluginMethod
    public void setSecret(PluginCall call) {
        if (secrets == null) { call.reject("Penyimpanan aman tidak tersedia"); return; }
        secrets.edit().putString(call.getString("key", ""), call.getString("value", "")).apply();
        call.resolve();
    }

    @PluginMethod
    public void removeSecret(PluginCall call) {
        if (secrets != null) secrets.edit().remove(call.getString("key", "")).apply();
        call.resolve();
    }

    /* --------------------------------------------------------- speech in */
    @PluginMethod
    public void listen(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "micPermission");
            return;
        }
        startListening(call);
    }

    @PermissionCallback
    private void micPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) startListening(call);
        else call.reject("Izin mikrofon ditolak");
    }

    private void startListening(PluginCall call) {
        main.post(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) { call.reject("Pengenalan suara tidak tersedia"); return; }
            if (recognizer != null) recognizer.destroy();
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onResults(Bundle results) {
                    List<String> list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (list == null || list.isEmpty()) { call.reject("no-match"); return; }
                    JSObject r = new JSObject(); r.put("text", list.get(0)); call.resolve(r);
                }
                @Override public void onError(int error) { call.reject("speech-error-" + error); }
                @Override public void onReadyForSpeech(Bundle params) {}
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onPartialResults(Bundle partialResults) {}
                @Override public void onEvent(int eventType, Bundle params) {}
            });
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("language", "id-ID"));
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            recognizer.startListening(i);
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        main.post(() -> { if (recognizer != null) recognizer.stopListening(); call.resolve(); });
    }

    /* -------------------------------------------------------- speech out */
    @PluginMethod
    public void speak(PluginCall call) {
        final String text = call.getString("text", "");
        final String lang = call.getString("language", "id-ID");
        main.post(() -> {
            Runnable say = () -> {
                String[] p = lang.split("-");
                tts.setLanguage(p.length > 1 ? new Locale(p[0], p[1]) : new Locale(p[0]));
                final String id = UUID.randomUUID().toString();
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String utteranceId) {}
                    @Override public void onDone(String utteranceId) { if (id.equals(utteranceId)) call.resolve(); }
                    @Override public void onError(String utteranceId) { if (id.equals(utteranceId)) call.resolve(); }
                });
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
            };
            if (tts != null && ttsReady) { say.run(); return; }
            tts = new TextToSpeech(getContext(), status -> {
                ttsReady = status == TextToSpeech.SUCCESS;
                if (ttsReady) say.run(); else call.reject("Suara tidak tersedia");
            });
        });
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        main.post(() -> { if (tts != null) tts.stop(); call.resolve(); });
    }

    /* ------------------------------------------------------- media session */
    private MediaController activeController() {
        if (sessions == null || !hasAccess()) return null;
        try {
            List<MediaController> list = sessions.getActiveSessions(listener());
            MediaController fallback = null;
            for (MediaController c : list) {
                PlaybackState s = c.getPlaybackState();
                if (s != null && s.getState() == PlaybackState.STATE_PLAYING) return c;
                if (fallback == null && c.getMetadata() != null) fallback = c;
            }
            return fallback;
        } catch (SecurityException e) { return null; }
    }

    private void watchSessions() {
        if (sessions == null || !hasAccess()) return;
        try {
            sessions.addOnActiveSessionsChangedListener(controllers -> { rewatch(); pushNowPlaying(); }, listener());
            rewatch();
        } catch (SecurityException ignored) {}
    }

    private void rewatch() {
        if (watched != null) watched.unregisterCallback(watchCallback);
        watched = activeController();
        if (watched != null) watched.registerCallback(watchCallback, main);
    }

    private JSObject describe(MediaController c) {
        JSObject o = new JSObject();
        if (c == null) { o.put("active", false); return o; }
        MediaMetadata m = c.getMetadata(); PlaybackState s = c.getPlaybackState();
        o.put("active", m != null);
        o.put("title", m == null ? "" : String.valueOf(m.getText(MediaMetadata.METADATA_KEY_TITLE)));
        o.put("artist", m == null ? "" : String.valueOf(m.getText(MediaMetadata.METADATA_KEY_ARTIST)));
        o.put("playing", s != null && s.getState() == PlaybackState.STATE_PLAYING);
        o.put("position", s == null ? 0 : s.getPosition() / 1000.0);
        o.put("duration", m == null ? 0 : m.getLong(MediaMetadata.METADATA_KEY_DURATION) / 1000.0);
        try {
            ApplicationInfo ai = getContext().getPackageManager().getApplicationInfo(c.getPackageName(), 0);
            o.put("app", String.valueOf(getContext().getPackageManager().getApplicationLabel(ai)));
        } catch (PackageManager.NameNotFoundException e) { o.put("app", c.getPackageName()); }
        if (m != null) {
            Bitmap art = m.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART);
            if (art == null) art = m.getBitmap(MediaMetadata.METADATA_KEY_ART);
            if (art != null) {
                Bitmap small = Bitmap.createScaledBitmap(art, 320, 320, true);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                small.compress(Bitmap.CompressFormat.JPEG, 82, out);
                o.put("artBase64", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
            }
        }
        return o;
    }

    private void pushNowPlaying() { notifyListeners("nowPlaying", describe(activeController())); }

    @PluginMethod
    public void nowPlaying(PluginCall call) { call.resolve(describe(activeController())); }

    @PluginMethod
    public void mediaControl(PluginCall call) {
        MediaController c = activeController();
        if (c == null) { call.reject("Tidak ada pemutar aktif"); return; }
        MediaController.TransportControls t = c.getTransportControls();
        String action = call.getString("action", "toggle");
        PlaybackState s = c.getPlaybackState();
        boolean playing = s != null && s.getState() == PlaybackState.STATE_PLAYING;
        switch (action) {
            case "play": t.play(); break;
            case "pause": t.pause(); break;
            case "next": t.skipToNext(); break;
            case "previous": t.skipToPrevious(); break;
            case "seek": t.seekTo((long) (call.getDouble("position", 0.0) * 1000)); break;
            default: if (playing) t.pause(); else t.play();
        }
        call.resolve();
    }

    /* ------------------------------------------------------------- system */
    @PluginMethod
    public void setVolume(PluginCall call) {
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        int cur = am.getStreamVolume(AudioManager.STREAM_MUSIC);
        int next = call.hasOption("level") ? (int) Math.round(call.getDouble("level", 0.0) * max) : cur + (int) Math.round(call.getDouble("delta", 0.0) * max);
        next = Math.max(0, Math.min(max, next));
        am.setStreamVolume(AudioManager.STREAM_MUSIC, next, 0);
        JSObject r = new JSObject(); r.put("level", max == 0 ? 0 : (double) next / max); call.resolve(r);
    }

    private boolean hasAccess() {
        return NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName());
    }

    @PluginMethod
    public void hasNotificationAccess(PluginCall call) {
        JSObject r = new JSObject(); r.put("granted", hasAccess());
        if (hasAccess()) main.post(this::watchSessions);
        call.resolve(r);
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void openApp(PluginCall call) {
        Intent i = getContext().getPackageManager().getLaunchIntentForPackage(call.getString("pkg", ""));
        if (i == null) { call.reject("Aplikasi tidak terpasang"); return; }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (recognizer != null) recognizer.destroy();
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (watched != null) watched.unregisterCallback(watchCallback);
    }
}
