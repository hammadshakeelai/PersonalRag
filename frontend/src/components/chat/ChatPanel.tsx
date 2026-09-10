import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  User,
  ExternalLink,
  Trash2,
  HelpCircle,
  FileCheck2,
  StopCircle,
  CornerDownLeft,
  Copy,
  Check,
  Key,
  Quote,
} from 'lucide-react';
import { marked } from 'marked';
import { useRagStore, globalBM25, globalVector } from '../../store/useRagStore';
import { streamRAGResponse } from '../../lib/llm/client';
import { reciprocalRankFusion } from '../../lib/rag/rrf';
import { rerankChunks } from '../../lib/rag/reranker';
import type { ChatMessage, Citation } from '../../lib/rag/types';

export const ChatPanel: React.FC = () => {
  const {
    documents,
    chatMessages,
    isStreaming,
    byokConfig,
    backendUrl,
    addChatMessage,
    updateLastChatMessage,
    clearChat,
    setActiveCitation,
    setPdfViewerOpen,
    setSettingsOpen,
  } = useRagStore();

  const [inputQuery, setInputQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeDocs = documents.filter((d) => d.selected);
  const activeDocIds = activeDocs.map((d) => d.id);
  const hasApiKey = Boolean(byokConfig.apiKey || byokConfig.provider === 'custom');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isStreaming]);

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isStreaming) return;

    setInputQuery('');

    // Add user message
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);

    // If no active documents, inform user
    if (activeDocIds.length === 0) {
      addChatMessage({
        id: 'msg_assistant_' + Date.now(),
        role: 'assistant',
        content: '⚠️ **No document sources are selected.** Please upload or check at least one document in the Sources panel on the left to ask grounded questions.',
        timestamp: Date.now(),
      });
      return;
    }

    // Check API Key
    if (!hasApiKey) {
      addChatMessage({
        id: 'msg_assistant_' + Date.now(),
        role: 'assistant',
        content: `⚠️ **API Key Required:** Please configure your **${byokConfig.provider.toUpperCase()}** API key in the Settings modal (top right) to start generating responses.\n\n*Tip: Google Gemini and Groq offer generous 100% free tiers!*`,
        timestamp: Date.now(),
      });
      return;
    }

    // Prepare assistant placeholder
    const assistantId = 'msg_assistant_' + Date.now();
    addChatMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    });

    try {
      // 1. Dual-Index Retrieval (BM25 + Dense)
      const bm25Matches = byokConfig.useBM25
        ? globalBM25.search(q, activeDocIds, 20)
        : [];

      const denseMatches = byokConfig.useHybridSearch
        ? await globalVector.search(q, activeDocIds, 20, byokConfig)
        : [];

      // 2. Reciprocal Rank Fusion (RRF)
      let combined = reciprocalRankFusion(
        denseMatches,
        bm25Matches,
        60,
        byokConfig.topK * 2
      );

      // Fallback chunks if search returned 0
      if (combined.length === 0) {
        const fallbackChunks = activeDocs.flatMap((d) => d.chunks.slice(0, 3));
        combined = fallbackChunks.map((c) => ({ chunk: c, score: 0.1 }));
      }

      // 3. Reranker
      let finalChunks = combined;
      if (byokConfig.useReranker) {
        finalChunks = await rerankChunks(q, combined, byokConfig.topK, backendUrl);
      } else {
        finalChunks = combined.slice(0, byokConfig.topK);
      }

      const retrievedChunks = finalChunks.map((f) => f.chunk);

      // 4. Stream LLM Response
      let accumulatedContent = '';
      let assignedCitations: Citation[] = [];

      await streamRAGResponse(
        q,
        retrievedChunks,
        byokConfig,
        chatMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        {
          onChunk: (chunk) => {
            accumulatedContent += chunk;
            updateLastChatMessage(accumulatedContent, true);
          },
          onCitations: (cites) => {
            assignedCitations = cites;
          },
          onError: (err) => {
            updateLastChatMessage(
              accumulatedContent + `\n\n❌ **Error:** ${err.message}`,
              false,
              assignedCitations
            );
          },
          onFinish: (full) => {
            updateLastChatMessage(full, false, assignedCitations);
          },
        }
      );
    } catch (err: any) {
      updateLastChatMessage(`❌ **Failed to retrieve or generate response:** ${err.message}`, false);
    }
  };

  const handleCitationClick = (citation: Citation) => {
    setActiveCitation({
      docId: citation.docId,
      pageNumber: citation.pageNumber,
      quote: citation.quote,
    });
    setPdfViewerOpen(true);
  };

  const renderMarkdown = (content: string) => {
    try {
      return { __html: marked.parse(content) as string };
    } catch {
      return { __html: content };
    }
  };

  const samplePrompts = [
    'Summarize key insights across all selected sources',
    'What are the retrieval failure rates mentioned?',
    'Explain the mathematical formulation of RRF',
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/50 overflow-hidden relative">
      {/* Top Banner / Stats */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-sm flex items-center justify-between text-xs text-slate-400 select-none">
        <div className="flex items-center space-x-2">
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>
            Searching in <strong className="text-slate-200">{activeDocs.length}</strong> active{' '}
            {activeDocs.length === 1 ? 'source' : 'sources'}
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-indigo-400 font-medium hidden sm:inline">Hybrid BM25 + Dense RRF</span>
        </div>

        {chatMessages.length > 1 && (
          <button
            onClick={clearChat}
            className="flex items-center space-x-1 text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        )}
      </div>

      {/* Missing API Key Warning Bar */}
      {!hasApiKey && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-amber-400 shrink-0" />
            <span>No API key added. Enter your free Gemini or Groq key to chat.</span>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold px-2.5 py-1 rounded-lg transition-colors"
          >
            Configure Key →
          </button>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {chatMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 group ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-indigo-600/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`relative max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 text-sm leading-relaxed transition-all ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-950/90 border border-slate-800/90 text-slate-200 shadow-sm'
                }`}
              >
                {/* Copy message button */}
                <button
                  onClick={() => handleCopyMessage(msg.id, msg.content)}
                  className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-100 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all"
                  title="Copy message"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Message Body */}
                <div
                  className="prose-custom break-words"
                  dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                />

                {/* Streaming Indicator */}
                {msg.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
                )}

                {/* Inline Verifiable Citations */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5 mb-2 select-none">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Ground Truth Citations (Click to preview exact page):</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.citations.map((c, i) => (
                        <button
                          key={c.id || i}
                          onClick={() => handleCitationClick(c)}
                          className="flex items-start space-x-2 text-left p-2 rounded-xl bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800/80 hover:border-indigo-500/40 transition-all hover:scale-[1.01] group/cite"
                        >
                          <div className="w-5 h-5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-200">
                              <span className="truncate max-w-[140px]">{c.docName}</span>
                              <span className="font-mono text-indigo-400 text-[10px]">p.{c.pageNumber}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 italic flex items-start space-x-1">
                              <Quote className="w-2.5 h-2.5 shrink-0 opacity-40 mt-0.5" />
                              <span>{c.quote}</span>
                            </p>
                          </div>
                          <ExternalLink className="w-3 h-3 text-slate-500 group-hover/cite:text-indigo-400 shrink-0 mt-1 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Suggestion Prompts if conversation is fresh */}
        {chatMessages.length <= 1 && documents.length > 0 && (
          <div className="pt-4 space-y-2 select-none">
            <p className="text-xs text-slate-500 font-medium flex items-center space-x-1">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Suggested questions for your active sources:</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  className="text-xs text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800/80 hover:border-indigo-500/40 px-3 py-1.5 rounded-xl transition-all text-left shadow-sm hover:scale-[1.01]"
                >
                  {p} →
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-end bg-slate-900/90 border border-slate-800 focus-within:border-indigo-500/80 rounded-2xl px-3.5 py-2.5 transition-all shadow-md shadow-black/20"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              activeDocs.length > 0
                ? `Ask questions across ${activeDocs.length} selected documents...`
                : 'Please select at least one document on the left...'
            }
            disabled={isStreaming}
            className="flex-1 max-h-32 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none py-1"
          />

          <div className="flex items-center space-x-2 ml-2 select-none">
            {isStreaming ? (
              <button
                type="button"
                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                title="Generating response..."
              >
                <StopCircle className="w-5 h-5 animate-pulse" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputQuery.trim() || activeDocs.length === 0}
                className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-30 text-white rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:cursor-not-allowed"
                title="Send query (Enter)"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1 select-none">
          <span>Press ↵ to send • Shift+↵ for new line</span>
          <span className="font-mono text-[10px]">Model: {byokConfig.model}</span>
        </div>
      </div>
    </div>
  );
};
