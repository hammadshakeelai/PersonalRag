import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  BookOpen,
  Code,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useRagStore } from '../../store/useRagStore';
import { parseUploadedFile } from '../../lib/pdf/extractor';
import type { DocumentType } from '../../lib/rag/types';

export const SourceManager: React.FC = () => {
  const {
    documents,
    addDocument,
    removeDocument,
    removeSelectedDocuments,
    clearAllDocuments,
    toggleDocumentSelection,
    selectAllDocuments,
    activeDocId,
    setActiveDocId,
    isSidebarOpen,
    setPdfViewerOpen,
  } = useRagStore();

  const [activeTab, setActiveTab] = useState<'sources' | 'notebook'>('sources');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCount = documents.filter((d) => d.selected).length;

  if (!isSidebarOpen) {
    return null;
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProcessError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const doc = await parseUploadedFile(file);
        await addDocument(doc);
        setActiveDocId(doc.id);
        setPdfViewerOpen(true);
      }
    } catch (err: any) {
      setProcessError('Error parsing file: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadSample = async () => {
    setIsProcessing(true);
    setProcessError(null);

    try {
      const sampleFiles = [
        { name: 'Attention_Is_All_You_Need.pdf', path: './samples/Attention_Is_All_You_Need.pdf' },
        { name: 'Retrieval_Augmented_Generation_Lewis2020.pdf', path: './samples/Retrieval_Augmented_Generation_Lewis2020.pdf' },
        { name: 'FlashAttention_Fast_Exact_Attention.pdf', path: './samples/FlashAttention_Fast_Exact_Attention.pdf' },
        { name: 'DeepSeek_R1_Reasoning_via_RL.pdf', path: './samples/DeepSeek_R1_Reasoning_via_RL.pdf' },
        { name: 'LoRA_Low_Rank_Adaptation.pdf', path: './samples/LoRA_Low_Rank_Adaptation.pdf' },
      ];

      let loadedAny = false;
      for (const sample of sampleFiles) {
        try {
          const res = await fetch(sample.path);
          if (res.ok) {
            const blob = await res.blob();
            const file = new File([blob], sample.name, { type: 'application/pdf' });
            const doc = await parseUploadedFile(file);
            await addDocument(doc);
            loadedAny = true;
          }
        } catch {
          // Ignore individual fetch failure
        }
      }

      if (!loadedAny) {
        // Fallback sample text paper if fetch not available
        const sampleText = `# Contextual Retrieval & Advanced RAG: Architectural Paradigms for Zero-Hallucination QA
Authors: AI Systems Research Group (2025)

## Abstract
Traditional Retrieval-Augmented Generation (RAG) relies on fixed-length semantic chunking followed by cosine similarity search. In this study, we propose and benchmark a unified hybrid architecture combining: (1) Contextual Chunk Enrichment, (2) Parent-Child Hierarchical Retrieval, (3) Reciprocal Rank Fusion (RRF) between Dense Embeddings and Sparse BM25, and (4) Cross-Encoder Reranking.

--- Page 2 ---
## 1. The Context Fragmentation Crisis in Naive RAG
When a document is split into 250-word chunks, sentences lose the identity of the company and fiscal year. Hybrid search with contextual retrieval reduces failure rate to 4.8%.

--- Page 3 ---
## 2. Mathematical Formulation of Reciprocal Rank Fusion (RRF)
RRF_Score(d) = \\sum_{m \\in M} \\frac{1}{k + r_m(d)} where k = 60.

--- Page 4 ---
## 3. Parent-Child Hierarchical Retrieval
Indexes granular child chunks (150-200 tokens) for matching, and dynamically expands to parent paragraphs (600-800 tokens).`;

        const sampleBlob = new Blob([sampleText], { type: 'text/markdown' });
        const sampleFile = new File([sampleBlob], 'Contextual_RAG_Paper_2025.md', { type: 'text/markdown' });
        const doc = await parseUploadedFile(sampleFile);
        await addDocument(doc);
      }
    } catch (err: any) {
      setProcessError('Failed to load sample papers: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const getDocBadge = (type: DocumentType) => {
    switch (type) {
      case 'pdf':
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'md':
        return (
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
        );
      case 'code':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Code className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <aside
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`w-72 sm:w-80 h-full border-r border-slate-850 bg-[#0E131F]/95 flex flex-col shrink-0 select-none transition-all z-10 ${
        isDragging ? 'ring-2 ring-indigo-500/50 bg-indigo-950/20' : ''
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.markdown,.json,.csv,.py,.ts,.js,.html"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Top Tab Bar: Sources | Notebook (Mockup Style) */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/30">
        <div className="flex items-center space-x-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('sources')}
            className={`relative pb-1.5 transition-colors ${
              activeTab === 'sources'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Sources</span>
            {activeTab === 'sources' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('notebook')}
            className={`relative pb-1.5 transition-colors ${
              activeTab === 'notebook'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Notebook</span>
            {activeTab === 'notebook' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            )}
          </button>
        </div>

        {/* 3-Dots Menu */}
        <button
          onClick={handleLoadSample}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          title="Options / Load Sample Paper"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Uploaded Header / Master Selection */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800/60 text-xs text-slate-400 bg-slate-900/10">
        <button
          onClick={() => selectAllDocuments(selectedCount < documents.length)}
          className="flex items-center space-x-2 hover:text-slate-200 transition-colors"
        >
          {selectedCount === documents.length && documents.length > 0 ? (
            <CheckSquare className="w-4 h-4 text-indigo-400" />
          ) : (
            <Square className="w-4 h-4 text-slate-500" />
          )}
          <span className="font-medium text-slate-300">Uploaded</span>
        </button>

        <div className="flex items-center space-x-2">
          {selectedCount > 0 ? (
            <button
              onClick={removeSelectedDocuments}
              className="flex items-center space-x-1 text-[11px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 px-2 py-0.5 rounded-lg transition-colors font-medium shadow-sm"
              title="Delete all selected documents"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete ({selectedCount})</span>
            </button>
          ) : documents.length > 0 ? (
            <button
              onClick={clearAllDocuments}
              className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors font-mono"
              title="Clear all sources"
            >
              Clear All
            </button>
          ) : null}

          <span className="text-[11px] font-mono text-slate-500">
            {selectedCount}/{documents.length}
          </span>
        </div>
      </div>

      {processError && (
        <div className="m-3 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl flex items-start space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{processError}</span>
        </div>
      )}

      {isProcessing && (
        <div className="mx-3 mt-3 p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center space-x-2.5">
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          <span className="text-xs text-indigo-200 font-medium">Extracting and indexing...</span>
        </div>
      )}

      {/* Document List (Mockup Card Style) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {documents.length === 0 && !isProcessing && (
          <div className="text-center py-12 px-4 text-slate-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="text-xs font-medium text-slate-400">No documents uploaded</p>
            <p className="text-[11px] text-slate-600 mt-1">Click "Upload sources" below or drag & drop files.</p>
            <button
              onClick={handleLoadSample}
              className="mt-4 inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 px-3 py-1.5 rounded-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Demo Paper</span>
            </button>
          </div>
        )}

        {documents.map((doc) => {
          const isActive = activeDocId === doc.id;
          return (
            <div
              key={doc.id}
              onClick={() => {
                setActiveDocId(doc.id);
                setPdfViewerOpen(true);
              }}
              className={`group flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#151C2C] border-indigo-500/50 shadow-md shadow-indigo-950/40'
                  : 'bg-[#101524]/60 hover:bg-[#151C2C]/80 border-slate-800/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDocumentSelection(doc.id);
                  }}
                  className="text-slate-400 hover:text-indigo-400 transition-colors shrink-0"
                >
                  {doc.selected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </button>

                {/* Color-Coded Icon Badge */}
                {getDocBadge(doc.type)}

                {/* Doc Name & Subtitle */}
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-slate-200 truncate block" title={doc.name}>
                    {doc.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                    {doc.totalPages} {doc.totalPages === 1 ? 'page' : 'pages'}
                  </span>
                </div>
              </div>

              {/* Delete Source Action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeDocument(doc.id);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg transition-colors shrink-0"
                title={`Delete ${doc.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Action: Wide "Upload sources" Button (Mockup Style) */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0E131F]">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-slate-600 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm"
        >
          <UploadCloud className="w-4 h-4 text-slate-300" />
          <span>Upload sources</span>
        </button>
      </div>
    </aside>
  );
};
