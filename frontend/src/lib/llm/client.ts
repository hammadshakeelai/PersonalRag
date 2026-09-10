import type { BYOKConfig, Citation, DocumentChunk } from '../rag/types';

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onCitations?: (citations: Citation[]) => void;
  onError: (err: Error) => void;
  onFinish: (fullText: string) => void;
}

export async function streamRAGResponse(
  query: string,
  contextChunks: DocumentChunk[],
  config: BYOKConfig,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  callbacks: StreamCallbacks
): Promise<void> {
  // 1. Build Citations list from context chunks
  const citations: Citation[] = contextChunks.map((c, i) => ({
    id: `cite_${i + 1}`,
    docId: c.docId,
    docName: c.docName,
    pageNumber: c.pageNumber,
    quote: c.content.slice(0, 180) + '...',
    relevanceScore: 0.95 - (i * 0.05),
  }));

  if (callbacks.onCitations) {
    callbacks.onCitations(citations);
  }

  // 2. Format Context Block with Contextual Retrieval Headers
  const contextBlock = contextChunks
    .map((c, idx) => {
      return `--- DOCUMENT SOURCE [${idx + 1}]: "${c.docName}" (Page ${c.pageNumber}) ---
${c.contextHeader}
${c.parentContent || c.content}
`;
    })
    .join('\n\n');

  const systemPrompt = `You are Ultra-RAG, a state-of-the-art document intelligence assistant combining the precision of ChatPDF with the multi-source analytical synthesis of NotebookLM.

YOUR CORE DIRECTIVES:
1. Answer the user's question accurately, deeply, and strictly grounded in the provided document sources.
2. Whenever asserting a specific claim, fact, data point, or number, YOU MUST cite your source inline using the exact bracket format: [DocName, p.X] (e.g., [${contextChunks[0]?.docName || 'Document.pdf'}, p.${contextChunks[0]?.pageNumber || 1}]).
3. If multiple documents contain contrasting or complementary information, synthesize them clearly and point out differences.
4. If the provided sources do not contain enough information to answer a question, honestly state what is present and what is missing. Do NOT hallucinate.
5. Format your response cleanly using markdown (bold headings, bullet points, numbered steps, tables where helpful).

DOCUMENT SOURCES:
${contextBlock || 'No document sources provided.'}`;

  try {
    if (config.provider === 'gemini') {
      await streamGemini(query, systemPrompt, config, conversationHistory, callbacks);
    } else if (config.provider === 'anthropic') {
      await streamAnthropic(query, systemPrompt, config, conversationHistory, callbacks);
    } else {
      // OpenAI, Groq, or Custom (Agnes AI / OpenRouter / Ollama)
      await streamOpenAICompatible(query, systemPrompt, config, conversationHistory, callbacks);
    }
  } catch (err: any) {
    callbacks.onError(err);
  }
}

async function streamGemini(
  query: string,
  systemPrompt: string,
  config: BYOKConfig,
  history: { role: 'user' | 'assistant'; content: string }[],
  callbacks: StreamCallbacks
): Promise<void> {
  const modelName = config.model || 'gemini-2.0-flash';
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error('Please enter your Google Gemini API Key in the settings (top right).');
  }

  const contents = [
    ...history.slice(-4).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    {
      role: 'user',
      parts: [{ text: query }],
    },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: config.temperature ?? 0.3,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body stream is unavailable.');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.replace('data: ', '').trim();
        if (!jsonStr) continue;
        try {
          const data = JSON.parse(jsonStr);
          const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (chunk) {
            fullText += chunk;
            callbacks.onChunk(chunk);
          }
        } catch {
          // ignore partial JSON parse errors
        }
      }
    }
  }

  callbacks.onFinish(fullText);
}

async function streamOpenAICompatible(
  query: string,
  systemPrompt: string,
  config: BYOKConfig,
  history: { role: 'user' | 'assistant'; content: string }[],
  callbacks: StreamCallbacks
): Promise<void> {
  let baseUrl = 'https://api.openai.com/v1';
  let defaultModel = 'gpt-4o-mini';

  if (config.provider === 'groq') {
    baseUrl = 'https://api.groq.com/openai/v1';
    defaultModel = 'llama-3.3-70b-versatile';
  } else if (config.provider === 'custom') {
    baseUrl = (config.customBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  }

  const model = config.model || defaultModel;
  const apiKey = config.apiKey;

  if (!apiKey && config.provider !== 'custom') {
    throw new Error(`Please enter your ${config.provider.toUpperCase()} API Key in settings.`);
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-4),
    { role: 'user', content: query },
  ];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: config.temperature ?? 0.3,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${config.provider.toUpperCase()} Error (${response.status}): ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body stream is unavailable.');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const raw = line.replace('data: ', '').trim();
        if (raw === '[DONE]') continue;
        try {
          const data = JSON.parse(raw);
          const chunk = data.choices?.[0]?.delta?.content || '';
          if (chunk) {
            fullText += chunk;
            callbacks.onChunk(chunk);
          }
        } catch {
          // ignore partial
        }
      }
    }
  }

  callbacks.onFinish(fullText);
}

async function streamAnthropic(
  query: string,
  systemPrompt: string,
  config: BYOKConfig,
  history: { role: 'user' | 'assistant'; content: string }[],
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = config.apiKey;
  if (!apiKey) {
    throw new Error('Please enter your Anthropic API Key in settings.');
  }

  const messages = [
    ...history.slice(-4),
    { role: 'user', content: query },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic Error (${response.status}): ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response stream unavailable.');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const raw = line.replace('data: ', '').trim();
        try {
          const data = JSON.parse(raw);
          if (data.type === 'content_block_delta') {
            const chunk = data.delta?.text || '';
            if (chunk) {
              fullText += chunk;
              callbacks.onChunk(chunk);
            }
          }
        } catch {}
      }
    }
  }

  callbacks.onFinish(fullText);
}
