import { existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync, statSync, readdirSync, createWriteStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import https from 'node:https';

const ROOT_DIR = resolve('.');
const BUILD_DIR = join(ROOT_DIR, 'android-build');
const TOOLS_DIR = join(ROOT_DIR, '.build-tools');

const JDK_BIN = 'C:\\Program Files\\Android\\Android Studio\\jbr\\bin';
const JAVAC    = join(JDK_BIN, 'javac.exe');
const KEYTOOL  = join(JDK_BIN, 'keytool.exe');
const JAR_TOOL = join(JDK_BIN, 'jar.exe');
const JAVA_EXE = join(JDK_BIN, 'java.exe');
const JARSIGNER = join(JDK_BIN, 'jarsigner.exe');

const SDK_ROOT    = 'C:\\Users\\Adarsh\\AppData\\Local\\Android\\Sdk';
const BUILD_TOOLS = join(SDK_ROOT, 'build-tools', '35.0.0');
const AAPT2       = join(BUILD_TOOLS, 'aapt2.exe');
const D8          = join(BUILD_TOOLS, 'd8.bat');
const ZIPALIGN    = join(BUILD_TOOLS, 'zipalign.exe');
const APKSIGNER   = join(BUILD_TOOLS, 'apksigner.bat');
const ANDROID_JAR = join(SDK_ROOT, 'platforms', 'android-34', 'android.jar');

const BUNDLETOOL_VERSION = '1.15.6';
const BUNDLETOOL_JAR = join(TOOLS_DIR, `bundletool-all-${BUNDLETOOL_VERSION}.jar`);

const ENV = {
  ...process.env,
  JAVA_HOME: 'C:\\Program Files\\Android\\Android Studio\\jbr',
  PATH: `${JDK_BIN};${process.env.PATH}`
};

function run(cmd, desc) {
  console.log(`\n▶ [${desc}]`);
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR, env: ENV });
}

function copyDirSync(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const item of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, item.name);
    const d = join(dst, item.name);
    if (item.isDirectory()) copyDirSync(s, d);
    else copyFileSync(s, d);
  }
}

function findClassFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) results.push(...findClassFiles(full));
    else if (item.name.endsWith('.class')) results.push(full);
  }
  return results;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const doGet = (u) => {
      https.get(u, { headers: { 'User-Agent': 'node.js' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doGet(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          rmSync(dest, { force: true });
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (err) => { file.close(); rmSync(dest, { force: true }); reject(err); });
    };
    doGet(url);
  });
}

