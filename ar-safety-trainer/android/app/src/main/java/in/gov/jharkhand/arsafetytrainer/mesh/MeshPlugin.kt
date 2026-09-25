// `in` is a Kotlin keyword, so the package name needs backticks here.
package `in`.gov.jharkhand.arsafetytrainer.mesh

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy

/**
 * Offline phone-to-phone network for src/platform/mesh.js.
 *
 * Uses Google Nearby Connections, which works with no internet and picks
 * Bluetooth, BLE or Wi-Fi Direct by itself. P2P_CLUSTER lets every phone be
 * connected to several neighbours at once, which is what a mesh needs.
 * This plugin only moves text messages between direct neighbours; the
 * multi-hop routing (shortest path to the admin) is in src/core/meshSync.js.
 *
 * Events for JS: peerConnected {endpointId, name}, peerLost {endpointId},
 * message {endpointId, data}, error {message}.
 */
@CapacitorPlugin(
    name = "Mesh",
    permissions = [
        Permission(
            alias = "bluetooth",
            strings = [Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_ADVERTISE, Manifest.permission.BLUETOOTH_CONNECT],
        ),
        Permission(alias = "location", strings = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION]),
        Permission(alias = "wifi", strings = [Manifest.permission.NEARBY_WIFI_DEVICES]),
        Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS]),
    ],
)
class MeshPlugin : Plugin() {

    private val client: ConnectionsClient by lazy { Nearby.getConnectionsClient(context) }
    private val main = Handler(Looper.getMainLooper())

    private var deviceName = "Phone"
    private var running = false
    private val connected = mutableMapOf<String, String>() // endpointId -> name
    private val pendingNames = mutableMapOf<String, String>()

    // Which runtime permissions Nearby needs depends on the Android version.
    private fun requiredAliases(): List<String> {
        val list = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= 31) list += "bluetooth"
        if (Build.VERSION.SDK_INT <= 32) list += "location"
        if (Build.VERSION.SDK_INT >= 33) list += "wifi"
        return list
    }

    private fun wantedAliases(): List<String> =
        requiredAliases() + if (Build.VERSION.SDK_INT >= 33) listOf("notifications") else emptyList()

    @PluginMethod
    fun start(call: PluginCall) {
        deviceName = call.getString("deviceName")?.take(60) ?: "Phone"
        val missing = wantedAliases().filter { getPermissionState(it) != PermissionState.GRANTED }
        if (missing.isNotEmpty()) {
            requestPermissionForAliases(missing.toTypedArray(), call, "afterPermissions")
            return
        }
        begin(call)
    }

    @PermissionCallback
    private fun afterPermissions(call: PluginCall) {
        // Notifications are optional (only the "sharing" notice); the rest are not.
        if (requiredAliases().any { getPermissionState(it) != PermissionState.GRANTED }) {
            call.reject("Bluetooth / nearby devices permission was denied", "permission")
            return
        }
        begin(call)
    }

    private fun begin(call: PluginCall) {
        if (running) {
            call.resolve()
            return
        }
        running = true
        val strategy = Strategy.P2P_CLUSTER
        client.startAdvertising(deviceName, SERVICE_ID, lifecycle, AdvertisingOptions.Builder().setStrategy(strategy).build())
            .addOnFailureListener { emitError("advertise: ${it.message}") }
        client.startDiscovery(SERVICE_ID, discovery, DiscoveryOptions.Builder().setStrategy(strategy).build())
            .addOnFailureListener { emitError("discovery: ${it.message}") }
        startKeepAliveService()
        call.resolve()
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        shutdown()
        call.resolve()
    }

    @PluginMethod
    fun send(call: PluginCall) {
        val endpointId = call.getString("endpointId")
        val data = call.getString("data")
        if (endpointId.isNullOrEmpty() || data == null) {
            call.reject("Missing endpointId or data")
            return
        }
        sendBytes(listOf(endpointId), data, call)
    }

    @PluginMethod
    fun broadcast(call: PluginCall) {
        val data = call.getString("data")
        if (data == null) {
            call.reject("Missing data")
            return
        }
        if (connected.isEmpty()) {
            call.resolve()
            return
        }
        sendBytes(connected.keys.toList(), data, call)
    }

    @PluginMethod
    fun status(call: PluginCall) {
        val peers = JSArray()
        connected.forEach { (id, name) -> peers.put(JSObject().put("endpointId", id).put("name", name)) }
        call.resolve(JSObject().put("running", running).put("peers", peers))
    }

    private fun sendBytes(to: List<String>, data: String, call: PluginCall) {
        val bytes = data.toByteArray(Charsets.UTF_8)
        if (bytes.size > ConnectionsClient.MAX_BYTES_DATA_SIZE) {
            call.reject("Message too large (${bytes.size} bytes)")
            return
        }
        client.sendPayload(to, Payload.fromBytes(bytes))
            .addOnSuccessListener { call.resolve() }
            .addOnFailureListener { call.reject(it.message ?: "send failed") }
    }

    // ---- Nearby callbacks --------------------------------------------------

    private val discovery = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            if (!running || connected.containsKey(endpointId)) return
            // Both phones discover each other. To avoid both asking at the
            // same moment, the "smaller" name asks first; the other asks
            // only if nothing happened after a few seconds.
            val delay = if (deviceName <= info.endpointName) 0L else 6000L
            main.postDelayed({ requestIfNeeded(endpointId) }, delay)
        }

        override fun onEndpointLost(endpointId: String) {}
    }

    private fun requestIfNeeded(endpointId: String) {
        if (!running || connected.containsKey(endpointId) || pendingNames.containsKey(endpointId)) return
        client.requestConnection(deviceName, endpointId, lifecycle)
            .addOnFailureListener { /* already connecting / connected: fine */ }
    }

    private val lifecycle = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            pendingNames[endpointId] = info.endpointName
            client.acceptConnection(endpointId, payloads)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            val name = pendingNames.remove(endpointId) ?: endpointId
            if (!result.status.isSuccess) return
            connected[endpointId] = name
            notifyListeners("peerConnected", JSObject().put("endpointId", endpointId).put("name", name))
        }

        override fun onDisconnected(endpointId: String) {
            connected.remove(endpointId)
            notifyListeners("peerLost", JSObject().put("endpointId", endpointId))
        }
    }

    private val payloads = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type != Payload.Type.BYTES) return
            val bytes = payload.asBytes() ?: return
            notifyListeners("message", JSObject().put("endpointId", endpointId).put("data", String(bytes, Charsets.UTF_8)))
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {}
    }

    // ---- helpers ------------------------------------------------------------

    private fun emitError(message: String) {
        notifyListeners("error", JSObject().put("message", message))
    }

    // A small "sharing with nearby phones" notification keeps the app alive
    // so relaying continues while the screen is off.
    private fun startKeepAliveService() {
        try {
            ContextCompat.startForegroundService(context, Intent(context, MeshService::class.java))
        } catch (_: Exception) {
            // Not critical: the mesh still works while the app is open.
        }
    }

    private fun shutdown() {
        if (!running) return
        running = false
        main.removeCallbacksAndMessages(null)
        client.stopAdvertising()
        client.stopDiscovery()
        client.stopAllEndpoints()
        connected.clear()
        pendingNames.clear()
        context.stopService(Intent(context, MeshService::class.java))
    }

    override fun handleOnDestroy() {
        shutdown()
        super.handleOnDestroy()
    }

    private companion object {
        // Same on every phone running this app; other apps' Nearby traffic is ignored.
        const val SERVICE_ID = "in.gov.jharkhand.arsafetytrainer.mesh"
    }
}
