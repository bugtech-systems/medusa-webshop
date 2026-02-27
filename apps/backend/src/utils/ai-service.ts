import { AiMemoryDTO } from "../modules/ai/types"
import {AiMemory} from "../modules/ai/types/models/ai-memory"

import { EntityManager, DataSource  } from "typeorm"

export default class AiModuleService {
  private manager: EntityManager
  private db: DataSource
  constructor({ db }: { db: DataSource }) {
    this.db = db
  }
  /**
   * pgVector similarity search
   */
  async similaritySearch(embedding: number[], limit = 5): Promise<AiMemoryDTO[]> {
    const repo = this.db.getRepository(AiMemory)

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
