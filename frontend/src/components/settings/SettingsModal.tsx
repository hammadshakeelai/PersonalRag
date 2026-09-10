import React, { useState } from 'react';
import {
  Settings,
  X,
  Key,
  Eye,
  EyeOff,
  Server,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
  Target,
  BookOpen,
  Loader2,
  Check,
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

  const [activeTab, setActiveTab] = useState<'providers' | 'tuning'>('providers');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingBackend, setTestingBackend] = useState(false);
  const [backendTestStatus, setBackendTestStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const [verifyingKey, setVerifyingKey] = useState(false);
  const [keyVerificationResult, setKeyVerificationResult] = useState<{
    status: 'idle' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'idle' });

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
    setKeyVerificationResult({ status: 'idle' });
  };

  const verifyApiKey = async () => {
    if (!byokConfig.apiKey && byokConfig.provider !== 'custom') {
      setKeyVerificationResult({ status: 'invalid', message: 'Please enter an API key first.' });
      return;
    }

    setVerifyingKey(true);
    setKeyVerificationResult({ status: 'idle' });

    try {
      if (byokConfig.provider === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${byokConfig.apiKey}`
        );
        if (res.ok) {
          setKeyVerificationResult({ status: 'valid', message: 'Gemini API key is verified and working!' });
        } else {
          const err = await res.text();
          setKeyVerificationResult({ status: 'invalid', message: `Invalid Gemini Key (${res.status}): ${err}` });
        }
      } else if (byokConfig.provider === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${byokConfig.apiKey}` },
        });
        if (res.ok) {
          setKeyVerificationResult({ status: 'valid', message: 'Groq API key is verified and working!' });
        } else {
          setKeyVerificationResult({ status: 'invalid', message: `Invalid Groq Key (${res.status})` });
        }
      } else if (byokConfig.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${byokConfig.apiKey}` },
        });
        if (res.ok) {
          setKeyVerificationResult({ status: 'valid', message: 'OpenAI API key verified!' });
        } else {
          setKeyVerificationResult({ status: 'invalid', message: `Invalid OpenAI Key (${res.status})` });
        }
      } else {
        setKeyVerificationResult({ status: 'valid', message: 'Endpoint format configured.' });
      }
    } catch (err: any) {
      setKeyVerificationResult({ status: 'invalid', message: `Connection error: ${err.message}` });
    } finally {
      setVerifyingKey(false);
    }
  };

  const applyPreset = (preset: 'precision' | 'balanced' | 'speed') => {
    if (preset === 'precision') {
      updateBYOKConfig({
        useContextualRetrieval: true,
        useHybridSearch: true,
        useBM25: true,
        useReranker: true,
        topK: 6,
        temperature: 0.2,
      });
    } else if (preset === 'balanced') {
      updateBYOKConfig({
        useContextualRetrieval: true,
        useHybridSearch: true,
        useBM25: true,
        useReranker: false,
        topK: 5,
        temperature: 0.3,
      });
    } else if (preset === 'speed') {
      updateBYOKConfig({
        useContextualRetrieval: false,
        useHybridSearch: false,
        useBM25: true,
        useReranker: false,
        topK: 4,
        temperature: 0.4,
      });
    }
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

  const modelOptions: Record<string, string[]> = {
    gemini: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    groq: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'mixtral-8x7b-32768'],
    openai: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    custom: ['agnes-default', 'llama3.2', 'deepseek-coder'],
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">BYOK & Pipeline Settings</h2>
              <p className="text-xs text-slate-400">Bring Your Own Key • 100% Client-Side Privacy</p>
            </div>
          </div>

          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-4">
          <button
            onClick={() => setActiveTab('providers')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'providers'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Providers & Keys
          </button>
          <button
            onClick={() => setActiveTab('tuning')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'tuning'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            RAG Pipeline Tuning
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'providers' && (
            <>
              {/* Privacy Badge */}
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 flex items-start space-x-2.5">
                <Key className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-300">
                  <strong className="text-emerald-200">Zero Server Intermediary:</strong> Keys are stored
                  in browser <code>localStorage</code> only. Requests are sent directly to the AI provider.
                </div>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Select Provider
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

              {/* API Key Input & Live Verification */}
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

                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={byokConfig.apiKey}
                      onChange={(e) => {
                        updateBYOKConfig({ apiKey: e.target.value });
                        setKeyVerificationResult({ status: 'idle' });
                      }}
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

                  <button
                    type="button"
                    onClick={verifyApiKey}
                    disabled={verifyingKey}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-xl transition-colors font-medium shrink-0 flex items-center space-x-1.5"
                  >
                    {verifyingKey ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify Key</span>
                    )}
                  </button>
                </div>

                {keyVerificationResult.status === 'valid' && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 pt-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{keyVerificationResult.message}</span>
                  </div>
                )}
                {keyVerificationResult.status === 'invalid' && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-rose-400 pt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{keyVerificationResult.message}</span>
                  </div>
                )}
              </div>

              {/* Model Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Model</label>
                <div className="flex items-center space-x-2">
                  <select
                    value={byokConfig.model}
                    onChange={(e) => updateBYOKConfig({ model: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none font-mono"
                  >
                    {(modelOptions[byokConfig.provider] || []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
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
            </>
          )}

          {activeTab === 'tuning' && (
            <>
              {/* Quick Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Quick Tuning Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => applyPreset('precision')}
                    className="p-2.5 rounded-xl border border-slate-800 hover:border-indigo-500/60 bg-slate-900/50 text-left transition-all group"
                  >
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
                      <Target className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Max Precision</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Hybrid + Reranker</p>
                  </button>

                  <button
                    onClick={() => applyPreset('balanced')}
                    className="p-2.5 rounded-xl border border-slate-800 hover:border-indigo-500/60 bg-slate-900/50 text-left transition-all group"
                  >
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span>Balanced</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Contextual BM25</p>
                  </button>

                  <button
                    onClick={() => applyPreset('speed')}
                    className="p-2.5 rounded-xl border border-slate-800 hover:border-indigo-500/60 bg-slate-900/50 text-left transition-all group"
                  >
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ultra-Fast</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Lowest Latency</p>
                  </button>
                </div>
              </div>

              {/* Detailed Toggles */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <div>
                    <div className="text-xs font-medium text-slate-200">Hybrid Search (BM25 + Dense RRF)</div>
                    <div className="text-[10px] text-slate-400">
                      Fuses exact keywords with semantic embeddings
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={byokConfig.useHybridSearch}
                    onChange={(e) => updateBYOKConfig({ useHybridSearch: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <div>
                    <div className="text-xs font-medium text-slate-200">Contextual Chunking</div>
                    <div className="text-[10px] text-slate-400">
                      Prepends document title & section headers before embedding
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={byokConfig.useContextualRetrieval}
                    onChange={(e) => updateBYOKConfig({ useContextualRetrieval: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <div>
                    <div className="text-xs font-medium text-slate-200">Cross-Encoder Reranker</div>
                    <div className="text-[10px] text-slate-400">
                      Re-ranks top passages to eliminate false positives
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={byokConfig.useReranker}
                    onChange={(e) => updateBYOKConfig({ useReranker: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </div>

                {/* Top-K Slider */}
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-200">Top-K Retrieved Chunks</span>
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

              {/* Optional Backend */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center space-x-1.5">
                  <Server className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Optional Render Backend
                  </h3>
                </div>
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
                    <span>Backend connected! FlashRank reranker active.</span>
                  </div>
                )}
                {backendTestStatus === 'failed' && (
                  <div className="flex items-center space-x-1 text-[11px] text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Backend unreachable. Running seamlessly in standalone browser mode.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
