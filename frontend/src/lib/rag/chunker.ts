import type { DocumentChunk, PageData } from './types';

interface ChunkerOptions {
  targetChunkWords?: number;
  overlapWords?: number;
  parentWindowWords?: number;
}

export function createChunksFromDocument(
  docId: string,
  docName: string,
  pages: PageData[],
  options: ChunkerOptions = {}
): DocumentChunk[] {
  const targetWords = options.targetChunkWords || 180;
  const overlapWords = options.overlapWords || 40;
  const parentWindow = options.parentWindowWords || 550;

  const chunks: DocumentChunk[] = [];

  for (const page of pages) {
    const pageText = page.text.trim();
    if (!pageText) continue;

    // Words array with page position tracking
    const words = pageText.split(/\s+/).filter(Boolean);

    if (words.length <= targetWords) {
      // Entire page fits in one chunk
      chunks.push({
        id: `${docId}_p${page.pageNumber}_c0`,
        docId,
        docName,
        pageNumber: page.pageNumber,
        content: pageText,
        parentContent: pageText,
        contextHeader: `[Source: ${docName} | Page: ${page.pageNumber}]`,
        tokenCount: words.length,
      });
      continue;
    }

    // Windowed chunking with overlap
    let chunkIndex = 0;
    for (let i = 0; i < words.length; i += (targetWords - overlapWords)) {
      const chunkWords = words.slice(i, i + targetWords);
      if (chunkWords.length < 25 && i > 0) {
        // Skip tiny trailing fragment
        break;
      }

      // Compute parent window context surrounding this chunk
      const parentStart = Math.max(0, i - Math.floor((parentWindow - targetWords) / 2));
      const parentWords = words.slice(parentStart, parentStart + parentWindow);
      const parentContent = parentWords.join(' ');

      const chunkText = chunkWords.join(' ');
      const contextHeader = `[Source: ${docName} | Page: ${page.pageNumber}]`;

      chunks.push({
        id: `${docId}_p${page.pageNumber}_c${chunkIndex}`,
        docId,
        docName,
        pageNumber: page.pageNumber,
        content: chunkText,
        parentContent,
        contextHeader,
        tokenCount: chunkWords.length,
      });

      chunkIndex++;
    }
  }

  return chunks;
}
