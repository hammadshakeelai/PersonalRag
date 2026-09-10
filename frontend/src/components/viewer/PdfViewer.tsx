import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  FileText,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Printer,
  Quote,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useRagStore } from '../../store/useRagStore';

// Ensure PDF.js worker is properly configured
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export const PdfViewer: React.FC = () => {
  const {
    documents,
    activeDocId,
    activeCitation,
    isPdfViewerOpen,
    setPdfViewerOpen,
    setActiveDocId,
    setActiveCitation,
  } = useRagStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedPage, setCopiedPage] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'native' | 'text'>('canvas');
  const [isRendering, setIsRendering] = useState(false);
  const [showExcerptCard, setShowExcerptCard] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const currentDocIdRef = useRef<string | null>(null);

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0];

  // Whenever active citation changes, jump to page and show excerpt
  useEffect(() => {
    if (activeCitation) {
      if (activeCitation.docId !== activeDocId) {
        setActiveDocId(activeCitation.docId);
      }
      const targetPage = Math.max(1, Math.min(activeCitation.pageNumber, activeDoc?.totalPages || 1));
      setCurrentPage(targetPage);
      setShowExcerptCard(true);
    }
  }, [activeCitation, activeDoc?.totalPages]);

  // When activeDoc changes, reset page and clear cached pdfDoc if doc changed
  useEffect(() => {
    if (activeDoc) {
      if (currentPage > activeDoc.totalPages) {
        setCurrentPage(1);
      }
      if (currentDocIdRef.current !== activeDoc.id) {
        pdfDocRef.current = null;
        currentDocIdRef.current = activeDoc.id;
      }
    }
  }, [activeDocId]);

  // Load and render PDF page on canvas whenever activeDoc, currentPage, zoomLevel, or viewMode changes
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!activeDoc || viewMode !== 'canvas') return;

      const hasPdfSource = activeDoc.pdfData || activeDoc.pdfBlobUrl;
      if (!hasPdfSource) {
        // Not a PDF binary file, fall back to text view
        setViewMode('text');
        return;
      }

      try {
        setIsRendering(true);

        // 1. Load PDF Document if not already cached
        if (!pdfDocRef.current) {
          let loadingTask;
          if (activeDoc.pdfData) {
            loadingTask = pdfjsLib.getDocument({ data: activeDoc.pdfData });
          } else {
            loadingTask = pdfjsLib.getDocument({ url: activeDoc.pdfBlobUrl! });
          }
          pdfDocRef.current = await loadingTask.promise;
        }

        if (isCancelled) return;

        const pdfDoc = pdfDocRef.current;
        const page = await pdfDoc.getPage(currentPage);

        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 2. Calculate scaling to fit width nicely inside container
        const container = containerRef.current;
        const containerWidth = container ? Math.max(300, container.clientWidth - 48) : 600;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const fitScale = containerWidth / unscaledViewport.width;
        const scale = fitScale * (zoomLevel / 100);
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * dpr });

        // Cancel previous running render task
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        const renderContext: any = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        setIsRendering(false);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.warn('PDF Canvas render notice:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [activeDoc, currentPage, zoomLevel, viewMode]);

  if (!isPdfViewerOpen || !activeDoc) {
    return null;
  }

  const currentPageData = activeDoc.pages.find((p) => p.pageNumber === currentPage) || activeDoc.pages[0];
  const isPdf = activeDoc.type === 'pdf' && Boolean(activeDoc.pdfBlobUrl || activeDoc.pdfData);

  const handleCopyPageText = () => {
    if (!currentPageData) return;
    navigator.clipboard.writeText(currentPageData.text);
    setCopiedPage(true);
    setTimeout(() => setCopiedPage(false), 2000);
  };

  const handlePrint = () => {
    if (activeDoc.pdfBlobUrl) {
      const win = window.open(activeDoc.pdfBlobUrl, '_blank');
      win?.print();
    } else {
      window.print();
    }
  };

  return (
    <div
      className={`border-l border-slate-800/80 bg-[#0B0F17] flex flex-col h-full transition-all select-text z-30 shadow-2xl relative ${
        isExpanded ? 'fixed inset-0 z-50 w-full' : 'w-80 md:w-96 lg:w-[480px] xl:w-[580px] shrink-0'
      }`}
    >
      {/* Top Header: In-browser PDF (Mockup Style) */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 select-none">
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate" title={activeDoc.name}>
            {activeDoc.name}
          </span>
        </div>

        {/* Page Nav in Header */}
        <div className="flex items-center space-x-1 text-slate-300 font-mono text-xs mr-3">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-1">{currentPage}</span>
          <span className="text-slate-500">of</span>
          <span className="px-1">{activeDoc.totalPages}</span>
          <button
            disabled={currentPage >= activeDoc.totalPages}
            onClick={() => setCurrentPage((p) => Math.min(activeDoc.totalPages, p + 1))}
            className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Header Tools */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrint}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopyPageText}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Copy Page Text"
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

      {/* Secondary Controls Bar: Mode Switcher & Zoom */}
      <div className="px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between text-xs select-none">
        {/* Mode Switcher */}
        <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
          {isPdf && (
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'canvas' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Real PDF
            </button>
          )}
          {isPdf && activeDoc.pdfBlobUrl && (
            <button
              onClick={() => setViewMode('native')}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'native' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Browser
            </button>
          )}
          <button
            onClick={() => setViewMode('text')}
            className={`px-2 py-0.5 rounded transition-colors ${
              viewMode === 'text' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Text
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center space-x-1 text-slate-400">
          <button
            onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
            className="p-1 hover:text-white hover:bg-slate-800 rounded"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(180, z + 10))}
            className="p-1 hover:text-white hover:bg-slate-800 rounded"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Excerpt Popup Card (Mockup Style) */}
      {activeCitation && showExcerptCard && (
        <div className="absolute top-24 right-5 w-72 bg-slate-900/95 border-2 border-amber-400/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md z-40 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
              <Quote className="w-3.5 h-3.5 text-amber-400" />
              <span>Excerpt</span>
            </span>
            <button
              onClick={() => {
                setShowExcerptCard(false);
                setActiveCitation(null);
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded-lg"
              title="Close excerpt card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed italic line-clamp-4">
            "{activeCitation.quote}"
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold text-sky-300 bg-sky-950/80 border border-sky-800/80 px-2 py-0.5 rounded-full">
              [Doc, p. {activeCitation.pageNumber}]
            </span>
            <button
              onClick={() => {
                setCurrentPage(activeCitation.pageNumber);
              }}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              Open Citation
            </button>
          </div>
        </div>
      )}

      {/* PDF Content Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0B0F17] flex flex-col items-center relative"
      >
        {/* Mode 1: Real PDF Canvas */}
        {viewMode === 'canvas' && isPdf && (
          <div className="relative my-auto flex flex-col items-center">
            {/* The Real Printed White Paper Sheet */}
            <div className="relative bg-white shadow-[0_15px_40px_rgba(0,0,0,0.6)] rounded-sm ring-1 ring-slate-400/20 overflow-hidden transition-transform">
              <canvas ref={canvasRef} className="block max-w-full h-auto rounded-sm" />

              {/* Glowing Citation Highlight Box over the Real Page */}
              {activeCitation && activeCitation.pageNumber === currentPage && (
                <div
                  className="absolute inset-x-8 top-1/3 p-3 bg-amber-300/35 border-2 border-amber-400 rounded-md shadow-[0_0_25px_rgba(251,191,36,0.45)] animate-pulse pointer-events-none transition-all flex items-center justify-between"
                  style={{ minHeight: '60px' }}
                >
                  <span className="text-[10px] bg-amber-100 text-amber-950 font-bold px-2 py-0.5 rounded shadow-sm">
                    Verified Citation Match (p. {currentPage})
                  </span>
                </div>
              )}
            </div>

            {isRendering && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center rounded-sm">
                <span className="text-xs font-medium text-white bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-700 shadow-xl">
                  Rendering High-DPI Page...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Native Browser PDF Viewer */}
        {viewMode === 'native' && activeDoc.pdfBlobUrl && (
          <iframe
            src={`${activeDoc.pdfBlobUrl}#page=${currentPage}&view=FitH`}
            className="w-full h-full rounded-xl border border-slate-800 bg-white"
            title="Native PDF Viewer"
          />
        )}

        {/* Mode 3: Styled Paper Document (For Markdown/Text or Fallback) */}
        {(viewMode === 'text' || !isPdf) && (
          <div className="w-full max-w-2xl bg-white text-slate-900 p-8 sm:p-10 rounded-sm shadow-2xl ring-1 ring-slate-300 min-h-[600px] relative font-serif">
            <div className="text-[11px] font-mono text-slate-400 mb-6 pb-2 border-b border-slate-200 flex justify-between items-center select-none">
              <span className="font-semibold text-slate-700 truncate max-w-[250px]">{activeDoc.name}</span>
              <span>Page {currentPage} of {activeDoc.totalPages}</span>
            </div>

            <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800">
              {currentPageData?.text || 'No text content on this page.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
