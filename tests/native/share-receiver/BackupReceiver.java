package com.tumarre.singluten.testreceiver;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.TextView;
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import org.json.JSONObject;

/** Test-only local ACTION_SEND sink. No network/storage permission, accounts or telemetry. */
public final class BackupReceiver extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    TextView message = new TextView(this);
    message.setPadding(24, 72, 24, 24);
    setContentView(message);
    try {
      Intent intent = getIntent();
      Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
      if (!Intent.ACTION_SEND.equals(intent.getAction()) || uri == null
          || !"content".equals(uri.getScheme()) || uri.getAuthority() == null
          || !uri.getAuthority().startsWith("com.tumarre.singluten.")) {
        throw new IllegalArgumentException("Unexpected shared source");
      }
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();
      try (InputStream input = getContentResolver().openInputStream(uri)) {
        if (input == null) throw new IllegalArgumentException("No readable backup");
        byte[] buffer = new byte[8192];
        int count;
        while ((count = input.read(buffer)) != -1) {
          if (bytes.size() + count > 20 * 1024 * 1024) throw new IllegalArgumentException("Backup too large");
          bytes.write(buffer, 0, count);
        }
      }
      byte[] body = bytes.toByteArray();
      JSONObject copy = new JSONObject(new String(body, "UTF-8"));
      if (!"sin-gluten-library".equals(copy.optString("format")) || copy.optInt("backupVersion") != 4) {
        throw new IllegalArgumentException("Unexpected backup format");
      }
      try (FileOutputStream output = openFileOutput("received.json", MODE_PRIVATE)) {
        output.write(body);
      }
      message.setText("Backup captured locally: " + body.length + " bytes. No data sent anywhere.");
    } catch (Exception failure) {
      // Never log the URI, backup contents or exception message.
      message.setText("Local backup capture failed: " + failure.getClass().getSimpleName());
    }
  }
}
