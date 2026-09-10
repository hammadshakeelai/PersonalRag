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
  FileSpreadsheet,
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
    toggleDocumentSelection,
    selectAllDocuments,
    activeDocId,
    setActiveDocId,
  } = useRagStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCount = documents.filter((d) => d.selected).length;
  const totalChunks = documents.reduce((acc, d) => acc + d.chunks.length, 0);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProcessError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const docItem = await parseUploadedFile(file);
        await addDocument(docItem);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setProcessError(err.message || 'Failed to parse file.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadSample = async () => {
    setIsProcessing(true);
    setProcessError(null);

    try {
      // Create rich sample research paper on Contextual Retrieval & Next-Gen RAG
      const sampleText = `# Contextual Retrieval & Advanced RAG: Architectural Paradigms for Zero-Hallucination QA
Authors: AI Systems Research Group (2025)

## Abstract
Traditional Retrieval-Augmented Generation (RAG) relies on fixed-length semantic chunking followed by cosine similarity search. While computationally efficient, this naive approach suffers from severe context amnesia, where isolated chunks lack document-level semantics, leading to retrieval failure rates exceeding 45%. In this study, we propose and benchmark a unified hybrid architecture combining: (1) Contextual Chunk Enrichment, (2) Parent-Child Hierarchical Retrieval, (3) Reciprocal Rank Fusion (RRF) between Dense Embeddings and Sparse BM25, and (4) Cross-Encoder Reranking.

--- Page 2 ---
## 1. The Context Fragmentation Crisis in Naive RAG
When a document is split into 250-word chunks, sentences such as "In Q3, net revenue climbed by 14.8% due to sustained hardware demand" completely lose the identity of the company and fiscal year. If an analyst queries "What was Tesla's Q3 revenue growth?", pure dense embeddings fail because the word "Tesla" is absent from the target chunk.

### Table 1: Retrieval Failure Rates across 10,000 Complex Queries
| Architecture Type | Keyword Recall | Semantic Precision | Failure Rate (%) |
| :--- | :--- | :--- | :--- |
| Naive Dense (Top-5) | 52.4% | 68.1% | 46.2% |
| Sparse BM25 Only | 81.3% | 44.7% | 38.9% |
| Hybrid (BM25 + Dense) | 88.9% | 79.4% | 19.5% |
| Hybrid + Contextual Retrieval + Reranker | 97.2% | 94.6% | 4.8% |

--- Page 3 ---
## 2. Mathematical Formulation of Reciprocal Rank Fusion (RRF)
To unify dense vector rankings and BM25 lexical rankings without encountering uncalibrated score distributions, we compute:
RRF_Score(d) = \\sum_{m \\in M} \\frac{1}{k + r_m(d)}
where M is the set of retrieval models (Dense, BM25), r_m(d) is the ordinal rank of passage d, and k is a smoothing constant set empirically to k = 60. RRF ensures that exact keyword matches (names, dates, serial numbers) receive high placement while conceptual inquiries retain semantic depth.

--- Page 4 ---
## 3. Parent-Child Hierarchical Retrieval
To resolve the trade-off between retrieval specificity and generation context, the system indexes granular child chunks (150-200 tokens) for matching, but dynamically expands to the enclosing parent paragraph (600-800 tokens) prior to context window injection. This eliminates mid-sentence truncations and maintains narrative coherence.

## 4. Conclusion & Key Takeaways
1. Contextual enrichment prepends document and section metadata, reducing ambiguity.
2. Hybrid RRF combines the precision of BM25 with the conceptual breadth of dense vectors.
3. FlashRank cross-encoder reranking eliminates false positive candidates before generation.
4. Inline verifiable citations provide user auditability and prevent hallucinations.`;

      const sampleBlob = new Blob([sampleText], { type: 'text/markdown' });
      const sampleFile = new File([sampleBlob], 'Contextual_RAG_Paper_2025.md', { type: 'text/markdown' });
      const doc = await parseUploadedFile(sampleFile);
      await addDocument(doc);
    } catch (err: any) {
      setProcessError('Failed to load sample paper: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDocIcon = (type: DocumentType) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'md':
        return <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'code':
        return <Code className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'csv':
      case 'json':
        return <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
  };

  return (
    <aside className="w-72 sm:w-80 h-full border-r border-slate-800 bg-slate-950 flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-200">Sources Notebook</h2>
        </div>
        <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full font-mono">
          {documents.length} docs ({totalChunks} chunks)
        </span>
      </div>

      {/* Upload Dropzone */}
      <div className="p-3">
        <div
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
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.markdown,.json,.csv,.py,.ts,.js,.html"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              <span className="text-xs text-slate-300 font-medium">Extracting & indexing chunks...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                <UploadCloud className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-slate-200">
                Drop documents here or <span className="text-indigo-400 underline">browse</span>
              </p>
              <p className="text-[10px] text-slate-500">PDF, Markdown, TXT, CSV, Code</p>
            </div>
          )}
        </div>

        {/* Instant Demo Button */}
        {documents.length === 0 && !isProcessing && (
          <button
            onClick={handleLoadSample}
            className="w-full mt-2 text-xs flex items-center justify-center space-x-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 py-1.5 rounded-lg transition-colors font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Load Sample Research Paper</span>
          </button>
        )}

        {processError && (
          <div className="mt-2 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg flex items-start space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{processError}</span>
          </div>
        )}
      </div>

      {/* Source Selection & Controls */}
      {documents.length > 0 && (
        <div className="px-3 py-1.5 flex items-center justify-between border-y border-slate-800/60 bg-slate-900/30 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => selectAllDocuments(selectedCount < documents.length)}
              className="flex items-center space-x-1 hover:text-slate-200"
            >
              {selectedCount === documents.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>Select All</span>
            </button>
          </div>
          <span className="text-[11px] text-indigo-400 font-medium">
            {selectedCount} of {documents.length} active
          </span>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {documents.length === 0 && !isProcessing && (
          <div className="text-center py-10 px-4 text-slate-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No documents uploaded yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">Upload a PDF or click the sample button above.</p>
          </div>
        )}

        {documents.map((doc) => {
          const isActive = activeDocId === doc.id;
          return (
            <div
              key={doc.id}
              onClick={() => setActiveDocId(doc.id)}
              className={`group flex items-start justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-950/40 border-indigo-500/40 shadow-sm'
                  : 'bg-slate-900/40 hover:bg-slate-900 border-slate-800/70 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDocumentSelection(doc.id);
                  }}
                  className="mt-0.5 text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  {doc.selected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </button>

                {/* Doc Icon & Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    {getDocIcon(doc.type)}
                    <span className="text-xs font-medium text-slate-200 truncate" title={doc.name}>
                      {doc.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-500">
                    <span>{doc.totalPages} {doc.totalPages === 1 ? 'page' : 'pages'}</span>
                    <span>•</span>
                    <span>{doc.chunks.length} chunks</span>
                    <span>•</span>
                    <span>{(doc.size / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeDocument(doc.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded"
                title="Remove Document"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
