"""
High-Fidelity Document Parser using PyMuPDF and PyMuPDF4LLM.
Extracts structured markdown, tables, outlines, and per-page coordinate mapping.
"""

import io
import uuid
from typing import Dict, Any, List

def parse_pdf_document(filename: str, pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Parses a PDF into structured markdown pages, metadata, and outline.
    """
    import fitz  # PyMuPDF

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    doc_id = str(uuid.uuid4())[:8]
    total_pages = len(doc)
    
    # Extract TOC / Bookmarks
    toc = []
    try:
        raw_toc = doc.get_toc()
        for item in raw_toc:
            lvl, title, page = item[0], item[1], item[2]
            toc.append({"level": lvl, "title": title, "page": page})
    except Exception:
        toc = []

    pages_data = []
    chunks = []

    for page_idx in range(total_pages):
        page = doc[page_idx]
        page_num = page_idx + 1
        page_text = page.get_text("text").strip()

        # Try pymupdf4llm for markdown formatting if available
        try:
            import pymupdf4llm
            page_md = pymupdf4llm.to_markdown(doc, pages=[page_idx])
        except Exception:
            page_md = page_text

        pages_data.append({
            "page_number": page_num,
            "text": page_text,
            "markdown": page_md
        })

        # Split page into paragraph-level chunks if substantial
        paragraphs = [p.strip() for p in page_text.split("\n\n") if len(p.strip()) > 40]
        if not paragraphs and page_text:
            paragraphs = [page_text]

        for p_idx, para in enumerate(paragraphs):
            chunk_id = f"{doc_id}-p{page_num}-c{p_idx+1}"
            context_header = f"[{filename} | Page {page_num}]"
            chunks.append({
                "id": chunk_id,
                "doc_id": doc_id,
                "doc_name": filename,
                "page_number": page_num,
                "content": para,
                "context_header": context_header
            })

    doc.close()

    return {
        "doc_id": doc_id,
        "filename": filename,
        "total_pages": total_pages,
        "toc": toc,
        "pages": pages_data,
        "chunks": chunks
    }
