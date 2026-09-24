package in.gov.jharkhand.arsafetytrainer;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before super.onCreate();
        // npm-installed plugins are registered automatically by Capacitor.
        registerPlugin(SceneViewerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
