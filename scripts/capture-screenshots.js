import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4321; // Custom port to avoid collisions
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.resolve(__dirname, '../preview-assets');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');

// Ensure output directories exist
mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function startServer() {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting local server on port ${PORT}...`);
    // Run server.js setting PORT environment variable
    const serverProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: PORT.toString() }
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server]: ${output.trim()}`);
      if (output.includes('Server running')) {
        resolve(serverProcess);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error]: ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });

    // Timeout fallback if it doesn't log the start message
    setTimeout(() => resolve(serverProcess), 3000);
  });
}

function zipDirectory(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const { ZipArchive } = require('archiver');
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`📦 Created ZIP archive: ${outPath} (${archive.pointer()} total bytes)`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function capture() {
  let serverProcess;
  try {
    serverProcess = await startServer();
  } catch (err) {
    console.error('❌ Failed to start server, falling back to local file path:', err);
  }

  console.log('🌐 Launching headless browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Helper function to capture a screenshot
  const takeScreenshot = async (urlPath, filename, actionFn = null, customViewport = null) => {
    if (customViewport) {
      await page.setViewportSize(customViewport);
    } else {
      await page.setViewportSize({ width: 1280, height: 800 });
    }

    const url = `${BASE_URL}${urlPath}`;
    console.log(`📸 Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000); // Allow animations to settle

      if (actionFn) {
        await actionFn(page);
        await page.waitForTimeout(500);
      }

      const filePath = path.join(SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: filePath });
      console.log(`   Saved: ${filename}`);
    } catch (e) {
      console.error(`   ❌ Failed to capture ${filename}:`, e.message);
    }
  };

  // 1. Home Page
  await takeScreenshot('/index.html', '01_homepage.png');

  // 2. Sign In Modal (Login)
  await takeScreenshot('/index.html', '02_login_modal.png', async (p) => {
    await p.click('button:has-text("Sign In")');
  });

  // 3. Register Modal (Sign Up)
  await takeScreenshot('/index.html', '03_register_modal.png', async (p) => {
    await p.click('button:has-text("Register")');
  });

  // 4. Image upload / Remover page
  await takeScreenshot('/image-remover.html', '04_image_upload.png');

  // 5. Video upload / Remover page
  await takeScreenshot('/video-remover.html', '05_video_upload.png');

  // 6. Pricing / Credits page
  await takeScreenshot('/pricing.html', '06_pricing_plans.png');

  // 7. Profile / Dashboard page (guest view/mocked)
  await takeScreenshot('/profile.html', '07_user_profile.png');

  // 8. Developer Preview / Admin Panel
  await takeScreenshot('/dev-preview.html', '08_admin_panel.png');

  // 9. Mobile View
  await takeScreenshot('/index.html', '09_mobile_view.png', null, { width: 375, height: 812 });

  // 10. Before/After section on homepage
  await takeScreenshot('/index.html', '10_before_after_comparison.png', async (p) => {
    // Scroll down to the comparison examples if any
    const element = await p.$('.steps-section, table');
    if (element) {
      await element.scrollIntoViewIfNeeded();
    }
  });

  // --- Create Thumbnail (80 x 80 PNG) ---
  console.log('🎨 Generating 80x80 Thumbnail...');
  await page.setViewportSize({ width: 80, height: 80 });
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });
  // Zoom or center logo
  await page.evaluate(() => {
    document.body.innerHTML = `
      <div style="width: 80px; height: 80px; display: flex; justify-content: center; align-items: center; background: #0b0f19; border: 1px solid #10b981;">
        <img src="logo.png" style="width: 50px; height: 50px; border-radius: 12px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
      </div>
    `;
  });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'thumbnail.png') });
  console.log('   Saved: thumbnail.png (80x80)');

  // --- Create Inline Preview (590 x 300 JPG) ---
  console.log('🎨 Generating 590x300 Inline Preview...');
  await page.setViewportSize({ width: 590, height: 300 });
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });
  // Style and zoom the hero area to look premium
  await page.evaluate(() => {
    const header = document.querySelector('header');
    if (header) header.style.display = 'none';
    const main = document.querySelector('main');
    if (main) main.style.paddingTop = '20px';
    const subtitle = document.querySelector('.hero-subtitle');
    if (subtitle) subtitle.style.display = 'none';
    const actions = document.querySelector('.hero-actions');
    if (actions) actions.style.display = 'none';
    document.body.style.background = 'radial-gradient(circle at center, #10b98115 0%, #0b0f19 100%)';
  });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'inline-preview.jpg'), type: 'jpeg', quality: 90 });
  console.log('   Saved: inline-preview.jpg (590x300)');

  await browser.close();

  if (serverProcess) {
    console.log('🔌 Stopping local server...');
    serverProcess.kill();
  }

  // --- ZIP Screenshots ---
  console.log('🤐 Zipping screenshots...');
  const zipPath = path.join(OUTPUT_DIR, 'screenshots.zip');
  await zipDirectory(SCREENSHOTS_DIR, zipPath);

  console.log('🎉 Preview assets generation completed successfully!');
}

capture().catch((err) => {
  console.error('❌ Failed to capture preview assets:', err);
  process.exit(1);
});
