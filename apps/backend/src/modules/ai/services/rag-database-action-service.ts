import { Pool } from 'pg';
import crypto from 'crypto';

export interface RagDocument {
  id?: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[]; // Optional precomputed vector
  created_at?: Date;
}

export interface RagQueryConfig {
  operation?: 'insert' | 'update' | 'delete' | 'read' | 'search';
  table?: string;
  data?: RagDocument | RagDocument[];
  where?: any;
  orderBy?: { field: string; direction?: 'ASC' | 'DESC' }[] | Record<string, 'ASC' | 'DESC'>;
  limit?: number;
  offset?: number;
  sql?: string;
  params?: any[];
  embedding?: number[]; // For search queries
  topK?: number;        // Number of nearest neighbors to retrieve
}

export class AiRagOperationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /** Main execute function */
  async execute(config: RagQueryConfig): Promise<any> {
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
        default:
          throw new Error(`Unsupported operation: ${config.operation}`);
      }
    } finally {
      client.release();
    }
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

  /** Insert one or multiple documents */
  private async insertDocuments(client: any, config: RagQueryConfig) {
    const dataArray = Array.isArray(config.data) ? config.data : [config.data] as any;
    if (!dataArray || dataArray.length === 0) return [];

    const table = config.table!;
    const rows: any[] = [];

    for (const doc of dataArray) {
      const id = this.generateId();
      const scope_id = doc.scope_id || null;
      const embeddingJson = doc.embedding ? JSON.stringify(doc.embedding) : null;
      const metadataJson = doc.metadata ? JSON.stringify(doc.metadata) : null;
      const scope = doc.scope ? doc.scope : null;

      const sql = `
        INSERT INTO ${this.quoteIdentifier(table)}
        (id, scope_id, scope, content, metadata, embedding, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const params = [id, scope_id, scope, doc.content, metadataJson, embeddingJson, new Date()];
      const res = await client.query(sql, params);
      rows.push(res.rows[0]);
    }

    return rows;
  }

  /** Update documents matching where clause */
  private async updateDocuments(client: any, config: RagQueryConfig) {
    if (!config.data) throw new Error('No data provided for update');
    const table = config.table!;
    const data = config.data as RagDocument;

    const setParts: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.content) {
      setParts.push(`content = $${idx++}`);
      params.push(data.content);
    }
    if (data.metadata) {
      setParts.push(`metadata = $${idx++}`);
      params.push(JSON.stringify(data.metadata));
    }
    if (data.embedding) {
      setParts.push(`embedding = $${idx++}`);
      params.push(JSON.stringify(data.embedding));
    }

    if (setParts.length === 0) return [];

    let sql = `UPDATE ${this.quoteIdentifier(table)} SET ${setParts.join(', ')}`;

    if (config.where) {
      const { clause, whereParams } = this.buildWhere(config.where, idx);
      sql += ` WHERE ${clause}`;
      params.push(...whereParams);
    }

    sql += ' RETURNING *';
    const res = await client.query(sql, params);
    return res.rows;
  }

  /** Delete documents matching where clause */
  private async deleteDocuments(client: any, config: RagQueryConfig) {
    const table = config.table!;
    let sql = `DELETE FROM ${this.quoteIdentifier(table)}`;
    let params: any[] = [];

    if (config.where) {
      const { clause, whereParams } = this.buildWhere(config.where, 1);
      sql += ` WHERE ${clause}`;
      params = whereParams;
    }

    sql += ' RETURNING *';
    const res = await client.query(sql, params);
    return res.rows;
  }

  /** Read documents matching where clause */
  private async readDocuments(client: any, config: RagQueryConfig) {
    const table = config.table!;
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
    return res.rows;
  }

  /** Search documents using vector similarity */
  private async searchDocuments(client: any, config: RagQueryConfig) {
    if (!config.embedding) throw new Error('Embedding required for search');
    const table = config.table!;
    const topK = config.topK || 5;

    // Assume embeddings stored as JSON arrays in embedding column
    const embedding = config.embedding;
    const embeddingStr = JSON.stringify(embedding);

    
    // Compute cosine similarity in SQL
    // (simplest version, assumes small tables; production should use pgvector or similar)
 const sql = `
  SELECT id, content,
    embedding <=> $1::vector AS distance
  FROM ai_memory
  ORDER BY embedding <=> $1::vector
  LIMIT $2
`;

const result = await client.query(sql, [embeddingStr, 5]);
    return result.rows;
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
    return crypto.randomBytes(8).toString('hex');
  }
}