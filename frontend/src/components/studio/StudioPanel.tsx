import React, { useState } from 'react';
import {
  Sparkles,
  Mic,
  FileText,
  GraduationCap,
  Scale,
  X,
  Copy,
  Check,
  Download,
  Loader2,
  Clock,
  Play,
  Pause,
  Volume2,
} from 'lucide-react';
import { marked } from 'marked';
import { useRagStore } from '../../store/useRagStore';
import { generateStudioArtifact, type StudioType } from '../../lib/studio/generator';

export const StudioPanel: React.FC = () => {
  const {
    documents,
    byokConfig,
    isStudioOpen,
    setStudioOpen,
    studioArtifacts,
    activeStudioArtifact,
    addStudioArtifact,
    setActiveStudioArtifact,
  } = useRagStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGenerationText, setCurrentGenerationText] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!isStudioOpen) return null;

  const activeDocs = documents.filter((d) => d.selected);

  const handleGenerate = async (type: StudioType) => {
    if (activeDocs.length === 0) {
      setErrorMsg('Please select at least one document source in the left panel first.');
      return;
    }

    setIsGenerating(true);
    setCurrentGenerationText('');
    setErrorMsg(null);
    setIsPlayingAudio(false);

    try {
      const artifact = await generateStudioArtifact(
        type,
        documents,
        byokConfig,
        (chunk) => {
          setCurrentGenerationText((prev) => prev + chunk);
        }
      );
      addStudioArtifact(artifact);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate studio artifact.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const text = activeStudioArtifact?.content || currentGenerationText;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = activeStudioArtifact?.content || currentGenerationText;
    if (!text) return;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeStudioArtifact?.title || 'Studio_Artifact').replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const studioTools = [
    {
      id: 'podcast' as StudioType,
      name: 'Deep Dive Podcast',
      subtitle: 'Two-Host Audio Overview',
      description: 'Engaging dialogue between Alex & Sam exploring thesis and nuances.',
      icon: <Mic className="w-4 h-4 text-pink-400" />,
      color: 'from-pink-500/10 via-purple-500/5 to-transparent border-pink-500/30 hover:border-pink-500/50',
    },
    {
      id: 'summary' as StudioType,
      name: 'Executive Briefing',
      subtitle: 'High-Level Synthesis',
      description: 'Key metrics, bullet findings, and actionable recommendations.',
      icon: <FileText className="w-4 h-4 text-indigo-400" />,
      color: 'from-indigo-500/10 via-blue-500/5 to-transparent border-indigo-500/30 hover:border-indigo-500/50',
    },
    {
      id: 'study_guide' as StudioType,
      name: 'Study Guide & Quiz',
      subtitle: 'Interactive Assessment',
      description: 'Core concepts glossary & 5 multiple choice questions with answers.',
      icon: <GraduationCap className="w-4 h-4 text-emerald-400" />,
      color: 'from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30 hover:border-emerald-500/50',
    },
    {
      id: 'comparison' as StudioType,
      name: 'Cross-Doc Matrix',
      subtitle: 'Side-by-Side Comparison',
      description: 'Agreements, contrasts, and unique perspectives across all sources.',
      icon: <Scale className="w-4 h-4 text-amber-400" />,
      color: 'from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/30 hover:border-amber-500/50',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 select-none">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/20 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">NotebookLM Studio</h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">
                  Multi-Source Synthesis
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Grounded strictly in your <strong className="text-slate-200">{activeDocs.length} active documents</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setStudioOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Close Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Synthesis Generators & History */}
          <div className="space-y-4 lg:col-span-1 border-r-0 lg:border-r border-slate-800/80 pr-0 lg:pr-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
                Studio Tools
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                {activeDocs.length} sources active
              </span>
            </div>

            <div className="space-y-2.5">
              {studioTools.map((tool) => (
                <button
                  key={tool.id}
                  disabled={isGenerating || activeDocs.length === 0}
                  onClick={() => handleGenerate(tool.id)}
                  className={`w-full text-left p-3.5 rounded-xl border bg-gradient-to-br transition-all ${
                    tool.color
                  } disabled:opacity-40 disabled:cursor-not-allowed group hover:scale-[1.01]`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 group-hover:border-slate-700">
                        {tool.icon}
                      </div>
                      <span className="text-xs font-semibold text-slate-100">{tool.name}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">{tool.description}</p>
                </button>
              ))}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                {errorMsg}
              </p>
            )}

            {/* Saved History */}
            {studioArtifacts.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 select-none">
                  Saved Sessions
                </h4>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {studioArtifacts.map((art) => (
                    <button
                      key={art.id}
                      onClick={() => setActiveStudioArtifact(art)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        activeStudioArtifact?.id === art.id
                          ? 'bg-purple-600/20 text-purple-200 border border-purple-500/40 font-medium'
                          : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className="truncate flex-1">{art.title}</span>
                      <Clock className="w-3 h-3 ml-2 opacity-50 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Artifact Viewer */}
          <div className="lg:col-span-2 flex flex-col h-full min-h-[400px]">
            {/* Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 select-none">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold text-slate-200 truncate max-w-sm">
                  {isGenerating
                    ? 'Synthesizing with RAG Context...'
                    : activeStudioArtifact?.title || 'Studio Preview'}
                </h4>
              </div>

              <div className="flex items-center space-x-2">
                {activeStudioArtifact?.type === 'podcast' && (
                  <button
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="flex items-center space-x-1.5 text-xs bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    {isPlayingAudio ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause Simulation</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-pink-300" />
                        <span>Play Audio Overview</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleCopy}
                  disabled={!activeStudioArtifact && !currentGenerationText}
                  className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                  title="Copy text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  disabled={!activeStudioArtifact && !currentGenerationText}
                  className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                  title="Download Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Audio Overview Waveform Banner (if playing podcast) */}
            {isPlayingAudio && (
              <div className="mb-3 bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 rounded-xl p-3 flex items-center justify-between select-none">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                    <Volume2 className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Deep Dive Audio Overview in Progress
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Alex (Host 1) & Sam (Host 2) discussing your sources
                    </div>
                  </div>
                </div>

                {/* Animated Equalizer Waves */}
                <div className="flex items-center space-x-1 h-5">
                  <span className="w-1 bg-pink-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
                  <span className="w-1 bg-purple-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-5" />
                  <span className="w-1 bg-indigo-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-2" />
                  <span className="w-1 bg-pink-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-4" />
                  <span className="w-1 bg-purple-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
                </div>
              </div>
            )}

            {/* Main Output Box */}
            <div className="flex-1 overflow-y-auto bg-slate-900/40 rounded-2xl border border-slate-800/80 p-5 font-sans text-sm text-slate-200 prose-custom leading-relaxed backdrop-blur-sm shadow-inner">
              {isGenerating ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs text-purple-400 font-semibold select-none">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing multi-document evidence & synthesizing...</span>
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(currentGenerationText || 'Synthesizing...') as string,
                    }}
                  />
                </div>
              ) : activeStudioArtifact ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(activeStudioArtifact.content) as string,
                  }}
                />
              ) : (
                <div className="text-center py-24 text-slate-500 select-none">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 text-purple-400/30" />
                  <p className="text-sm font-semibold text-slate-300">Select a tool on the left to start synthesis</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Try the <strong>Deep Dive Podcast Script</strong> for a two-host overview or the{' '}
                    <strong>Study Guide</strong> for interactive quizzes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
