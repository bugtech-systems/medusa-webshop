import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm"

/**
 * AiMemory
 * Stores vectorized content for RAG (products, FAQs, policies, etc.)
 */
@Entity({ name: "ai_memory" })
export class AiMemory {
  @PrimaryColumn({ type: "text" })
  id: string

  /**
   * Scope of the memory
   * e.g. "product", "collection", "policy", "faq"
   */
  @Index()
  @Column({ type: "text" })
  scope: string

  /**
   * ID of the related entity (product_id, policy_id, etc.)
   */
  @Index()
  @Column({ type: "text" })
  scope_id: string

  /**
   * Original content used for embedding
   */
  @Column({ type: "text" })
  content: string

  /**
   * pgVector embedding
   * Requires: CREATE EXTENSION vector;
   */
  @Column("vector", { length: 768 })
  embedding: number[]

  /**
   * Optional language metadata
   */
  @Column({ type: "text", nullable: true })
  language?: string

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date
}
