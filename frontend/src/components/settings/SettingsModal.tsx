import React, { useState } from 'react';
import {
  Settings,
  X,
  Key,
  Sliders,
  Eye,
  EyeOff,
  Server,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useRagStore } from '../../store/useRagStore';
import type { LLMProvider } from '../../lib/rag/types';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setSettingsOpen,
    byokConfig,
    updateBYOKConfig,
    backendUrl,
    setBackendUrl,
    setBackendConnected,
  } = useRagStore();

  const [showApiKey, setShowApiKey] = useState(false);
  const [testingBackend, setTestingBackend] = useState(false);
  const [backendTestStatus, setBackendTestStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  if (!isSettingsOpen) return null;

  const handleProviderChange = (provider: LLMProvider) => {
    let defaultModel = 'gemini-2.0-flash';
    if (provider === 'groq') defaultModel = 'llama-3.3-70b-versatile';
    if (provider === 'openai') defaultModel = 'gpt-4o-mini';
    if (provider === 'anthropic') defaultModel = 'claude-3-5-sonnet-20241022';
    if (provider === 'custom') defaultModel = 'agnes-default';

    updateBYOKConfig({
      provider,
      model: defaultModel,
    });
  };

  const testBackendConnection = async () => {
    setTestingBackend(true);
    setBackendTestStatus('idle');
    try {
      const res = await fetch(`${backendUrl.replace(/\/+$/, '')}/health`, { method: 'GET' });
      if (res.ok) {
        setBackendConnected(true);
        setBackendTestStatus('success');
      } else {
        setBackendConnected(false);
        setBackendTestStatus('failed');
      }
    } catch {
      setBackendConnected(false);
      setBackendTestStatus('failed');
    } finally {
      setTestingBackend(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">BYOK & Engine Settings</h2>
              <p className="text-xs text-slate-400">Configure your AI providers, API keys, and RAG pipeline</p>
            </div>
          </div>

          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Privacy Guarantee Box */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-start space-x-2.5">
            <Key className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-300">
              <strong className="text-emerald-200">100% Privacy & Zero Server Storage:</strong> Your API keys
              and uploaded files stay strictly inside your browser. Direct calls are made to your chosen AI
              provider without passing through any third-party database.
            </div>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Select AI Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'gemini' as LLMProvider, name: 'Google Gemini', tag: 'Free Tier (1M Context)' },
                { id: 'groq' as LLMProvider, name: 'Groq Cloud', tag: 'Free 500+ tok/s' },
                { id: 'openai' as LLMProvider, name: 'OpenAI', tag: 'GPT-4o / mini' },
                { id: 'anthropic' as LLMProvider, name: 'Claude', tag: 'Anthropic' },
                { id: 'custom' as LLMProvider, name: 'Custom / Agnes AI', tag: 'Ollama / Proxy' },
              ].map((prov) => (
                <button
                  key={prov.id}
                  onClick={() => handleProviderChange(prov.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    byokConfig.provider === prov.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold">{prov.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{prov.tag}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                {byokConfig.provider.toUpperCase()} API Key
              </label>
              {byokConfig.provider === 'gemini' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <span>Get Free Gemini Key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {byokConfig.provider === 'groq' && (
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <span>Get Free Groq Key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={byokConfig.apiKey}
                onChange={(e) => updateBYOKConfig({ apiKey: e.target.value })}
                placeholder={`Paste your ${byokConfig.provider} API key here...`}
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 text-slate-400 hover:text-slate-200"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Custom Base URL (if custom / Agnes AI selected) */}
          {byokConfig.provider === 'custom' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Custom API Base URL (OpenAI-Compatible)
              </label>
              <input
                type="text"
                value={byokConfig.customBaseUrl || ''}
                onChange={(e) => updateBYOKConfig({ customBaseUrl: e.target.value })}
                placeholder="https://api.agnes.ai/v1 or http://localhost:11434/v1"
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>
          )}

          {/* Model Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Model Name</label>
            <input
              type="text"
              value={byokConfig.model}
              onChange={(e) => updateBYOKConfig({ model: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none font-mono"
            />
          </div>

          {/* RAG Pipeline Tuning */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Advanced RAG Tuning
              </h3>
            </div>

            <div className="space-y-3">
              {/* Hybrid Search Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div>
                  <div className="text-xs font-medium text-slate-200">Hybrid Search (BM25 + Dense)</div>
                  <div className="text-[10px] text-slate-400">
                    Fuses lexical keyword matches with semantic vectors via RRF
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={byokConfig.useHybridSearch}
                  onChange={(e) => updateBYOKConfig({ useHybridSearch: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </div>

              {/* Reranker Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div>
                  <div className="text-xs font-medium text-slate-200">Cross-Encoder Reranker</div>
                  <div className="text-[10px] text-slate-400">
                    Re-scores top passages to eliminate false positives
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={byokConfig.useReranker}
                  onChange={(e) => updateBYOKConfig({ useReranker: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </div>

              {/* Top-K Chunks Slider */}
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-200">Top-K Retrieved Passages</span>
                  <span className="font-mono text-indigo-400">{byokConfig.topK}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={byokConfig.topK}
                  onChange={(e) => updateBYOKConfig({ topK: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Optional Render Backend Connection */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-1.5">
              <Server className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Optional FastAPI Backend (Render / Local)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Ultra-RAG runs 100% in your browser. You can optionally connect a Python FastAPI instance on
              Render for FlashRank reranking and PyMuPDF4LLM extraction.
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8000 or https://your-app.onrender.com"
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={testBackendConnection}
                disabled={testingBackend}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-xl transition-colors font-medium shrink-0"
              >
                {testingBackend ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {backendTestStatus === 'success' && (
              <div className="flex items-center space-x-1 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Backend connected successfully! FlashRank reranker active.</span>
              </div>
            )}
            {backendTestStatus === 'failed' && (
              <div className="flex items-center space-x-1 text-[11px] text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Backend unreachable. Running seamlessly in standalone browser mode.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
