package com.helix.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // QA builds keep WebView inspection (needed for the emulator test of the exact artifact);
        // the app itself is not debuggable in release. See android/app/build.gradle.
        WebView.setWebContentsDebuggingEnabled(BuildConfig.QA_WEBVIEW_INSPECTION);
    }
}
