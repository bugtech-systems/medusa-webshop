import { MedusaService } from "@medusajs/utils"
import {
  AiMemory,
  AiModel,
  AiConversationSession,
  AiConversationMessage
} from "./models"

import {
  chatCompletion,
  generateEmbedding,
  streamChatCompletion
} from "../../utils/ollama"

type ChatInput = {
  session_id?: string
  message: string
  language?: string
  model_id?: string
  use_rag?: boolean
  memory_limit?: number
  onToken?: (token: string) => void
}

export default class AiModuleService extends MedusaService({
  AiModel,
  AiMemory,
  AiConversationSession,
  AiConversationMessage
}) {
  constructor(container: any, options?: any) {
    super(container)
    // Now super() will have access to container.manager
  }

  /* -----------------------------------------------------
     AI MODEL CRUD
  ----------------------------------------------------- */

  async getModel(model_id?: string) {
    if (!model_id) {
      const models = await this.listAiModels({})
      return models?.[0] ?? null
    }

    let models = await this.listAiModels({  $or: [
        {
          id: {
            $eq: model_id,
          },
        },
        {
          model_name: {
            $eq: model_id,
          },
        },
      ]})

      return models[0]
  }

  /* -----------------------------------------------------
     MEMORY MANAGEMENT (RAG)
  ----------------------------------------------------- */

  async storeMemory(input: {
    scope: string
    scope_id: string
    content: string
    embedding: number[]
    language?: string
  }) {
    return this.createAiMemories({
      ...input,
      embedding: input.embedding as any
    })
  }

  async indexContent(input: {
    scope: string
    scope_id: string
    content: string
    language?: string
  }) {

    const embedding = await generateEmbedding(input.content)

    return this.storeMemory({
      ...input,
      embedding
    })
  }

  async similaritySearch(
    embedding: number[],
    limit = 5
  ) {

    /**
     * Replace later with pgvector query
     */

    return { data: [] }

    /*
    return this.queryService.graph({
      entity: "ai_memory",
      fields: ["id", "content", "scope", "scope_id"],
      pagination: { limit },
      order: {
        embedding: {
          operator: "<=>",
          value: embedding
        }
      }
    })
    */
  }

  async retrieveContext(query: string, limit = 5) {
    const embedding = await generateEmbedding(query)
    return this.similaritySearch(embedding, limit)
  }

  /* -----------------------------------------------------
     SESSION MANAGEMENT
  ----------------------------------------------------- */

  async createSession(input?: {
    customer_id?: string
    cart_id?: string
    language?: string
  }) {
    return this.createAiConversationSessions(input ?? {})
  }

  async addMessage(input: {
    session_id: string
    role: "system" | "user" | "assistant" | "tool"
    content: string
  }) {
    return this.createAiConversationMessages(input)
  }

  /* -----------------------------------------------------
     CHAT ENGINE
  ----------------------------------------------------- */

  async chat(input: ChatInput) {

    const language = input.language ?? "en"

    const model = await this.getModel(input.model_id)

    let session =
      input.session_id
        ? { id: input.session_id }
        : await this.createSession({ language })

    /* ---------------- RAG ---------------- */

    let memories = { data: [] }

    if (input.use_rag) {
      memories = await this.retrieveContext(
        input.message,
        input.memory_limit ?? 5
      )
    }

    const contextText = memories.data
      ?.map((m: any) => m.content)
      .join("\n---\n")

    const systemPrompt = `
You are a helpful ecommerce assistant.

Answer in ${language}.

Use the context below if relevant.

Context:
${contextText || "None"}
`

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: input.message }
    ]

    /* Store user message */

    await this.addMessage({
      session_id: session.id,
      role: "user",
      content: input.message
    })

    let fullResponse = ""

    /* STREAM MODE */

    if (input.onToken) {

      await streamChatCompletion({
        model: model?.name,
        messages,
        onToken: (token) => {
          fullResponse += token
          input.onToken?.(token)
        }
      })

    } else {

      const resp = await chatCompletion({
        model: model?.name,
        messages
      })

      fullResponse = resp.response
    }

    /* Store assistant message */

    await this.addMessage({
      session_id: session.id,
      role: "assistant",
      content: fullResponse
    })

    return {
      session_id: session.id,
      model: model?.name,
      response: fullResponse,
      memories_used: memories?.data?.length ?? 0
    }
  }
}