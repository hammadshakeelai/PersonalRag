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

const STORAGE_KEY_BYOK = 'ultra_rag_byok_config';
const STORAGE_KEY_CHAT = 'ultra_rag_chat_history';
const STORAGE_KEY_STUDIO = 'ultra_rag_studio_artifacts';
const STORAGE_KEY_DOCS = 'ultra_rag_documents';

const DEFAULT_WELCOME_MSG: ChatMessage = {
  id: 'welcome_msg',
  role: 'assistant',
  content: `### Welcome to **Ultra-RAG** 🚀
Your personal, privacy-first document intelligence platform combining the exact-citation verification of **ChatPDF** with the multi-source synthesis of **NotebookLM**.

**Get Started:**
1. Click **Settings** (⚙️ top right) to select your preferred model (supports **Google Gemini** free tier, **Groq**, **OpenAI**, **Claude**, or custom endpoints like **Agnes AI / Ollama**).
2. Upload one or multiple documents (**PDF, TXT, Markdown, CSV, Code**).
3. Ask questions with cross-document synthesis, click citations to preview exact pages, or open the **Studio** to generate podcasts and study guides!`,
  timestamp: Date.now(),
};

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

function loadStoredChat(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CHAT);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [DEFAULT_WELCOME_MSG];
}

function loadStoredStudio(): StudioArtifact[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STUDIO);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function loadStoredDocs(): DocumentItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DOCS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Re-index loaded document chunks into global search indices
        for (const doc of parsed) {
          if (doc.chunks && doc.chunks.length > 0) {
            globalBM25.indexChunks(doc.chunks);
          }
        }
        return parsed;
      }
    }
  } catch {}
  return [];
}

function persistChat(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(messages));
  } catch {}
}

function persistStudio(artifacts: StudioArtifact[]) {
  try {
    localStorage.setItem(STORAGE_KEY_STUDIO, JSON.stringify(artifacts));
  } catch {}
}

function persistDocs(documents: DocumentItem[]) {
  try {
    // Strip large binary buffers before saving to localStorage to stay within quota
    const sanitized = documents.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      totalPages: d.totalPages,
      size: d.size,
      uploadedAt: d.uploadedAt,
      summary: d.summary,
      selected: d.selected,
      pages: d.pages,
      rawText: d.rawText,
      chunks: d.chunks,
    }));
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('Document localStorage persist error (quota exceeded):', err);
  }
}

const initialDocs = loadStoredDocs();

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
  removeSelectedDocuments: () => void;
  clearAllDocuments: () => void;
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

export const useRagStore = create<RagState>((set, get) => ({
  documents: initialDocs,
  activeDocId: initialDocs[0]?.id || null,
  activeCitation: null,
  chatMessages: loadStoredChat(),
  isStreaming: false,
  byokConfig: loadStoredBYOK(),
  studioArtifacts: loadStoredStudio(),
  activeStudioArtifact: null,
  isStudioOpen: false,
  isSettingsOpen: false,
  isPdfViewerOpen: initialDocs.length > 0,
  isSidebarOpen: true,
  backendUrl: 'http://localhost:8000',
  backendConnected: false,

  addDocument: async (doc) => {
    // Index in BM25 & Vector store
    globalBM25.indexChunks(doc.chunks);
    await globalVector.addChunks(doc.chunks, get().byokConfig);

    set((state) => {
      const updated = [...state.documents, doc];
      persistDocs(updated);
      return {
        documents: updated,
        activeDocId: state.activeDocId || doc.id,
        isPdfViewerOpen: true,
      };
    });
  },

  removeDocument: (id) => {
    globalBM25.removeDocuments([id]);
    globalVector.removeDocuments([id]);

    set((state) => {
      const remaining = state.documents.filter((d) => d.id !== id);
      persistDocs(remaining);
      const nextActiveId = state.activeDocId === id ? (remaining[0]?.id || null) : state.activeDocId;
      return {
        documents: remaining,
        activeDocId: nextActiveId,
        isPdfViewerOpen: remaining.length > 0,
      };
    });
  },

  removeSelectedDocuments: () => {
    set((state) => {
      const toRemove = state.documents.filter((d) => d.selected).map((d) => d.id);
      if (toRemove.length === 0) return state;

      globalBM25.removeDocuments(toRemove);
      globalVector.removeDocuments(toRemove);

      const remaining = state.documents.filter((d) => !d.selected);
      persistDocs(remaining);
      const nextActiveId = remaining[0]?.id || null;
      return {
        documents: remaining,
        activeDocId: nextActiveId,
        isPdfViewerOpen: remaining.length > 0,
      };
    });
  },

  clearAllDocuments: () => {
    set((state) => {
      const allIds = state.documents.map((d) => d.id);
      globalBM25.removeDocuments(allIds);
      globalVector.removeDocuments(allIds);
      persistDocs([]);
      return {
        documents: [],
        activeDocId: null,
        activeCitation: null,
        isPdfViewerOpen: false,
      };
    });
  },

  toggleDocumentSelection: (id) => {
    set((state) => {
      const updated = state.documents.map((d) =>
        d.id === id ? { ...d, selected: !d.selected } : d
      );
      persistDocs(updated);
      return { documents: updated };
    });
  },

  selectAllDocuments: (select) => {
    set((state) => {
      const updated = state.documents.map((d) => ({ ...d, selected: select }));
      persistDocs(updated);
      return { documents: updated };
    });
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
    set((state) => {
      const updated = [...state.chatMessages, msg];
      persistChat(updated);
      return { chatMessages: updated };
    });
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

      if (!isStreaming) {
        persistChat(msgs);
      }
      return { chatMessages: msgs, isStreaming: isStreaming ?? state.isStreaming };
    });
  },

  clearChat: () => {
    const cleared = [DEFAULT_WELCOME_MSG];
    persistChat(cleared);
    set({
      chatMessages: cleared,
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
    set((state) => {
      const updated = [art, ...state.studioArtifacts];
      persistStudio(updated);
      return {
        studioArtifacts: updated,
        activeStudioArtifact: art,
        isStudioOpen: true,
      };
    });
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
