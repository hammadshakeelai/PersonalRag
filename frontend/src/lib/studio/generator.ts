import type { BYOKConfig, DocumentItem, StudioArtifact } from '../rag/types';
import { streamRAGResponse } from '../llm/client';

export type StudioType = 'podcast' | 'summary' | 'study_guide' | 'comparison';

export async function generateStudioArtifact(
  type: StudioType,
  documents: DocumentItem[],
  config: BYOKConfig,
  onChunk: (text: string) => void
): Promise<StudioArtifact> {
  const activeDocs = documents.filter((d) => d.selected);
  if (activeDocs.length === 0) {
    throw new Error('Please select at least one document source to generate studio artifacts.');
  }

  // Gather representative chunks from each selected document
  const sampleChunks = activeDocs.flatMap((d) => d.chunks.slice(0, 8));

  let prompt = '';
  let title = '';

  switch (type) {
    case 'podcast':
      title = 'Deep Dive Podcast Script (Two-Host Overview)';
      prompt = `Generate a NotebookLM-style "Audio Deep Dive" podcast dialogue between two engaging, expert co-hosts:
- Host 1 (Alex): Analytical, curious, framing big questions and setting the stage.
- Host 2 (Sam): Deep domain expert, breaking down the nuances, citing surprising details.

RULES:
1. Format every turn as:
   **Host 1 (Alex):** [speech]
   **Host 2 (Sam):** [speech]
2. Keep the banter natural, lively, and intelligent.
3. Ground the conversation deeply in the facts and metrics from the provided sources.
4. Cover the main thesis, unexpected findings, and key takeaways across all uploaded sources.`;
      break;

    case 'summary':
      title = 'Executive Summary & Key Insights';
      prompt = `Provide a comprehensive Executive Briefing of the provided document sources:
1. Executive Summary (high-level synthesis of core themes).
2. Key Findings & Data Points (bullet points with exact numbers/metrics).
3. Strategic Implications & Recommendations.
4. Synthesized Conclusion.`;
      break;

    case 'study_guide':
      title = 'Study Guide, Key Concepts & Quiz';
      prompt = `Create an in-depth Study Guide and Assessment based on the provided documents:
1. Core Concepts & Definitions Glossary (explain 5-7 crucial terms).
2. Detailed Key Topic Breakdown.
3. 5 Multiple-Choice Quiz Questions (with answer key and detailed explanations).
4. 3 Discussion / Short-Answer Practice Questions.`;
      break;

    case 'comparison':
      title = 'Cross-Document Comparison Matrix';
      prompt = `Perform a rigorous comparative synthesis across the selected documents:
1. Overview of documents and their respective focus areas.
2. Comparison Table / Matrix (comparing scope, methodology, key findings, conclusions).
3. Points of Agreement vs. Points of Divergence / Conflict.
4. Unified Synthesis.`;
      break;
  }

  let generatedText = '';

  await streamRAGResponse(
    prompt,
    sampleChunks,
    config,
    [],
    {
      onChunk: (c) => {
        generatedText += c;
        onChunk(c);
      },
      onError: (err) => {
        throw err;
      },
      onFinish: () => {},
    }
  );

  return {
    id: 'art_' + Math.random().toString(36).substring(2, 9),
    type,
    title,
    content: generatedText,
    createdAt: Date.now(),
  };
}
