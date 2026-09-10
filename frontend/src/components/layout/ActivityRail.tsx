import React from 'react';
import {
  Plus,
  Files,
  Clock,
  Bell,
  PanelLeft,
  Sparkles,
} from 'lucide-react';
import { useRagStore } from '../../store/useRagStore';

export const ActivityRail: React.FC = () => {
  const { clearChat, isSidebarOpen, toggleSidebar, setStudioOpen } = useRagStore();

  return (
    <aside className="w-16 md:w-18 bg-[#090D16] border-r border-slate-800/80 flex flex-col items-center py-4 justify-between shrink-0 select-none z-20">
      {/* Top Action: New Chat */}
      <div className="flex flex-col items-center space-y-4 w-full px-2">
        <button
          onClick={clearChat}
          className="w-11 h-11 rounded-2xl bg-gradient-to-b from-indigo-500/20 to-indigo-600/30 hover:from-indigo-500/30 hover:to-indigo-600/50 border border-indigo-500/40 text-indigo-200 hover:text-white flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] group"
          title="Start a new chat session"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        <span className="text-[10px] text-slate-400 font-medium tracking-tight text-center">
          New Chat
        </span>

        <div className="w-8 h-px bg-slate-800/80 my-1" />

        {/* Documents */}
        <button
          onClick={toggleSidebar}
          className={`flex flex-col items-center justify-center space-y-1 p-2 rounded-xl transition-all group ${
            isSidebarOpen ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Toggle Documents sidebar"
        >
          <div className="p-1.5 rounded-lg group-hover:bg-slate-800 transition-colors">
            <Files className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-medium tracking-tight">Documents</span>
        </button>

        {/* Recent / History */}
        <button
          onClick={() => setStudioOpen(true)}
          className="flex flex-col items-center justify-center space-y-1 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl transition-all group"
          title="Studio & History"
        >
          <div className="p-1.5 rounded-lg group-hover:bg-slate-800 transition-colors">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-medium tracking-tight">Recent</span>
        </button>

        {/* Notifications / Studio Pulse */}
        <button
          onClick={() => setStudioOpen(true)}
          className="relative p-2 text-slate-400 hover:text-purple-300 rounded-xl hover:bg-slate-800/50 transition-all group"
          title="Studio audio & updates"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" />
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center space-y-3 w-full px-2">
        <button
          onClick={() => setStudioOpen(true)}
          className="p-2 rounded-xl text-purple-400 hover:text-purple-200 hover:bg-purple-950/40 border border-purple-800/30 transition-all"
          title="Open NotebookLM Studio"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          title="Toggle sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
