package in.gov.jharkhand.arsafetytrainer;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens a 3D model in Google Scene Viewer so the worker can place it in
 * their real surroundings (AR). Called from src/platform/arLauncher.js.
 *
 * Scene Viewer ships with the Google app; ARCore ("Google Play Services
 * for AR") is tried as a fallback. `file` must be a public https URL —
 * Scene Viewer runs in its own process and can't read this app's files.
 */
@CapacitorPlugin(name = "SceneViewer")
public class SceneViewerPlugin extends Plugin {

    private static final String SCENE_VIEWER_URL = "https://arvr.google.com/scene-viewer/1.0";
    private static final String[] HANDLER_PACKAGES = {
        "com.google.android.googlequicksearchbox",
        "com.google.ar.core",
    };

    @PluginMethod
    public void open(PluginCall call) {
        String file = call.getString("file");
        if (file == null || file.isEmpty()) {
            call.reject("Missing 'file' (model URL)");
            return;
        }

        Uri uri = Uri.parse(SCENE_VIEWER_URL).buildUpon()
            .appendQueryParameter("file", file)
            .appendQueryParameter("mode", "ar_preferred")
            .appendQueryParameter("title", call.getString("title", ""))
            .build();

        for (String handlerPackage : HANDLER_PACKAGES) {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.setPackage(handlerPackage);
            try {
                getActivity().startActivity(intent);
                call.resolve();
                return;
            } catch (ActivityNotFoundException ignored) {
                // Try the next handler.
            }
        }
        call.reject("Scene Viewer is not available on this device");
    }
}
