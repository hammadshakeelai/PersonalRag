import React from 'react';
import { Sparkles, Settings, FileText } from 'lucide-react';
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
  } = useRagStore();

  const selectedCount = documents.filter((d) => d.selected).length;

  const providerNames: Record<string, string> = {
    gemini: 'Google Gemini',
    groq: 'Groq (Ultra-Fast)',
    openai: 'OpenAI',
    anthropic: 'Claude',
    custom: 'Custom / Agnes AI',
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-20 select-none">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold tracking-tight text-white">Ultra-RAG</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
              ChatPDF + NotebookLM
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Verifiable Citations • Hybrid BM25 & Dense • BYOK Privacy
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Active Provider Badge */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center space-x-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg transition-colors"
          title="Click to configure API keys and models"
        >
          <span className={`w-2 h-2 rounded-full ${byokConfig.apiKey || byokConfig.provider === 'custom' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-medium hidden md:inline">{providerNames[byokConfig.provider] || 'BYOK'}</span>
          <span className="text-slate-500 text-[11px]">({byokConfig.model || 'Default'})</span>
        </button>

        {/* Studio Button */}
        <button
          onClick={() => setStudioOpen(!isStudioOpen)}
          className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            isStudioOpen
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
              : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Studio</span>
          {selectedCount > 0 && (
            <span className="bg-purple-900/60 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {selectedCount}
            </span>
          )}
        </button>

        {/* Viewer Toggle */}
        {documents.length > 0 && (
          <button
            onClick={() => setPdfViewerOpen(!isPdfViewerOpen)}
            className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              isPdfViewerOpen
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
            title="Toggle Document Viewer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Viewer</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          title="Settings & BYOK Keys"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
