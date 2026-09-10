import React from 'react';
import {
  Sparkles,
  Settings,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Cpu,
  Layers,
} from 'lucide-react';
import { useRagStore } from '../../store/useRagStore';

export const Navbar: React.FC = () => {
  const {
    documents,
    byokConfig,
    setSettingsOpen,
    setStudioOpen,
    isStudioOpen,
    isPdfViewerOpen,
    setPdfViewerOpen,
    isSidebarOpen,
    toggleSidebar,
  } = useRagStore();

  const selectedCount = documents.filter((d) => d.selected).length;

  const providerNames: Record<string, string> = {
    gemini: 'Google Gemini',
    groq: 'Groq Cloud',
    openai: 'OpenAI',
    anthropic: 'Claude',
    custom: 'Custom / Agnes AI',
  };

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-20 select-none shadow-sm">
      {/* Left: Brand & Sidebar Toggle */}
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors"
          title={isSidebarOpen ? 'Collapse Sources Sidebar' : 'Expand Sources Sidebar'}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center">
                Ultra-RAG
              </h1>
              <span className="hidden sm:inline-flex items-center text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                ChatPDF + NotebookLM
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden md:block">
              Verifiable Citations • Hybrid BM25 & Dense • 100% BYOK Privacy
            </p>
          </div>
        </div>
      </div>

      {/* Right: Studio, Provider, Viewer, and Settings */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* RAG Engine Status Pill */}
        <div className="hidden lg:flex items-center space-x-1.5 text-[11px] bg-slate-900/60 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-400 font-mono">
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>Hybrid RRF:</span>
          <span className="text-emerald-400 font-medium">BM25 + Dense</span>
        </div>

        {/* Active Provider Badge */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center space-x-1.5 text-xs bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg transition-all shadow-sm"
          title="Click to configure API keys and models"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              byokConfig.apiKey || byokConfig.provider === 'custom'
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <Cpu className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <span className="font-medium hidden md:inline">{providerNames[byokConfig.provider] || 'BYOK'}</span>
          <span className="text-indigo-300 font-mono text-[10px] bg-indigo-950/60 px-1 py-0.5 rounded border border-indigo-800/40">
            {byokConfig.model || 'Default'}
          </span>
        </button>

        {/* Studio Button */}
        <button
          onClick={() => setStudioOpen(!isStudioOpen)}
          className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            isStudioOpen
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 ring-1 ring-white/20'
              : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Studio</span>
          {selectedCount > 0 && (
            <span className="bg-purple-900/80 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {selectedCount}
            </span>
          )}
        </button>

        {/* Viewer Toggle */}
        {documents.length > 0 && (
          <button
            onClick={() => setPdfViewerOpen(!isPdfViewerOpen)}
            className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${
              isPdfViewerOpen
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
            title="Toggle Document Viewer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Viewer</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors shadow-sm"
          title="Settings & BYOK Keys"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
