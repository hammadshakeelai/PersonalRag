# 🚀 Ultra-RAG: Next-Gen Personal Document Intelligence

> **A free, open-source, privacy-preserving hybrid of ChatPDF and NotebookLM** powered by state-of-the-art RAG architectures (Contextual Chunking, Hybrid BM25 + Dense Search, Reciprocal Rank Fusion, Cross-Encoder Reranking, and Verifiable Visual Citations).

[![Deploy to GitHub Pages](https://github.com/actions/workflows/deploy.yml/badge.svg)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Highlights

- 🎯 **Verifiable Visual Citations (ChatPDF-Style)**: Every statement is cited with `[DocName, p.X]`. Clicking any citation instantly shifts the side-by-side document viewer to the exact page and highlights the cited quote in glowing yellow.
- 📚 **Multi-Source Notebooks (NotebookLM-Style)**: Upload multiple documents at once (PDFs, Markdown, TXT, CSV, JSON, Code). Use the checkboxes to dynamically choose which sources are active for any given query or comparison.
- 🎙️ **NotebookLM Studio Synthesis**:
  - **Deep Dive Podcast Dialogue**: Generates a lively two-host conversational discussion between Alex (host/interviewer) and Sam (domain expert) dissecting your sources.
  - **Executive Briefing**: Distills key metrics, data points, and strategic takeaways into an executive report.
  - **Study Guide & Quiz**: Builds a core concepts glossary and a 5-question multiple-choice interactive quiz with answers grounded in the text.
  - **Cross-Doc Comparison Matrix**: Compares viewpoints, findings, and divergences across multiple files.
- 🔬 **State-of-the-Art RAG Pipeline**:
  - **Anthropic Contextual Retrieval**: Augments individual chunks with document and section situational context before indexing to prevent context amnesia.
  - **Parent-Child Hierarchical Retrieval**: Indexes granular child chunks (150–200 words) for razor-sharp retrieval, then expands to surrounding parent blocks (500–800 words) for rich LLM context.
  - **Hybrid Search (Dense + BM25)**: Combines exact keyword matching (for part numbers, names, equations, dates) with dense semantic embeddings.
  - **Reciprocal Rank Fusion (RRF)**: Fuses sparse and dense rankings mathematically:
    $$\text{RRF Score}(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$
  - **Cross-Encoder Reranker**: Integrates FlashRank to re-score candidate passages and eliminate false positives before generation.
- 🔑 **BYOK (Bring Your Own Key) & 100% Privacy**:
  - **Zero Server Storage**: API keys are stored strictly in your browser (`localStorage`) and sent only directly to the AI provider.
  - Supported Providers:
    - **Google Gemini** (*Recommended* — Generous Free Tier with 15 RPM and massive 1M context window)
    - **Groq Cloud** (*Ultra-Fast* — 500+ tokens/sec on Llama 3.3 70B & DeepSeek R1 Distill)
    - **OpenAI** (GPT-4o, GPT-4o-mini)
    - **Anthropic Claude** (Claude 3.5 Sonnet & Haiku)
    - **Custom / Agnes AI / Ollama** (Universal OpenAI-compatible endpoint support for local or custom proxies)
- 🌐 **Dual Deployment Architecture**:
  - **Standalone Mode (GitHub Pages)**: Runs 100% in the browser using PDF.js and client-side BM25/vector search. Zero server bills, infinite scalability, 0ms backend latency.
  - **Power Backend Mode (Render / Local)**: Optional Python FastAPI backend on Render with PyMuPDF4LLM extraction and server-side FlashRank reranking.

---

## 🏗️ Architecture Overview

```
PersonalRag/
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/             # Streaming chat with clickable citation chips
│   │   │   ├── viewer/           # Side-by-side viewer with live quote highlighting
│   │   │   ├── sources/          # Multi-doc source checklist & drag-and-drop
│   │   │   ├── studio/           # NotebookLM Podcast, Study Guide, Summary
│   │   │   └── settings/         # BYOK provider & RAG tuning modal
│   │   ├── lib/
│   │   │   ├── rag/              # BM25 (MiniSearch), Vector, RRF, Reranker, Chunker
│   │   │   ├── llm/              # Unified BYOK client (Gemini, Groq, OpenAI, Claude, Custom)
│   │   │   ├── pdf/              # PDF.js and generic document parser
│   │   │   └── studio/           # NotebookLM studio generator
│   │   └── store/                # Zustand global state
├── backend/                      # Optional Python FastAPI backend for Render / Local
│   ├── app/
│   │   ├── core/                 # PyMuPDF4LLM & FlashRank reranker
│   │   └── main.py               # REST API endpoints (/api/parse-pdf, /api/rerank)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── render.yaml               # One-click Render blueprint
└── .github/workflows/deploy.yml  # Automated GitHub Pages CI/CD workflow
```

---

## ⚡ Quickstart

### 1. Run the Frontend Locally

```bash
# Clone the repository
git clone https://github.com/your-username/PersonalRag.git
cd PersonalRag/frontend

# Install dependencies
npm install --legacy-peer-deps

# Start Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Configure Your API Key (BYOK)

1. Click the **Settings (⚙️)** button in the top right.
2. Choose your preferred AI provider:
   - **Google Gemini** (Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey))
   - **Groq** (Get a free key from [Groq Console](https://console.groq.com/keys))
   - **OpenAI** / **Claude** / **Custom (Agnes AI / Ollama)**
3. Paste your key and click **Save & Close**.

### 3. Load Documents & Ask Questions

- Click **Load Sample Research Paper** for an instant one-click demo, or drag and drop any PDF, Markdown, TXT, CSV, or code file.
- Ask questions in the chat! Notice the citations `[DocName, p.X]`. Click any citation tag to jump directly to that page in the document viewer.
- Click **Studio** (top bar) to generate a Two-Host Podcast Script, Executive Briefing, or Study Guide.

---

## 🚢 Deploying to GitHub Pages (100% Free & Zero Server Maintenance)

1. Create a repository on GitHub (e.g. `PersonalRag`) and push this codebase:
   ```bash
   git add .
   git commit -m "feat: initial commit of Ultra-RAG"
   git branch -M main
   git remote add origin https://github.com/<your-username>/PersonalRag.git
   git push -u origin main
   ```
2. Go to your GitHub Repository **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) will automatically build and publish your website at:
   `https://<your-username>.github.io/PersonalRag/`

---

## ☁️ Deploying the Optional FastAPI Backend to Render

If you want heavy server-side PyMuPDF4LLM extraction and Python FlashRank reranking:

1. Sign up for free at [render.com](https://render.com).
2. Click **New +** > **Blueprint** and connect your GitHub repository.
3. Render will detect `backend/render.yaml` and configure a free web service automatically.
4. Copy your Render URL (e.g. `https://ultra-rag-backend.onrender.com`) and paste it into the **Settings** modal in your Ultra-RAG web app!

---

## 📄 License

MIT License. Free for personal and commercial use.
