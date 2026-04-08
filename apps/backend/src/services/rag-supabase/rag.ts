import { embed, generate } from "./ollama"
import { searchProducts, searchSimilar, pool } from "./db"


export async function ask(question: string) {
  // 1. Embed question
  const queryEmbedding = await embed(question)

  // 2. Retrieve context
  const docs = await searchSimilar(queryEmbedding, 5)

  const context = docs
    .map((d: any) => `- ${d.content}`)
    .join("\n")

  // 3. Build prompt
  const prompt = `
You are a helpful assistant.
Use the context below to answer the question.
If the answer is not in the context, say you don't know.

Context:
${context}

Question:
${question}

Answer:
`

  // 4. Generate answer
  return generate(prompt)
}


// =============================
// PRODUCTION OLLAMA RAG SYSTEM
// - Modular Architecture
// - PGVECTOR
// - AUTO-LEARNING
// - MULTI-AGENT (Planner / Executor / Critic)
// - SIMPLE DASHBOARD API
// =============================



const OLLAMA_URL = "http://localhost:11434";




// =============================
// OLLAMA
// =============================
async function callLLM(prompt, model = "llama3") {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false })
  });
  return (await res.json()).response;
}

async function getEmbedding(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text })
  });
  return (await res.json()).embedding;
}

// =============================
// VECTOR OPS
// =============================
async function upsertRAG(item) {
  const embedding = await getEmbedding(item.text);

  await pool.query(
    `INSERT INTO rag VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET
     text=$2, action=$3, embedding=$4,
     usage_count=$5, success_rate=$6,
     examples=$7, negative_examples=$8`,
    [
      item.id,
      item.text,
      item.action,
      embedding,
      item.usage_count || 0,
      item.success_rate || 0,
      item.examples || [],
      item.negative_examples || []
    ]
  );
}

// =============================
// SEMANTIC NEGATIVE PENALTY (EMBEDDING-BASED)
// =============================
async function semanticNegativePenalty(queryEmbedding, negatives = []) {
  if (!negatives || negatives.length === 0) return 0;

  let maxSimilarity = 0;

  for (const neg of negatives) {
    const negEmbedding = await getEmbedding(neg);

    const similarity = cosineSimilarity(queryEmbedding, negEmbedding);

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
  }

  // scale penalty (only penalize if similarity is meaningful)
  if (maxSimilarity > 0.6) {
    return maxSimilarity; // stronger semantic match = stronger penalty
  }

  return 0;
}

// cosine helper (reused)
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

// =============================
// SEARCH (SEMANTIC NEGATIVE SCORING)
// =============================
async function searchRAGSemantic(query) {
  const queryEmbedding = await getEmbedding(query);

  const res = await pool.query(
    `SELECT *, (1 - (embedding <=> $1)) AS similarity
     FROM rag
     ORDER BY similarity DESC
     LIMIT 5`,
    [queryEmbedding]
  );

  const enriched = await Promise.all(
    res.rows.map(async r => {
      const penalty = await semanticNegativePenalty(
        queryEmbedding,
        r.negative_examples
      );

      return {
        ...r,
        penalty,
        final_score:
          0.6 * r.similarity +
          0.3 * r.success_rate -
          0.5 * penalty
      };
    })
  );

  return enriched.sort((a, b) => b.final_score - a.final_score);
}

function negativePenalty(query, negatives) {
  return negatives.some(n => query.includes(n)) ? 0.3 : 0;
}

// =============================
// SEARCH (WITH NEGATIVE SCORING)
// =============================
async function searchRAG(query) {
  const embedding = await getEmbedding(query);

  const res = await pool.query(
    `SELECT *, (1 - (embedding <=> $1)) AS similarity
     FROM rag
     ORDER BY similarity DESC
     LIMIT 5`,
    [embedding]
  );

  return res.rows
    .map(r => {
      const penalty = negativePenalty(query, r.negative_examples);

      return {
        ...r,
        penalty,
        final_score:
          0.6 * r.similarity +
          0.3 * r.success_rate -
          0.4 * penalty
      };
    })
    .sort((a, b) => b.final_score - a.final_score);
}

// =============================
// AGENTS
// =============================

// PLANNER
async function planner(userInput, ragResults) {
  const prompt = `
You are a planner.
Choose best action.

Context:
${JSON.stringify(ragResults)}

User: ${userInput}

Return JSON {action, confidence, parameters}`;

  return JSON.parse(await callLLM(prompt));
}

// EXECUTOR
function executor(action) {
  return { success: true, output: `Executed ${action.action}` };
}

// CRITIC
async function critic(userInput, action, result) {
  const prompt = `
Evaluate if action was correct.
User: ${userInput}
Action: ${JSON.stringify(action)}
Result: ${JSON.stringify(result)}

Return JSON {success: true/false}`;

  return JSON.parse(await callLLM(prompt));
}

// =============================
// LEARNING
// =============================
async function updateRAG(ragItem, success, userInput) {
  ragItem.usage_count++;

  if (success) {
    ragItem.success_rate =
      (ragItem.success_rate * (ragItem.usage_count - 1) + 1) /
      ragItem.usage_count;

    ragItem.examples = ragItem.examples || [];
    ragItem.examples.push(userInput);
  } else {
    ragItem.negative_examples = ragItem.negative_examples || [];
    ragItem.negative_examples.push(userInput);
  }

  await upsertRAG(ragItem);
}

async function autoCreateIntent(userInput) {
  const prompt = `
Create intent JSON for: ${userInput}
Return {id,text,action}`;

  const obj = JSON.parse(await callLLM(prompt));
  obj.usage_count = 0;
  obj.success_rate = 0;

  await upsertRAG(obj);
}



