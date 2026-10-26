package id.simplymar.tablet;

import android.content.ComponentName;
import android.content.Context;
import android.service.notification.NotificationListenerService;

/**
 * Holding an enabled notification listener is what lets the app read other apps' media sessions
 * (MediaSessionManager.getActiveSessions), which powers the music card. It never reads notification content.
 */
public class AinoNotificationListener extends NotificationListenerService {
    public static volatile boolean connected = false;

    @Override public void onListenerConnected() { connected = true; }
    @Override public void onListenerDisconnected() { connected = false; }

    /** Android binds the listener lazily after the user grants access; ask it to bind now. */
    public static void rebind(Context ctx) {
        try { NotificationListenerService.requestRebind(new ComponentName(ctx, AinoNotificationListener.class)); } catch (Exception ignored) {}
    }
}
