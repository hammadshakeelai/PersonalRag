import { describe, it, expect, beforeEach } from 'vitest';
import { createChunksFromDocument } from '../lib/rag/chunker';
import { BM25Index } from '../lib/rag/bm25';
import { VectorIndex } from '../lib/rag/vector';
import { reciprocalRankFusion } from '../lib/rag/rrf';
import { rerankChunks } from '../lib/rag/reranker';
import type { PageData, DocumentChunk } from '../lib/rag/types';

describe('1. Contextual & Hierarchical Chunker', () => {
  it('chunks a short page into a single coherent chunk', () => {
    const pages: PageData[] = [
      {
        pageNumber: 1,
        text: 'This is a concise single page summary of quantum computing algorithms.',
      },
    ];

    const chunks = createChunksFromDocument('doc_1', 'quantum.pdf', pages, {
      targetChunkWords: 150,
    });

    expect(chunks.length).toBe(1);
    expect(chunks[0].docName).toBe('quantum.pdf');
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].contextHeader).toBe('[Source: quantum.pdf | Page: 1]');
    expect(chunks[0].content).toContain('quantum computing');
  });

  it('splits long documents into windowed chunks with parent context expansion', () => {
    const longText = Array.from({ length: 400 }, (_, i) => `Word${i}`).join(' ');
    const pages: PageData[] = [{ pageNumber: 1, text: longText }];

    const chunks = createChunksFromDocument('doc_2', 'long_report.pdf', pages, {
      targetChunkWords: 100,
      overlapWords: 20,
      parentWindowWords: 250,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].parentContent?.length).toBeGreaterThanOrEqual(chunks[0].content.length);
    // Every chunk must have context header
    for (const chunk of chunks) {
      expect(chunk.contextHeader).toContain('long_report.pdf');
      expect(chunk.pageNumber).toBe(1);
    }
  });
});

describe('2. BM25 Lexical Index (MiniSearch)', () => {
  let bm25: BM25Index;

  beforeEach(() => {
    bm25 = new BM25Index();
  });

  it('indexes and retrieves chunks with exact keyword precision', () => {
    const chunks: DocumentChunk[] = [
      {
        id: 'c1',
        docId: 'doc_alpha',
        docName: 'Alpha.pdf',
        pageNumber: 1,
        content: 'Net profit grew by 14.8 percent in fiscal year 2024 due to EV battery scaling.',
        contextHeader: '[Source: Alpha.pdf | Page: 1]',
      },
      {
        id: 'c2',
        docId: 'doc_beta',
        docName: 'Beta.pdf',
        pageNumber: 2,
        content: 'Clinical trial NCT0482910 showed significant efficacy in Phase 3 trials.',
        contextHeader: '[Source: Beta.pdf | Page: 2]',
      },
    ];

    bm25.indexChunks(chunks);

    const matches = bm25.search('EV battery net profit');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].chunk.id).toBe('c1');

    const clinicalMatches = bm25.search('NCT0482910');
    expect(clinicalMatches.length).toBeGreaterThan(0);
    expect(clinicalMatches[0].chunk.id).toBe('c2');
  });

  it('filters results by active document IDs (NotebookLM source toggle)', () => {
    const chunks: DocumentChunk[] = [
      {
        id: 'c1',
        docId: 'doc_active',
        docName: 'Active.pdf',
        pageNumber: 1,
        content: 'Artificial intelligence architecture in modern search engines.',
        contextHeader: '[Source: Active.pdf | Page: 1]',
      },
      {
        id: 'c2',
        docId: 'doc_inactive',
        docName: 'Inactive.pdf',
        pageNumber: 1,
        content: 'Artificial intelligence ethics and global regulatory policies.',
        contextHeader: '[Source: Inactive.pdf | Page: 1]',
      },
    ];

    bm25.indexChunks(chunks);

    // Filter only doc_active
    const results = bm25.search('Artificial intelligence', ['doc_active']);
    expect(results.length).toBe(1);
    expect(results[0].chunk.docId).toBe('doc_active');
  });

  it('removes documents when deleted by user', () => {
    const chunks: DocumentChunk[] = [
      {
        id: 'c1',
        docId: 'doc_del',
        docName: 'DeleteMe.pdf',
        pageNumber: 1,
        content: 'Secret confidential material to be discarded.',
        contextHeader: '[Source: DeleteMe.pdf | Page: 1]',
      },
    ];

    bm25.indexChunks(chunks);
    expect(bm25.search('Secret').length).toBe(1);

    bm25.removeDocuments(['doc_del']);
    expect(bm25.search('Secret').length).toBe(0);
  });
});

