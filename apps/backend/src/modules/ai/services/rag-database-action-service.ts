import { Pool } from 'pg';
import {
  generateEntityId,
  MedusaService,
  InjectManager,
} from "@medusajs/framework/utils"
import { toSql } from 'pgvector';
import {
  generateEmbedding,
  callLLM
} from "../../../utils/ollama";

// =============================
// TYPES & INTERFACES
// =============================

export interface RagDocument {
  id?: string;
  text: string;
  action: string;
  embedding?: string;        // Store as pgvector format string
  usage_count?: number;
  success_rate?: number;
  examples?: string[];
  negative_examples?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface RagQueryConfig {
  operation?: 'upsertRag' | 'updateRag' | 'insert' | 'update' | 'delete' | 'read' | 'search' | 'stats' | 'batch' | 'cleanup' | 'index' | 'feedback' | 'searchRag' | 'searchRagSemantic' | 'query';
  table?: string;
  data?: RagDocument | RagDocument[];
  where?: any;
  orderBy?: { field: string; direction?: 'ASC' | 'DESC' }[] | Record<string, 'ASC' | 'DESC'>;
  limit?: number;
  offset?: number;
  sql?: string;
  params?: any[];

  // Search specific
  query?: string;           // Natural language query for semantic search
  embedding?: number[];     // Precomputed embedding vector
  topK?: number;            // Number of nearest neighbors to retrieve
  minSimilarity?: number;   // Minimum similarity threshold (0-1)
  includeScore?: boolean;   // Include similarity and final scores

  // Stats specific
  minSuccess?: number;      // Filter by minimum success rate
  minUsage?: number;        // Filter by minimum usage count
  searchTerm?: string;      // Text search in content

  // Batch specific
  entries?: RagDocument[];  // For batch operations
  ids?: string[];           // For batch delete

  // Cleanup specific
  unusedDays?: number;      // Days since creation without usage
  minSuccessRate?: number;  // Minimum success rate threshold
  dryRun?: boolean;         // Preview without executing

  // Reindex specific
  reindexIds?: string[];    // IDs to reindex (all if empty)
}

export interface SearchResult extends RagDocument {
  similarity: number;
  final_score: number;
}

export interface BatchResult {
  success: boolean;
  results?: { id: string; status: string }[];
  errors?: { entry: any; error: string }[];
  total?: number;
  successful?: number;
  failed?: number;
}

export interface StatsSummary {
  total_entries: number;
  total_uses: number;
  avg_success_rate: number;
  avg_usage_count: number;
  high_performing: number;
  low_performing: number;
  never_used: number;
  max_usage: number;
  max_success_rate: number;
  min_success_rate: number;
}

export interface PerformanceAnalysis {
  threshold: number;
  underperforming_count: number;
  entries: RagDocument[];
}

// =============================
// MAIN SERVICE CLASS
// =============================

export class AiRagOperationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /** Main execute function - single entry point for all operations */
  async execute(config: RagQueryConfig | any): Promise<any> {
    if (config.sql) {
      return this.executeRaw(config.sql, config.params || []);
    }

    const client = await this.pool.connect();
    try {
      switch (config.operation) {
        case 'insert':
          return this.insertDocuments(client, config);
        case 'update':
          return this.updateDocuments(client, config);
        case 'delete':
          return this.deleteDocuments(client, config);
        case 'read':
          return this.readDocuments(client, config);
        case 'search':
          return this.searchDocuments(client, config);
        case 'stats':
          return this.getStatistics(client, config);
        case 'batch':
          return this.batchOperation(client, config);
        case 'cleanup':
          return this.cleanupOperation(client, config);
        case 'index':
          return this.reindexDocuments(config);
        case 'feedback':
          return this.feedback(config as any);
        case 'searchRag':
          return this.searchRAG(config as any);
        case 'searchRagSemantic':
          return this.searchRAGSemantic(config as any);
        case 'updateRag':
          return this.updateRAG(config, config?.type, config?.text);
        case 'upsertAiRag':
          return this.upsertAiRAG(config?.data);
        case 'query':
          return this.query(config as any);
        default:
          throw new Error(`Unsupported operation: ${config.operation}`);
      }
    } finally {
      client.release();
    }
  }

