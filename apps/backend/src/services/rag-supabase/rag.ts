import { embed, generate } from "./ollama"
import { searchSimilar } from "./vectorSearch"

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
