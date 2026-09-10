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
  RefreshCw,
  Sparkles,
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

  const [fetchingModels, setFetchingModels] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  if (!isSettingsOpen) return null;

  // Preset models for instant selection
  const defaultPresets: Record<LLMProvider, string[]> = {
    gemini: [
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-8b',
      'gemini-2.5-flash',
    ],
    groq: [
      'llama-3.3-70b-versatile',
      'deepseek-r1-distill-llama-70b',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
    openai: [
      'gpt-4o-mini',
      'gpt-4o',
      'o3-mini',
      'o1',
      'chatgpt-4o-latest',
    ],
    anthropic: [
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    custom: [
      'agnes-default',
      'llama3.2',
      'deepseek-chat',
      'mistral-large',
    ],
  };

  const handleProviderChange = (provider: LLMProvider) => {
    const savedKeys = byokConfig.providerKeys || {};
    const savedModels = byokConfig.providerModels || {};

    const savedKey = savedKeys[provider] || (provider === byokConfig.provider ? byokConfig.apiKey : '');
    const savedModel = savedModels[provider] || defaultPresets[provider][0];

    updateBYOKConfig({
      provider,
      apiKey: savedKey,
      model: savedModel,
    });
    setKeyVerificationResult({ status: 'idle' });
    setDiscoveredModels([]);
    setFetchError(null);
  };

  const handleKeyChange = (newKey: string) => {
    updateBYOKConfig({
      apiKey: newKey,
      providerKeys: {
        ...(byokConfig.providerKeys || {}),
        [byokConfig.provider]: newKey,
      },
    });
    setKeyVerificationResult({ status: 'idle' });
  };

  const handleModelChange = (newModel: string) => {
    updateBYOKConfig({
      model: newModel,
      providerModels: {
        ...(byokConfig.providerModels || {}),
        [byokConfig.provider]: newModel,
      },
    });
  };

  // Fetch all active models dynamically from the provider API
  const fetchActiveModels = async () => {
    const apiKey = (byokConfig.apiKey || '').trim();
    if (!apiKey && byokConfig.provider !== 'custom') {
      setFetchError('Please paste your API key first to discover active models.');
      return;
    }

    setFetchingModels(true);
    setFetchError(null);

    try {
      if (byokConfig.provider === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
        );
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Google API returned ${res.status}: ${errText}`);
        }
        const data = await res.json();
        const models: string[] = (data.models || [])
          .filter((m: any) =>
            m.supportedGenerationMethods?.some((method: string) =>
              method.toLowerCase().includes('generatecontent')
            )
          )
          .map((m: any) => m.name.replace(/^models\//, ''));

        if (models.length > 0) {
          setDiscoveredModels(models);
        } else {
          setFetchError('No text generation models found for this key.');
        }
      } else if (byokConfig.provider === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`Groq API returned ${res.status}`);
        const data = await res.json();
        const models = (data.data || []).map((m: any) => m.id);
        setDiscoveredModels(models);
      } else if (byokConfig.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`OpenAI API returned ${res.status}`);
        const data = await res.json();
        const models = (data.data || [])
          .map((m: any) => m.id)
          .filter((id: string) => id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3'));
        setDiscoveredModels(models);
      } else if (byokConfig.provider === 'custom') {
        const url = (byokConfig.customBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/models';
        const res = await fetch(url, {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const models = (data.data || []).map((m: any) => m.id);
          setDiscoveredModels(models);
        } else {
          throw new Error(`Custom endpoint returned ${res.status}`);
        }
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch models.');
    } finally {
      setFetchingModels(false);
    }
  };

  // Test API key and model connectivity
  const verifyApiKey = async () => {
    const apiKey = (byokConfig.apiKey || '').trim();
    if (!apiKey && byokConfig.provider !== 'custom') {
      setKeyVerificationResult({ status: 'invalid', message: 'Please enter an API key first.' });
      return;
    }

    setVerifyingKey(true);
    setKeyVerificationResult({ status: 'idle' });

    try {
      const cleanModel = (byokConfig.model || 'gemini-2.0-flash').trim().replace(/^models\//, '');

      if (byokConfig.provider === 'gemini') {
        // Test live model generateContent with 1-word query
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with 1 word: OK' }] }],
          }),
        });

        if (res.ok) {
          setKeyVerificationResult({
            status: 'valid',
            message: `Active & Verified! Model "${cleanModel}" responded successfully (HTTP 200).`,
          });
        } else {
          let errDetail = '';
          try {
            const errJson = await res.json();
            errDetail = errJson.error?.message || JSON.stringify(errJson);
          } catch {
            errDetail = await res.text();
          }
          setKeyVerificationResult({
            status: 'invalid',
            message: `Gemini Error (${res.status}): ${errDetail}`,
          });
        }
      } else if (byokConfig.provider === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: cleanModel,
            messages: [{ role: 'user', content: 'Say OK' }],
            max_tokens: 5,
          }),
        });
        if (res.ok) {
          setKeyVerificationResult({
            status: 'valid',
            message: `Active & Verified! Groq model "${cleanModel}" responded successfully.`,
          });
        } else {
          const errText = await res.text();
          setKeyVerificationResult({ status: 'invalid', message: `Groq Error (${res.status}): ${errText}` });
        }
      } else if (byokConfig.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: cleanModel,
            messages: [{ role: 'user', content: 'Say OK' }],
            max_tokens: 5,
          }),
        });
        if (res.ok) {
          setKeyVerificationResult({
            status: 'valid',
            message: `Active & Verified! OpenAI model "${cleanModel}" is ready.`,
          });
        } else {
          const errText = await res.text();
          setKeyVerificationResult({ status: 'invalid', message: `OpenAI Error (${res.status}): ${errText}` });
        }
      } else {
        setKeyVerificationResult({ status: 'valid', message: `Configuration saved for "${cleanModel}".` });
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

  // Combine default presets and dynamically discovered models
  const activePresets = discoveredModels.length > 0
    ? discoveredModels
    : defaultPresets[byokConfig.provider] || [];

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
            AI Providers & Models
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
                  in your browser only. Requests connect directly to {byokConfig.provider.toUpperCase()} from your browser.
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
                      onChange={(e) => handleKeyChange(e.target.value)}
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
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs text-white rounded-xl transition-all font-medium shrink-0 flex items-center space-x-1.5 shadow-sm"
                  >
                    {verifyingKey ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <span>Verify Key</span>
                    )}
                  </button>
                </div>

                {keyVerificationResult.status === 'valid' && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 pt-1">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{keyVerificationResult.message}</span>
                  </div>
                )}
                {keyVerificationResult.status === 'invalid' && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-rose-400 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{keyVerificationResult.message}</span>
                  </div>
                )}
              </div>

              {/* Model Input (100% Editable) & Live Fetch */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-xs font-semibold text-slate-300">Model Name (Freely Editable)</label>
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded font-mono">
                      Active
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={fetchActiveModels}
                    disabled={fetchingModels || !byokConfig.apiKey}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-30 flex items-center space-x-1 transition-colors"
                    title="Fetch all models available for your account from the API"
                  >
                    <RefreshCw className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                    <span>{fetchingModels ? 'Discovering Models...' : 'Fetch Models from Key'}</span>
                  </button>
                </div>

                {/* Freeform Editable Text Input */}
                <input
                  type="text"
                  value={byokConfig.model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  placeholder="e.g. gemini-1.5-pro, gemini-2.0-flash, llama-3.3-70b-versatile, gpt-4o..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none font-mono tracking-wide"
                />

                {fetchError && (
                  <p className="text-[11px] text-rose-400 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fetchError}</span>
                  </p>
                )}

                {/* Quick Presets / Discovered Model Chips */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>{discoveredModels.length > 0 ? 'Discovered Active Models:' : 'Quick Select Presets:'}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Click to fill</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                    {activePresets.map((m) => {
                      const isSelected = byokConfig.model === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleModelChange(m)}
                          className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold shadow-sm'
                              : 'bg-slate-900/70 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {m}
                          {isSelected && <span className="ml-1 text-emerald-400">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Custom Base URL (if custom / Agnes AI selected) */}
              {byokConfig.provider === 'custom' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
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
