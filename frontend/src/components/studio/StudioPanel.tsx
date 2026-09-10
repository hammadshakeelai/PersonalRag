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
    a.download = `${activeStudioArtifact?.title || 'NotebookLM_Studio_Artifact'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const studioTools = [
    {
      id: 'podcast' as StudioType,
      name: 'Deep Dive Podcast Script',
      description: 'Two-host lively conversational dialogue (Alex & Sam) breaking down all key insights.',
      icon: <Mic className="w-5 h-5 text-pink-400" />,
      color: 'from-pink-500/10 to-purple-500/10 border-pink-500/20 hover:border-pink-500/40',
    },
    {
      id: 'summary' as StudioType,
      name: 'Executive Briefing',
      description: 'High-level synthesis with key metrics, critical takeaways, and recommendations.',
      icon: <FileText className="w-5 h-5 text-indigo-400" />,
      color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/20 hover:border-indigo-500/40',
    },
    {
      id: 'study_guide' as StudioType,
      name: 'Study Guide & Quiz',
      description: 'Glossary of core terms, key concept breakdown, and 5 interactive quiz questions.',
      icon: <GraduationCap className="w-5 h-5 text-emerald-400" />,
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 hover:border-emerald-500/40',
    },
    {
      id: 'comparison' as StudioType,
      name: 'Cross-Doc Matrix',
      description: 'Compare agreements, discrepancies, and unique perspectives across sources.',
      icon: <Scale className="w-5 h-5 text-amber-400" />,
      color: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 hover:border-amber-500/40',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 select-none">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">NotebookLM Studio</h2>
              <p className="text-xs text-slate-400">
                Multi-document synthesis powered by your selected sources ({activeDocs.length} active)
              </p>
            </div>
          </div>

          <button
            onClick={() => setStudioOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Content Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Left Column: Tool Selectors & History */}
          <div className="space-y-4 md:col-span-1 border-r-0 md:border-r border-slate-800/80 pr-0 md:pr-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
              Generate Synthesis
            </h3>

            <div className="space-y-2.5">
              {studioTools.map((tool) => (
                <button
                  key={tool.id}
                  disabled={isGenerating || activeDocs.length === 0}
                  onClick={() => handleGenerate(tool.id)}
                  className={`w-full text-left p-3 rounded-xl border bg-gradient-to-br transition-all ${
                    tool.color
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center space-x-2">
                    {tool.icon}
                    <span className="text-xs font-semibold text-slate-200">{tool.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{tool.description}</p>
                </button>
              ))}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
                {errorMsg}
              </p>
            )}

            {/* Previous Artifacts */}
            {studioArtifacts.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 select-none">
                  Saved Artifacts
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {studioArtifacts.map((art) => (
                    <button
                      key={art.id}
                      onClick={() => setActiveStudioArtifact(art)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                        activeStudioArtifact?.id === art.id
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className="truncate flex-1">{art.title}</span>
                      <Clock className="w-3 h-3 ml-1 opacity-50 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Output Viewer */}
          <div className="md:col-span-2 flex flex-col h-full min-h-[350px]">
            {/* Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 select-none">
              <h4 className="text-sm font-semibold text-slate-200 truncate">
                {isGenerating
                  ? 'Synthesizing across sources...'
                  : activeStudioArtifact?.title || 'Studio Preview'}
              </h4>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleCopy}
                  disabled={!activeStudioArtifact && !currentGenerationText}
                  className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-30"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  disabled={!activeStudioArtifact && !currentGenerationText}
                  className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-30"
                  title="Download Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-slate-900/30 rounded-xl border border-slate-800/60 p-4 font-sans text-sm text-slate-200 prose-custom leading-relaxed">
              {isGenerating ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs text-purple-400 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing multi-document evidence...</span>
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
                <div className="text-center py-20 text-slate-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-400/40" />
                  <p className="text-sm font-medium">Select a tool on the left to generate synthesis.</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Try the <strong>Deep Dive Podcast Script</strong> or <strong>Study Guide</strong>!
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