  async query(config: RagQueryConfig): Promise<any> {
    const { query: input } = config;

    const rag = await this.searchRAG(config);
    const action = await this.planner(input, rag);
    const result = this.executor(action);
    const evalResult = await this.critic(input, action, result);


    console.log(rag, 'RAGG', action)
    if (rag.length) {
      await this.updateRAG(rag[0], evalResult.success, input);
    }

    if (action.confidence < 0.6) {
      await this.autoCreateIntent(input);
    }

    return { action, result, eval: evalResult };
  }

  // =============================
  // SEARCH (SEMANTIC NEGATIVE SCORING)
  // =============================
  async searchRAGSemantic(config) {
    const queryEmbedding = await generateEmbedding(config.query);
    let embeddingVector = toSql(queryEmbedding);
    const minSimilarity = config.minSimilarity ?? 0.6;


    const res = await this.pool.query(
      `SELECT id, content, (1 - (embedding <=> $1::vector)) AS similarity
       FROM ai_memory
       WHERE 1 - (embedding <=> $1::vector) >= $2
       ORDER BY similarity DESC
       LIMIT $3`,
      [embeddingVector, minSimilarity, config.topK]
    );

    const enriched = await Promise.all(
      res.rows.map(async r => {
        const penalty = await this.semanticNegativePenalty(
          queryEmbedding,
          r.negative_examples
        );

        return {
          ...r,
          penalty,
          final_score:
            0.6 * r.similarity +
            0.3 * r.success_rate -
            0.5 * penalty
        };
      })
    );

    return enriched.sort((a, b) => b.final_score - a.final_score)
  }

  negativePenalty(query, negatives) {
    return negatives.some(n => query.includes(n)) ? 0.3 : 0;
  }

  // =============================
  // SEARCH (WITH NEGATIVE SCORING)
  // =============================
  async searchRAG(config) {
    const embedding = await generateEmbedding(config.query);
    const minSimilarity = config.minSimilarity ?? 0.6;
    const topK = config.topK ?? 5;
    console.log(embedding, config, 'CONFIG')

    const client = await this.pool.connect();
    let embeddingVector = toSql(embedding);

    console.log(embeddingVector, "EMBEDDDIING")
    const res = await client.query(
      `SELECT id, text, action as handle, usage_count, success_rate,
        examples, negative_examples, (1 - (embedding <=> $1::vector)) AS similarity
       FROM ${this.quoteIdentifier(config.table)}
       WHERE 1 - (embedding <=> $1::vector) >= $2
       ORDER BY similarity DESC
       LIMIT $3`,
      [embeddingVector, minSimilarity, topK]
    );

    return res.rows
      .map(r => {
        const penalty = this.negativePenalty(config.query, r.negative_examples);

        return {
          ...r,
          penalty,
          final_score:
            0.6 * r.similarity +
            0.3 * r.success_rate -
            0.4 * penalty
        };
      })
      .sort((a, b) => b.final_score - a.final_score)
  }

  // =============================
  // CORE CRUD OPERATIONS
  // =============================

