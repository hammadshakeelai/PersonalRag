import React from 'react';
import {
  Sparkles,
  Cpu,
} from 'lucide-react';
import { useRagStore } from '../../store/useRagStore';

export const Navbar: React.FC = () => {
  const {
    byokConfig,
    setSettingsOpen,
    setStudioOpen,
    isStudioOpen,
    isSidebarOpen,
    toggleSidebar,
  } = useRagStore();

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-20 select-none shadow-sm">
      {/* Left: Brand */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)] ring-1 ring-white/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white flex items-center">
            Ultra-RAG
          </span>
        </div>
      </div>

      {/* Center: Navigation Pill Tabs (Mockup Style) */}
      <nav className="hidden sm:flex items-center space-x-1 bg-slate-900/70 border border-slate-800/80 p-1 rounded-full shadow-inner">
        <button
          onClick={() => toggleSidebar()}
          className="px-3.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-full transition-colors"
        >
          Projects
        </button>
        <button
          onClick={() => toggleSidebar()}
          className={`px-3.5 py-1 text-xs font-medium rounded-full transition-colors ${
            isSidebarOpen ? 'text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Documents
        </button>
        <button
          className="px-4 py-1 text-xs font-semibold bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 rounded-full shadow-sm"
        >
          Chat
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="px-3.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-full transition-colors"
        >
          Settings
        </button>
      </nav>

      {/* Right: Actions, Studio, Provider, and Profile Avatar */}
      <div className="flex items-center space-x-2.5">
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
          <span className="text-indigo-300 font-mono text-[11px] bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
            {byokConfig.model || 'Default'}
          </span>
        </button>

        {/* Studio Button */}
        <button
          onClick={() => setStudioOpen(!isStudioOpen)}
          className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
            isStudioOpen
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 ring-1 ring-white/20'
              : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30'
          }`}
          title="Audio Podcast & Synthesis Studio"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">Studio</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setStudioOpen(true)}
          className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          title="Updates & Alerts"
        >
          <div className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse" />
          <span className="sr-only">Notifications</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* User Profile Avatar */}
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 p-0.5 cursor-pointer shadow-sm">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-[11px] font-bold text-sky-200">
              U
            </div>
          </div>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
        </div>
      </div>
    </header>
  );
};
