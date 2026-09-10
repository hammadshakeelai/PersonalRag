import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  User,
  ExternalLink,
  Trash2,
  HelpCircle,
  StopCircle,
  Copy,
  Check,
  Key,
  Quote,
  Send,
  ThumbsUp,
  ThumbsDown,
  Share2,
} from 'lucide-react';
import { marked } from 'marked';
import { sanitizeHtml } from '../../lib/security/sanitize';
import { useRagStore, globalBM25, globalVector } from '../../store/useRagStore';
import { streamRAGResponse } from '../../lib/llm/client';
import { reciprocalRankFusion } from '../../lib/rag/rrf';
import { rerankChunks } from '../../lib/rag/reranker';
import type { Citation } from '../../lib/rag/types';

export const ChatPanel: React.FC = () => {
  const {
    documents,
    chatMessages,
    isStreaming,
    byokConfig,
    backendUrl,
    backendConnected,
    addChatMessage,
    updateLastChatMessage,
    clearChat,
    setActiveDocId,
    setActiveCitation,
    setPdfViewerOpen,
    setSettingsOpen,
    setStudioOpen,
  } = useRagStore();

  const [inputQuery, setInputQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, number>>({});
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

  const handleToggleLike = (id: string) => {
    setLikedMap((prev) => ({
      ...prev,
      [id]: prev[id] ? 0 : 1,
    }));
  };

  const handleSendMessage = async (customQuery?: string) => {
    const q = (customQuery || inputQuery).trim();
    if (!q || isStreaming) return;

    if (activeDocs.length === 0) {
      alert('Please select at least one document from the Sources panel on the left.');
      return;
    }

    setInputQuery('');

    // User Message
    addChatMessage({
      id: 'msg_user_' + Date.now(),
      role: 'user',
      content: q,
      timestamp: Date.now(),
    });

    // Assistant placeholder
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
        finalChunks = await rerankChunks(q, combined, byokConfig.topK, backendConnected ? backendUrl : undefined);
      } else {
        finalChunks = combined.slice(0, byokConfig.topK);
      }

      const retrievedChunks = finalChunks.map((f) => f.chunk);

      // 4. Stream LLM Response or Fallback Preview
      let accumulatedContent = '';
      let assignedCitations: Citation[] = [];

      const hasKey = byokConfig.apiKey?.trim() || byokConfig.provider === 'custom';
      if (!hasKey) {
        // High-Quality Client-Side In-Browser Hybrid Preview
        const previewCitations: Citation[] = retrievedChunks.slice(0, 4).map((c, i) => ({
          id: `cite_${i + 1}`,
          docId: c.docId,
          docName: c.docName,
          pageNumber: c.pageNumber,
          quote: c.content.slice(0, 160) + '...',
          relevanceScore: 0.95 - i * 0.05,
        }));

        const previewResponse = `### 💡 In-Browser Hybrid Search Preview (Zero API Key)
*(To enable live multi-document LLM generation, add your free Google Gemini or Groq key in **Settings** ⚙️)*

We executed in-browser hybrid search (BM25 lexical + dense cosine fusion) across **${activeDocs.length} active documents** and retrieved the highest-ranking passages for your query:

${retrievedChunks.slice(0, 3).map((c, i) => `#### Evidence Passage ${i + 1} [${c.docName}, p. ${c.pageNumber}]
> "${c.content.slice(0, 240)}..."`).join('\n\n')}

👉 **Tip:** Click any citation badge above or in the cards below to jump straight to the exact highlighted sentence on the visual PDF canvas!`;

        updateLastChatMessage(previewResponse, false, previewCitations);
        return;
      }

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

  const handleMessageClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-cite-page]');
    if (target) {
      e.stopPropagation();
      const docName = target.getAttribute('data-cite-doc');
      const pageStr = target.getAttribute('data-cite-page');
      const pageNum = pageStr ? parseInt(pageStr, 10) : 1;

      const doc = documents.find(
        (d) =>
          d.name.toLowerCase().includes((docName || '').toLowerCase()) ||
          (docName || '').toLowerCase().includes(d.name.toLowerCase())
      ) || documents[0];

      if (doc) {
        setActiveDocId(doc.id);
        setActiveCitation({
          docId: doc.id,
          pageNumber: pageNum,
          quote: `Citation reference from ${doc.name}`,
        });
        setPdfViewerOpen(true);
      }
    }
  };

  const renderMarkdown = (content: string) => {
    try {
      // Style citation mentions like [Doc 1, p. 14] into clickable badges with data attributes
      const styledContent = content.replace(
        /\[([^\]]+),\s*p\.\s*(\d+)\]/g,
        '<span role="button" tabindex="0" data-cite-doc="$1" data-cite-page="$2" class="citation-badge inline-flex items-center space-x-1 text-sky-400 bg-sky-950/80 border border-sky-800/80 px-1.5 py-0.2 rounded text-[11px] font-mono cursor-pointer hover:bg-sky-900/80 transition-colors">[$1, p.$2]</span>'
      );
      const parsed = marked.parse(styledContent) as string;
      return { __html: sanitizeHtml(parsed) };
    } catch {
      return { __html: sanitizeHtml(content) };
    }
  };

  const samplePrompts = [
    'What are the key performance indicators mentioned in the report?',
    'Summarize key insights across all selected sources',
    'Explain the mathematical formulation of RRF',
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F17] overflow-hidden relative select-text">
      {/* Top Header: AI Chat (Mockup Style) */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-sm flex items-center justify-between text-xs text-slate-300 select-none">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-bold text-white tracking-tight">AI Chat</h2>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            ({activeDocs.length} active sources)
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setStudioOpen(true)}
            className="w-7 h-7 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 flex items-center justify-center transition-colors shadow-sm"
            title="Open Audio Studio"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {chatMessages.length > 1 && (
            <button
              onClick={clearChat}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/60 transition-colors"
              title="Clear Chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
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

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {chatMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 group ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Assistant Avatar */}
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`relative max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 text-sm leading-relaxed transition-all ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-[#111624]/90 border border-slate-800/80 text-slate-200 shadow-xl'
                }`}
              >
                {/* Assistant Sub-header with Streaming Status */}
                {!isUser && (
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 select-none">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-purple-300">
                      <span>{msg.isStreaming ? 'AI streaming' : 'AI Response'}</span>
                      {msg.isStreaming && (
                        <span className="flex space-x-1 items-center">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-150" />
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-300" />
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Message Markdown Body with Event-Delegated Citations */}
                <div
                  onClick={handleMessageClick}
                  className="prose-custom break-words leading-relaxed"
                  dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                />

                {/* Streaming Indicator */}
                {msg.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse align-middle" />
                )}

                {/* Ground Truth Citation Cards */}
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
                          data-cite-page={c.pageNumber}
                          data-cite-doc={c.docName}
                          title={`Citation: ${c.docName} p.${c.pageNumber}`}
                          className="citation-badge flex items-start space-x-2 text-left p-2 rounded-xl bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800/80 hover:border-indigo-500/40 transition-all group/cite"
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

                {/* Message Action Footer (Mockup Style) */}
                {!isUser && (
                  <div className="mt-3 pt-2 flex items-center space-x-3 text-slate-400 text-xs border-t border-slate-800/40 select-none">
                    <button
                      onClick={() => handleToggleLike(msg.id)}
                      className="flex items-center space-x-1 hover:text-white transition-colors"
                      title="Helpful"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{likedMap[msg.id] ? 1 : 0}</span>
                    </button>
                    <button
                      className="hover:text-white transition-colors"
                      title="Not helpful"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="hover:text-white transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      className="hover:text-white transition-colors"
                      title="Share response"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5 shadow-sm">
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

      {/* Glowing Bottom Prompt Bar (Mockup Style) */}
      <div className="p-3 sm:p-4 bg-[#0B0F17] border-t border-slate-800/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center bg-[#0F1422] border border-sky-500/50 shadow-[0_0_15px_rgba(56,189,248,0.15)] rounded-2xl px-4 py-2.5 transition-all"
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
            placeholder="Provide your prompt..."
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none py-1"
          />

          <div className="flex items-center space-x-2 ml-2 select-none">
            {isStreaming ? (
              <button
                type="button"
                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                title="Generating..."
              >
                <StopCircle className="w-5 h-5 animate-pulse" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputQuery.trim() || activeDocs.length === 0}
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-md shadow-indigo-500/30 disabled:cursor-not-allowed shrink-0"
                title="Send query (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1 select-none">
          <span>Press ↵ to send • Shift+↵ for new line</span>
          <span className="font-mono text-[10px]">Active Model: {byokConfig.model}</span>
        </div>
      </div>
    </div>
  );
};
