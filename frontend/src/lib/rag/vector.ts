import type { DocumentChunk, BYOKConfig } from './types';

export class VectorIndex {
  private chunks: DocumentChunk[] = [];
  private embeddings: Map<string, number[]> = new Map();

  public async addChunks(chunks: DocumentChunk[], config?: BYOKConfig): Promise<void> {
    const newChunks = chunks.filter((c) => !this.embeddings.has(c.id));
    if (newChunks.length === 0) return;

    this.chunks.push(...newChunks);

    // Compute or fetch embeddings
    const vectors = await this.generateEmbeddings(newChunks, config);
    for (let i = 0; i < newChunks.length; i++) {
      this.embeddings.set(newChunks[i].id, vectors[i]);
    }
  }

  public removeDocuments(docIds: string[]): void {
    const docIdSet = new Set(docIds);
    this.chunks = this.chunks.filter((c) => !docIdSet.has(c.docId));
    for (const chunk of this.chunks) {
      if (docIdSet.has(chunk.docId)) {
        this.embeddings.delete(chunk.id);
      }
    }
  }

  public async search(
    query: string,
    activeDocIds?: string[],
    topK: number = 20,
    config?: BYOKConfig
  ): Promise<{ chunk: DocumentChunk; score: number }[]> {
    if (this.chunks.length === 0 || !query.trim()) return [];

    const [queryVec] = await this.generateEmbeddings(
      [{ id: 'query', content: query, docId: '', docName: '', pageNumber: 0, contextHeader: '' }],
      config
    );

    const docIdFilter = activeDocIds && activeDocIds.length > 0 ? new Set(activeDocIds) : null;
    const scored: { chunk: DocumentChunk; score: number }[] = [];

    for (const chunk of this.chunks) {
      if (docIdFilter && !docIdFilter.has(chunk.docId)) continue;
      const vec = this.embeddings.get(chunk.id);
      if (!vec) continue;

      const score = cosineSimilarity(queryVec, vec);
      scored.push({ chunk, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  private async generateEmbeddings(
    items: DocumentChunk[],
    config?: BYOKConfig
  ): Promise<number[][]> {
    // If Gemini API Key is available, use Google's text-embedding-004
    if (config?.provider === 'gemini' && config.apiKey) {
      try {
        return await this.fetchGeminiEmbeddings(items, config.apiKey);
      } catch (err) {
        console.warn('Gemini embedding failed, falling back to local dense vectorizer:', err);
      }
    }

    // If OpenAI API Key is available, use text-embedding-3-small
    if (config?.provider === 'openai' && config.apiKey) {
      try {
        return await this.fetchOpenAIEmbeddings(items, config.apiKey, config.customBaseUrl);
      } catch (err) {
        console.warn('OpenAI embedding failed, falling back to local dense vectorizer:', err);
      }
    }

    // High-performance local semantic feature vectorizer (zero-dependency, zero API cost)
    return items.map((item) => localSemanticEmbedding(item.content));
  }

  private async fetchGeminiEmbeddings(items: DocumentChunk[], apiKey: string): Promise<number[][]> {
    // Gemini text-embedding-004 batch embedding
    const results: number[][] = [];
    const BATCH_SIZE = 16;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const requests = batch.map((item) => ({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: `${item.contextHeader}\n${item.content}` }] },
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        }
      );

      if (!res.ok) {
        throw new Error(`Gemini Embeddings HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      for (const emb of data.embeddings) {
        results.push(emb.values);
      }
    }

    return results;
  }

  private async fetchOpenAIEmbeddings(
    items: DocumentChunk[],
    apiKey: string,
    baseUrl?: string
  ): Promise<number[][]> {
    const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/embeddings';
    const texts = items.map((item) => `${item.contextHeader}\n${item.content}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: 'text-embedding-3-small',
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI Embeddings HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return data.data.map((d: any) => d.embedding);
  }

  public clear(): void {
    this.chunks = [];
    this.embeddings.clear();
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 256-dimensional semantic hashing vectorizer with sub-word n-gram features
 * Generates normalized dense vectors without external network calls or weights.
 */
function localSemanticEmbedding(text: string, dimension: number = 256): number[] {
  const vec = new Float64Array(dimension);
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = clean.split(/\s+/).filter((w) => w.length > 1);

  for (const word of words) {
    // Word hash
    let h = 0x811c9dc5;
    for (let i = 0; i < word.length; i++) {
      h ^= word.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    const idx = Math.abs(h) % dimension;
    vec[idx] += 1.0;

    // Character 3-grams for semantic and typo tolerance
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        const tri = word.slice(i, i + 3);
        let th = 0x811c9dc5;
        for (let j = 0; j < 3; j++) {
          th ^= tri.charCodeAt(j);
          th = Math.imul(th, 0x01000193);
        }
        vec[Math.abs(th) % dimension] += 0.35;
      }
    }
  }

  // L2 normalize
  let sumSq = 0;
  for (let i = 0; i < dimension; i++) {
    sumSq += vec[i] * vec[i];
  }

  const norm = Math.sqrt(sumSq) || 1.0;
  const result = new Array(dimension);
  for (let i = 0; i < dimension; i++) {
    result[i] = vec[i] / norm;
  }

  return result;
}
