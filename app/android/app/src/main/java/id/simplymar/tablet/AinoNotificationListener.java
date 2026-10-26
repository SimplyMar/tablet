package id.simplymar.tablet;

import android.service.notification.NotificationListenerService;

/**
 * Intentionally empty. Holding an enabled notification listener is what lets the app read other apps'
 * media sessions (MediaSessionManager.getActiveSessions), which powers the music card.
 */
public class AinoNotificationListener extends NotificationListenerService {}
