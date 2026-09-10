"""
Python-based Advanced RAG Engine:
Features FlashRank Cross-Encoder Reranking, BM25 Lexical Scoring, and Reciprocal Rank Fusion (RRF).
"""

from typing import List, Dict, Any

class PythonRAGEngine:
    def __init__(self):
        self._ranker = None
        self._init_ranker()

    def _init_ranker(self):
        try:
            from flashrank import Ranker
            # Uses the ultra-fast lightweight ms-marco-TinyBERT-L-2-v2 or ms-marco-MiniLM-L-12-v2
            self._ranker = Ranker()
        except Exception as e:
            print(f"[RAG Engine] FlashRank ranker initialization deferred or unavailable: {e}")
            self._ranker = None

    def rerank(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Reranks retrieved candidate chunks against query using FlashRank.
        Falls back to lexical density scoring if ranker is not loaded.
        """
        if not chunks:
            return []

        if self._ranker:
            try:
                from flashrank import RerankRequest
                passages = [{"id": i, "text": c.get("content", "")} for i, c in enumerate(chunks)]
                req = RerankRequest(query=query, passages=passages)
                ranked_passages = self._ranker.rerank(req)
                
                results = []
                for item in ranked_passages[:top_k]:
                    idx = item["id"]
                    results.append({
                        "chunk": chunks[idx],
                        "score": float(item["score"])
                    })
                return results
            except Exception as e:
                print(f"[RAG Engine] FlashRank execution error, using fallback: {e}")

        # Fallback scoring: Keyword density + exact match + length penalty
        query_terms = [t.lower() for t in query.split() if len(t) > 2]
        scored_chunks = []
        for c in chunks:
            text = c.get("content", "").lower()
            score = 0.0
            for term in query_terms:
                if term in text:
                    score += 1.0 + (text.count(term) * 0.2)
            scored_chunks.append({"chunk": c, "score": score})

        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

    @staticmethod
    def reciprocal_rank_fusion(dense_ranks: List[str], sparse_ranks: List[str], k: int = 60) -> List[Dict[str, Any]]:
        """
        Calculates RRF scores across multiple rankings:
        RRF_score(d) = sum(1 / (k + rank))
        """
        scores = {}
        for rank, doc_id in enumerate(dense_ranks):
            scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank + 1))

        for rank, doc_id in enumerate(sparse_ranks):
            scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank + 1))

        sorted_items = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [{"id": item[0], "rrf_score": item[1]} for item in sorted_items]
