import axios from "axios"

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434"

export async function generateEmbedding(input: string): Promise<number[]> {
  const { data } = await axios.post(
    `${OLLAMA_BASE_URL}/api/embed`,
    {
      model: "nomic-embed-text",
      input,
    }
  )

  return data.embeddings
}

/**
 * Streaming chat response from Ollama
 * Calls onToken(token) for every streamed chunk
 */
export async function streamChatCompletion({
  messages,
  model = "llama3.2:1b",
  onToken,
}: {
  messages: { role: string; content: string }[]
  model?: string
  onToken: (token: string) => void
}) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  })

  if (!response.body) {
    throw new Error("No stream returned from Ollama")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split("\n").filter(Boolean)

    for (const line of lines) {
      const json = JSON.parse(line)
      if (json.message?.content) {
        onToken(json.message.content)
      }
    }
  }
}


export async function chatCompletion({
  messages,
  model = "llama3.2:1b",
  format = 'json'
}: any) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      format
    }),
  })

  return response.json()
}


export async function generateCompletion({
  prompt,
  model = "alayon",
  format = 'json'
}: any) {



  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format
    }),
  });
  
  

  const ollamaResponse = await response.json();
console.log({
  prompt,
}, prompt, ollamaResponse, 'OLLAAP')
  // 🟢 Parse the model's JSON string into an object
  try {
    ollamaResponse.response = JSON.parse(ollamaResponse.response);
  } catch (e) {
    console.error("Failed to parse model response as JSON:", ollamaResponse.response);
    // Optionally, you could fall back xto the raw string or throw an error
  }

  return ollamaResponse;
}