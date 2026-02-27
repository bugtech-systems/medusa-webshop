import { MedusaService } from "@medusajs/utils"
import {
  AiMemory,
  AiModel,
  AiConversationSession,
  AiConversationMessage,
  AiToolExecution,
} from "./models"
import { chatCompletion, generateEmbedding, streamChatCompletion } from "../../utils/ollama"

class AiModuleService extends MedusaService({
  AiModel,
  AiMemory,
  AiConversationSession,
  AiConversationMessage,
  AiToolExecution,
}) {

  /**
   * Store RAG memory (products, FAQs, policies)
   */
  async storeMemory(input: {
    scope: string
    scope_id: string
    content: string
    embedding: any
    language?: string
  }) {
    return await this.createAiMemories(input)
  }

  /**
   * Create or reuse a chat session
   */
  async createSession(input?: {
    customer_id?: string
    cart_id?: string
    language?: string
  }) {
    return await this.createAiConversationSessions(input ?? {})
  }

  /**
   * Append a message to session
   */
  async addMessage(input: {
    session_id: string
    role: "system" | "user" | "assistant" | "tool"
    content: string
  }) {
    return await this.createAiConversationMessages(input)
  }

  /**
   * Vector similarity search (pgvector)
   * Uses <=> operator under the hood
   */
  async similaritySearch(
    embedding: number[],
    limit = 5
  ) {
  
    return;
    /* return await this.queryService.graph({
      entity: "ai_memory",
      fields: ["id", "content", "scope", "scope_id"],
      filters: {},
      pagination: { limit },
      order: {
        embedding: {
          operator: "<=>",
          value: embedding,
        },
      },
    }) */
  }
  
  async indexContent(input: {
    scope: string
    scope_id: string
    content: string
    language?: string
  }) {
    // Generate embedding from Ollama
    const embedding: number[] = await generateEmbedding(input.content)
    let newInput = {
      ...input,
      embedding: embedding as any

    }

    // Save memory, casting embedding as JSON
    return await this.createAiMemories(newInput)
  }
  
    /**
   * Vector similarity search
   * Returns top `limit` relevant memories
   */
  async retrieveContext(query: string, limit = 5) {
    const embedding: number[] = await generateEmbedding(query)

    // Medusa query helper for pgvector similarity search
    return await this.similaritySearch(embedding, limit)
  }
  
   async streamChat({
    session_id,
    user_message,
    language,
    memories = {data: []},
    onToken,
  }: {
    session_id: string
    user_message: string
    language: string
    onToken: (token: string) => void
    memories?: any
  }) {

    const contextText = memories.data
      .map((m) => m.content)
      .join("\n---\n")

    const systemPrompt = `
You are a helpful ecommerce assistant.
Answer in ${language}.
Use the context below if relevant.

Context:
${contextText}
`

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: user_message },
    ]

    await this.addMessage({
      session_id,
      role: "user",
      content: user_message,
    })

    let fullResponse = ""

    await streamChatCompletion({
      messages,
      onToken: (token) => {
        fullResponse += token
        onToken(token)
      },
    })
    
    let chatResp = await chatCompletion({messages})

    await this.addMessage({
      session_id,
      role: "assistant",
      content: fullResponse,
    })
  return chatResp
  }
  
}

export default AiModuleService