async function buildApk() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📱 Building Erasify — APK + AAB');
  console.log('   Package: io.erasify.app  |  v1.0.4');
  console.log('═══════════════════════════════════════════════════════════════');

  if (!existsSync(JAVAC))       throw new Error(`javac not found at ${JAVAC}`);
  if (!existsSync(AAPT2))       throw new Error(`aapt2 not found at ${AAPT2}`);
  if (!existsSync(ANDROID_JAR)) throw new Error(`android.jar not found at ${ANDROID_JAR}`);

  // Clean build directory
  if (existsSync(BUILD_DIR)) rmSync(BUILD_DIR, { recursive: true, force: true });
  for (const sub of ['res/values', 'res/drawable', 'gen', 'bin', 'dex', 'src/io/erasify/app']) {
    mkdirSync(join(BUILD_DIR, sub), { recursive: true });
  }
  mkdirSync(TOOLS_DIR, { recursive: true });

  // ── AndroidManifest.xml ────────────────────────────────────────────────────
  const MANIFEST_PATH = join(BUILD_DIR, 'AndroidManifest.xml');
  writeFileSync(MANIFEST_PATH, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="io.erasify.app"
    android:versionCode="5"
    android:versionName="1.0.4">

    <uses-sdk
        android:minSdkVersion="21"
        android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
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
</manifest>`, 'utf8');

  // ── strings.xml ────────────────────────────────────────────────────────────
  writeFileSync(join(BUILD_DIR, 'res', 'values', 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Erasify</string>
</resources>`, 'utf8');

  // ── Icon ───────────────────────────────────────────────────────────────────
  for (const src of [
    join(ROOT_DIR, 'dist', 'extension', 'assets', 'icon-128.png'),
    join(ROOT_DIR, 'dist', 'extension', 'assets', 'icon-48.png'),
    join(ROOT_DIR, 'public', 'logo.png')
  ]) {
    if (existsSync(src)) { copyFileSync(src, join(BUILD_DIR, 'res', 'drawable', 'icon.png')); break; }
  }

  // ── MainActivity.java ──────────────────────────────────────────────────────
  writeFileSync(join(BUILD_DIR, 'src', 'io', 'erasify', 'app', 'MainActivity.java'), `package io.erasify.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> uploadMessage;
    private static final int FILECHOOSER_RESULTCODE = 1;

    private static final String START_URL = "https://erasify-nine.vercel.app/index.html";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#040806"));
        setContentView(webView);

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
                if (url.contains("erasify") || url.contains("vercel.app") || url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
                    view.loadUrl(url);
                    return true;
                }
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                catch (Exception e) { view.loadUrl(url); }
                return true;
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

        webView.loadUrl(START_URL);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
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
        } else {
            super.onActivityResult(requestCode, resultCode, intent);
        }
    }

    @Override protected void onResume()  { super.onResume();  webView.onResume();  CookieManager.getInstance().flush(); }
    @Override protected void onPause()   { super.onPause();   webView.onPause();   CookieManager.getInstance().flush(); }
    @Override protected void onDestroy() { webView.destroy(); super.onDestroy(); }
}
`, 'utf8');

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: aapt2 compile
  // ═══════════════════════════════════════════════════════════════
  const compiledResZip = join(BUILD_DIR, 'compiled_res.zip');
  run(`"${AAPT2}" compile --dir "${join(BUILD_DIR, 'res')}" -o "${compiledResZip}"`, 'Compiling Resources');

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: aapt2 link (standard — for APK + R.java generation)
  // ═══════════════════════════════════════════════════════════════
  const unalignedApk = join(BUILD_DIR, 'unaligned.apk');
  run(
    `"${AAPT2}" link -I "${ANDROID_JAR}" --manifest "${MANIFEST_PATH}" -o "${unalignedApk}" "${compiledResZip}" --java "${join(BUILD_DIR, 'gen')}" --auto-add-overlay`,
    'Linking Resources & Generating R.java'
  );

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Compile Java
  // ═══════════════════════════════════════════════════════════════
  const rJava   = join(BUILD_DIR, 'gen', 'io', 'erasify', 'app', 'R.java');
  const mainJava = join(BUILD_DIR, 'src', 'io', 'erasify', 'app', 'MainActivity.java');
  run(
    `"${JAVAC}" -encoding UTF-8 -source 8 -target 8 -cp "${ANDROID_JAR}" -d "${join(BUILD_DIR, 'bin')}" "${rJava}" "${mainJava}"`,
    'Compiling Java'
  );

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: d8 → classes.dex
  // ═══════════════════════════════════════════════════════════════
  const classFiles = findClassFiles(join(BUILD_DIR, 'bin'));
  console.log(`\n📦 Found ${classFiles.length} class files`);
  run(
    `"${D8}" --lib "${ANDROID_JAR}" --output "${join(BUILD_DIR, 'dex')}" ${classFiles.map(f => `"${f}"`).join(' ')}`,
    'Compiling DEX'
  );

  // ═══════════════════════════════════════════════════════════════
  // STEP 5-9: Package APK → zipalign → sign
  // ═══════════════════════════════════════════════════════════════
  run(`"${JAR_TOOL}" uf "${unalignedApk}" -C "${join(BUILD_DIR, 'dex')}" classes.dex`, 'Packaging DEX into APK');

  const alignedApk = join(BUILD_DIR, 'aligned.apk');
  run(`"${ZIPALIGN}" -f -p 4 "${unalignedApk}" "${alignedApk}"`, 'Zipalign');

  const keystorePath = join(ROOT_DIR, 'erasify.keystore');
  if (!existsSync(keystorePath)) {
    run(
      `"${KEYTOOL}" -genkeypair -v -keystore "${keystorePath}" -alias erasify -keyalg RSA -keysize 2048 -validity 10000 -storepass erasify123 -keypass erasify123 -dname "CN=Erasify, OU=Avdar, O=Avdar Innovations, L=Mumbai, ST=Maharashtra, C=IN"`,
      'Generating Keystore'
    );
  }

  const finalApk = join(ROOT_DIR, 'Erasify.apk');
  run(
    `"${APKSIGNER}" sign --ks "${keystorePath}" --ks-key-alias erasify --ks-pass pass:erasify123 --key-pass pass:erasify123 --out "${finalApk}" "${alignedApk}"`,
    'Signing APK'
  );
  run(`"${APKSIGNER}" verify "${finalApk}"`, 'Verifying APK');

  copyFileSync(finalApk, join(ROOT_DIR, 'public', 'Erasify.apk'));
  if (existsSync(join(ROOT_DIR, 'dist'))) copyFileSync(finalApk, join(ROOT_DIR, 'dist', 'Erasify.apk'));
  console.log(`\n✅ APK → ${finalApk} (${(statSync(finalApk).size / 1024).toFixed(1)} KB)`);

  // ═══════════════════════════════════════════════════════════════
  // AAB BUILD — for Google Play Store
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📦 Building Android App Bundle (AAB) for Google Play Store');
  console.log('═══════════════════════════════════════════════════════════════');

  // Download bundletool if not cached
  if (!existsSync(BUNDLETOOL_JAR)) {
    console.log(`\n⬇️  Downloading bundletool v${BUNDLETOOL_VERSION} (one-time)...`);
    await downloadFile(
      `https://github.com/google/bundletool/releases/download/${BUNDLETOOL_VERSION}/bundletool-all-${BUNDLETOOL_VERSION}.jar`,
      BUNDLETOOL_JAR
    );
    console.log('✅ bundletool downloaded');
  } else {
    console.log(`\n✅ bundletool cached at ${BUNDLETOOL_JAR}`);
  }

  // AAB-A: aapt2 link with --proto-format (required by bundletool)
  const protoApk = join(BUILD_DIR, 'proto.apk');
  run(
    `"${AAPT2}" link --proto-format -I "${ANDROID_JAR}" --manifest "${MANIFEST_PATH}" -o "${protoApk}" "${compiledResZip}" --auto-add-overlay`,
    'AAB: Proto-format link'
  );

  // AAB-B: Extract proto APK
  const protoDir = join(BUILD_DIR, 'proto-contents');
  if (existsSync(protoDir)) rmSync(protoDir, { recursive: true });
  mkdirSync(protoDir, { recursive: true });
  console.log('\n▶ [AAB: Extracting proto APK]');
  execSync(
    `"${JAR_TOOL}" xf "${protoApk}"`,
    { stdio: 'inherit', cwd: protoDir, env: ENV }
  );

  // AAB-C: Build bundletool base module directory structure
  const baseModDir = join(BUILD_DIR, 'base-module');
  if (existsSync(baseModDir)) rmSync(baseModDir, { recursive: true });
  mkdirSync(join(baseModDir, 'manifest'), { recursive: true });
  mkdirSync(join(baseModDir, 'dex'),      { recursive: true });
  mkdirSync(join(baseModDir, 'root'),     { recursive: true });

  // manifest/ — proto-binary AndroidManifest.xml
  copyFileSync(join(protoDir, 'AndroidManifest.xml'), join(baseModDir, 'manifest', 'AndroidManifest.xml'));
  // dex/ — compiled classes
  copyFileSync(join(BUILD_DIR, 'dex', 'classes.dex'), join(baseModDir, 'dex', 'classes.dex'));
  // resources.pb — proto resource table
  if (existsSync(join(protoDir, 'resources.pb'))) {
    copyFileSync(join(protoDir, 'resources.pb'), join(baseModDir, 'resources.pb'));
  }
  // res/ — proto-format resources
  if (existsSync(join(protoDir, 'res'))) {
    copyDirSync(join(protoDir, 'res'), join(baseModDir, 'res'));
  }

  // AAB-D: Create base.zip module archive
  const baseZip = join(BUILD_DIR, 'base.zip');
  if (existsSync(baseZip)) rmSync(baseZip);
  run(`"${JAR_TOOL}" cMf "${baseZip}" -C "${baseModDir}" .`, 'AAB: Creating base module ZIP');

  // AAB-E: Build AAB with bundletool
  const aabPath = join(ROOT_DIR, 'Erasify.aab');
  if (existsSync(aabPath)) rmSync(aabPath);
  run(
    `"${JAVA_EXE}" -jar "${BUNDLETOOL_JAR}" build-bundle --modules="${baseZip}" --output="${aabPath}"`,
    'AAB: Building with bundletool'
  );

  // AAB-F: Sign AAB with jarsigner
  run(
    `"${JARSIGNER}" -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "${keystorePath}" -storepass erasify123 -keypass erasify123 "${aabPath}" erasify`,
    'AAB: Signing with jarsigner'
  );

  // Copy AAB to output dirs
  copyFileSync(aabPath, join(ROOT_DIR, 'public', 'Erasify.aab'));
  if (existsSync(join(ROOT_DIR, 'dist'))) copyFileSync(aabPath, join(ROOT_DIR, 'dist', 'Erasify.aab'));

  const aabStat = statSync(aabPath);
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎉 SUCCESS!');
  console.log(`📱 APK  → ${finalApk} (${(statSync(finalApk).size / 1024).toFixed(1)} KB)`);
  console.log(`📦 AAB  → ${aabPath} (${(aabStat.size / 1024).toFixed(1)} KB)`);
  console.log('🏷️  Package: io.erasify.app');
  console.log('📋 Version: 1.0.4 (code 5)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

buildApk().catch(err => {
  console.error('\n❌ Build failed:', err.message || err);
  process.exit(1);
});