describe('3. Dense Vector Index', () => {
  let vectorIndex: VectorIndex;

  beforeEach(() => {
    vectorIndex = new VectorIndex();
  });

  it('computes semantic embeddings and returns rank-ordered matches', async () => {
    const chunks: DocumentChunk[] = [
      {
        id: 'v1',
        docId: 'doc_1',
        docName: 'finance.pdf',
        pageNumber: 1,
        content: 'Revenue, quarterly operating margin, EBIT and EBITDA metrics in corporate balance sheets.',
        contextHeader: '[Source: finance.pdf | Page: 1]',
      },
      {
        id: 'v2',
        docId: 'doc_2',
        docName: 'cooking.pdf',
        pageNumber: 1,
        content: 'Recipe for authentic Italian sourdough pizza dough with fresh basil and mozzarella.',
        contextHeader: '[Source: cooking.pdf | Page: 1]',
      },
    ];

    await vectorIndex.addChunks(chunks);

    const matches = await vectorIndex.search('quarterly financial earnings balance sheet');
    expect(matches.length).toBe(2);
    expect(matches[0].chunk.id).toBe('v1');
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });
});

describe('4. Reciprocal Rank Fusion (RRF)', () => {
  it('fuses dense and sparse rankings mathematically', () => {
    const chunkA: DocumentChunk = {
      id: 'A',
      docId: 'd1',
      docName: 'A.pdf',
      pageNumber: 1,
      content: 'Chunk A',
      contextHeader: '',
    };
    const chunkB: DocumentChunk = {
      id: 'B',
      docId: 'd2',
      docName: 'B.pdf',
      pageNumber: 1,
      content: 'Chunk B',
      contextHeader: '',
    };
    const chunkC: DocumentChunk = {
      id: 'C',
      docId: 'd3',
      docName: 'C.pdf',
      pageNumber: 1,
      content: 'Chunk C',
      contextHeader: '',
    };

    // Dense results: [A (rank 1), B (rank 2)]
    const dense = [
      { chunk: chunkA, score: 0.9 },
      { chunk: chunkB, score: 0.8 },
    ];

    // BM25 results: [B (rank 1), C (rank 2)]
    const bm25 = [
      { chunk: chunkB, score: 5.2 },
      { chunk: chunkC, score: 3.1 },
    ];

    const k = 60;
    const fused = reciprocalRankFusion(dense, bm25, k, 10);

    // Chunk B appears in BOTH rankings (rank 2 in dense, rank 1 in bm25)
    // RRF(B) = 1/(60+2) + 1/(60+1) = 1/62 + 1/61 = 0.016129 + 0.016393 = ~0.03252
    // RRF(A) = 1/(60+1) = 1/61 = ~0.01639
    // RRF(C) = 1/(60+2) = 1/62 = ~0.01612
    // Therefore Chunk B MUST rank #1!
    expect(fused[0].chunk.id).toBe('B');
    expect(fused[0].score).toBeGreaterThan(fused[1].score);
  });
});

describe('5. Reranker & False-Positive Elimination', () => {
  it('boosts passages with high keyword coverage and penalizes irrelevant matches', async () => {
    const relevantChunk: DocumentChunk = {
      id: 'rel',
      docId: 'd1',
      docName: 'rel.pdf',
      pageNumber: 3,
      content: 'Transformer attention mechanisms use queries, keys, and values to compute self-attention.',
      contextHeader: '[rel.pdf | p.3]',
    };

    const distractorChunk: DocumentChunk = {
      id: 'dist',
      docId: 'd2',
      docName: 'dist.pdf',
      pageNumber: 1,
      content: 'General history of machinery in early industrial manufacturing.',
      contextHeader: '[dist.pdf | p.1]',
    };

    const candidates = [
      { chunk: distractorChunk, score: 0.8 },
      { chunk: relevantChunk, score: 0.5 },
    ];

    const reranked = await rerankChunks('Transformer self-attention query key value', candidates, 2);
    expect(reranked[0].chunk.id).toBe('rel');
  });
});
