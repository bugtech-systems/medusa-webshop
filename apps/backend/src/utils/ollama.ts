import axios from "axios"

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://192.168.1.140:11434"

export async function generateEmbedding(input: string): Promise<number[]> {
  const { data } = await axios.post(
    `${OLLAMA_BASE_URL}/api/embed`,
    {
      model: "nomic-embed-text",
      input,
    }
  )

  return data.embeddings[0]
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

export async function callLLM(prompt, model = "llama3.2:latest") {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, format: 'json' })
  });
  return (await res.json()).response;
}


export async function chatCompletion({
  messages,
  model = "llama3.2:1b",
  format = 'json',
  options = {
    "num_predict": 500,
    "temperature": 0.2,
    "num_ctx": 2048,
    "num_thread": 2
  }
}: any) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      options,
      stream: false,
      format
    }),
  })

  return response.json()
}


export async function generateCompletion({
  prompt,
  model = "alayon",
  format = 'json',
  options
}: any) {



  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      options,
      stream: false,
      format
    }),
  });



  const ollamaResponse = await response.json();

  // 🟢 Parse the model's JSON string into an object
  try {
    ollamaResponse.response = JSON.parse(ollamaResponse.response);
  } catch (e) {
    console.error("Failed to parse model response as JSON:", ollamaResponse.response);
    // Optionally, you could fall back xto the raw string or throw an error
  }

  return ollamaResponse;
}