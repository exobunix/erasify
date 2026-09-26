import { existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync, statSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = resolve('.');
const BUILD_DIR = join(ROOT_DIR, 'android-build');

const JDK_BIN = 'C:\\Program Files\\Android\\Android Studio\\jbr\\bin';
const JAVAC = join(JDK_BIN, 'javac.exe');
const KEYTOOL = join(JDK_BIN, 'keytool.exe');
const JAR_TOOL = join(JDK_BIN, 'jar.exe');

const SDK_ROOT = 'C:\\Users\\Adarsh\\AppData\\Local\\Android\\Sdk';
const BUILD_TOOLS = join(SDK_ROOT, 'build-tools', '35.0.0');
const AAPT2 = join(BUILD_TOOLS, 'aapt2.exe');
const D8 = join(BUILD_TOOLS, 'd8.bat');
const ZIPALIGN = join(BUILD_TOOLS, 'zipalign.exe');
const APKSIGNER = join(BUILD_TOOLS, 'apksigner.bat');
const ANDROID_JAR = join(SDK_ROOT, 'platforms', 'android-34', 'android.jar');

function run(cmd, desc) {
  console.log(`\n▶ [${desc}]`);
  console.log(`$ ${cmd}`);
  const env = {
    ...process.env,
    JAVA_HOME: 'C:\\Program Files\\Android\\Android Studio\\jbr',
    PATH: `${JDK_BIN};${process.env.PATH}`
  };
  execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR, env });
}

// Recursively find all .class files in a directory
function findClassFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = join(dir, item.name);
    if (item.isDirectory()) results.push(...findClassFiles(full));
    else if (item.name.endsWith('.class')) results.push(full);
  }
  return results;
}

async function buildApk() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📱 Building Erasify Native Android APK');
  console.log('═══════════════════════════════════════════════════════════════');

  if (!existsSync(JAVAC)) throw new Error(`javac not found at ${JAVAC}`);
  if (!existsSync(AAPT2)) throw new Error(`aapt2 not found at ${AAPT2}`);
  if (!existsSync(ANDROID_JAR)) throw new Error(`android.jar not found at ${ANDROID_JAR}`);

  // Clean and prepare directories
  if (existsSync(BUILD_DIR)) rmSync(BUILD_DIR, { recursive: true, force: true });
  mkdirSync(BUILD_DIR, { recursive: true });
  mkdirSync(join(BUILD_DIR, 'res', 'values'), { recursive: true });
  mkdirSync(join(BUILD_DIR, 'res', 'drawable'), { recursive: true });
  mkdirSync(join(BUILD_DIR, 'gen'), { recursive: true });
  mkdirSync(join(BUILD_DIR, 'bin'), { recursive: true });
  mkdirSync(join(BUILD_DIR, 'dex'), { recursive: true });
  mkdirSync(join(BUILD_DIR, 'src', 'io', 'erasify', 'app'), { recursive: true });

  // 1. AndroidManifest.xml
  const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="io.erasify.app"
    android:versionCode="5"
    android:versionName="1.0.4">

    <uses-sdk
        android:minSdkVersion="21"
        android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/icon"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:supportsRtl="true"
        android:allowBackup="true">
        <activity
            android:name="io.erasify.app.MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize"
            android:configChanges="orientation|screenSize|keyboardHidden|keyboard|navigation">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
  writeFileSync(join(BUILD_DIR, 'AndroidManifest.xml'), manifestContent, 'utf8');

  // 2. Resources: strings.xml
  const stringsContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Erasify</string>
