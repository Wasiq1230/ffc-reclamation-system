package com.ffc.reclamation;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
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

            // 1. Issue 1 Fix: Enable fluid responsive scaling & pinch-to-zoom
            settings.setSupportZoom(true);
            settings.setBuiltInZoomControls(true);
            settings.setDisplayZoomControls(false); // Hide legacy on-screen buttons
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setTextZoom(100);

            // 2. Issue 3 Fix: Attach AndroidDownloader bridge interface
            webView.addJavascriptInterface(new AndroidDownloader(this), "AndroidDownloader");
        }
    }

    public static class AndroidDownloader {
        private final Context context;

        public AndroidDownloader(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void saveAndOpenPdf(String base64Data, String fileName) {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    if (base64Data == null || base64Data.isEmpty()) {
                        Toast.makeText(context, "Error: PDF data is empty", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    // Clean base64 header if present (e.g. data:application/pdf;base64,...)
                    String cleanBase64 = base64Data;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    byte[] pdfBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                    String safeFileName = (fileName != null && !fileName.trim().isEmpty())
                            ? fileName.trim()
                            : "FFC-Certificate.pdf";
                    if (!safeFileName.toLowerCase().endsWith(".pdf")) {
                        safeFileName += ".pdf";
                    }

                    // 1. Save to app cache/files for immediate FileProvider viewing
                    File pdfFile = new File(context.getCacheDir(), safeFileName);
                    try (FileOutputStream fos = new FileOutputStream(pdfFile)) {
                        fos.write(pdfBytes);
                        fos.flush();
                    }

                    // 2. Save copy to system Downloads folder (Scoped Storage on Android 10+, public dir on older)
                    saveToPublicDownloads(pdfBytes, safeFileName);

                    // 3. Open via FileProvider in device's native PDF Viewer
                    Uri contentUri = FileProvider.getUriForFile(
                            context,
                            context.getPackageName() + ".fileprovider",
                            pdfFile
                    );

                    Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                    viewIntent.setDataAndType(contentUri, "application/pdf");
                    viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    Intent chooser = Intent.createChooser(viewIntent, "Open Certificate PDF with...");
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(chooser);

                    Toast.makeText(context, "Certificate saved: " + safeFileName, Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Log.e(TAG, "Error saving/opening PDF: " + e.getMessage(), e);
                    Toast.makeText(context, "Failed to open PDF: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        private void saveToPublicDownloads(byte[] pdfBytes, String fileName) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/FFC_Reclamation");

                    Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (OutputStream os = context.getContentResolver().openOutputStream(uri)) {
                            if (os != null) {
                                os.write(pdfBytes);
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
                        fos.write(pdfBytes);
                        fos.flush();
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Could not save to public Downloads folder: " + e.getMessage());
            }
        }
    }
}
