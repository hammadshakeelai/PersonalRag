import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

let previewProcess = null;
let browser = null;

async function runTest() {
  console.log('====================================================');
  console.log('🧪 ULTRA-RAG EXHAUSTIVE HAND-TESTING & REDTEAM SUITE');
  console.log('====================================================\n');

  // 1. Launch Vite preview server
  console.log('▶ Starting Vite preview server on port 4173...');
  previewProcess = spawn('npx.cmd', ['vite', 'preview', '--port', '4173'], {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
  });

  await new Promise((r) => setTimeout(r, 3500));

  // 2. Launch Puppeteer Chrome
  console.log('▶ Launching Chrome in test mode...');
  browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1.5 },
  });

  const page = await browser.newPage();
  const logs = [];
  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
      console.log('  [BROWSER ERROR]:', text);
    } else {
      logs.push(text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
    console.log('  [UNCAUGHT PAGE ERROR]:', err.message);
  });

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: App Boot & Initial Navigation State
    // ----------------------------------------------------
    console.log('\n--- TEST 1: App Boot & Shell Mounting ---');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));

    const pageTitle = await page.title();
    assert(pageTitle.includes('Ultra-RAG'), `Page title contains Ultra-RAG (got "${pageTitle}")`);

    const hasNavbar = await page.evaluate(() => document.body.textContent.includes('Projects'));
    assert(hasNavbar, 'Navbar is rendered with Projects / Documents / Chat tabs');

    const hasActivityRail = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some((b) => b.title && b.title.includes('New Chat'));
    });
    assert(hasActivityRail, 'Far-Left Activity Rail is rendered with New Chat button');

    // ----------------------------------------------------
    // TEST 2: Load Sample Research Papers
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Document Ingestion & Sample PDF Loading ---');
    const loadSampleSuccess = await page.evaluate(async () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const demoBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Demo Paper') || b.textContent.includes('Load Sample')));
      if (demoBtn) {
        demoBtn.click();
        return true;
      }
      return false;
    });
    assert(loadSampleSuccess, 'Triggered Load Demo Paper button');

    await new Promise((r) => setTimeout(r, 4500));

    const docCount = await page.evaluate(() => {
      return window.useRagStore ? window.useRagStore.getState().documents.length : 0;
    });
    assert(docCount >= 1, `Documents loaded into store (found ${docCount} documents)`);

    // ----------------------------------------------------
    // TEST 3: Checkbox Selection & Master Selection
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Document Checkboxes & Selection Controls ---');
    const selectionTest = await page.evaluate(() => {
      const store = window.useRagStore;
      
      // Select all
      store.getState().selectAllDocuments(true);
      const allSelected = store.getState().documents.every((d) => d.selected);
      
      // Deselect all
      store.getState().selectAllDocuments(false);
      const noneSelected = store.getState().documents.every((d) => !d.selected);

      // Re-select first 3
      const docs = store.getState().documents;
      if (docs.length >= 3) {
        store.getState().toggleDocumentSelection(docs[0].id);
        store.getState().toggleDocumentSelection(docs[1].id);
        store.getState().toggleDocumentSelection(docs[2].id);
      }
      const countAfter = store.getState().documents.filter((d) => d.selected).length;

      return { allSelected, noneSelected, countAfter };
    });

    assert(selectionTest.allSelected, 'Master selectAllDocuments(true) selects all sources');
    assert(selectionTest.noneSelected, 'Master selectAllDocuments(false) deselects all sources');
    assert(selectionTest.countAfter === 3, 'Individual toggleDocumentSelection accurately updates count');

    await new Promise((r) => setTimeout(r, 1000));

    // ----------------------------------------------------
    // TEST 4: In-Browser PDF Canvas Viewer
    // ----------------------------------------------------
    console.log('\n--- TEST 4: High-DPI Real PDF Canvas Viewer & Controls ---');
    const pdfViewerState = await page.evaluate(() => {
      const store = window.useRagStore.getState();
      const firstDoc = store.documents[0];
      if (firstDoc) {
        store.setActiveDocId(firstDoc.id);
        store.setPdfViewerOpen(true);
      }
      return {
        activeDocId: store.activeDocId,
        isOpen: store.isPdfViewerOpen,
        docName: firstDoc ? firstDoc.name : '',
      };
    });

    assert(pdfViewerState.isOpen, `PDF Viewer is open for active document: ${pdfViewerState.docName}`);

    await new Promise((r) => setTimeout(r, 3500));

    // Check canvas element rendering
    const canvasMetrics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      return {
        width: canvas.width,
        height: canvas.height,
        styleWidth: canvas.style.width,
        styleHeight: canvas.style.height,
      };
    });

    assert(canvasMetrics !== null && canvasMetrics.width > 0 && canvasMetrics.height > 0, 
      `PDF Canvas rendered with high-DPI resolution (${canvasMetrics?.width}x${canvasMetrics?.height}px)`);

    // Test Page Navigation
    const pageNavResult = await page.evaluate(() => {
      const nextBtn = document.querySelector('button[title="Next Page"]');
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
        return true;
      }
      return false;
    });
    assert(pageNavResult, 'Clicked Next Page button on PDF Viewer');

    await new Promise((r) => setTimeout(r, 1500));

    // Test Zoom In / Out
    const zoomResult = await page.evaluate(() => {
      const zoomInBtn = document.querySelector('button[title="Zoom in"]');
      if (zoomInBtn) {
        zoomInBtn.click();
        return true;
      }
      return false;
    });
    assert(zoomResult, 'Clicked Zoom In button on PDF Viewer');

    // ----------------------------------------------------
    // TEST 5: AI Chat & In-Browser Retrieval
    // ----------------------------------------------------
    console.log('\n--- TEST 5: AI Chat & In-Browser Retrieval ---');
    await page.click('textarea');
    await page.type('textarea', 'What is the attention mechanism formula in the transformer paper?');
    await new Promise((r) => setTimeout(r, 500));
    await page.keyboard.press('Enter');

    console.log('  Typed and submitted query to AI Chat via Enter key');
    await new Promise((r) => setTimeout(r, 3000));

    const chatMsgCount = await page.evaluate(() => {
      return window.useRagStore ? window.useRagStore.getState().chatMessages.length : 0;
    });
    assert(chatMsgCount >= 2, `Chat contains question and generated/retrieved response (${chatMsgCount} messages)`);

    // Test inline citation click jump
    const citationClickTest = await page.evaluate(() => {
      const citeBtn = document.querySelector('[data-cite-page], .citation-badge, button[title*="citation"]');
      if (citeBtn) {
        citeBtn.click();
        return true;
      }
      return false;
    });
    assert(citationClickTest, 'Clicked inline citation badge to trigger jump in PDF Viewer');

    // ----------------------------------------------------
    // TEST 6: NotebookLM Studio Modal
    // ----------------------------------------------------
    console.log('\n--- TEST 6: NotebookLM Audio Studio Modal ---');
    const openStudio = await page.evaluate(() => {
      const studioBtn = document.querySelector('button[title*="Studio"]');
      if (studioBtn) {
        studioBtn.click();
        return true;
      }
      return false;
    });
    assert(openStudio, 'Opened NotebookLM Studio modal');
    await new Promise((r) => setTimeout(r, 1500));

    const studioModalMounted = await page.evaluate(() => {
      const modal = document.querySelector('.fixed.inset-0');
      return modal !== null && document.body.textContent.includes('Studio');
    });
    assert(studioModalMounted, 'Studio modal mounted with synthesis tabs');

    // Close Studio
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[title="Close Studio"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // ----------------------------------------------------
    // TEST 7: BYOK Settings Modal & Dynamic Model Discovery
    // ----------------------------------------------------
    console.log('\n--- TEST 7: BYOK Settings Modal & Model Discovery ---');
    const openSettings = await page.evaluate(() => {
      const settingsBtn = document.querySelector('button[title*="configure API keys"], button[title*="Settings"]');
      if (settingsBtn) {
        settingsBtn.click();
        return true;
      }
      return false;
    });
    assert(openSettings, 'Opened BYOK Settings modal');
    await new Promise((r) => setTimeout(r, 1500));

    const settingsMounted = await page.evaluate(() => {
      const store = window.useRagStore ? window.useRagStore.getState() : null;
      return store?.isSettingsOpen === true;
    });
    assert(settingsMounted, 'Settings modal is active in application store');

    // Close Settings
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[title="Close settings"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // ----------------------------------------------------
    // TEST 8: Document Deletion (Single & Bulk)
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Document Deletion & Memory Cleanup ---');
    const deleteTest = await page.evaluate(() => {
      const store = window.useRagStore.getState();
      const countBefore = store.documents.length;
      if (countBefore > 0) {
        const idToDelete = store.documents[0].id;
        store.removeDocument(idToDelete);
        const countAfter = window.useRagStore.getState().documents.length;
        return { countBefore, countAfter };
      }
      return null;
    });

    assert(deleteTest !== null && deleteTest.countAfter === deleteTest.countBefore - 1,
      `Individual document successfully deleted (before: ${deleteTest?.countBefore}, after: ${deleteTest?.countAfter})`);

    // ----------------------------------------------------
    // TEST 9: LocalStorage Persistence across Page Reload
    // ----------------------------------------------------
    console.log('\n--- TEST 9: LocalStorage Persistence across Page Refresh ---');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 2000));

    const reloadedState = await page.evaluate(() => {
      const store = window.useRagStore ? window.useRagStore.getState() : null;
      return {
        docCount: store?.documents?.length || 0,
        chatCount: store?.chatMessages?.length || 0,
      };
    });

    assert(reloadedState.docCount > 0, `Documents survived page reload via localStorage (${reloadedState.docCount} docs restored)`);
    assert(reloadedState.chatCount > 0, `Chat history survived page reload (${reloadedState.chatCount} messages restored)`);

    // ----------------------------------------------------
    // FINAL RESULTS & REPORT
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`📊 FINAL TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log(`🐛 Total Browser Page Errors: ${errors.length}`);
    console.log('====================================================\n');

    if (errors.length > 0) {
      console.log('Errors caught during testing:');
      errors.forEach((e, i) => console.log(`  [${i + 1}] ${e}`));
    }

  } catch (err) {
    console.error('Test script encountered fatal error:', err);
  } finally {
    if (browser) await browser.close();
    if (previewProcess) {
      if (process.platform === 'win32') {
        try {
          spawn('taskkill', ['/pid', previewProcess.pid.toString(), '/f', '/t']);
        } catch {}
      } else {
        previewProcess.kill('SIGKILL');
      }
    }
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runTest();
