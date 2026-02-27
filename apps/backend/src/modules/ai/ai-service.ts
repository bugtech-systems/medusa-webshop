import { AiMemoryDTO } from "./types"
import {AiMemory} from "./types/models/ai-memory"

import { EntityManager, DataSource  } from "typeorm"

export default class AiModuleService {
  // private manager: EntityManager
  protected aiModuleService: DataSource

  constructor({ aiModuleService }: { aiModuleService: DataSource }) {
    this.aiModuleService = aiModuleService
  }

  /**
   * pgVector similarity search
   */
  async similaritySearch(embedding: number[], limit = 5): Promise<any> {
    const repo = this.aiModuleService.getRepository("ai_memory")

    // Use the cosine distance operator `<=>` for similarity
    // or use `<->` for L2/EUCLIDEAN
    const results = await repo
      .createQueryBuilder("ai_memory")
      .select(["ai_memory.id", "ai_memory.content", "ai_memory.scope", "ai_memory.scope_id"])
      .orderBy("ai_memory.embedding <=> :embedding", "ASC")
      .setParameter("embedding", embedding)
      .limit(limit)
      .getMany()

    return results
  }
}
