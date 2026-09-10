import { create } from 'zustand';
import type { ActiveCitation, BYOKConfig, ChatMessage, DocumentItem, StudioArtifact } from '../lib/rag/types';
import { BM25Index } from '../lib/rag/bm25';
import { VectorIndex } from '../lib/rag/vector';

const DEFAULT_BYOK: BYOKConfig = {
  provider: 'gemini',
  apiKey: '',
  customBaseUrl: '',
  model: 'gemini-2.0-flash',
  temperature: 0.3,
  topK: 6,
  useContextualRetrieval: true,
  useReranker: true,
  useBM25: true,
  useHybridSearch: true,
};

// Global search index instances
export const globalBM25 = new BM25Index();
export const globalVector = new VectorIndex();

interface RagState {
  documents: DocumentItem[];
  activeDocId: string | null;
  activeCitation: ActiveCitation | null;
  chatMessages: ChatMessage[];
  isStreaming: boolean;
  byokConfig: BYOKConfig;
  studioArtifacts: StudioArtifact[];
  activeStudioArtifact: StudioArtifact | null;
  isStudioOpen: boolean;
  isSettingsOpen: boolean;
  isPdfViewerOpen: boolean;
  isSidebarOpen: boolean;
  backendUrl: string;
  backendConnected: boolean;

  // Actions
  addDocument: (doc: DocumentItem) => Promise<void>;
  removeDocument: (id: string) => void;
  toggleDocumentSelection: (id: string) => void;
  selectAllDocuments: (select: boolean) => void;
  setActiveDocId: (id: string | null) => void;
  setActiveCitation: (citation: ActiveCitation | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastChatMessage: (content: string, isStreaming?: boolean, citations?: any[]) => void;
  clearChat: () => void;
  updateBYOKConfig: (partial: Partial<BYOKConfig>) => void;
  addStudioArtifact: (art: StudioArtifact) => void;
  setActiveStudioArtifact: (art: StudioArtifact | null) => void;
  setStudioOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setPdfViewerOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setBackendConnected: (connected: boolean) => void;
  setBackendUrl: (url: string) => void;
}

const STORAGE_KEY_BYOK = 'ultra_rag_byok_config';

function loadStoredBYOK(): BYOKConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BYOK);
    if (saved) {
      const parsed = JSON.parse(saved);
      const provider = parsed.provider || 'gemini';
      const providerKeys = parsed.providerKeys || {};
      const providerModels = parsed.providerModels || {};
      const apiKey = parsed.apiKey || providerKeys[provider] || '';
      const model = parsed.model || providerModels[provider] || 'gemini-2.0-flash';

      return {
        ...DEFAULT_BYOK,
        ...parsed,
        provider,
        apiKey,
        model,
        providerKeys: { ...providerKeys, [provider]: apiKey },
        providerModels: { ...providerModels, [provider]: model },
      };
    }
  } catch {}
  return DEFAULT_BYOK;
}

export const useRagStore = create<RagState>((set, get) => ({
  documents: [],
  activeDocId: null,
  activeCitation: null,
  chatMessages: [
    {
      id: 'welcome_msg',
      role: 'assistant',
      content: `### Welcome to **Ultra-RAG** 🚀
Your personal, privacy-first document intelligence platform combining the exact-citation verification of **ChatPDF** with the multi-source synthesis of **NotebookLM**.

**Get Started:**
1. Click **Settings** (⚙️ top right) to select your preferred model (supports **Google Gemini** free tier, **Groq**, **OpenAI**, **Claude**, or custom endpoints like **Agnes AI / Ollama**).
2. Upload one or multiple documents (**PDF, TXT, Markdown, CSV, Code**).
3. Ask questions with cross-document synthesis, click citations to preview exact pages, or open the **Studio** to generate podcasts and study guides!`,
      timestamp: Date.now(),
    },
  ],
  isStreaming: false,
  byokConfig: loadStoredBYOK(),
  studioArtifacts: [],
  activeStudioArtifact: null,
  isStudioOpen: false,
  isSettingsOpen: false,
  isPdfViewerOpen: false,
  isSidebarOpen: true,
  backendUrl: 'http://localhost:8000',
  backendConnected: false,

  addDocument: async (doc) => {
    // Index in BM25 & Vector store
    globalBM25.indexChunks(doc.chunks);
    await globalVector.addChunks(doc.chunks, get().byokConfig);

    set((state) => ({
      documents: [...state.documents, doc],
      activeDocId: state.activeDocId || doc.id,
      isPdfViewerOpen: true,
    }));
  },

  removeDocument: (id) => {
    globalBM25.removeDocuments([id]);
    globalVector.removeDocuments([id]);

    set((state) => {
      const remaining = state.documents.filter((d) => d.id !== id);
      const nextActiveId = state.activeDocId === id ? (remaining[0]?.id || null) : state.activeDocId;
      return {
        documents: remaining,
        activeDocId: nextActiveId,
        isPdfViewerOpen: remaining.length > 0,
      };
    });
  },

  toggleDocumentSelection: (id) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, selected: !d.selected } : d
      ),
    }));
  },

  selectAllDocuments: (select) => {
    set((state) => ({
      documents: state.documents.map((d) => ({ ...d, selected: select })),
    }));
  },

  setActiveDocId: (id) => set({ activeDocId: id, isPdfViewerOpen: !!id }),

  setActiveCitation: (citation) => {
    set((state) => ({
      activeCitation: citation,
      activeDocId: citation?.docId || state.activeDocId,
      isPdfViewerOpen: true,
    }));
  },

  addChatMessage: (msg) => {
    set((state) => ({
      chatMessages: [...state.chatMessages, msg],
    }));
  },

  updateLastChatMessage: (content, isStreaming, citations) => {
    set((state) => {
      const msgs = [...state.chatMessages];
      if (msgs.length === 0) return state;
      const last = { ...msgs[msgs.length - 1] };
      last.content = content;
      if (isStreaming !== undefined) last.isStreaming = isStreaming;
      if (citations !== undefined) last.citations = citations;
      msgs[msgs.length - 1] = last;
      return { chatMessages: msgs, isStreaming: isStreaming ?? state.isStreaming };
    });
  },

  clearChat: () => {
    set({
      chatMessages: [],
    });
  },

  updateBYOKConfig: (partial) => {
    set((state) => {
      const updated = { ...state.byokConfig, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY_BYOK, JSON.stringify(updated));
      } catch {}
      return { byokConfig: updated };
    });
  },

  addStudioArtifact: (art) => {
    set((state) => ({
      studioArtifacts: [art, ...state.studioArtifacts],
      activeStudioArtifact: art,
      isStudioOpen: true,
    }));
  },

  setActiveStudioArtifact: (art) => set({ activeStudioArtifact: art, isStudioOpen: !!art }),
  setStudioOpen: (open) => set({ isStudioOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setPdfViewerOpen: (open) => set({ isPdfViewerOpen: open }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setBackendConnected: (connected) => set({ backendConnected: connected }),
  setBackendUrl: (url) => set({ backendUrl: url }),
}));