</resources>`;
  writeFileSync(join(BUILD_DIR, 'res', 'values', 'strings.xml'), stringsContent, 'utf8');

  // 3. Icon
  const iconCandidates = [
    join(ROOT_DIR, 'dist', 'extension', 'assets', 'icon-128.png'),
    join(ROOT_DIR, 'dist', 'extension', 'assets', 'icon-48.png'),
    join(ROOT_DIR, 'public', 'logo.png')
  ];
  for (const src of iconCandidates) {
    if (existsSync(src)) { copyFileSync(src, join(BUILD_DIR, 'res', 'drawable', 'icon.png')); break; }
  }

  // 4. MainActivity.java — Native bottom nav bar (no HTML/CSS nav, pure Android views)
  const javaContent = `package io.erasify.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> uploadMessage;
    private static final int FILECHOOSER_RESULTCODE = 1;
    private LinearLayout[] tabViews;

    private static final String[] TAB_URLS = {
        "https://erasify-nine.vercel.app/app.html",
        "https://erasify-nine.vercel.app/image-remover.html",
        "https://erasify-nine.vercel.app/video-remover.html",
        "https://erasify-nine.vercel.app/profile.html"
    };
    private static final String[] TAB_KEYS = { "app.html", "image-remover", "video-remover", "profile" };
    private static final String[] TAB_ICONS = { "\\uD83C\\uDFE0", "\\uD83D\\uDDBC", "\\uD83C\\uDFAC", "\\uD83D\\uDC64" };
    private static final String[] TAB_LABELS = { "Home", "Image", "Video", "Profile" };
    private static final String C_ACTIVE = "#10b981";
    private static final String C_INACTIVE = "#6b7280";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        // Root: vertical LinearLayout (WebView takes all space, nav fixed at bottom)
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#040806"));

        // WebView — flex-grows to fill all space above nav
        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
        ));

        // Native bottom nav bar
        tabViews = new LinearLayout[TAB_LABELS.length];
        LinearLayout bottomNav = new LinearLayout(this);
        bottomNav.setOrientation(LinearLayout.HORIZONTAL);
        bottomNav.setBackgroundColor(Color.parseColor("#06100a"));
        bottomNav.setPadding(0, dp(1), 0, 0);
        root.addView(bottomNav, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(68)
        ));

        for (int i = 0; i < TAB_LABELS.length; i++) {
            final int idx = i;
            LinearLayout tab = new LinearLayout(this);
            tab.setOrientation(LinearLayout.VERTICAL);
            tab.setGravity(Gravity.CENTER);
            tab.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));
            tab.setClickable(true);
            tab.setFocusable(true);

            TextView icon = new TextView(this);
            icon.setText(TAB_ICONS[i]);
            icon.setTextSize(22);
            icon.setGravity(Gravity.CENTER);
            icon.setTextColor(i == 0 ? Color.parseColor(C_ACTIVE) : Color.parseColor(C_INACTIVE));

            TextView lbl = new TextView(this);
            lbl.setText(TAB_LABELS[i]);
            lbl.setTextSize(10);
            lbl.setTypeface(null, Typeface.BOLD);
            lbl.setGravity(Gravity.CENTER);
            lbl.setTextColor(i == 0 ? Color.parseColor(C_ACTIVE) : Color.parseColor(C_INACTIVE));
            lbl.setPadding(0, dp(2), 0, 0);

            tab.addView(icon);
            tab.addView(lbl);
            tab.setOnClickListener(new View.OnClickListener() {
                @Override public void onClick(View v) { navigateTo(idx); }
            });

            tabViews[i] = tab;
            bottomNav.addView(tab);
        }

        setContentView(root);

        // WebView settings
        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);
        ws.setUseWideViewPort(true);
        ws.setLoadWithOverviewMode(true);
        ws.setSupportZoom(true);
        ws.setBuiltInZoomControls(false);
        ws.setDisplayZoomControls(false);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        ws.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        ws.setUserAgentString("Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36");

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                if (url.startsWith("tel:") || url.startsWith("whatsapp:") ||
                    url.startsWith("https://wa.me") || url.startsWith("mailto:")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); return true; }
                    catch (Exception e) { return false; }
                }
                if (url.contains("erasify") || url.contains("vercel.app")) {
                    view.loadUrl(url); return true;
                }
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                catch (Exception e) { view.loadUrl(url); }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Strip ALL website chrome: header, footer, mobile drawer, OWN bottom bar
                String css =
                    // Hide website header & hamburger
                    "header.app-header,nav.header-nav,.navbar,.app-header," +
                    ".mobile-menu-btn,#mobileMenu,.header-actions{display:none!important}" +
                    // Hide website's own bottom tab bar (the one with huge SVG icons)
                    "nav.bottom-app-bar,.bottom-app-bar,.bottom-tab{display:none!important}" +
                    // Hide mobile drawer & backdrop
                    ".mobile-drawer,.mobile-backdrop,.mobile-nav,.mobile-overlay{display:none!important}" +
                    // Hide footer
                    "footer,.app-footer,.mobile-bottom-dock,.bottom-dock{display:none!important}" +
                    // Fix body padding (header was 72px, bottom bar was 68px)
                    "body{padding-top:0!important;padding-bottom:0!important;margin-top:0!important}" +
                    // Fix hero section which had padding-top for the header
                    ".hero{padding-top:20px!important}" +
                    ".hero-section,.page-hero,.hero.container{padding-top:20px!important}" +
                    // Fix main content area
                    "main.flex-grow{padding-bottom:4px!important}";
                view.evaluateJavascript(
                    "(function(){" +
                    "var s=document.getElementById('__gx__');" +
                    "if(!s){s=document.createElement('style');s.id='__gx__';document.head.appendChild(s);}" +
                    "s.textContent='" + css + "';" +
                    "})()", null
                );

                // Sync native tab highlight with current URL
                if (url != null) {
                    for (int i = 0; i < TAB_KEYS.length; i++) {
                        final boolean active = url.contains(TAB_KEYS[i]);
                        final int fi = i;
                        runOnUiThread(new Runnable() {
                            @Override public void run() { setTabActive(fi, active); }
                        });
                    }
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> filePathCallback,
                                             FileChooserParams params) {
                if (uploadMessage != null) { uploadMessage.onReceiveValue(null); uploadMessage = null; }
                uploadMessage = filePathCallback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "video/*"});
                try { startActivityForResult(Intent.createChooser(intent, "Select Media"), FILECHOOSER_RESULTCODE); }
                catch (Exception e) { uploadMessage = null; return false; }
                return true;
            }
        });

        webView.loadUrl(TAB_URLS[0]);
    }

    private void navigateTo(int idx) {
        for (int i = 0; i < tabViews.length; i++) setTabActive(i, i == idx);
        webView.loadUrl(TAB_URLS[idx]);
    }

    private void setTabActive(int idx, boolean active) {
        if (tabViews == null || idx >= tabViews.length || tabViews[idx] == null) return;
        int color = active ? Color.parseColor(C_ACTIVE) : Color.parseColor(C_INACTIVE);
        ((TextView) tabViews[idx].getChildAt(0)).setTextColor(color);
        ((TextView) tabViews[idx].getChildAt(1)).setTextColor(color);
    }

    private int dp(int v) {
        return (int)(v * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent intent) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (uploadMessage == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && intent != null) {
                String d = intent.getDataString();
                if (d != null) results = new Uri[]{Uri.parse(d)};
            }
            uploadMessage.onReceiveValue(results);
            uploadMessage = null;
        } else super.onActivityResult(requestCode, resultCode, intent);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack(); return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override protected void onResume() { super.onResume(); webView.onResume(); CookieManager.getInstance().flush(); }
    @Override protected void onPause() { super.onPause(); webView.onPause(); CookieManager.getInstance().flush(); }
    @Override protected void onDestroy() { webView.destroy(); super.onDestroy(); }
}
`;
  writeFileSync(join(BUILD_DIR, 'src', 'io', 'erasify', 'app', 'MainActivity.java'), javaContent, 'utf8');

  // Step 1: aapt2 compile
  const compiledResZip = join(BUILD_DIR, 'compiled_res.zip');
  run(`"${AAPT2}" compile --dir "${join(BUILD_DIR, 'res')}" -o "${compiledResZip}"`, 'Compiling Resources');

  // Step 2: aapt2 link
  const unalignedApk = join(BUILD_DIR, 'unaligned.apk');
  run(
    `"${AAPT2}" link -I "${ANDROID_JAR}" --manifest "${join(BUILD_DIR, 'AndroidManifest.xml')}" -o "${unalignedApk}" "${compiledResZip}" --java "${join(BUILD_DIR, 'gen')}" --auto-add-overlay`,
    'Linking Resources & Generating R.java'
  );

  // Step 3: Compile Java
  const rJava = join(BUILD_DIR, 'gen', 'io', 'erasify', 'app', 'R.java');
  const mainJava = join(BUILD_DIR, 'src', 'io', 'erasify', 'app', 'MainActivity.java');
  run(
    `"${JAVAC}" -encoding UTF-8 -source 8 -target 8 -cp "${ANDROID_JAR}" -d "${join(BUILD_DIR, 'bin')}" "${rJava}" "${mainJava}"`,
    'Compiling Java Classes'
  );

  // Step 4: Find ALL .class files (handles any number of anonymous classes)
  const classFiles = findClassFiles(join(BUILD_DIR, 'bin'));
  console.log(`\n📦 Found ${classFiles.length} class files for DEX compilation`);

  run(
    `"${D8}" --lib "${ANDROID_JAR}" --output "${join(BUILD_DIR, 'dex')}" ${classFiles.map(f => `"${f}"`).join(' ')}`,
    'Compiling DEX with d8'
  );

  // Step 5: Add classes.dex into unaligned.apk
  run(
    `"${JAR_TOOL}" uf "${unalignedApk}" -C "${join(BUILD_DIR, 'dex')}" classes.dex`,
    'Packaging DEX into APK'
  );

  // Step 6: Zipalign
  const alignedApk = join(BUILD_DIR, 'aligned.apk');
  run(`"${ZIPALIGN}" -f -p 4 "${unalignedApk}" "${alignedApk}"`, 'Aligning APK');

  // Step 7: Generate Keystore if needed
  const keystorePath = join(BUILD_DIR, 'erasify.keystore');
  if (!existsSync(keystorePath)) {
    run(
      `"${KEYTOOL}" -genkeypair -v -keystore "${keystorePath}" -alias erasify -keyalg RSA -keysize 2048 -validity 10000 -storepass erasify123 -keypass erasify123 -dname "CN=Erasify, OU=Avdar, O=Avdar Innovations, L=Mumbai, ST=Maharashtra, C=IN"`,
      'Generating Keystore'
    );
  }

  // Step 8: Sign
  const finalApk = join(ROOT_DIR, 'Erasify.apk');
  run(
    `"${APKSIGNER}" sign --ks "${keystorePath}" --ks-key-alias erasify --ks-pass pass:erasify123 --key-pass pass:erasify123 --out "${finalApk}" "${alignedApk}"`,
    'Signing APK'
  );

  // Step 9: Verify
  run(`"${APKSIGNER}" verify "${finalApk}"`, 'Verifying APK Signature');

  // Copy to public/dist
  const publicApk = join(ROOT_DIR, 'public', 'Erasify.apk');
  const distApk = join(ROOT_DIR, 'dist', 'Erasify.apk');
  copyFileSync(finalApk, publicApk);
  if (existsSync(join(ROOT_DIR, 'dist'))) copyFileSync(finalApk, distApk);

  const stat = statSync(finalApk);
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🎉 SUCCESS! Native Android APK Generated:`);
  console.log(`📦 File: ${finalApk} (${(stat.size / 1024).toFixed(1)} KB)`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

buildApk().catch(err => {
  console.error('\n❌ APK Build failed:', err);
  process.exit(1);
});
