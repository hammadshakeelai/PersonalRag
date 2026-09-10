import type { DocumentChunk } from './types';

export interface RankedChunk {
  chunk: DocumentChunk;
  score: number;
  denseRank?: number;
  bm25Rank?: number;
}

/**
 * Combines dense vector results and sparse BM25 results using Reciprocal Rank Fusion.
 * Score(d) = sum( 1 / (k + rank(d)) )
 */
export function reciprocalRankFusion(
  denseResults: { chunk: DocumentChunk; score: number }[],
  bm25Results: { chunk: DocumentChunk; score: number }[],
  k: number = 60,
  topK: number = 10
): RankedChunk[] {
  const scoreMap = new Map<string, { chunk: DocumentChunk; rrfScore: number; denseRank?: number; bm25Rank?: number }>();

  // Add Dense Ranks
  denseResults.forEach((res, rank) => {
    const existing = scoreMap.get(res.chunk.id);
    const contribution = 1.0 / (k + rank + 1);
    if (existing) {
      existing.rrfScore += contribution;
      existing.denseRank = rank + 1;
    } else {
      scoreMap.set(res.chunk.id, {
        chunk: res.chunk,
        rrfScore: contribution,
        denseRank: rank + 1,
      });
    }
  });

  // Add BM25 Ranks
  bm25Results.forEach((res, rank) => {
    const existing = scoreMap.get(res.chunk.id);
    const contribution = 1.0 / (k + rank + 1);
    if (existing) {
      existing.rrfScore += contribution;
      existing.bm25Rank = rank + 1;
    } else {
      scoreMap.set(res.chunk.id, {
        chunk: res.chunk,
        rrfScore: contribution,
        bm25Rank: rank + 1,
      });
    }
  });

  const sorted = Array.from(scoreMap.values()).sort((a, b) => b.rrfScore - a.rrfScore);

  return sorted.slice(0, topK).map((item) => ({
    chunk: item.chunk,
    score: item.rrfScore,
    denseRank: item.denseRank,
    bm25Rank: item.bm25Rank,
  }));
}
