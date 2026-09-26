import { existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync, statSync } from 'node:fs';
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

async function buildApk() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📱 Building Erasify Native Android APK');
  console.log('═══════════════════════════════════════════════════════════════');

  if (!existsSync(JAVAC)) throw new Error(`javac not found at ${JAVAC}`);
  if (!existsSync(AAPT2)) throw new Error(`aapt2 not found at ${AAPT2}`);
  if (!existsSync(ANDROID_JAR)) throw new Error(`android.jar not found at ${ANDROID_JAR}`);

  // Clean and prepare directories
  if (existsSync(BUILD_DIR)) {
    rmSync(BUILD_DIR, { recursive: true, force: true });
  }
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
    android:versionCode="3"
    android:versionName="1.0.2">

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

  // 3. Icon (Must be valid PNG signature for aapt2)
  const iconCandidates = [
    join(ROOT_DIR, 'dist', 'extension', 'assets', 'icon-128.png'),
    join(ROOT_DIR, 'dist', 'extension', 'assets', 'icon-48.png'),
    join(ROOT_DIR, 'public', 'logo.png')
  ];
  let iconFound = false;
  for (const src of iconCandidates) {
    if (existsSync(src)) {
      copyFileSync(src, join(BUILD_DIR, 'res', 'drawable', 'icon.png'));
      iconFound = true;
      break;
    }
  }

  // 4. MainActivity.java
  const javaContent = `package io.erasify.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
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
import android.widget.FrameLayout;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> uploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fullscreen immersive layout
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(Color.parseColor("#060d0d"));
        webView = new WebView(this);
        layout.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        setContentView(layout);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        // Mobile user-agent for proper responsive layout
        settings.setUserAgentString("Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36");

        // Enable cookies
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                if (url.startsWith("tel:") || url.startsWith("whatsapp:") ||
                    url.startsWith("https://wa.me") || url.startsWith("mailto:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }
                // Keep all erasify/vercel URLs inside the WebView
                if (url.contains("erasify") || url.contains("vercel.app")) {
                    view.loadUrl(url);
                    return true;
                }
                // Open external links in external browser
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception e) {
                    view.loadUrl(url);
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Inject CSS to hide website header & footer on tool pages
                String injectCss =
                    "(function(){" +
                    "  if(document.getElementById('__app_css__')) return;" +
                    "  var s=document.createElement('style');" +
                    "  s.id='__app_css__';" +
                    "  s.textContent=" +
                    "    'header.app-header,nav.header-nav,.navbar,.mobile-menu-btn,#mobileMenu{display:none!important}' +" +
                    "    'footer,.app-footer,.mobile-bottom-dock{display:none!important}' +" +
                    "    'body{padding-top:0!important;padding-bottom:0!important}';" +
                    "  document.head.appendChild(s);" +
                    "})();";
                view.evaluateJavascript(injectCss, null);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (uploadMessage != null) {
                    uploadMessage.onReceiveValue(null);
                    uploadMessage = null;
                }
                uploadMessage = filePathCallback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "video/*"});
                try {
                    startActivityForResult(Intent.createChooser(intent, "Select Media"), FILECHOOSER_RESULTCODE);
                } catch (Exception e) {
                    uploadMessage = null;
                    return false;
                }
                return true;
            }
        });

        // Hide system UI for immersive experience
        webView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );

        webView.loadUrl("https://erasify-nine.vercel.app/app.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent intent) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (uploadMessage == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && intent != null) {
                String dataString = intent.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
            }
            uploadMessage.onReceiveValue(results);
            uploadMessage = null;
        } else {
            super.onActivityResult(requestCode, resultCode, intent);
        }
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
    protected void onResume() {
        super.onResume();
        webView.onResume();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
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

  // Step 3: Compile Java with javac
  const rJava = join(BUILD_DIR, 'gen', 'io', 'erasify', 'app', 'R.java');
  const mainJava = join(BUILD_DIR, 'src', 'io', 'erasify', 'app', 'MainActivity.java');
  run(
    `"${JAVAC}" -encoding UTF-8 -source 8 -target 8 -cp "${ANDROID_JAR}" -d "${join(BUILD_DIR, 'bin')}" "${rJava}" "${mainJava}"`,
    'Compiling Java Classes (Java 8 target)'
  );

  // Step 4: Convert class files to Dalvik classes.dex with d8
  const classFiles = [
    join(BUILD_DIR, 'bin', 'io', 'erasify', 'app', 'MainActivity.class'),
    join(BUILD_DIR, 'bin', 'io', 'erasify', 'app', 'MainActivity$1.class'),
    join(BUILD_DIR, 'bin', 'io', 'erasify', 'app', 'MainActivity$2.class'),
    join(BUILD_DIR, 'bin', 'io', 'erasify', 'app', 'R.class'),
    join(BUILD_DIR, 'bin', 'io', 'erasify', 'app', 'R$drawable.class'),
    join(BUILD_DIR, 'bin', 'io', 'erasify', 'app', 'R$string.class')
  ].filter(existsSync);

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
  run(
    `"${ZIPALIGN}" -f -p 4 "${unalignedApk}" "${alignedApk}"`,
    'Aligning APK with zipalign'
  );

  // Step 7: Generate Keystore if needed
  const keystorePath = join(BUILD_DIR, 'erasify.keystore');
  if (!existsSync(keystorePath)) {
    run(
      `"${KEYTOOL}" -genkeypair -v -keystore "${keystorePath}" -alias erasify -keyalg RSA -keysize 2048 -validity 10000 -storepass erasify123 -keypass erasify123 -dname "CN=Erasify, OU=Avdar, O=Avdar Innovations, L=Mumbai, ST=Maharashtra, C=IN"`,
      'Generating Signing Keystore'
    );
  }

  // Step 8: Sign with apksigner
  const finalApk = join(ROOT_DIR, 'Erasify.apk');
  run(
    `"${APKSIGNER}" sign --ks "${keystorePath}" --ks-key-alias erasify --ks-pass pass:erasify123 --key-pass pass:erasify123 --out "${finalApk}" "${alignedApk}"`,
    'Signing APK with apksigner'
  );

  // Step 9: Verify signature
  run(`"${APKSIGNER}" verify "${finalApk}"`, 'Verifying APK Signature');

  // Also place in public and dist for download link
  const publicApk = join(ROOT_DIR, 'public', 'Erasify.apk');
  const distApk = join(ROOT_DIR, 'dist', 'Erasify.apk');
  copyFileSync(finalApk, publicApk);
  if (existsSync(join(ROOT_DIR, 'dist'))) {
    copyFileSync(finalApk, distApk);
  }

  const stat = statSync(finalApk);
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🎉 SUCCESS! Native Android APK Generated:`);
  console.log(`📦 File: ${finalApk} (${(stat.size / 1024).toFixed(1)} KB)`);
  console.log(`🌐 Public Download URL: /Erasify.apk`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

buildApk().catch(err => {
  console.error('\n❌ APK Build failed:', err);
  process.exit(1);
});
