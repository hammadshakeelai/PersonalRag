import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const assetsDir = path.join(projectRoot, 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

async function run() {
  console.log('Starting preview server on port 4173...');
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4173'], {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
  });

  // Wait 3.5 seconds for preview server
  await new Promise((r) => setTimeout(r, 3500));

  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1.5 },
  });

  try {
    const page = await browser.newPage();
    console.log('Navigating to http://localhost:4173...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // --- SCREENSHOT 1: Real Product Dashboard with Document & Citations ---
    console.log('Clicking Load Sample Research Paper...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const sampleBtn = buttons.find((b) => b.textContent && b.textContent.includes('Load Sample'));
      if (sampleBtn) sampleBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Click suggested prompt
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const promptBtn = buttons.find((b) => b.textContent && b.textContent.includes('retrieval failure rates'));
      if (promptBtn) promptBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    const ss1Path = path.join(assetsDir, '1_real_product_dashboard.png');
    await page.screenshot({ path: ss1Path });
    console.log(`Saved: ${ss1Path}`);

    // --- SCREENSHOT 2: Real NotebookLM Studio Modal ---
    console.log('Opening Studio modal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const studioBtn = buttons.find((b) => b.textContent && b.textContent.includes('Studio'));
      if (studioBtn) studioBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    const ss2Path = path.join(assetsDir, '2_real_notebooklm_studio.png');
    await page.screenshot({ path: ss2Path });
    console.log(`Saved: ${ss2Path}`);

    // Close Studio
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[title="Close Studio"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // --- SCREENSHOT 3: Real BYOK Settings Modal with Editable Models ---
    console.log('Opening Settings modal...');
    await page.evaluate(() => {
      const settingsBtn = document.querySelector('button[title="Settings & BYOK Keys"]');
      if (settingsBtn) settingsBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    const ss3Path = path.join(assetsDir, '3_real_byok_settings.png');
    await page.screenshot({ path: ss3Path });
    console.log(`Saved: ${ss3Path}`);

  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
    preview.kill();
    console.log('Finished capturing real screenshots!');
    process.exit(0);
  }
}

run();
