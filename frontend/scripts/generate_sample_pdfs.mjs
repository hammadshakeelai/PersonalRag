import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplesDir = path.resolve(__dirname, '..', 'public', 'samples');

if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

const papers = [
  {
    filename: 'Attention_Is_All_You_Need.pdf',
    title: 'Attention Is All You Need',
    authors: 'Ashish Vaswani*, Noam Shazeer*, Niki Parmar*, Jakob Uszkoreit*, Llion Jones*, Aidan N. Gomez*†, Łukasz Kaiser*, Illia Polosukhin* ‡',
    affil: 'Google Brain • Google Research • University of Toronto',
    pages: [
      {
        pageHeader: 'Published in Advances in Neural Information Processing Systems (NeurIPS 2017)',
        content: `
          <div class="title-block">
            <h1 class="paper-title">Attention Is All You Need</h1>
            <p class="authors">Ashish Vaswani* &nbsp;&nbsp; Noam Shazeer* &nbsp;&nbsp; Niki Parmar* &nbsp;&nbsp; Jakob Uszkoreit*<br>
            Llion Jones* &nbsp;&nbsp; Aidan N. Gomez*† &nbsp;&nbsp; Łukasz Kaiser* &nbsp;&nbsp; Illia Polosukhin* ‡</p>
            <p class="affiliations">Google Brain &nbsp;•&nbsp; Google Research &nbsp;•&nbsp; University of Toronto</p>
          </div>

          <div class="abstract-box">
            <h3>Abstract</h3>
            <p>The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the <strong>Transformer</strong>, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.</p>
          </div>

          <div class="two-col">
            <div class="col">
              <h2>1. Introduction</h2>
              <p>Recurrent neural networks, specifically long short-term memory and gated recurrent neural networks, have been firmly established as state-of-the-art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Subsequent efforts have continued to push the boundaries of recurrent language models and encoder-decoder architectures.</p>
              <p>Recurrent models inherently factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states $h_t$, as a function of the previous hidden state $h_{t-1}$ and the input for position $t$. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths.</p>
            </div>
            <div class="col">
              <h2>2. Background</h2>
              <p>The goal of reducing sequential computation also forms the foundation of the Extended Neural GPU, ByteNet, and ConvS2S, all of which use convolutional neural networks as basic building blocks. In these models, the number of operations required to relate signals from two arbitrary input or output positions grows in the distance between positions, linearly for ConvS2S and logarithmically for ByteNet.</p>
              <p>In the Transformer, this is reduced to a constant number of operations, albeit at the cost of reduced effective resolution due to averaging attention-weighted positions, an effect we counteract with Multi-Head Attention as described in Section 3.2.</p>
            </div>
          </div>
        `
      },
      {
        pageHeader: 'NeurIPS 2017 — Vaswani et al.',
        content: `
          <div class="two-col">
            <div class="col">
              <h2>3. Model Architecture</h2>
              <p>Most competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence of symbol representations $(x_1, \\dots, x_n)$ to a sequence of continuous representations $\\mathbf{z} = (z_1, \\dots, z_n)$. Given $\\mathbf{z}$, the decoder then generates an output sequence $(y_1, \\dots, y_m)$ of symbols one element at a time.</p>
              <p>The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder, shown in the left and right halves of Figure 1, respectively.</p>

              <h3>3.1 Encoder and Decoder Stacks</h3>
              <p><strong>Encoder:</strong> The encoder is composed of a stack of $N = 6$ identical layers. Each layer has two sub-layers. The first is a multi-head self-attention mechanism, and the second is a simple, position-wise fully connected feed-forward network. We employ a residual connection around each of the two sub-layers, followed by layer normalization.</p>
            </div>
            <div class="col">
              <p><strong>Decoder:</strong> The decoder is also composed of a stack of $N = 6$ identical layers. In addition to the two sub-layers in each encoder layer, the decoder inserts a third sub-layer, which performs multi-head attention over the output of the encoder stack.</p>

              <h3>Table 1: Maximum path lengths and layer complexity</h3>
              <table class="academic-table">
                <thead>
                  <tr>
                    <th>Layer Type</th>
                    <th>Complexity</th>
                    <th>Sequential Ops</th>
                    <th>Max Path</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Self-Attention</td><td>$O(n^2 \\cdot d)$</td><td>$O(1)$</td><td>$O(1)$</td></tr>
                  <tr><td>Recurrent</td><td>$O(n \\cdot d^2)$</td><td>$O(n)$</td><td>$O(n)$</td></tr>
                  <tr><td>Convolutional</td><td>$O(k \\cdot n \\cdot d^2)$</td><td>$O(1)$</td><td>$O(\\log_k(n))$</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        `
      },
      {
        pageHeader: 'NeurIPS 2017 — Vaswani et al. (Page 3)',
        content: `
          <div class="two-col">
            <div class="col">
              <h2>3.2 Attention</h2>
              <p>An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.</p>
              
              <h3>3.2.1 Scaled Dot-Product Attention</h3>
              <p>We call our particular attention <strong>Scaled Dot-Product Attention</strong>. The input consists of queries and keys of dimension $d_k$, and values of dimension $d_v$. We compute the dot products of the query with all keys, divide each by $\\sqrt{d_k}$, and apply a softmax function to obtain the weights on the values.</p>
              
              <div class="equation-box">
                Attention(Q, K, V) = softmax( (Q K^T) / sqrt(d_k) ) V
              </div>
              <p>In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix $Q$. The keys and values are also packed into matrices $K$ and $V$.</p>
            </div>
            <div class="col">
              <h3>3.2.2 Multi-Head Attention</h3>
              <p>Instead of performing a single attention function with $d_{\\text{model}}$-dimensional queries, keys and values, we found it beneficial to linearly project the queries, keys and values $h$ times with different, learned linear projections to $d_k, d_k$ and $d_v$ dimensions, respectively.</p>
              
              <div class="equation-box highlight-target">
                MultiHead(Q, K, V) = Concat(head_1, ..., head_h) W^O<br>
                where head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V)
              </div>

              <div class="callout-box">
                <p><strong>Key Principle:</strong> Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.</p>
              </div>

              <p>In this work we employ $h = 8$ parallel attention layers, or heads. For each of these we use $d_k = d_v = d_{\\text{model}}/h = 64$. Due to the reduced dimension of each head, the total computational cost is similar to that of single-head attention with full dimensionality.</p>
            </div>
          </div>
        `
      },
      {
        pageHeader: 'NeurIPS 2017 — Vaswani et al. (Page 4)',
        content: `
          <div class="two-col">
            <div class="col">
              <h2>4. Why Self-Attention</h2>
              <p>In this section we compare various aspects of self-attention layers to the recurrent and convolutional layers commonly used for mapping one variable-length sequence of symbol representations $(x_1, \\dots, x_n)$ to another sequence of equal length $(z_1, \\dots, z_n)$, such as a hidden layer in a typical sequence transduction encoder or decoder. Motivating our use of self-attention we consider three desiderata:</p>
              <ul>
                <li>Total computational complexity per layer.</li>
                <li>Amount of computation that can be parallelized, as measured by minimum sequential operations required.</li>
                <li>Path length between long-range dependencies in the network.</li>
              </ul>
            </div>
            <div class="col">
              <h2>5. Conclusion</h2>
              <p>In this work, we presented the Transformer, the first sequence transduction model based entirely on attention, replacing the recurrent layers most commonly used in encoder-decoder architectures with multi-headed self-attention.</p>
              <p>For translation tasks, the Transformer can be trained significantly faster than architectures based on recurrent or convolutional layers. On both WMT 2014 English-to-German and WMT 2014 English-to-French translation tasks, we achieved a new state of the art.</p>
            </div>
          </div>
        `
      }
    ]
  },
  {
    filename: 'Retrieval_Augmented_Generation_Lewis2020.pdf',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive Tasks',
    authors: 'Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Douwe Kiela',
    affil: 'Facebook AI Research • University College London • NYU',
    pages: [
      {
        pageHeader: 'NeurIPS 2020 — Lewis et al.',
        content: `
          <div class="title-block">
            <h1 class="paper-title">Retrieval-Augmented Generation for Knowledge-Intensive Tasks</h1>
            <p class="authors">Patrick Lewis &nbsp;•&nbsp; Ethan Perez &nbsp;•&nbsp; Aleksandra Piktus &nbsp;•&nbsp; Fabio Petroni &nbsp;•&nbsp; Douwe Kiela</p>
            <p class="affiliations">Facebook AI Research &nbsp;•&nbsp; University College London &nbsp;•&nbsp; New York University</p>
          </div>
          <div class="abstract-box">
            <h3>Abstract</h3>
            <p>Large pre-trained language models store factual knowledge in their parameters, but their ability to access and manipulate knowledge is limited, leading to hallucinations. We propose a general-purpose recipe for <strong>retrieval-augmented generation (RAG)</strong> combining pre-trained parametric and non-parametric memory.</p>
          </div>
          <div class="two-col">
            <div class="col">
              <h2>1. Introduction</h2>
              <p>Pre-trained neural language models cannot easily update their memory or inspect reasons for predictions. We propose RAG models where parametric memory is a seq2seq transformer and non-parametric memory is a dense vector index accessed with a neural retriever.</p>
            </div>
            <div class="col">
              <h2>2. Hallucination Mitigation</h2>
              <p>By conditioning generation directly on retrieved evidence passages, RAG dramatically reduces hallucinations compared to purely parametric models and provides verifiable source attribution.</p>
            </div>
          </div>
        `
      }
    ]
  },
  {
    filename: 'FlashAttention_Fast_Exact_Attention.pdf',
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
    authors: 'Tri Dao, Daniel Y. Fu, Stefano Ermon, Atri Rudra, Christopher Ré',
    affil: 'Department of Computer Science, Stanford University',
    pages: [
      {
        pageHeader: 'NeurIPS 2022 — Dao et al.',
        content: `
          <div class="title-block">
            <h1 class="paper-title">FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness</h1>
            <p class="authors">Tri Dao &nbsp;•&nbsp; Daniel Y. Fu &nbsp;•&nbsp; Stefano Ermon &nbsp;•&nbsp; Atri Rudra &nbsp;•&nbsp; Christopher Ré</p>
            <p class="affiliations">Department of Computer Science, Stanford University</p>
          </div>
          <div class="abstract-box">
            <h3>Abstract</h3>
            <p>Transformers are slow and memory-hungry on long sequences because self-attention scales quadratically with sequence length. We propose <strong>FlashAttention</strong>, an exact attention algorithm that uses tiling to compute softmax without materializing the large intermediate $N \\times N$ matrix to GPU memory.</p>
          </div>
          <div class="two-col">
            <div class="col">
              <h2>1. IO-Aware Tiling</h2>
              <p>FlashAttention splits inputs into blocks, loads them from HBM to SRAM, and performs incremental softmax. This reduces memory traffic by 5-10x and achieves 2-4x wall-clock speedups.</p>
            </div>
            <div class="col">
              <h2>2. Quadratic Bottleneck</h2>
              <p>Standard attention incurs $O(N^2)$ memory reads and writes. FlashAttention reduces this to $O(N)$ memory reads/writes, scaling transformers to 64k+ context windows.</p>
            </div>
          </div>
        `
      }
    ]
  },
  {
    filename: 'DeepSeek_R1_Reasoning_via_RL.pdf',
    title: 'DeepSeek-R1: Incentivizing Reasoning Capability via RL',
    authors: 'DeepSeek-AI Research Group',
    affil: 'DeepSeek-AI Inc.',
    pages: [
      {
        pageHeader: 'DeepSeek-AI Technical Report (2025)',
        content: `
          <div class="title-block">
            <h1 class="paper-title">DeepSeek-R1: Incentivizing Reasoning Capability via RL</h1>
            <p class="authors">DeepSeek-AI Research Group</p>
            <p class="affiliations">DeepSeek-AI Inc.</p>
          </div>
          <div class="abstract-box">
            <h3>Abstract</h3>
            <p>We introduce <strong>DeepSeek-R1-Zero</strong> and <strong>DeepSeek-R1</strong>. Trained via large-scale reinforcement learning without preliminary supervised fine-tuning, the models spontaneously develop self-verification, reflective chain-of-thought, and deep mathematical reasoning.</p>
          </div>
        `
      }
    ]
  },
  {
    filename: 'LoRA_Low_Rank_Adaptation.pdf',
    title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    authors: 'Edward J. Hu, Yelong Shen, Phillip Wallis, Weizhu Chen',
    affil: 'Microsoft Corporation',
    pages: [
      {
        pageHeader: 'ICLR 2022 — Hu et al.',
        content: `
          <div class="title-block">
            <h1 class="paper-title">LoRA: Low-Rank Adaptation of Large Language Models</h1>
            <p class="authors">Edward J. Hu &nbsp;•&nbsp; Yelong Shen &nbsp;•&nbsp; Phillip Wallis &nbsp;•&nbsp; Weizhu Chen</p>
            <p class="affiliations">Microsoft Corporation</p>
          </div>
          <div class="abstract-box">
            <h3>Abstract</h3>
            <p>We propose <strong>LoRA (Low-Rank Adaptation)</strong>, which freezes pre-trained model weights and injects trainable rank decomposition matrices into Transformer attention layers, reducing trainable parameters by 10,000x with zero inference latency.</p>
          </div>
        `
      }
    ]
  }
];

