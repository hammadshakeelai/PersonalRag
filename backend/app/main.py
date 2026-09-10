"""
FastAPI Backend for Ultra-RAG
Provides high-fidelity PyMuPDF parsing, FlashRank reranking, and unified RAG API.
Deployable to Render, Railway, Hugging Face Spaces, or locally via Docker.
"""

import os
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.core.parser import parse_pdf_document
from app.core.rag import PythonRAGEngine

app = FastAPI(
    title="Ultra-RAG Backend API",
    description="High-precision RAG engine with PyMuPDF4LLM extraction & FlashRank cross-encoder reranking.",
    version="1.0.0"
)

# Enable CORS for local dev and GitHub Pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_engine = PythonRAGEngine()

class DocumentChunk(BaseModel):
    id: str
    doc_id: str
    doc_name: str
    page_number: int
    content: str
    context_header: Optional[str] = ""

class RerankRequest(BaseModel):
    query: str
    chunks: List[DocumentChunk]
    top_k: Optional[int] = 5

class RerankResultItem(BaseModel):
    chunk: DocumentChunk
    score: float

class RerankResponse(BaseModel):
    results: List[RerankResultItem]

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Ultra-RAG Backend",
        "features": [
            "PyMuPDF4LLM Layout-Aware Extraction",
            "FlashRank Cross-Encoder Reranker",
            "BM25 + Dense RRF Fusion"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    """
    Extracts text, markdown tables, and per-page content from uploaded PDF.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        content = await file.read()
        parsed_doc = parse_pdf_document(file.filename, content)
        return parsed_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

@app.post("/api/rerank", response_model=RerankResponse)
def rerank_passages(request: RerankRequest):
    """
    Reranks document chunks against a user query using FlashRank cross-encoder.
    """
    try:
        ranked = rag_engine.rerank(
            query=request.query,
            chunks=[c.model_dump() for c in request.chunks],
            top_k=request.top_k
        )
        return {"results": ranked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reranking failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