  /** Insert one or multiple RAG documents */
  private async insertDocuments(client: any, config: RagQueryConfig): Promise<RagDocument[]> {
    const dataArray = Array.isArray(config.data) ? config.data : [config.data] as RagDocument[];
    if (!dataArray || dataArray.length === 0) return [];

    const table = config.table || 'rag';
    const rows: RagDocument[] = [];

    for (const doc of dataArray) {
      const id = doc.id || this.generateId();

      // Handle embedding: if provided as string, use it; otherwise generate from text
      let embeddingValue: string;
      if (doc.embedding) {
        // If embedding is already a string (pgvector format), use it directly
        embeddingValue = doc.embedding;
      } else {
        // Generate embedding from text
        const embeddingArray = await generateEmbedding(doc.text);
        // Convert to pgvector format using toSql
        embeddingValue = toSql(embeddingArray);
      }

      const sql = `
        INSERT INTO ${this.quoteIdentifier(table)}
        (id, text, action, embedding, usage_count, success_rate, examples, negative_examples, created_at, updated_at)
        VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const params = [
        id,
        doc.text,
        doc.action,
        embeddingValue,           // Pass as string with ::vector cast
        doc.usage_count || 0,
        doc.success_rate || 0,
        doc.examples || [],       // PostgreSQL array
        doc.negative_examples || [],
        new Date(),
        new Date()
      ];

      const res = await client.query(sql, params);
      rows.push(this.parseDocument(res.rows[0]));
    }

    return rows;
  }

  /** Update documents matching where clause */
  private async updateDocuments(client: any, config: RagQueryConfig): Promise<RagDocument[]> {
    if (!config.data) throw new Error('No data provided for update');
    const table = config.table || 'rag';
    const data = config.data as RagDocument;

    const setParts: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.text) {
      setParts.push(`text = $${idx++}`);
      params.push(data.text);

      // If text changed, update embedding
      if (!data.embedding) {
        const embeddingArray = await generateEmbedding(data.text);
        const embeddingValue = toSql(embeddingArray);
        setParts.push(`embedding = $${idx++}::vector`);
        params.push(embeddingValue);
      }
    }

    if (data.action) {
      setParts.push(`action = $${idx++}`);
      params.push(data.action);
    }

    if (data.embedding) {
      setParts.push(`embedding = $${idx++}::vector`);
      params.push(data.embedding);
    }

    if (data.examples) {
      setParts.push(`examples = $${idx++}`);
      params.push(data.examples);
    }

    if (data.negative_examples) {
      setParts.push(`negative_examples = $${idx++}`);
      params.push(data.negative_examples);
    }

    if (data.usage_count !== undefined) {
      setParts.push(`usage_count = $${idx++}`);
      params.push(data.usage_count);
    }

    if (data.success_rate !== undefined) {
      setParts.push(`success_rate = $${idx++}`);
      params.push(data.success_rate);
    }

    setParts.push(`updated_at = $${idx++}`);
    params.push(new Date());

    if (setParts.length === 1) return [];

    let sql = `UPDATE ${this.quoteIdentifier(table)} SET ${setParts.join(', ')}`;

    if (config.where) {
      const { clause, whereParams } = this.buildWhere(config.where, idx);
      sql += ` WHERE ${clause}`;
      params.push(...whereParams);
    }

    sql += ' RETURNING *';
    const res = await client.query(sql, params);
    return res.rows.map((row: any) => this.parseDocument(row));
  }

  /** Delete documents matching where clause */
  private async deleteDocuments(client: any, config: RagQueryConfig): Promise<RagDocument[]> {
    const table = config.table || 'rag';
    let sql = `DELETE FROM ${this.quoteIdentifier(table)}`;
    let params: any[] = [];

    if (config.where) {
      const { clause, whereParams } = this.buildWhere(config.where, 1);
      sql += ` WHERE ${clause}`;
      params = whereParams;
    } else if (config.ids) {
      sql += ` WHERE id = ANY($1::text[])`;
      params = [config.ids];
    }

    sql += ' RETURNING *';
    const res = await client.query(sql, params);
    return res.rows.map((row: any) => this.parseDocument(row));
  }

  /** Read documents matching where clause */
  private async readDocuments(client: any, config: RagQueryConfig): Promise<RagDocument[]> {
    const table = config.table || 'rag';
    let sql = `SELECT * FROM ${this.quoteIdentifier(table)}`;
    let params: any[] = [];

    if (config.where) {
      const { clause, whereParams } = this.buildWhere(config.where, 1);
      sql += ` WHERE ${clause}`;
      params = whereParams;
    }

    if (config.orderBy) {
      sql += this.buildOrderBy(config.orderBy);
    }
    if (config.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(config.limit);
    }
    if (config.offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(config.offset);
    }

    const res = await client.query(sql, params);
    return res.rows.map((row: any) => this.parseDocument(row));
  }

  // =============================
  // VECTOR OPS
  // =============================
  async upsertRAG(item) {
    const embedding = await generateEmbedding(item.text);
    let embeddingVector = toSql(embedding || []);

    const client = await this.pool.connect();

    await client.query(
      `INSERT INTO rag VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET
     text=$2, action=$3, embedding=$4,
     usage_count=$5, success_rate=$6,
     examples=$7, negative_examples=$8`,
      [
        item.id,
        item.text,
        item.action,
        embeddingVector,
        item.usage_count || 0,
        item.success_rate || 0,
        item.examples || [],
        item.negative_examples || []
      ]
    );
  }

  async upsertAiRAG(item) {

    const embedding = await generateEmbedding(item.content);

    if (!embedding || !embedding.length) {
      throw new Error("Embedding failed");
    }


    const vector = `[${embedding.join(",")}]`;

    const client = await this.pool.connect();

    try {

      let oldRag = await this.readDocuments(client, { table: 'ai_memory', where: { scope_id: item.scope_id } })
      let id = this.generateId()
      console.log(oldRag)
      if (oldRag.length) {
        id = oldRag[0].id as any;
      }


      await client.query(
        `INSERT INTO ai_memory (id, scope, scope_id, content, embedding, examples, metadata)
       VALUES ($1,$2,$3,$4,$5::vector,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         scope=$2,
         scope_id=$3,
         content=$4,
         embedding=$5::vector,
         examples=$6,
         metadata=$7`,
        [
          id,
          item.scope,
          item.scope_id,
          item.content,
          vector,
          item.examples || [],
          item.metadata || {}
        ]
      );
    } finally {
      client.release();
    }
  }

  // =============================
  // SEMANTIC NEGATIVE PENALTY (EMBEDDING-BASED)
  // =============================
  async semanticNegativePenalty(queryEmbedding, negatives = []) {
    if (!negatives || negatives.length === 0) return 0;

    let maxSimilarity = 0;

    for (const neg of negatives) {
      const negEmbedding = await generateEmbedding(neg);
      const embeddingValue = toSql(negEmbedding);

      const similarity = this.cosineSimilarity(queryEmbedding, negEmbedding);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    }

    // scale penalty (only penalize if similarity is meaningful)
    if (maxSimilarity > 0.6) {
      return maxSimilarity; // stronger semantic match = stronger penalty
    }

    return 0;
  }

  // cosine helper (reused)
  cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
  }

  // =============================
  // AGENTS
  // =============================

  // PLANNER
  async planner(userInput, ragResults) {
    const prompt = `
You are a planner.
Choose best action.
Return lower confidence from 0.1 to 0.5, If No Available Action is provided in the context.
Return higher confidence from 0.5 to 1, if action is provided in the context.  

Context:
${ragResults.length ? JSON.stringify(ragResults.map(a => ({ text: a.text, action: a.action, examples: a.examples, negative_examples: a.negative_examples }))) : 'No Action'}

User: ${userInput}

Return JSON {action, confidence, parameters}`;



    return JSON.parse(await callLLM(prompt));
  }

  // EXECUTOR
  executor(action) {
    return { success: true, output: `Executed ${action.action}` };
  }

  // CRITIC
  async critic(userInput, action, result) {
    const prompt = `
Evaluate if action was correct.
User: ${userInput}
Action: ${JSON.stringify(action)}
Result: ${JSON.stringify(result)}

Return JSON {success: true/false}`;

    return JSON.parse(await callLLM(prompt));
  }

  // =============================
  // LEARNING
  // =============================


  async updateRAG(item, success, userInput) {
    const client = await this.pool.connect();

    let ragData = await this.readDocuments(client, { table: 'rag', where: { id: item.id } })
    let ragItem = ragData[0] as any;

    if (success) {
      ragItem.success_rate =
        (ragItem.success_rate * (ragItem.usage_count - 1) + 1) /
        ragItem.usage_count;

      ragItem.examples = ragItem.examples || [];
      if (!ragItem.examples.includes(userInput)) {
        ragItem.examples.push(userInput);
        ragItem.usage_count++;
      }

    } else {
      ragItem.negative_examples = ragItem.negative_examples || [];
      ragItem.negative_examples.push(userInput);
    }

    await this.upsertRAG({ ...item, ...ragItem });
  }

  async autoCreateIntent(userInput) {
    const prompt = `
Create intent JSON for: ${userInput}
Return JSON {id,text,action}`;

    const obj = JSON.parse(await callLLM(prompt));
    obj.id = generateEntityId(undefined, 'rag')
    obj.usage_count = 0;
    obj.success_rate = 0;
    console.log(obj, prompt, 'OBJ INTENT')
    await this.upsertRAG({ text: userInput, ...obj });
  }




  // =============================
  // SEARCH OPERATIONS
  // =============================

  /** Search documents using vector similarity with hybrid scoring */
  private async searchDocuments(client: any, config: RagQueryConfig): Promise<SearchResult[]> {
    const table = config.table || 'rag';
    const topK = config.topK || 5;
    const minSimilarity = config.minSimilarity || 0.5;

    let embeddingVector: string;

    if (config.embedding) {
      // Convert provided embedding array to pgvector format
      embeddingVector = toSql(config.embedding);
    } else if (config.query) {
      // Generate embedding from query
      const embeddingArray = await generateEmbedding(config.query);
      embeddingVector = toSql(embeddingArray);
    } else {
      throw new Error('Either embedding or query must be provided for search');
    }

    // Use pgvector's cosine similarity operator (<=>)
    const sql = `
      SELECT 
        id, text, action, usage_count, success_rate,
        examples, negative_examples, created_at, updated_at,
        1 - (embedding <=> $1::vector) AS similarity
      FROM ${this.quoteIdentifier(table)}
      WHERE 1 - (embedding <=> $1::vector) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `;

    const result = await client.query(sql, [embeddingVector, minSimilarity, topK]);

    let rows = result.rows.map((row: any) => ({
      ...this.parseDocument(row),
      similarity: parseFloat(row.similarity)
    }));

    if (config.includeScore !== false) {
      rows = rows.map(row => ({
        ...row,
        final_score: 0.7 * row.similarity + 0.3 * (row.success_rate || 0)
      }));
      rows.sort((a, b) => b.final_score - a.final_score);
    }

    return rows;
  }

  // =============================
  // STATISTICS & ANALYTICS
  // =============================

  /** Get comprehensive statistics about RAG system */
  private async getStatistics(client: any, config: RagQueryConfig): Promise<{
    summary: StatsSummary;
    topByUsage: RagDocument[];
    topBySuccess: RagDocument[];
    recentActivity: RagDocument[];
  }> {
    const table = config.table || 'rag';

    const statsQuery = `
      SELECT 
        COUNT(*) as total_entries,
        COALESCE(SUM(usage_count), 0) as total_uses,
        COALESCE(AVG(success_rate), 0) as avg_success_rate,
        COALESCE(AVG(usage_count), 0) as avg_usage_count,
        COUNT(CASE WHEN success_rate >= 0.8 THEN 1 END) as high_performing,
        COUNT(CASE WHEN success_rate < 0.5 THEN 1 END) as low_performing,
        COUNT(CASE WHEN usage_count = 0 THEN 1 END) as never_used,
        COALESCE(MAX(usage_count), 0) as max_usage,
        COALESCE(MAX(success_rate), 0) as max_success_rate,
        COALESCE(MIN(success_rate), 0) as min_success_rate
      FROM ${this.quoteIdentifier(table)}
    `;

    const statsResult = await client.query(statsQuery);

    const topByUsage = await client.query(`
      SELECT * FROM ${this.quoteIdentifier(table)}
      ORDER BY usage_count DESC
      LIMIT 10
    `);

    const topBySuccess = await client.query(`
      SELECT * FROM ${this.quoteIdentifier(table)}
      WHERE usage_count > 0
      ORDER BY success_rate DESC
      LIMIT 10
    `);

    const recentActivity = await client.query(`
      SELECT * FROM ${this.quoteIdentifier(table)}
      ORDER BY updated_at DESC
      LIMIT 20
    `);

    return {
      summary: statsResult.rows[0],
      topByUsage: topByUsage.rows.map((r: any) => this.parseDocument(r)),
      topBySuccess: topBySuccess.rows.map((r: any) => this.parseDocument(r)),
      recentActivity: recentActivity.rows.map((r: any) => this.parseDocument(r))
    };
  }

  /** Analyze underperforming entries */
  async analyzePerformance(config: {
    table?: string;
    threshold?: number;
    minUsage?: number;
  }): Promise<PerformanceAnalysis> {
    const threshold = config.threshold || 0.5;
    const minUsage = config.minUsage || 5;
    const table = config.table || 'rag';

    const result = await this.pool.query(`
      SELECT id, text, action, usage_count, success_rate,
             examples, negative_examples, created_at, updated_at,
             cardinality(examples) as example_count,
             cardinality(negative_examples) as negative_count
      FROM ${this.quoteIdentifier(table)}
      WHERE success_rate < $1 AND usage_count >= $2
      ORDER BY success_rate ASC
    `, [threshold, minUsage]);

    return {
      threshold,
      underperforming_count: result.rows.length,
      entries: result.rows.map((r: any) => this.parseDocument(r))
    };
  }

  // =============================
  // BATCH OPERATIONS
  // =============================

  /** Handle batch operations (create, delete) */
  private async batchOperation(client: any, config: RagQueryConfig): Promise<BatchResult> {
    if (config.entries) {
      return this.batchInsert(client, config);
    } else if (config.ids) {
      return this.batchDelete(client, config);
    } else {
      throw new Error('Batch operation requires entries or ids');
    }
  }

  /** Batch insert multiple documents */
  private async batchInsert(client: any, config: RagQueryConfig): Promise<BatchResult> {
    const entries = config.entries!;
    const results: { id: string; status: string }[] = [];
    const errors: { entry: any; error: string }[] = [];

    for (const entry of entries) {
      try {
        const doc = entry as RagDocument;
        const id = doc.id || this.generateId();

        // Generate embedding for each document
        const embeddingArray = await generateEmbedding(doc.text);
        const embeddingValue = toSql(embeddingArray);

        await client.query(
          `INSERT INTO ${this.quoteIdentifier(config.table || 'rag')}
           (id, text, action, embedding, usage_count, success_rate, examples, negative_examples, created_at, updated_at)
           VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8, $9, $10)`,
          [
            id,
            doc.text,
            doc.action,
            embeddingValue,
            doc.usage_count || 0,
            doc.success_rate || 0,
            doc.examples || [],
            doc.negative_examples || [],
            new Date(),
            new Date()
          ]
        );

        results.push({ id, status: 'success' });
      } catch (error: any) {
        errors.push({ entry, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      total: entries.length,
      successful: results.length,
      failed: errors.length
    };
  }

  /** Batch delete multiple documents by IDs */
  private async batchDelete(client: any, config: RagQueryConfig): Promise<{
    success: boolean;
    deleted: string[];
    not_found: string[];
  }> {
    const ids = config.ids!;
    const table = config.table || 'rag';

    const result = await client.query(
      `DELETE FROM ${this.quoteIdentifier(table)} WHERE id = ANY($1::text[]) RETURNING id`,
      [ids]
    );

    const deleted = result.rows.map((r: any) => r.id);
    const notFound = ids.filter(id => !deleted.includes(id));

    return {
      success: notFound.length === 0,
      deleted,
      not_found: notFound
    };
  }

  async feedback({ id, type, text }): Promise<{
    success: boolean;
    result: any;
    not_found: string[];
  }> {
    const client = await this.pool.connect();


    const result = await client.query(
      `SELECT * FROM rag WHERE id = $1`,
      [id]
    );

    if (result.rows[0]) {
      let record = result.rows[0];
      let examples = [...record.examples] as any;
      let negativeExamples = [...record.negative_examples] as any;

      if (type) {
        if (!examples.includes(text)) {
          examples.push(text);
        }
      } else {
        if (!negativeExamples.includes(text)) {
          negativeExamples.push(text);
        }
      }


      this.updateDocuments(client, { table: "rag", data: { examples, negative_examples: negativeExamples } as any, where: { id } })

    }


    return {
      success: true,
      result,
      not_found: ['']
    };
  }


  // =============================
  // MAINTENANCE OPERATIONS
  // =============================

  /** Rebuild embeddings for documents */
  async reindexDocuments(config: {
    table?: string;
    ids?: string[];
  }): Promise<{ total: number; updated: number; failed: number, updatedTexts: any }> {
    const table = config.table || 'rag';
    const client = await this.pool.connect();
    const updatedTexts = [] as any;
    try {
      let query = `SELECT * FROM ${this.quoteIdentifier(table)}`;
      let params: any[] = [];

      if (config.ids && config.ids.length > 0) {
        query += ` WHERE id = ANY($1::text[])`;
        params.push(config.ids);
      }

      const entries = await client.query(query, params);
      let updated = 0;
      let failed = 0;

      for (const entry of entries.rows) {
        try {
          console.log(entry, 'ENTRY')
          let completeTextContent = ``;
          let examplesText = `Examples:\n`;
          let negativeExamplesText = `Negative Examples:\n`;

          completeTextContent += `${entry.text}\n\n`;


          if (entry.examples.length) {
            for (const example of entry.examples) {
              examplesText += `- ${example}\n`;
            }
            completeTextContent += `${examplesText}\n\n`
          }

          //   if(entry.negative_examples.length){
          //   for(const example of entry.negative_examples){
          //         negativeExamplesText += `- ${example}\n`;
          //   }

          //   completeTextContent += `${negativeExamplesText}\n\n`
          // }


          updatedTexts.push(completeTextContent);
          // Generate new embedding
          const embeddingArray = await generateEmbedding(completeTextContent);
          const embeddingValue = toSql(embeddingArray);

          await client.query(
            `UPDATE ${this.quoteIdentifier(table)} 
             SET embedding = $1::vector, updated_at = $2 
             WHERE id = $3`,
            [embeddingValue, new Date(), entry.id]
          );
          updated++;
        } catch (error) {
          console.error(`Failed to reindex ${entry.id}:`, error);
          failed++;
        }
      }

      return {
        total: entries.rows.length,
        updated,
        failed,
        updatedTexts
      };
    } finally {
      client.release();
    }
  }



  /** Clean up low-quality or unused documents */
  private async cleanupOperation(client: any, config: RagQueryConfig): Promise<{
    dry_run: boolean;
    would_delete?: number;
    deleted_count?: number;
    deleted_entries?: RagDocument[];
    entries?: RagDocument[];
  }> {
    const table = config.table || 'rag';
    const unusedDays = config.unusedDays || 30;
    const minSuccessRate = config.minSuccessRate || 0.3;
    const dryRun = config.dryRun || false;

    const query = `
      ${dryRun ? 'SELECT' : 'DELETE FROM'}
      ${this.quoteIdentifier(table)}
      WHERE 
        (usage_count = 0 AND created_at < NOW() - INTERVAL '${unusedDays} days')
        OR (success_rate < ${minSuccessRate} AND usage_count > 0)
      ${dryRun ? '' : 'RETURNING id, text, action, success_rate, usage_count'}
    `;

    const result = await client.query(query);

    if (dryRun) {
      return {
        dry_run: true,
        would_delete: result.rows.length,
        entries: result.rows.map((r: any) => this.parseDocument(r))
      };
    }

    return {
      dry_run: false,
      deleted_count: result.rows.length,
      deleted_entries: result.rows.map((r: any) => this.parseDocument(r))
    };
  }

  // =============================
  // EXPORT & IMPORT
  // =============================

  /** Export RAG data */
  async exportData(config: {
    table?: string;
    ids?: string[];
    format?: 'json' | 'csv';
  }): Promise<RagDocument[] | string> {
    const table = config.table || 'rag';
    let query = `SELECT id, text, action, usage_count, success_rate, examples, negative_examples FROM ${this.quoteIdentifier(table)}`;
    let params: any[] = [];

    if (config.ids && config.ids.length > 0) {
      query += ` WHERE id = ANY($1::text[])`;
      params.push(config.ids);
    }

    const result = await this.pool.query(query, params);
    const documents = result.rows.map((r: any) => this.parseDocument(r));

    if (config.format === 'csv') {
      const headers = ['id', 'text', 'action', 'usage_count', 'success_rate', 'examples', 'negative_examples'];
      const csvRows = documents.map(doc =>
        headers.map(header => {
          const value = doc[header as keyof RagDocument];
          // Handle arrays properly for CSV
          if (Array.isArray(value)) {
            return `"${value.join(';')}"`;
          }
          return JSON.stringify(value || '');
        }).join(',')
      );
      return [headers.join(','), ...csvRows].join('\n');
    }

    return documents;
  }

  /** Import RAG data */
  async importData(config: {
    table?: string;
    entries: RagDocument[];
    overwrite?: boolean;
  }): Promise<{ total: number; imported: number; updated: number; failed: number }> {
    const table = config.table || 'rag';
    const overwrite = config.overwrite || false;
    let imported = 0;
    let updated = 0;
    let failed = 0;

    for (const entry of config.entries) {
      try {
        const id = entry.id || this.generateId();

        // Generate embedding for imported document
        const embeddingArray = await generateEmbedding(entry.text);
        const embeddingValue = toSql(embeddingArray);

        const sql = overwrite
          ? `INSERT INTO ${this.quoteIdentifier(table)}
             (id, text, action, embedding, usage_count, success_rate, examples, negative_examples, created_at, updated_at)
             VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
             text = EXCLUDED.text,
             action = EXCLUDED.action,
             embedding = EXCLUDED.embedding,
             examples = EXCLUDED.examples,
             negative_examples = EXCLUDED.negative_examples,
             updated_at = EXCLUDED.updated_at`
          : `INSERT INTO ${this.quoteIdentifier(table)}
             (id, text, action, embedding, usage_count, success_rate, examples, negative_examples, created_at, updated_at)
             VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`;

        const result = await this.pool.query(sql, [
          id,
          entry.text,
          entry.action,
          embeddingValue,
          entry.usage_count || 0,
          entry.success_rate || 0,
          entry.examples || [],
          entry.negative_examples || [],
          new Date(),
          new Date()
        ]);

        if (overwrite) {
          if (result.rowCount === 1) imported++;
          else updated++;
        } else {
          imported++;
        }
      } catch (error) {
        failed++;
        console.error(`Failed to import ${entry.id}:`, error);
      }
    }

    return {
      total: config.entries.length,
      imported,
      updated,
      failed
    };
  }

  // =============================
  // UTILITY FUNCTIONS
  // =============================

  /** Parse database row to RagDocument */
  private parseDocument(row: any): RagDocument {
    return {
      id: row.id,
      text: row.text,
      action: row.action,
      usage_count: row.usage_count,
      success_rate: row.success_rate,
      examples: row.examples || [],
      negative_examples: row.negative_examples || [],
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /** Raw SQL execution */
  private async executeRaw(sql: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  /** Build WHERE clause from JSON-style conditions */
  private buildWhere(condition: any, startIndex: number): { clause: string; whereParams: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];
    let idx = startIndex;

    for (const [field, val] of Object.entries(condition)) {
      clauses.push(`${this.quoteIdentifier(field)} = $${idx++}`);
      params.push(val);
    }

    return { clause: clauses.join(' AND '), whereParams: params };
  }

  /** Build ORDER BY clause */
  private buildOrderBy(orderBy: any): string {
    const parts: string[] = [];
    if (Array.isArray(orderBy)) {
      for (const ob of orderBy) {
        parts.push(`${this.quoteIdentifier(ob.field)} ${ob.direction || 'ASC'}`);
      }
    } else {
      for (const [f, d] of Object.entries(orderBy)) {
        parts.push(`${this.quoteIdentifier(f)} ${d}`);
      }
    }
    return parts.length ? ` ORDER BY ${parts.join(', ')}` : '';
  }

  /** Quote identifiers safely */
  private quoteIdentifier(identifier: string) {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /** Generate a unique ID for a document */
  private generateId() {
    return generateEntityId(undefined, "rag");
  }
}