import * as pdfjsLib from 'pdfjs-dist';
import type { DocumentItem, DocumentType, PageData } from '../rag/types';
import { createChunksFromDocument } from '../rag/chunker';

// Ensure PDF.js worker is properly configured for Vite and GitHub Pages
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export async function parseUploadedFile(file: File): Promise<DocumentItem> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  let docType: DocumentType = 'txt';

  if (fileExt === 'pdf') {
    docType = 'pdf';
  } else if (['md', 'markdown'].includes(fileExt)) {
    docType = 'md';
  } else if (fileExt === 'json') {
    docType = 'json';
  } else if (fileExt === 'csv') {
    docType = 'csv';
  } else if (['py', 'ts', 'js', 'html', 'css', 'go', 'rs', 'java', 'cpp', 'c'].includes(fileExt)) {
    docType = 'code';
  }

  let pages: PageData[] = [];
  let rawText = '';

  if (docType === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageStrings = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter((str) => str.trim().length > 0);

      // Join items preserving spacing
      const pageText = pageStrings.join(' ');
      pages.push({
        pageNumber: pageNum,
        text: pageText,
        markdown: pageText,
      });
      rawText += `\n\n--- Page ${pageNum} ---\n` + pageText;
    }
  } else {
    // Text-based files
    rawText = await file.text();
    // Split into pseudo-pages (around 3000 chars per page to maintain consistent paging)
    const lines = rawText.split('\n');
    let currentPage = 1;
    let currentChunk = '';

    for (const line of lines) {
      currentChunk += line + '\n';
      if (currentChunk.length > 2500) {
        pages.push({
          pageNumber: currentPage,
          text: currentChunk.trim(),
          markdown: currentChunk.trim(),
        });
        currentPage++;
        currentChunk = '';
      }
    }

    if (currentChunk.trim().length > 0 || pages.length === 0) {
      pages.push({
        pageNumber: currentPage,
        text: currentChunk.trim() || rawText,
        markdown: currentChunk.trim() || rawText,
      });
    }
  }

  const docId = 'doc_' + Math.random().toString(36).substring(2, 9);
  const totalPages = pages.length;

  // Generate chunks using layout & contextual-aware chunker
  const chunks = createChunksFromDocument(docId, file.name, pages);

  return {
    id: docId,
    name: file.name,
    type: docType,
    totalPages,
    size: file.size,
    uploadedAt: Date.now(),
    selected: true,
    pages,
    rawText,
    chunks,
    summary: pages[0]?.text.slice(0, 200) + '...',
  };
}
