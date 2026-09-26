import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Erasify - Documentation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap');
    
    :root {
      --primary: #10b981;
      --primary-dark: #059669;
      --primary-glow: rgba(16, 185, 129, 0.15);
      --bg-dark: #0b0f19;
      --card-bg: rgba(30, 41, 59, 0.4);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border: rgba(255, 255, 255, 0.08);
    }
    
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      margin: 0;
      padding: 0;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
    }

    /* Cover Page */
    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40px;
      box-sizing: border-box;
      page-break-after: always;
      background: radial-gradient(circle at center, #10b98110 0%, transparent 70%);
    }

    .cover-logo {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      border-radius: 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 48px;
      color: #fff;
      font-weight: 800;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
    }

    .cover-title {
      font-family: 'Outfit', sans-serif;
      font-size: 54px;
      font-weight: 800;
      margin: 0 0 12px 0;
      letter-spacing: -1px;
    }

    .cover-subtitle {
      font-size: 20px;
      color: var(--text-muted);
      max-width: 600px;
      margin: 0 0 48px 0;
      font-weight: 300;
    }

    .cover-meta {
      border-top: 1px solid var(--border);
      padding-top: 24px;
      width: 300px;
      font-size: 14px;
      color: var(--text-muted);
    }

    .cover-meta div {
      margin-bottom: 8px;
    }

    .cover-meta strong {
      color: var(--text-main);
    }

    /* Container & General Layout */
    .content {
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 40px;
    }

    h1, h2, h3 {
      font-family: 'Outfit', sans-serif;
      color: var(--text-main);
      page-break-after: avoid;
    }

    h1 {
      font-size: 32px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      margin-top: 48px;
      margin-bottom: 24px;
    }

    h2 {
      font-size: 22px;
      margin-top: 36px;
      color: var(--primary);
    }

    p {
      margin-bottom: 20px;
      font-size: 15px;
      color: #cbd5e1;
    }

    /* Styled Lists */
    ul, ol {
      margin-bottom: 24px;
      padding-left: 24px;
    }

    li {
      margin-bottom: 8px;
      font-size: 15px;
      color: #cbd5e1;
    }

    /* Code Blocks */
    pre, code {
      font-family: 'Fira Code', Consolas, Monaco, monospace;
      font-size: 13.5px;
      background-color: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    code {
      padding: 2px 6px;
      color: #38bdf8;
    }

    pre {
      padding: 16px;
      overflow-x: auto;
      margin-bottom: 24px;
    }

    pre code {
      padding: 0;
      background: none;
      border: none;
      color: #e2e8f0;
    }

    /* Info Alert Box */
    .alert {
      background: var(--primary-glow);
      border-left: 4px solid var(--primary);
      padding: 16px 20px;
      border-radius: 0 12px 12px 0;
      margin-bottom: 24px;
    }

    .alert p {
      margin: 0;
      font-size: 14.5px;
      color: #a7f3d0;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-size: 14.5px;
    }

    th {
      background-color: rgba(15, 23, 42, 0.5);
      color: var(--primary);
      font-weight: 600;
    }

    td {
      color: #cbd5e1;
    }

    /* Page Breaks */
    .page-break {
      page-break-after: always;
    }

    /* Footer structure */
    .doc-footer {
      margin-top: 60px;
      border-top: 1px solid var(--border);
      padding-top: 24px;
      text-align: center;
      font-size: 13px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover">
    <div class="cover-logo">E</div>
    <h1 class="cover-title">Erasify</h1>
    <p class="cover-subtitle">Local AI-Powered Watermark & Logo Removal Platform</p>
    
    <div class="cover-meta">
      <div>Document Type: <strong>System Setup & Operation Guide</strong></div>
      <div>Version: <strong>1.0.31</strong></div>
      <div>Date: <strong>July 2026</strong></div>
      <div>Organization: <strong>Avdar Innovations Pvt Ltd</strong></div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="content">
    
    <h1>1. Introduction</h1>
    <p>
      <strong>Erasify</strong> is a secure, local, high-fidelity platform engineered to remove watermark stamps and logo overlays from AI-generated media (such as Gemini and Veo style image/video outputs). 
    </p>
    <p>
      Unlike traditional inpainting models that "hallucinate" pixel fills and destroy surrounding details, Erasify operates using a mathematically exact <strong>Reverse Alpha Blending</strong> engine. It localizes watermark layers down to subpixel offsets, performs inverse blending, and removes the watermark transparently. This leaves the original background pixels untouched and maintains maximum quality.
    </p>
    <div class="alert">
      <p><strong>Security Note:</strong> All media processing, decoding, and rendering take place strictly inside the user's local browser memory. Files are never uploaded to any external server, ensuring complete data privacy.</p>
    </div>

    <h1>2. Server Requirements</h1>
    <p>To deploy and host the Erasify server backend, your server must meet the following minimum specs:</p>
    <table>
      <thead>
        <tr>
          <th>Requirement</th>
          <th>Specification</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Runtime Environment</strong></td>
          <td>Node.js &gt;= 20.0.0 (LTS recommended)</td>
        </tr>
        <tr>
          <td><strong>Package Manager</strong></td>
          <td>pnpm &gt;= 10.0.0 (or npm &gt;= 10.0.0)</td>
        </tr>
        <tr>
          <td><strong>Database</strong></td>
          <td>MongoDB &gt;= 6.0 (Atlas Cloud or Local Instance)</td>
        </tr>
        <tr>
          <td><strong>RAM</strong></td>
          <td>Minimum 1 GB (2 GB recommended for serverless or container runs)</td>
        </tr>
        <tr>
          <td><strong>Browser Support</strong></td>
          <td>Modern browsers (Chrome, Edge, Firefox, Safari) with WebAssembly and WebCodecs enabled</td>
        </tr>
      </tbody>
    </table>

    <div class="page-break"></div>

    <h1>3. Installation</h1>
    <p>Follow these steps to set up the project locally:</p>
    <ol>
      <li>Clone the project repository to your server:
        <pre><code>git clone https://github.com/exobunix/erasify.git
cd gemini-watermark-remover</code></pre>
      </li>
      <li>Install dependencies using <code>pnpm</code>:
        <pre><code>pnpm install</code></pre>
      </li>
      <li>Configure your environment variables by copying the template file:
        <pre><code>cp .env.example .env</code></pre>
      </li>
      <li>Run the production build script to compile the frontend assets to the <code>dist/</code> folder:
        <pre><code>pnpm build</code></pre>
      </li>
    </ol>

    <h1>4. Environment Variables</h1>
    <p>The server reads configuration from a <code>.env</code> file in the project root. Below are the key environment variables:</p>
    <table>
      <thead>
        <tr>
          <th>Variable</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>PORT</code></td>
          <td><code>3000</code></td>
          <td>The port the Express server will listen on.</td>
        </tr>
        <tr>
          <td><code>MONGODB_URI</code></td>
          <td><code>mongodb://localhost:27017/erasify</code></td>
          <td>The connection string to your MongoDB database.</td>
        </tr>
        <tr>
          <td><code>NODE_ENV</code></td>
          <td><code>development</code></td>
          <td>Set to <code>production</code> in live environments to enable asset minification.</td>
        </tr>
      </tbody>
    </table>

    <div class="page-break"></div>

    <h1>5. Gemini API Configuration</h1>
    <p>
      Because Erasify operates as a sandboxed browser client (via Chrome Extension or Tampermonkey Userscript), it interacts with the <strong>Gemini Web App</strong> at <code>https://gemini.google.com/app</code> dynamically.
    </p>
    <p>
      The userscript intercepts generated asset requests and matches original image bindings from Gemini's RPC calls (specifically targeting <code>hNvQHb</code> and <code>c8o8Fe</code> executions). This allows full-resolution downloads and clipboard copy processes to bypass watermarks on the client side without needing backend API keys.
    </p>

    <h1>6. Database Setup</h1>
    <p>The application uses MongoDB to manage user accounts, sessions, subscription tiers, and quota limits.</p>
    <h2>Atlas Cloud Network Whitelisting</h2>
    <p>
      If hosting the server on Vercel or any other serverless container platform, the IP addresses of the serverless function containers will change dynamically. 
    </p>
    <div class="alert">
      <p><strong>Crucial Step:</strong> You must configure Network Access in your MongoDB Atlas Dashboard to allow connections from anywhere: add <code>0.0.0.0/0</code> to the IP access list. Failure to do so will cause secure socket connections to time out.</p>
    </div>
    <h2>Database Indexing</h2>
    <p>Upon initial boot, the application automatically ensures the following indexes are created on the <code>users</code> collection:</p>
    <pre><code>db.users.createIndex({ email: 1 }, { unique: true })</code></pre>

    <h1>7. Running the Application</h1>
    <p>Commands to run and manage the process:</p>
    <ul>
      <li><strong>Development Mode</strong> (Start local file watching and esbuild live reload):
        <pre><code>pnpm dev</code></pre>
      </li>
      <li><strong>Production Start</strong> (Launch the Node.js production server):
        <pre><code>pnpm start</code></pre>
      </li>
    </ul>

    <div class="page-break"></div>

    <h1>8. Admin & User Authentication</h1>
    <h2>User Sign In & Registration</h2>
    <p>
      Users can register accounts via the frontend modal. Tiers include:
    </p>
    <ul>
      <li><strong>Free Tier</strong>: Limits processing to 1 image, 0 videos.</li>
      <li><strong>Basic Tier</strong>: Unlimited image removals, 0 videos.</li>
      <li><strong>Daily Tier</strong>: 15 images/day, 3 videos/day.</li>
      <li><strong>Unlimited Tier</strong>: Unlimited image removals, 100 video removals.</li>
    </ul>
    <h2>Admin Diagnostics</h2>
    <p>
      Admins can check database connectivity and server system health by querying the secure diagnostics endpoint:
    </p>
    <pre><code>GET /api/debug/db</code></pre>
    <p>This endpoint returns the server node version, masked MongoDB URI, and current database connectivity status.</p>

    <h1>9. Troubleshooting</h1>
    <table>
      <thead>
        <tr>
          <th>Symptom</th>
          <th>Cause</th>
          <th>Resolution</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>Database connection failed: Socket timed out</code></td>
          <td>MongoDB Atlas Firewall blocking Vercel IP.</td>
          <td>Verify that IP <code>0.0.0.0/0</code> is added to Network Access in Atlas. If using Free Tier, verify the cluster is not paused.</td>
        </tr>
        <tr>
          <td><code>npm error Cannot read properties of null (isDescendantOf)</code></td>
          <td>Lockfile conflict inside Vite/npm install.</td>
          <td>Enable <code>pnpm install</code> in Vercel settings under Build & Deployment.</td>
        </tr>
        <tr>
          <td><code>Old "Logged In as" menu layout still visible</code></td>
          <td>Browser caching static JS file.</td>
          <td>Clear browser cache or use cache-busting script paths (e.g. <code>erasify.js?v=1.0.31</code>).</td>
        </tr>
      </tbody>
    </table>

    <h1>10. Support Contact</h1>
    <p>
      For technical support, custom feature development, or integration queries, contact Avdar Innovations:
    </p>
    <ul>
      <li><strong>Company</strong>: Avdar Innovations Pvt Ltd</li>
      <li><strong>Support Line / WhatsApp</strong>: +91 9967853364</li>
    </ul>

    <div class="doc-footer">
      &copy; 2026 Erasify. Powered by Avdar Innovations Pvt Ltd. All rights reserved.
    </div>
  </div>

</body>
</html>
`;

async function generatePDF() {
  console.log('🚀 Launching headless browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('📄 Rendering HTML content...');
  await page.setContent(htmlContent);
  
  // Wait for Google Fonts to load
  await page.evaluate(() => document.fonts.ready);
  
  console.log('💾 Saving PDF to Erasify_Documentation.pdf...');
  const pdfPath = path.resolve(__dirname, '../Erasify_Documentation.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0px',
      bottom: '0px',
      left: '0px',
      right: '0px'
    }
  });

  console.log(`✅ PDF successfully generated at: ${pdfPath}`);
  await browser.close();
}

generatePDF().catch(err => {
  console.error('❌ Failed to generate PDF:', err);
  process.exit(1);
});
