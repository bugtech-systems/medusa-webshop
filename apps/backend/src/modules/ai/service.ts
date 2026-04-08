import { generateEntityId, MedusaService } from "@medusajs/utils";
import {
  AiMemory,
  AiModel,
  AiConversationSession,
  AiConversationMessage
} from "./models";

import {
  chatCompletion,
  generateEmbedding,
  streamChatCompletion
} from "../../utils/ollama";
import { 
  InferTypeOf, 
  DAL,
  Logger
} from "@medusajs/framework/types"

import * as expressionEvaluator from "../action-engine/expressionEvaluator";

import { AiRagOperationService } from "./services/rag-database-action-service"; // <-- New RAG DB service
import { refineContent } from "../../utils/helpers";

type ChatInput = {
  session_id?: string;
  message: string;
  language?: string;
  model_id?: string;
  use_rag?: boolean;
  memory_limit?: number;
  config?: any;
  onToken?: (token: string) => void;
  context?: any;
};

export default class AiModuleService extends MedusaService({
  AiModel,
  AiMemory,
  AiConversationSession,
  AiConversationMessage
}) {
   readonly logger_: Logger
   ragService: AiRagOperationService;
   ragPgPool?: any

  constructor(container: any, options?: any) {
    super(container);
    this.logger_ = container.logger
    this.ragPgPool = container?.ragPgPool
    this.ragService = new AiRagOperationService(container?.ragPgPool); // inject pg pool
    this.logger_.info("✅ AI Module initialized")
  }

  /* -------------------------------
     AI MODEL CRUD
  ------------------------------- */
  async getModel(model_id?: string) {
    if (!model_id) {
      const models = await this.listAiModels({});
      return models?.[0] ?? null;
    }

    const models = await this.listAiModels({
      $or: [
        { id: { $eq: model_id } },
        { model_name: { $eq: model_id } }
      ]
    });

    return models[0];
  }

  /* -------------------------------
     MEMORY MANAGEMENT (RAG)
  ------------------------------- */
  async storeMemory(input: {
    scope: string;
    scope_id: string;
    content: string;
    embedding: number[];
    language?: string;
  }) {
    return this.ragService.execute({
      operation: "insert",
      table: "ai_memory",
      data: input
    });
  }

  async indexContent(input: {
    scope: string;
    scope_id: string;
    content: string;
    language?: string;
  }) {
    const embedding = await generateEmbedding(input.content);

    return this.storeMemory({
      ...input,
      embedding
    });
  }

  async similaritySearch(embedding: number[], limit = 5) {
    const result = await this.ragService.execute({
      operation: "search",
      table: "ai_memory",
      embedding,
      topK: limit
    });
    return { data: result };
  }

  async retrieveContext(query: string, limit = 5) {
    const embedding = await generateEmbedding(query);
    
    return this.similaritySearch(embedding, limit);
  }

  /* -------------------------------
     CONVERSATION MANAGEMENT
  ------------------------------- */
  async retrieveConversation(session_id: string) {

    return await this.retrieveAiConversationSession(session_id);
  }

  async getConversationMessages(session_id: string) {
    return this.listAiConversationMessages({
      session_id,
      role: ["user", "assistant"]
    });
  }

  async createSession(input?: { id?: any , relation_id?: string; auth_id?: string; language?: string }) {
    let session = await this.retrieveConversation(input?.id).catch(() => null)
    if(!session){
      session = await this.createAiConversationSessions(input ?? {});
    }
    return session
  }

  async addMessage(input: {
    session_id: string;
    role: "system" | "user" | "assistant" | "tool";
    content?: string;
    ai_conversation_session_id?: any;
    model_id?: any;
  }) {
    return this.createAiConversationMessages(input);
  }

  /* -------------------------------
     CHAT ENGINE
  ------------------------------- */
  async chat(input: ChatInput, session) {
    try {
      const language = input.language ?? "en";
      const model = await this.getModel(input.model_id);
      
      const history = await this.getConversationMessages(session?.id);
      const lastMessages = history.slice(-6).map((m: any) => ({
        role: m.role,
        content: refineContent(m.content)?.message ?? m.content
      }));

      /* -------------------------------
         RAG CONTEXT
      ------------------------------- */
      let memories: { data: any[] } = { data: [] };
      if (input.use_rag) {
        memories = await this.retrieveContext(input.message, input.memory_limit ?? 5);
      }

      const contextText = memories.data.map((m: any) => m.content).join("\n---\n");
    const pairId = generateEntityId(undefined, 'mess-pair')

      const systemInstruction = await expressionEvaluator.evaluatePlaceholders(
        model?.metadata?.template || model.system,
        { context: input.context }
      );

      const messages = [
        { role: "system", content: systemInstruction },
        ...lastMessages,
        { role: "user", content: input.message }
      ];



      /* -------------------------------
         STORE MESSAGES
      ------------------------------- */
      await this.addMessage({
        session_id: pairId,
        ai_conversation_session_id: session.id,
        role: "system",
        content: systemInstruction,
        model_id: model.id
      });

      await this.addMessage({
        session_id: pairId,
        ai_conversation_session_id: session.id,
        role: "user",
        content: input.message,
        model_id: model.id
      });

      let fullResponse: any;

      if (input.onToken) {
        await streamChatCompletion({
          model: model?.model_name,
          messages,
          onToken: (token) => {
            fullResponse += token;
            input.onToken?.(token);
          }
        });
      } else {
        const resp = await chatCompletion({
          model: model?.model_name,
          messages,
          options: input?.config ?? model.config
        });
        fullResponse = resp.message;
      }

      await this.addMessage({
        session_id: pairId,
        ai_conversation_session_id: session.id,
        role: "assistant",
        content: fullResponse.content,
        model_id: model.id
      });

      return {
        session_id: session.id,
        model: model?.model_name,
        ...JSON.parse(fullResponse.content),
        memories_used: lastMessages.length ?? 0
      };
    } catch (err) {
      console.error(err, "ERROR");
      return { message: "Something went wrong!", error: err };
    }
  }
}


export type AiApiContext = {
  aiService: AiModuleService
}