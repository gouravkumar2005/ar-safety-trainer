package in.gov.jharkhand.arsafetytrainer;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import in.gov.jharkhand.arsafetytrainer.ar.ArViewerPlugin;
import in.gov.jharkhand.arsafetytrainer.mesh.MeshPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before super.onCreate();
        // npm-installed plugins are registered automatically by Capacitor.
        registerPlugin(ArViewerPlugin.class);
        registerPlugin(MeshPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
