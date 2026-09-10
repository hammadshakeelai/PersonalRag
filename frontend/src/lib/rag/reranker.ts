import type { RankedChunk } from './rrf';

export async function rerankChunks(
  query: string,
  candidates: RankedChunk[],
  topK: number = 5,
  backendUrl?: string
): Promise<RankedChunk[]> {
  if (candidates.length <= 1) return candidates;

  // 1. Try FastAPI FlashRank backend if configured and available
  if (backendUrl) {
    try {
      const cleanUrl = backendUrl.replace(/\/+$/, '') + '/api/rerank';
      const payload = {
        query,
        chunks: candidates.map((c) => ({
          id: c.chunk.id,
          doc_id: c.chunk.docId,
          doc_name: c.chunk.docName,
          page_number: c.chunk.pageNumber,
          content: c.chunk.content,
          context_header: c.chunk.contextHeader,
        })),
        top_k: topK,
      };

      const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          return data.results.map((r: any) => ({
            chunk: r.chunk,
            score: r.score,
          }));
        }
      }
    } catch (err) {
      console.warn('Backend reranking unavailable, using client-side reranker:', err);
    }
  }

  // 2. High-precision Client-side Reranker (Semantic Overlap + Exact Density + Proximity)
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = candidates.map((cand) => {
    const text = cand.chunk.content.toLowerCase();
    const parent = (cand.chunk.parentContent || '').toLowerCase();
    let termMatches = 0;
    let termDensity = 0;

    for (const term of queryTerms) {
      if (text.includes(term)) {
        termMatches++;
        // Count occurrences
        const count = (text.match(new RegExp(term, 'g')) || []).length;
        termDensity += count * 0.15;
      } else if (parent.includes(term)) {
        termMatches += 0.5;
      }
    }

    // Term coverage ratio (what fraction of query keywords appear)
    const coverage = queryTerms.length > 0 ? termMatches / queryTerms.length : 0;
    // Length penalty: penalize too short or too sparse chunks
    const lengthFactor = Math.min(1.0, cand.chunk.content.length / 150);

    const rerankScore = (cand.score * 0.4) + (coverage * 0.45) + (termDensity * 0.15) * lengthFactor;

    return {
      ...cand,
      score: rerankScore,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
