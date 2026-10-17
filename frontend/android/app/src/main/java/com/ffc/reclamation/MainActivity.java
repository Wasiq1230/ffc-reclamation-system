package com.ffc.reclamation;

import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "FFC_MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupWebView();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupWebView();
    }

    private void setupWebView() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();

            // 1. Responsive scaling & pinch-to-zoom
            settings.setSupportZoom(true);
            settings.setBuiltInZoomControls(true);
            settings.setDisplayZoomControls(false); // Hide legacy on-screen buttons
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setTextZoom(100);

            // 2. Auto-Update from Server (Live Reload without Reinstalling APK):
            // When device has an internet connection, bypass stale local cache to load the latest Vercel/server deployment.
            // When offline, fall back to cached version so app remains accessible.
            try {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                NetworkInfo activeNetwork = cm != null ? cm.getActiveNetworkInfo() : null;
                boolean isConnected = activeNetwork != null && activeNetwork.isConnectedOrConnecting();
                if (isConnected) {
                    settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
                } else {
                    settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
                }
            } catch (Exception e) {
                settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            }

            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            // 3. Attach enhanced AndroidDownloader bridge interface
            webView.addJavascriptInterface(new AndroidDownloader(this, webView), "AndroidDownloader");
        }
    }

    public static class AndroidDownloader {
        private final Context context;
        private final WebView webView;

        public AndroidDownloader(Context context, WebView webView) {
            this.context = context;
            this.webView = webView;
        }

        /**
         * Generic in-app file downloader for PDF, CSV, Excel (.xlsx), etc.
         * Saves to Scoped Storage (Downloads/FFC_Reclamation) and opens/shares with native viewer.
         */
        @JavascriptInterface
        public void saveAndOpenFile(String base64Data, String fileName, String mimeType) {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    if (base64Data == null || base64Data.trim().isEmpty()) {
                        Toast.makeText(context, "Error: File data is empty", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    // Clean base64 header (e.g. "data:text/csv;base64,...")
                    String cleanBase64 = base64Data;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    byte[] fileBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                    // Normalize file name
                    String safeFileName = (fileName != null && !fileName.trim().isEmpty())
                            ? fileName.trim()
                            : "FFC_Export_" + System.currentTimeMillis();

                    // Determine MIME type and proper extension
                    String resolvedMimeType = (mimeType != null && !mimeType.trim().isEmpty())
                            ? mimeType.trim()
                            : "";

                    String lowerName = safeFileName.toLowerCase();
                    if (lowerName.endsWith(".csv") || resolvedMimeType.contains("csv")) {
                        resolvedMimeType = "text/csv";
                        if (!lowerName.endsWith(".csv")) safeFileName += ".csv";
                    } else if (lowerName.endsWith(".xlsx") || resolvedMimeType.contains("spreadsheetml") || resolvedMimeType.contains("excel")) {
                        resolvedMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                        if (!lowerName.endsWith(".xlsx")) safeFileName += ".xlsx";
                    } else if (lowerName.endsWith(".pdf") || resolvedMimeType.contains("pdf")) {
                        resolvedMimeType = "application/pdf";
                        if (!lowerName.endsWith(".pdf")) safeFileName += ".pdf";
                    } else if (resolvedMimeType.isEmpty()) {
                        resolvedMimeType = "application/octet-stream";
                    }

                    // 1. Save to app cache directory for FileProvider viewing
                    File targetFile = new File(context.getCacheDir(), safeFileName);
                    try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                        fos.write(fileBytes);
                        fos.flush();
                    }

                    // 2. Save permanent copy to public Downloads folder (Scoped Storage on Android 10+)
                    saveToPublicDownloads(fileBytes, safeFileName, resolvedMimeType);

                    // 3. Open or Share file via FileProvider
                    Uri contentUri = FileProvider.getUriForFile(
                            context,
                            context.getPackageName() + ".fileprovider",
                            targetFile
                    );

                    Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                    viewIntent.setDataAndType(contentUri, resolvedMimeType);
                    viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    Intent chooser = Intent.createChooser(viewIntent, "Open " + safeFileName + " with...");
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    try {
                        context.startActivity(chooser);
                    } catch (ActivityNotFoundException anfe) {
                        // Fallback: If no dedicated viewer installed, open native Share dialog
                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType(resolvedMimeType);
                        shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(Intent.createChooser(shareIntent, "Share " + safeFileName));
                    }

                    Toast.makeText(context, "Saved to Downloads: " + safeFileName, Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Log.e(TAG, "Error saving/opening file: " + e.getMessage(), e);
                    Toast.makeText(context, "Failed to download file: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        /**
         * Backward-compatible alias for certificate PDF downloads
         */
        @JavascriptInterface
        public void saveAndOpenPdf(String base64Data, String fileName) {
            saveAndOpenFile(base64Data, fileName, "application/pdf");
        }

        /**
         * Reloads the app from server with cache clearance so user instantly sees server deploys.
         */
        @JavascriptInterface
        public void reloadApp(boolean forceClearCache) {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    if (webView != null) {
                        if (forceClearCache) {
                            webView.clearCache(true);
                        }
                        webView.reload();
                        Toast.makeText(context, "Syncing latest updates from server...", Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Error reloading webView: " + e.getMessage());
                }
            });
        }

        private void saveToPublicDownloads(byte[] fileBytes, String fileName, String mimeType) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/FFC_Reclamation");

                    Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (OutputStream os = context.getContentResolver().openOutputStream(uri)) {
                            if (os != null) {
                                os.write(fileBytes);
                                os.flush();
                            }
                        }
                    }
                } else {
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File ffcDir = new File(downloadsDir, "FFC_Reclamation");
                    if (!ffcDir.exists()) ffcDir.mkdirs();
                    File dest = new File(ffcDir, fileName);
                    try (FileOutputStream fos = new FileOutputStream(dest)) {
                        fos.write(fileBytes);
                        fos.flush();
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Could not save to public Downloads folder: " + e.getMessage());
            }
        }
    }
}
