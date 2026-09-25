package `in`.gov.jharkhand.arsafetytrainer.mesh

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Keeps the app running while it relays training records to nearby phones
 * (see [MeshPlugin]). It does no work itself: it only shows the ongoing
 * "sharing with nearby phones" notification Android requires for that.
 */
class MeshService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Offline network", NotificationManager.IMPORTANCE_LOW),
            )
        }
        val openApp = PendingIntent.getActivity(
            this,
            0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
            .setContentTitle("AR Safety Trainer")
            .setContentText("Sharing training records with nearby phones (no internet)")
            .setOngoing(true)
            .setContentIntent(openApp)
            .build()
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (_: Exception) {
            // e.g. Bluetooth permission not granted yet: just don't stay in the foreground.
            stopSelf()
        }
        return START_NOT_STICKY
    }

    private companion object {
        const val CHANNEL_ID = "mesh"
        const val NOTIFICATION_ID = 7301
    }
}
