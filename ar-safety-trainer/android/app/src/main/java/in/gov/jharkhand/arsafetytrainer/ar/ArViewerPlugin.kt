// `in` is a Kotlin keyword, so the package name needs backticks here.
package `in`.gov.jharkhand.arsafetytrainer.ar

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.ar.core.ArCoreApk

/**
 * "View in your space" for the Android app. Called from src/platform/arLauncher.js.
 *
 *  - open():            our own offline AR screen ([ArViewerActivity]), using
 *                       the model bundled inside the APK. No internet needed.
 *  - openSceneViewer(): fallback for phones without ARCore support. Opens
 *                       Google Scene Viewer, which can only load models from
 *                       an https:// address, so it needs internet.
 */
@CapacitorPlugin(name = "ArViewer")
class ArViewerPlugin : Plugin() {

    @PluginMethod
    fun open(call: PluginCall) {
        val modelAsset = call.getString("modelAsset")
        if (modelAsset.isNullOrEmpty()) {
            call.reject("Missing 'modelAsset'")
            return
        }
        // Devices ARCore can never run on. (A supported device where ARCore
        // isn't installed yet is fine: the AR screen offers to install it.)
        if (ArCoreApk.getInstance().checkAvailability(context).isUnsupported) {
            call.reject("AR is not supported on this device", UNSUPPORTED)
            return
        }

        val request = ArViewerActivity.Request(
            modelAsset = modelAsset,
            title = call.getString("title", "")!!,
            sizeMetres = call.getFloat("sizeMetres", 1f)!!,
            hintScan = call.getString("hintScan", "")!!,
            hintTap = call.getString("hintTap", "")!!,
            hintPlaced = call.getString("hintPlaced", "")!!,
            errorText = call.getString("errorText", "")!!,
            closeLabel = call.getString("closeLabel", "")!!,
        )
        activity.startActivity(request.intent(context))
        call.resolve()
    }

    @PluginMethod
    fun openSceneViewer(call: PluginCall) {
        val file = call.getString("file")
        if (file.isNullOrEmpty()) {
            call.reject("Missing 'file' (model URL)")
            return
        }
        val uri = Uri.parse(SCENE_VIEWER_URL).buildUpon()
            .appendQueryParameter("file", file)
            .appendQueryParameter("mode", "ar_preferred")
            .appendQueryParameter("title", call.getString("title", ""))
            .build()

        for (handlerPackage in SCENE_VIEWER_PACKAGES) {
            try {
                activity.startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage(handlerPackage))
                call.resolve()
                return
            } catch (_: ActivityNotFoundException) {
                // Try the next handler.
            }
        }
        call.reject("Scene Viewer is not available on this device", UNSUPPORTED)
    }

    private companion object {
        const val UNSUPPORTED = "unsupported"
        const val SCENE_VIEWER_URL = "https://arvr.google.com/scene-viewer/1.0"
        val SCENE_VIEWER_PACKAGES = listOf("com.google.android.googlequicksearchbox", "com.google.ar.core")
    }
}