const css = `
  @page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
  }
  body {
    margin: 0;
    padding: 0;
    font-family: 'Times New Roman', Times, 'Computer Modern', serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #111;
    background: #fff;
  }
  .page {
    page-break-after: always;
    min-height: 980px;
    box-sizing: border-box;
    position: relative;
    padding-bottom: 20px;
  }
  .page:last-child {
    page-break-after: avoid;
  }
  .running-header {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 8pt;
    color: #666;
    border-bottom: 0.5pt solid #ccc;
    padding-bottom: 4px;
    margin-bottom: 18px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    justify-content: space-between;
  }
  .title-block {
    text-align: center;
    margin-bottom: 18px;
  }
  .paper-title {
    font-size: 18pt;
    font-weight: bold;
    margin: 0 0 10px 0;
    line-height: 1.25;
    color: #000;
  }
  .authors {
    font-size: 9.5pt;
    margin: 0 0 4px 0;
    color: #222;
  }
  .affiliations {
    font-size: 8.5pt;
    color: #555;
    font-style: italic;
    margin: 0;
  }
  .abstract-box {
    margin: 16px 28px 22px 28px;
    text-align: justify;
  }
  .abstract-box h3 {
    text-align: center;
    font-size: 10pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0 0 6px 0;
  }
  .abstract-box p {
    font-size: 9pt;
    line-height: 1.4;
    margin: 0;
  }
  .two-col {
    display: flex;
    gap: 20px;
  }
  .col {
    flex: 1;
    text-align: justify;
  }
  h2 {
    font-size: 11pt;
    font-weight: bold;
    margin: 14px 0 6px 0;
    border-bottom: 0.5pt solid #eee;
    padding-bottom: 2px;
  }
  h3 {
    font-size: 10pt;
    font-weight: bold;
    margin: 10px 0 4px 0;
  }
  p {
    margin: 0 0 8px 0;
    text-indent: 1.2em;
  }
  p:first-of-type {
    text-indent: 0;
  }
  .equation-box {
    background: #f8fafc;
    border: 0.5pt solid #cbd5e1;
    padding: 8px 12px;
    margin: 10px 0;
    text-align: center;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9.5pt;
    border-radius: 4px;
  }
  .highlight-target {
    background: #fef08a;
    border: 1.5pt solid #eab308;
    box-shadow: 0 0 10px rgba(234, 179, 8, 0.3);
  }
  .callout-box {
    background: #eff6ff;
    border-left: 3pt solid #3b82f6;
    padding: 6px 10px;
    margin: 10px 0;
    font-size: 8.5pt;
  }
  .academic-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 8pt;
  }
  .academic-table th {
    border-top: 1.5pt solid #000;
    border-bottom: 1pt solid #000;
    padding: 4px;
    text-align: left;
  }
  .academic-table td {
    border-bottom: 0.5pt solid #ccc;
    padding: 4px;
  }
  .academic-table tr:last-child td {
    border-bottom: 1.5pt solid #000;
  }
`;

async function generatePdfs() {
  console.log('Launching headless Chrome to compile academic PDFs...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  for (const paper of papers) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${css}</style>
      </head>
      <body>
        ${paper.pages
          .map(
            (p, idx) => `
          <div class="page">
            <div class="running-header">
              <span>${p.pageHeader || paper.title}</span>
              <span>Page ${idx + 1} of ${paper.pages.length}</span>
            </div>
            ${p.content}
          </div>
        `
          )
          .join('')}
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'load' });
    const outPath = path.join(samplesDir, paper.filename);
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    });
    console.log(`Generated: ${paper.filename} -> ${outPath}`);
  }

  await browser.close();
  console.log('All sample research PDFs generated successfully!');
}

generatePdfs().catch(console.error);
