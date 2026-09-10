import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  FileText,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useRagStore } from '../../store/useRagStore';

export const PdfViewer: React.FC = () => {
  const {
    documents,
    activeDocId,
    activeCitation,
    isPdfViewerOpen,
    setPdfViewerOpen,
    setActiveDocId,
  } = useRagStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0];

  // Whenever active citation changes, jump to that page
  useEffect(() => {
    if (activeCitation) {
      if (activeCitation.docId !== activeDocId) {
        setActiveDocId(activeCitation.docId);
      }
      setCurrentPage(activeCitation.pageNumber);
    }
  }, [activeCitation]);

  // If activeDoc changes, reset page if out of bounds
  useEffect(() => {
    if (activeDoc && currentPage > activeDoc.totalPages) {
      setCurrentPage(1);
    }
  }, [activeDocId]);

  if (!isPdfViewerOpen || !activeDoc) {
    return null;
  }

  const currentPageData = activeDoc.pages.find((p) => p.pageNumber === currentPage) || activeDoc.pages[0];

  // Highlight active citation text if present
  const renderHighlightedContent = (text: string) => {
    if (!activeCitation || activeCitation.docId !== activeDoc.id || activeCitation.pageNumber !== currentPage) {
      return text;
    }

    // Attempt to match quote fragment
    const cleanQuote = activeCitation.quote.replace(/\.\.\.$/, '').trim();
    if (!cleanQuote || cleanQuote.length < 5) return text;

    const words = cleanQuote.split(/\s+/).slice(0, 10).join(' ');
    const lowerText = text.toLowerCase();
    const lowerWords = words.toLowerCase();
    const matchIdx = lowerText.indexOf(lowerWords);

    if (matchIdx !== -1) {
      const before = text.slice(0, matchIdx);
      const highlighted = text.slice(matchIdx, matchIdx + words.length);
      const after = text.slice(matchIdx + words.length);

      return (
        <>
          {before}
          <mark className="citation-highlight rounded px-1 text-slate-900 font-medium">
            {highlighted}
          </mark>
          {after}
        </>
      );
    }

    return text;
  };

  return (
    <div
      className={`border-l border-slate-800 bg-slate-950 flex flex-col h-full transition-all select-text ${
        isExpanded ? 'fixed inset-0 z-50 w-full' : 'w-80 md:w-96 lg:w-[460px] shrink-0'
      }`}
    >
      {/* Top Controls Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 select-none">
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate" title={activeDoc.name}>
            {activeDoc.name}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse view' : 'Maximize viewer'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setPdfViewerOpen(false)}
            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
            title="Close viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Page Navigation & Zoom Toolbar */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between text-xs select-none">
        {/* Page Nav */}
        <div className="flex items-center space-x-1.5">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30 rounded transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-slate-300 font-mono text-[11px]">
            Page <strong className="text-white">{currentPage}</strong> of {activeDoc.totalPages}
          </span>

          <button
            disabled={currentPage >= activeDoc.totalPages}
            onClick={() => setCurrentPage((p) => Math.min(activeDoc.totalPages, p + 1))}
            className="p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30 rounded transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center space-x-1 text-slate-400">
          <button
            onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
            className="p-1 hover:text-white hover:bg-slate-800 rounded"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
            className="p-1 hover:text-white hover:bg-slate-800 rounded"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Citation Notification Banner */}
      {activeCitation && activeCitation.docId === activeDoc.id && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-300 select-none">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Viewing cited excerpt on <strong>Page {activeCitation.pageNumber}</strong></span>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded font-mono">
            Verified
          </span>
        </div>
      )}

      {/* Page Canvas / Content Viewer */}
      <div
        ref={pageContainerRef}
        className="flex-1 overflow-y-auto p-5 bg-slate-950 font-serif leading-relaxed text-slate-300"
        style={{ fontSize: `${(zoomLevel / 100) * 14}px` }}
      >
        <div className="max-w-prose mx-auto bg-slate-900/50 p-6 rounded-xl border border-slate-800 shadow-xl min-h-[500px]">
          <div className="text-[11px] font-mono text-slate-500 mb-4 pb-2 border-b border-slate-800 select-none flex justify-between">
            <span>{activeDoc.name}</span>
            <span>Page {currentPage} of {activeDoc.totalPages}</span>
          </div>

          <div className="whitespace-pre-wrap leading-relaxed text-slate-200 font-sans text-sm">
            {currentPageData ? (
              renderHighlightedContent(currentPageData.text)
            ) : (
              <span className="text-slate-500 italic">No text content found for this page.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
