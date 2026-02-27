

export const AI_MODULE = "aiModuleService"

export interface AiMemoryDTO {
  id: string
  scope: string
  scope_id: string
  content: string
  embedding: number[]
  language?: string
}

export interface AiConversationSession {
  id: string
  customer_id?: string
  cart_id?: string
  language: string
  created_at: Date
}

export interface AiConversationMessage {
  id: string
  session_id: string
  role: "system" | "user" | "assistant" | "tool"
  content: string
  created_at: Date
}

export interface AiModel {
  id: string
  name: string
  provider: string  // e.g., "ollama"
  model_type: "chat" | "embedding"
  config: Record<string, any>
}

export interface AiToolExecution {
  id: string
  session_id: string
  tool_name: string
  input: Record<string, any>
  output: Record<string, any>
  created_at: Date
}



export interface IAiModuleService {
  /**
   * Create or update AI memory (RAG document)
   */
  indexContent(input: {
    scope: string
    scope_id: string
    content: string
    language?: string
  }): Promise<any>

  /**
   * Perform similarity search on AI memory using embedding
   */
  retrieveContext(query: string, limit?: number): Promise<{
    data: any
  }>

  /**
   * Stream a chat completion token-by-token
   */
  streamChat(input: {
    session_id: string
    user_message: string
    language?: string
    onToken: (token: string) => void
    container?: any
  }): Promise<void>

  /**
   * Create a conversation session
   */
  createSession(input?: {
    customer_id?: string
    cart_id?: string
    language?: string
  }): Promise<AiConversationSession>

  /**
   * Add a conversation message to a session
   */
  addMessage(input: {
    session_id: string
    role: "system" | "user" | "assistant" | "tool"
    content: string
  }): Promise<AiConversationMessage>

  /**
   * Delete AI memory by ID (for rollback)
   */
  deleteAiMemory(id: string): Promise<void>
}


export interface CreateAiModelInput {
  name: string
  description?: string
  provider: string
  base_model_id?: string
  model_type: string
  status?: string
  config: Record<string, any>
  metadata?: Record<string, any>
}

export interface UpdateAiModelInput {
  name?: string
  description?: string
  provider?: string
  base_model_id?: string
  model_type?: string
  status?: string
  config?: Record<string, any>
  metadata?: Record<string, any>
}

export interface FilterableAiModelProps {
  id?: string | string[]
  name?: string | { $contains: string }
  description?: string | { $contains: string }
  provider?: string | string[]
  model_type?: string | string[]
  status?: string | string[]
  created_at?: Date | { $gte?: Date; $lte?: Date }
  updated_at?: Date | { $gte?: Date; $lte?: Date }
  $or?: any[]
}

export interface AiModelDTO {
  id: string
  name: string
  description?: string
  provider: string
  base_model_id?: string
  model_type: string
  status: string
  config: Record<string, any>
  metadata?: Record<string, any>
  created_at: Date
  updated_at: Date
  deleted_at?: Date
}