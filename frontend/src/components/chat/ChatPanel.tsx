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
  } = useRagStore();

  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeDocs = documents.filter((d) => d.selected);
  const activeDocIds = activeDocs.map((d) => d.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isStreaming]);

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

      // If both indices returned zero matches, fall back to first available chunks from active docs
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
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden">
      {/* Top Banner / Stats */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>
            Querying <strong className="text-slate-200">{activeDocs.length}</strong> active{' '}
            {activeDocs.length === 1 ? 'source' : 'sources'}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-indigo-400 font-medium">Hybrid Search (BM25 + Dense) Active</span>
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

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {chatMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950 border border-slate-800/90 text-slate-200 shadow-sm'
                }`}
              >
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
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-400 flex items-center space-x-1 mr-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Verified Sources:</span>
                    </span>
                    {msg.citations.map((c, i) => (
                      <button
                        key={c.id || i}
                        onClick={() => handleCitationClick(c)}
                        className="inline-flex items-center space-x-1 text-[11px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md transition-all hover:scale-[1.02]"
                        title={`Click to view Page ${c.pageNumber} of "${c.docName}" with text highlight`}
                      >
                        <span className="font-semibold text-indigo-400">[{i + 1}]</span>
                        <span className="max-w-[120px] truncate">{c.docName}</span>
                        <span className="text-slate-500 font-mono">p.{c.pageNumber}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Suggestion Prompts if conversation is fresh */}
        {chatMessages.length <= 1 && documents.length > 0 && (
          <div className="pt-4 space-y-2">
            <p className="text-xs text-slate-500 font-medium flex items-center space-x-1">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Suggested questions for your sources:</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  className="text-xs text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-colors text-left"
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
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-end bg-slate-900 border border-slate-800 focus-within:border-indigo-500/80 rounded-xl px-3 py-2 transition-colors"
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
                ? `Ask questions across ${activeDocs.length} selected documents (Shift+Enter for newline)...`
                : 'Please select at least one document source on the left...'
            }
            disabled={isStreaming}
            className="flex-1 max-h-32 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none py-1"
          />

          <div className="flex items-center space-x-1.5 ml-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={() => {
                  abortControllerRef.current?.abort();
                }}
                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Stop generation"
              >
                <StopCircle className="w-5 h-5 animate-pulse" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputQuery.trim()}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg transition-colors shadow-sm disabled:cursor-not-allowed"
                title="Send query"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span>Grounding: 100% Document Citations Required</span>
          <span>Model: {byokConfig.model}</span>
        </div>
      </div>
    </div>
  );
};
