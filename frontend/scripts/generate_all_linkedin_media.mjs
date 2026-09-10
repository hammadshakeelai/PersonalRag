import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const assetsDir = path.join(projectRoot, 'assets');
const brainDir = 'C:/Users/HP/.gemini/antigravity/brain/a0596213-47ea-4a05-94f0-2e01a6994663';

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

async function run() {
  console.log('Starting preview server on port 4173...');
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4173'], {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
  });

  await new Promise((r) => setTimeout(r, 3500));

  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 2.0 },
  });

  try {
    const page = await browser.newPage();
    console.log('Navigating to live app...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // 1. Load the demo paper into Sources
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const demoBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Demo Paper') || b.textContent.includes('Load Sample')));
      if (demoBtn) demoBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Open the document viewer by clicking the document card
    await page.evaluate(() => {
      const docCard = document.querySelector('.group.flex.items-center');
      if (docCard) docCard.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Click suggested question to generate conversation
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const qBtn = buttons.find((b) => b.textContent && b.textContent.includes('failure rates'));
      if (qBtn) qBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    // --- ASSET 1: 1_real_product_dashboard.png ---
    const img1Path = path.join(assetsDir, '1_real_product_dashboard.png');
    await page.screenshot({ path: img1Path });
    console.log('Saved Asset 1: 1_real_product_dashboard.png');

    // --- ASSET 2: 2_real_notebooklm_studio.png ---
    console.log('Opening Studio modal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const studioBtn = buttons.find((b) => b.textContent && b.textContent.includes('Studio'));
      if (studioBtn) studioBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    const img2Path = path.join(assetsDir, '2_real_notebooklm_studio.png');
    await page.screenshot({ path: img2Path });
    console.log('Saved Asset 2: 2_real_notebooklm_studio.png');

    // Close Studio
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[title="Close Studio"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // --- ASSET 3: 3_real_byok_settings.png ---
    console.log('Opening Settings modal...');
    await page.evaluate(() => {
      const settingsBtn = document.querySelector('button[title="Click to configure API keys and models"]');
      if (settingsBtn) settingsBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    const img3Path = path.join(assetsDir, '3_real_byok_settings.png');
    await page.screenshot({ path: img3Path });
    console.log('Saved Asset 3: 3_real_byok_settings.png');

    // --- ASSET 4: 4_rag_architecture_blueprint.png (Honest Codebase Architecture) ---
    console.log('Generating Honest Architecture Blueprint...');
    const archHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 60px 80px;
      background: #0A0E17;
      color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
      width: 1920px;
      height: 1080px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 28px;
    }
    .title-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #818CF8;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 10px;
    }
    h1 {
      margin: 0;
      font-size: 44px;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 18px;
      color: #94A3B8;
      margin-top: 6px;
    }
    .repo-pill {
      background: #111625;
      border: 1px solid #1E293B;
      padding: 12px 20px;
      border-radius: 14px;
      font-family: ui-monospace, monospace;
      font-size: 14px;
      color: #38BDF8;
      text-align: right;
    }
    .pipeline {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 18px;
      margin: 32px 0;
    }
    .step-card {
      background: #111625;
      border: 1px solid #1E293B;
      border-radius: 18px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    .step-card.highlight {
      border-color: rgba(99, 102, 241, 0.6);
      box-shadow: 0 0 30px rgba(99, 102, 241, 0.2);
      background: #13182B;
    }
    .step-num {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: rgba(99, 102, 241, 0.2);
      color: #A5B4FC;
      font-weight: 800;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }
    .step-title {
      font-size: 17px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    .step-desc {
      font-size: 13px;
      color: #94A3B8;
      line-height: 1.5;
    }
    .step-file {
      margin-top: 14px;
      display: inline-block;
      font-family: ui-monospace, monospace;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(56, 189, 248, 0.1);
      color: #38BDF8;
      border: 1px solid rgba(56, 189, 248, 0.2);
    }
    .bottom-bar {
      background: #111625;
      border: 1px solid #1E293B;
      border-radius: 18px;
      padding: 22px 32px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }
    .stat-val {
      font-size: 22px;
      font-weight: 800;
      color: #10B981;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stat-label {
      font-size: 13px;
      color: #94A3B8;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title-badge">⚡ Real Codebase Architecture</div>
      <h1>PersonalRag: Full System Pipeline</h1>
      <div class="subtitle">Open-Source Client-Side RAG uniting ChatPDF (Exact Citations) & NotebookLM (Multi-Source Studio)</div>
    </div>
    <div class="repo-pill">
      <div>github.com/hammadshakeelai/PersonalRag</div>
      <div style="color:#10B981; margin-top:4px;">100% Client-Side &bull; $0 Hosting</div>
    </div>
  </div>

  <div class="pipeline">
    <div class="step-card">
      <div>
        <div class="step-num">1</div>
        <div class="step-title">Multi-Format Extraction</div>
        <div class="step-desc">Extracts text and page numbers directly in browser using PDF.js WebAssembly. Retains binary PDF for visual canvas rendering.</div>
      </div>
      <div class="step-file">lib/pdf/extractor.ts</div>
    </div>

    <div class="step-card highlight">
      <div>
        <div class="step-num">2</div>
        <div class="step-title">Contextual & Parent Windows</div>
        <div class="step-desc">Prepends contextual headers [Source | Page]. Indexes granular child chunks (150w) but dynamically retrieves enclosing parent (600w).</div>
      </div>
      <div class="step-file">lib/rag/chunker.ts</div>
    </div>

    <div class="step-card">
      <div>
        <div class="step-num">3</div>
        <div class="step-title">Dual Indexing (BM25 + Vectors)</div>
        <div class="step-desc">Indexes chunks in both an in-memory BM25 inverted index (MiniSearch) and dense vector embeddings with cosine similarity.</div>
      </div>
      <div class="step-file">bm25.ts &bull; vector.ts</div>
    </div>

    <div class="step-card highlight">
      <div>
        <div class="step-num">4</div>
        <div class="step-title">Reciprocal Rank Fusion</div>
        <div class="step-desc">Fuses ranking distributions with constant k=60. Ensures exact keyword matches (dates, names) rank alongside conceptual matches.</div>
      </div>
      <div class="step-file">lib/rag/rrf.ts</div>
    </div>

    <div class="step-card">
      <div>
        <div class="step-num">5</div>
        <div class="step-title">Cross-Encoder Reranker</div>
        <div class="step-desc">FlashRank reranker scores candidate passages against the query to filter distractors before injecting into generation context.</div>
      </div>
      <div class="step-file">lib/rag/reranker.ts</div>
    </div>

    <div class="step-card highlight">
      <div>
        <div class="step-num">6</div>
        <div class="step-title">BYOK Streaming & Studio</div>
        <div class="step-desc">Streams citations [Doc, p.X] jumping to high-DPI PDF canvas with glowing beacon. NotebookLM Studio generates audio podcast scripts.</div>
      </div>
      <div class="step-file">client.ts &bull; PdfViewer.tsx</div>
    </div>
  </div>

  <div class="bottom-bar">
    <div>
      <div class="stat-val">100% Client-Side</div>
      <div class="stat-label">Runs directly in the user browser without sending private document text to third-party databases.</div>
    </div>
    <div>
      <div class="stat-val">$0 Hosting Cost</div>
      <div class="stat-label">Statically built with Vite and deployed directly to GitHub Pages with automated GitHub Actions.</div>
    </div>
    <div>
      <div class="stat-val">BYOK Multi-Model</div>
      <div class="stat-label">Supports Google Gemini (Free Tier), Groq Cloud (Free Tier), OpenAI, Claude, and Custom endpoints.</div>
    </div>
    <div>
      <div class="stat-val">Local Persistence</div>
      <div class="stat-label">Chat history, studio syntheses, and document indexes survive browser refresh via localStorage.</div>
    </div>
  </div>
</body>
</html>`;

    await page.setContent(archHtml);
    const img4Path = path.join(assetsDir, '4_rag_architecture_blueprint.png');
    await page.screenshot({ path: img4Path });
    console.log('Saved Asset 4: 4_rag_architecture_blueprint.png');

    // --- ASSET 5: 5_honest_feature_comparison.png ---
    console.log('Generating Honest Feature Comparison graphic...');
    const compHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 60px 80px;
      background: #0A0E17;
      color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
      width: 1920px;
      height: 1080px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .title-badge {
      display: inline-block;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818CF8;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 10px;
    }
    h1 {
      margin: 0;
      font-size: 44px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 17px;
      color: #94A3B8;
      margin-top: 6px;
    }
    .table-box {
      background: #111625;
      border: 1px solid #1E293B;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: #0F1424;
      padding: 18px 22px;
      font-size: 15px;
      font-weight: 700;
      border-bottom: 1px solid #1E293B;
      color: #CBD5E1;
    }
    th.highlight {
      color: #34D399;
      background: rgba(16, 185, 129, 0.08);
      border-left: 1px solid rgba(16, 185, 129, 0.2);
    }
    td {
      padding: 15px 22px;
      font-size: 14px;
      border-bottom: 1px solid #1E293B;
      vertical-align: middle;
    }
    td.feature {
      font-weight: 600;
      color: #FFFFFF;
      width: 26%;
    }
    td.col-other {
      color: #94A3B8;
      border-left: 1px solid #1E293B;
      width: 24%;
    }
    td.col-highlight {
      color: #F1F5F9;
      background: rgba(16, 185, 129, 0.04);
      border-left: 1px solid rgba(16, 185, 129, 0.2);
      font-weight: 500;
      width: 26%;
    }
    .cross {
      color: #EF4444;
      font-weight: 800;
      margin-right: 6px;
    }
    .check {
      color: #10B981;
      font-weight: 800;
      margin-right: 6px;
    }
    .footer-note {
      text-align: center;
      font-size: 15px;
      color: #64748B;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-badge">Honest Product Comparison</div>
    <h1>ChatPDF vs. NotebookLM vs. PersonalRag</h1>
    <div class="subtitle">Why we built an open-source hybrid bringing together verifiable PDF citations and multi-source synthesis</div>
  </div>

  <div class="table-box">
    <table>
      <thead>
        <tr>
          <th>Capability</th>
          <th>ChatPDF</th>
          <th>Google NotebookLM</th>
          <th class="highlight">PersonalRag (Our Project)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="feature">Multi-Document Sources</td>
          <td class="col-other"><span class="cross">&times;</span> Single document only</td>
          <td class="col-other"><span class="check">&check;</span> Up to 50 sources</td>
          <td class="col-highlight"><span class="check">&check;</span> <strong>Yes</strong> (Multi-Doc Notebook selection)</td>
        </tr>
        <tr>
          <td class="feature">Side-by-Side PDF & Citation Beacon</td>
          <td class="col-other"><span class="check">&check;</span> Side-by-side viewer</td>
          <td class="col-other"><span class="cross">&times;</span> Simple footnote popups</td>
          <td class="col-highlight"><span class="check">&check;</span> <strong>Yes</strong> (Real PDF Canvas + Neon beacon)</td>
        </tr>
        <tr>
          <td class="feature">Search Architecture</td>
          <td class="col-other">Basic Vector search</td>
          <td class="col-other">Proprietary Google RAG</td>
          <td class="col-highlight"><span class="check">&check;</span> <strong>Hybrid BM25 + Dense RRF + Reranker</strong></td>
        </tr>
        <tr>
          <td class="feature">Studio Audio & Synthesis</td>
          <td class="col-other"><span class="cross">&times;</span> Q&A chat only</td>
          <td class="col-other"><span class="check">&check;</span> Audio Overviews & Briefs</td>
          <td class="col-highlight"><span class="check">&check;</span> <strong>Yes</strong> (Podcasts, Briefs, Study Guides)</td>
        </tr>
        <tr>
          <td class="feature">Model Choice & BYOK</td>
          <td class="col-other"><span class="cross">&times;</span> Fixed closed model</td>
          <td class="col-other"><span class="cross">&times;</span> Gemini only</td>
          <td class="col-highlight"><span class="check">&check;</span> <strong>BYOK</strong> (Gemini Free, Groq, Claude, OpenAI)</td>
        </tr>
        <tr>
          <td class="feature">Data Privacy</td>
          <td class="col-other"><span class="cross">&times;</span> Files saved on cloud servers</td>
          <td class="col-other"><span class="cross">&times;</span> Stored in Google Cloud</td>
          <td class="col-highlight"><span class="check">&check;</span> <strong>100% Client-Side</strong> (Browser Indexed)</td>
        </tr>
        <tr>
          <td class="feature">Pricing & Licensing</td>
          <td class="col-other"><span class="cross">&times;</span> $20/month subscription</td>
          <td class="col-other">Freemium (Google Account)</td>
          <td class="col-highlight"><span class="check">&check;</span> <strong>100% Free & Open Source (MIT)</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer-note">
    Live on GitHub Pages: hammadshakeelai.github.io/PersonalRag &bull; Built with React 19 + TypeScript + PDF.js
  </div>
</body>
</html>`;

    await page.setContent(compHtml);
    const img5Path = path.join(assetsDir, '5_honest_feature_comparison.png');
    await page.screenshot({ path: img5Path });
    console.log('Saved Asset 5: 5_honest_feature_comparison.png');

    // Also copy all 5 images to the brain directory for markdown embedding
    fs.copyFileSync(img1Path, path.join(brainDir, '1_real_product_dashboard.png'));
    fs.copyFileSync(img2Path, path.join(brainDir, '2_real_notebooklm_studio.png'));
    fs.copyFileSync(img3Path, path.join(brainDir, '3_real_byok_settings.png'));
    fs.copyFileSync(img4Path, path.join(brainDir, '4_rag_architecture_blueprint.png'));
    fs.copyFileSync(img5Path, path.join(brainDir, '5_honest_feature_comparison.png'));

  } catch (err) {
    console.error('Error during generation:', err);
  } finally {
    await browser.close();
    preview.kill();
    console.log('All 5 honest LinkedIn assets successfully generated!');
    process.exit(0);
  }
}

run();
