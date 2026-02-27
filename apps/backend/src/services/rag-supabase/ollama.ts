import axios from "axios"
import { config } from "./config"

export async function embed(text: string): Promise<number[]> {
  const res = await axios.post(`${config.ollamaBaseUrl}/api/embeddings`, {
    model: config.embedModel,
    prompt: text,
  })

  return res.data.embedding
}

export async function generate(prompt: string) {
  const res = await axios.post(`${config.ollamaBaseUrl}/api/generate`, {
    model: config.chatModel,
    prompt,
    stream: false,
  })

  return res.data.response
}
