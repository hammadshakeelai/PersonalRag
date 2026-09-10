import MiniSearch from 'minisearch';
import type { DocumentChunk } from './types';

export class BM25Index {
  private miniSearch: MiniSearch<DocumentChunk>;
  private chunksMap: Map<string, DocumentChunk> = new Map();

  constructor() {
    this.miniSearch = new MiniSearch<DocumentChunk>({
      fields: ['content', 'contextHeader', 'docName'], // fields to index
      storeFields: ['id', 'docId', 'docName', 'pageNumber', 'content', 'contextHeader', 'parentContent'],
      searchOptions: {
        boost: { content: 2, contextHeader: 1.5, docName: 1 },
        prefix: true,
        fuzzy: 0.2,
      },
    });
  }

  public indexChunks(chunks: DocumentChunk[]): void {
    const newChunks: DocumentChunk[] = [];
    for (const chunk of chunks) {
      if (!this.chunksMap.has(chunk.id)) {
        this.chunksMap.set(chunk.id, chunk);
        newChunks.push(chunk);
      }
    }
    if (newChunks.length > 0) {
      this.miniSearch.addAll(newChunks);
    }
  }

  public removeDocuments(docIds: string[]): void {
    const docIdSet = new Set(docIds);
    const toRemove: DocumentChunk[] = [];
    for (const [id, chunk] of this.chunksMap.entries()) {
      if (docIdSet.has(chunk.docId)) {
        toRemove.push(chunk);
        this.chunksMap.delete(id);
      }
    }
    if (toRemove.length > 0) {
      this.miniSearch.removeAll(toRemove);
    }
  }

  public search(
    query: string,
    activeDocIds?: string[],
    topK: number = 20
  ): { chunk: DocumentChunk; score: number }[] {
    if (!query.trim() || this.chunksMap.size === 0) {
      return [];
    }

    const results = this.miniSearch.search(query, {
      filter: activeDocIds && activeDocIds.length > 0
        ? (result) => activeDocIds.includes((result as any).docId)
        : undefined,
    });

    return results.slice(0, topK).map((res) => {
      const chunk = this.chunksMap.get(res.id as string) || (res as unknown as DocumentChunk);
      return {
        chunk,
        score: res.score,
      };
    });
  }

  public clear(): void {
    this.miniSearch.removeAll();
    this.chunksMap.clear();
  }
}
