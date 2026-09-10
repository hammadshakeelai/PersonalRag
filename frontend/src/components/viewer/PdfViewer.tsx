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
  Search,
  Copy,
  Check,
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
  const [inDocSearch, setInDocSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [copiedPage, setCopiedPage] = useState(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0];

  // Whenever active citation changes, jump to that page & scroll to highlight
  useEffect(() => {
    if (activeCitation) {
      if (activeCitation.docId !== activeDocId) {
        setActiveDocId(activeCitation.docId);
      }
      setCurrentPage(activeCitation.pageNumber);

      setTimeout(() => {
        const mark = pageContainerRef.current?.querySelector('mark');
        if (mark) {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
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

  const handleCopyPageText = () => {
    if (!currentPageData) return;
    navigator.clipboard.writeText(currentPageData.text);
    setCopiedPage(true);
    setTimeout(() => setCopiedPage(false), 2000);
  };

  // Render text with both active citation highlighting and in-document search matches
  const renderFormattedText = (text: string) => {
    let contentNode: React.ReactNode = text;

    // 1. Citation highlight
    if (activeCitation && activeCitation.docId === activeDoc.id && activeCitation.pageNumber === currentPage) {
      const cleanQuote = activeCitation.quote.replace(/\.\.\.$/, '').trim();
      if (cleanQuote && cleanQuote.length >= 5) {
        const words = cleanQuote.split(/\s+/).slice(0, 12).join(' ');
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
              <mark className="citation-highlight rounded px-1.5 py-0.5 text-slate-950 font-medium inline-block my-0.5 animate-pulse">
                {highlighted}
              </mark>
              {after}
            </>
          );
        }
      }
    }

    // 2. In-document search highlight
    if (inDocSearch.trim() && text.toLowerCase().includes(inDocSearch.toLowerCase())) {
      const regex = new RegExp(`(${inDocSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      return (
        <>
          {parts.map((part, idx) =>
            part.toLowerCase() === inDocSearch.toLowerCase() ? (
              <mark key={idx} className="bg-sky-400/30 text-sky-200 border-b border-sky-400 px-0.5 rounded">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </>
      );
    }

    return contentNode;
  };

  return (
    <div
      className={`border-l border-slate-800/80 bg-slate-950 flex flex-col h-full transition-all select-text z-30 shadow-2xl ${
        isExpanded ? 'fixed inset-0 z-50 w-full' : 'w-80 md:w-96 lg:w-[480px] xl:w-[540px] shrink-0'
      }`}
    >
      {/* Top Header & Document Switcher */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 select-none">
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-slate-200 truncate block" title={activeDoc.name}>
              {activeDoc.name}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isSearchOpen ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Search inside document"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopyPageText}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Copy page text"
          >
            {copiedPage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Exit full screen' : 'Expand full screen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setPdfViewerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            title="Close viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-Doc Search Bar (Toggleable) */}
      {isSearchOpen && (
        <div className="p-2 border-b border-slate-800 bg-slate-900/80 flex items-center space-x-2">
          <Search className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
          <input
            type="text"
            value={inDocSearch}
            onChange={(e) => setInDocSearch(e.target.value)}
            placeholder="Search keywords on this page..."
            className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          {inDocSearch && (
            <button
              onClick={() => setInDocSearch('')}
              className="text-slate-400 hover:text-slate-200 text-xs px-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Page Navigation & Zoom Toolbar */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs select-none">
        {/* Page Nav */}
        <div className="flex items-center space-x-1.5">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30 rounded-lg transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1 text-slate-300 font-mono text-[11px]">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={activeDoc.totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= activeDoc.totalPages) setCurrentPage(val);
              }}
              className="w-10 bg-slate-800 border border-slate-700 rounded text-center py-0.5 text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            <span>of {activeDoc.totalPages}</span>
          </div>

          <button
            disabled={currentPage >= activeDoc.totalPages}
            onClick={() => setCurrentPage((p) => Math.min(activeDoc.totalPages, p + 1))}
            className="p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30 rounded-lg transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center space-x-1 text-slate-400">
          <button
            onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
            className="p-1 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(160, z + 10))}
            className="p-1 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Citation Notification Banner */}
      {activeCitation && activeCitation.docId === activeDoc.id && (
        <div className="bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border-b border-amber-500/30 px-3.5 py-2 flex items-center justify-between text-xs text-amber-300 select-none shadow-inner">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Viewing cited evidence on <strong>Page {activeCitation.pageNumber}</strong></span>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
            Verified Citation
          </span>
        </div>
      )}

      {/* Document Content Page Viewer */}
      <div
        ref={pageContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/70 font-sans leading-relaxed text-slate-300"
        style={{ fontSize: `${(zoomLevel / 100) * 14}px` }}
      >
        <div className="max-w-2xl mx-auto bg-slate-900/40 p-6 sm:p-8 rounded-2xl border border-slate-800/80 shadow-2xl min-h-[550px] relative backdrop-blur-sm">
          {/* Page Top Header Info */}
          <div className="text-[11px] font-mono text-slate-500 mb-5 pb-3 border-b border-slate-800/80 select-none flex justify-between items-center">
            <span className="truncate max-w-[200px]">{activeDoc.name}</span>
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-400">
              Page {currentPage} of {activeDoc.totalPages}
            </span>
          </div>

          {/* Page Body with Highlights */}
          <div className="whitespace-pre-wrap leading-relaxed text-slate-200 text-sm">
            {currentPageData ? (
              renderFormattedText(currentPageData.text)
            ) : (
              <span className="text-slate-500 italic">No text content found on this page.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
