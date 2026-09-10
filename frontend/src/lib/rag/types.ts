export type DocumentType = 'pdf' | 'txt' | 'md' | 'json' | 'csv' | 'code';

export interface PageData {
  pageNumber: number;
  text: string;
  markdown?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: DocumentType;
  totalPages: number;
  size: number;
  uploadedAt: number;
  summary?: string;
  selected: boolean;
  pages: PageData[];
  rawText: string;
  chunks: DocumentChunk[];
  pdfBlobUrl?: string;
  pdfData?: ArrayBuffer;
}

export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  pageNumber: number;
  content: string;
  parentContent?: string;
  contextHeader: string;
  tokenCount?: number;
  embedding?: number[];
}

export interface Citation {
  id: string;
  docId: string;
  docName: string;
  pageNumber: number;
  quote: string;
  relevanceScore: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  citations?: Citation[];
  queryDecompositions?: string[];
  isStreaming?: boolean;
}

export type LLMProvider = 'gemini' | 'groq' | 'openai' | 'anthropic' | 'custom';

export interface BYOKConfig {
  provider: LLMProvider;
  apiKey: string;
  customBaseUrl?: string;
  model: string;
  temperature: number;
  topK: number;
  useContextualRetrieval: boolean;
  useReranker: boolean;
  useBM25: boolean;
  useHybridSearch: boolean;
  providerKeys?: Record<string, string>;
  providerModels?: Record<string, string>;
}

export interface PodcastLine {
  speaker: string;
  text: string;
}

export interface StudioArtifact {
  id: string;
  type: 'podcast' | 'summary' | 'study_guide' | 'comparison';
  title: string;
  content: string;
  podcastDialogue?: PodcastLine[];
  createdAt: number;
}

export interface ActiveCitation {
  docId: string;
  pageNumber: number;
  quote: string;
}
