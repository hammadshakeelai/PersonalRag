import React from 'react';
import { Navbar } from './components/layout/Navbar';
import { ActivityRail } from './components/layout/ActivityRail';
import { SourceManager } from './components/sources/SourceManager';
import { ChatPanel } from './components/chat/ChatPanel';
import { PdfViewer } from './components/viewer/PdfViewer';
import { StudioPanel } from './components/studio/StudioPanel';
import { SettingsModal } from './components/settings/SettingsModal';

export const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0A0E17] text-slate-100 antialiased font-sans">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Work Area: Left Activity Rail + 3 Main Panels */}
      <main className="flex-1 flex overflow-hidden relative bg-[#0A0E17]">
        {/* Far-Left Activity Rail */}
        <ActivityRail />

        {/* Left Pane: Notebook Sources */}
        <SourceManager />

        {/* Center Pane: Chat & Hybrid Retrieval */}
        <ChatPanel />

        {/* Right Pane: In-Browser PDF with Real Canvas & Citations */}
        <PdfViewer />
      </main>

      {/* Modals & Drawers */}
      <StudioPanel />
      <SettingsModal />
    </div>
  );
};

export default App;
