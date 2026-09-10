import React from 'react';
import { Navbar } from './components/layout/Navbar';
import { SourceManager } from './components/sources/SourceManager';
import { ChatPanel } from './components/chat/ChatPanel';
import { PdfViewer } from './components/viewer/PdfViewer';
import { StudioPanel } from './components/studio/StudioPanel';
import { SettingsModal } from './components/settings/SettingsModal';

export const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased font-sans">
      {/* Top Navigation */}
      <Navbar />

      {/* Main 3-Pane Work Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Notebook Sources */}
        <SourceManager />

        {/* Center Pane: Chat & Hybrid Retrieval */}
        <ChatPanel />

        {/* Right Pane: Verifiable PDF Viewer with Citation Highlighting */}
        <PdfViewer />
      </main>

      {/* Modals & Drawers */}
      <StudioPanel />
      <SettingsModal />
    </div>
  );
};

export default App;
