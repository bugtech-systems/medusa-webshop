import { Pool } from 'pg';
import { randomBytes } from 'crypto';

export interface JoinConfig {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: Record<string, string>;
  fields?: string[];
}

export interface OrderByConfig {
  field: string;
  direction?: 'ASC' | 'DESC';
}

export interface QueryConfig {
  // JSON-based operation
  operation?: 'read' | 'create' | 'update' | 'delete' | 'upsert' | 'count' | 'exists' | 'batch_create';
  table?: string;
  fields?: string[] | '*';
  data?: Record<string, any> | Record<string, any>[];
  where?: any;
  joins?: JoinConfig[];
  orderBy?: OrderByConfig[] | Record<string, 'ASC' | 'DESC'>;
  limit?: any;
  offset?: any;
  groupBy?: string[];
  having?: Record<string, any>;
  returning?: string[] | '*';
  onConflict?: {
    target: string[];
    update?: string[];
    where?: Record<string, any>;
  };
  skipIdGeneration?: boolean; // Allow skipping ID generation for custom IDs
  idPrefix?: string; // Custom prefix for ID generation

  // Raw SQL execution
  sql?: string;
  params?: any[];
}

export class DbOperationService {
  private pool: Pool;
  private reservedKeywords = new Set(['order', 'user', 'group', 'select', 'insert', 'update', 'delete', 'table', 'where', 'from', 'to', 'as', 'on', 'by', 'with', 'like', 'between', 'in', 'is', 'null', 'not', 'and', 'or', 'case', 'when', 'then', 'else', 'end', 'exists', 'all', 'any', 'some', 'distinct', 'limit', 'offset', 'fetch', 'for', 'if', 'primary', 'key', 'foreign', 'references', 'constraint', 'check', 'default', 'index', 'view', 'sequence', 'trigger', 'procedure', 'function', 'grant', 'revoke']);

  // Map table names to Medusa ID prefixes
  private tablePrefixMap: Map<string, string> = new Map([
    ['order', 'order_'],
    ['orders', 'order_'],
    ['product', 'prod_'],
    ['products', 'prod_'],
    ['product_variant', 'var_'],
    ['product_variants', 'var_'],
    ['product_collection', 'pcol_'],
    ['product_collections', 'pcol_'],
    ['customer', 'cus_'],
    ['customers', 'cus_'],
    ['payment', 'pay_'],
    ['payments', 'pay_'],
    ['payment_session', 'payses_'],
    ['payment_sessions', 'payses_'],
    ['shipping_method', 'ship_'],
    ['shipping_methods', 'ship_'],
    ['region', 'reg_'],
    ['regions', 'reg_'],
    ['cart', 'cart_'],
    ['carts', 'cart_'],
    ['claim', 'claim_'],
    ['claims', 'claim_'],
    ['return', 'ret_'],
    ['returns', 'ret_'],
    ['swap', 'swap_'],
    ['swaps', 'swap_'],
    ['fulfillment', 'ful_'],
    ['fulfillments', 'ful_'],
    ['order_item', 'item_'],
    ['order_items', 'item_'],
    ['order_line_item', 'line_'],
    ['order_line_items', 'line_'],
    ['inventory_item', 'inv_'],
    ['inventory_items', 'inv_'],
    ['stock_location', 'sloc_'],
    ['stock_locations', 'sloc_'],
    ['price_list', 'plist_'],
    ['price_lists', 'plist_'],
    ['sales_channel', 'sc_'],
    ['sales_channels', 'sc_']
  ]);

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async execute(config: QueryConfig): Promise<any> {
    // Raw SQL path
    if (config.sql) {
      return this.executeRaw(config.sql, config.params || []);
    }

    // JSON-based operation path
    const client = await this.pool.connect();
    try {
      const { sql, params } = this.buildQuery(config);
      const result = await client.query(sql, params);
      let formattedResult = result.rows as any;
      
      // For read operations with joins, transform the result to nested structure
      if (config.operation === 'read' && config.joins && config.joins.length > 0) {
        formattedResult = this.transformJoinResult(formattedResult, config);
      }
     
      return formattedResult;
    } catch (error) {
      console.log(error, 'ERRORR');
      return { success: false, status: 'error', message: `Database operation failed: ${error.message}` };
    } finally {
      client.release();
    }
  }

  private async executeRaw(sql: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  private buildQuery(config: QueryConfig): { sql: string; params: any[] } {
    // Ensure returning is set for mutations
    if (['create', 'update', 'upsert', 'batch_create'].includes(config.operation || '') && !config.returning) {
      config.returning = '*'; // Default to returning all columns
    }
  
    switch (config.operation) {
      case 'read': return this.buildSelect(config);
      case 'create': return this.buildInsert(config);
      case 'update': return this.buildUpdate(config);
      case 'delete': return this.buildDelete(config);
      case 'upsert': return this.buildUpsert(config);
      case 'count': return this.buildCount(config);
      case 'exists': return this.buildExists(config);
      case 'batch_create': return this.buildBatchInsert(config);
      default: throw new Error(`Unsupported operation: ${config.operation}`);
    }
  }

  // ----- SELECT -----
  private buildSelect(config: QueryConfig): { sql: string; params: any[] } {
    const params: any[] = [];
    let paramIndex = 1;

    // Build fields with aliases for nested structure
    const fields = this.buildFieldsWithAliases(config.table, config.fields || '*', config.joins);
    let sql = `SELECT ${fields} FROM ${this.quoteIdentifier(config.table!)}`;

    if (config.joins) {
      sql += this.buildJoins(config.joins, params, paramIndex);
      paramIndex += params.length;
    }

    if (config.where && Object.keys(config.where).length) {
      const whereClause = this.buildWhere(config.where, params, paramIndex);
      sql += ` WHERE ${whereClause}`;
      paramIndex = params.length + 1;
    }

    if (config.groupBy?.length) {
      sql += ` GROUP BY ${config.groupBy.map(f => this.quoteIdentifier(f)).join(', ')}`;
    }

    if (config.having && Object.keys(config.having).length) {
      const havingClause = this.buildWhere(config.having, params, paramIndex + params.length);
      sql += ` HAVING ${havingClause}`;
    }

    if (config.orderBy && config.orderBy.length) {
      sql += this.buildOrderBy(config.orderBy);
    }

    // Add LIMIT and OFFSET using the current paramIndex
    if (config.limit !== undefined && config.limit !== null) {
      const limit = Number(config.limit);
      if (isNaN(limit)) throw new Error('LIMIT must be a number');
      sql += ` LIMIT $${paramIndex}`;
      params.push(limit);
      paramIndex++;
    }
    if (config.offset !== undefined && config.offset !== null) {
      const offset = Number(config.offset);
      if (isNaN(offset)) throw new Error('OFFSET must be a number');
      sql += ` OFFSET $${paramIndex}`;
      params.push(offset);
      paramIndex++;
    }

    return { sql, params };
  }

  private buildFields(fields: string | string[], joins?: JoinConfig[]): string {
    const fieldList: string[] = [];
    if (fields === '*') {
      fieldList.push('*');
    } else if (Array.isArray(fields)) {
      fieldList.push(...fields.map(f => this.quoteIdentifierWithAlias(f)));
    }
    if (joins) {
      for (const join of joins) {
        if (join.fields) {
          fieldList.push(...join.fields.map(f => this.quoteIdentifierWithAlias(f)));
        }
      }
    }
    return fieldList.join(', ');
  }

  private buildJoins(joins: JoinConfig[], params: any[], startIndex: number): string {
    let sql = '';
    for (const join of joins) {
      sql += ` ${join.type} JOIN ${this.quoteIdentifier(join.table)} ON `;
      const onConditions = Object.entries(join.on).map(([left, right]) => {
        return `${this.quoteIdentifier(left)} = ${this.quoteIdentifier(right)}`;
      });
      sql += onConditions.join(' AND ');
    }
    return sql;
  }

  private buildOrderBy(orderBy: OrderByConfig[] | Record<string, 'ASC' | 'DESC'>): string {
    const orders: string[] = [];
    if (Array.isArray(orderBy)) {
      for (const item of orderBy) {
        orders.push(`${this.quoteIdentifier(item.field)} ${item.direction || 'ASC'}`);
      }
    } else {
      for (const [field, dir] of Object.entries(orderBy)) {
        orders.push(`${this.quoteIdentifier(field)} ${dir}`);
      }
    }
    return ` ORDER BY ${orders.join(', ')}`;
  }

  // ----- INSERT -----
  private buildInsert(config: QueryConfig): { sql: string; params: any[] } {
    const data = Array.isArray(config.data) ? config.data[0] : config.data;
    const sanitized = this.sanitizeData(data);
    
    // Generate ID if not provided and not skipping generation
    if (!sanitized.id && !config.skipIdGeneration) {
      const prefix = config.idPrefix || this.getTablePrefix(config.table!);
      sanitized.id = this.generateMedusaId(prefix);
    }

    const columns = Object.keys(sanitized).map(c => this.quoteIdentifier(c));
    const values = Object.values(sanitized);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    let sql = `INSERT INTO ${this.quoteIdentifier(config.table!)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    if (config.onConflict) {
      sql += this.buildOnConflict(config.onConflict, values.length);
    }

    sql += this.buildReturning(config.returning);
    return { sql, params: values };
  }

  private buildOnConflict(onConflict: any, valueCount: number): string {
    const target = onConflict.target.map((c: string) => this.quoteIdentifier(c)).join(', ');
    let clause = ` ON CONFLICT (${target})`;
    if (onConflict.update?.length) {
      const updates = onConflict.update.map((col: string) =>
        `${this.quoteIdentifier(col)} = EXCLUDED.${this.quoteIdentifier(col)}`
      ).join(', ');
      clause += ` DO UPDATE SET ${updates}`;
      if (onConflict.where) {
        const whereClause = this.buildWhere(onConflict.where, [], valueCount + 1);
        clause += ` WHERE ${whereClause}`;
      }
    } else {
      clause += ` DO NOTHING`;
    }
    return clause;
  }

  // ----- UPDATE -----
  private buildUpdate(config: QueryConfig): { sql: string; params: any[] } {
    const data = this.sanitizeData(config.data as Record<string, any>);
    delete data.id; // Don't update ID field

    const params = Object.values(data);
    const setClause = Object.keys(data).map((key, i) =>
      `${this.quoteIdentifier(key)} = $${i + 1}`
    ).join(', ');

    let sql = `UPDATE ${this.quoteIdentifier(config.table!)} SET ${setClause}`;

    if (config.where) {
      const whereClause = this.buildWhere(config.where, params, params.length + 1);
      sql += ` WHERE ${whereClause}`;
    }

    sql += this.buildReturning(config.returning);
    return { sql, params };
  }

  // ----- DELETE -----
  private buildDelete(config: QueryConfig): { sql: string; params: any[] } {
    const params: any[] = [];
    let sql = `DELETE FROM ${this.quoteIdentifier(config.table!)}`;

    if (config.where) {
      const whereClause = this.buildWhere(config.where, params, 1);
      sql += ` WHERE ${whereClause}`;
    }

    sql += this.buildReturning(config.returning);
    return { sql, params };
  }

  // ----- UPSERT (PostgreSQL) -----
  private buildUpsert(config: QueryConfig): { sql: string; params: any[] } {
    const insertConfig = {
      ...config,
      onConflict: config.onConflict || {
        target: ['id'],
        update: Object.keys(config.data as Record<string, any>).filter(k => k !== 'id')
      }
    };
    return this.buildInsert(insertConfig);
  }

  // ----- COUNT -----
  private buildCount(config: QueryConfig): { sql: string; params: any[] } {
    const params: any[] = [];
    let sql = `SELECT COUNT(*) as count FROM ${this.quoteIdentifier(config.table!)}`;

    if (config.joins) {
      sql += this.buildJoins(config.joins, params, 1);
    }

    if (config.where) {
      const whereClause = this.buildWhere(config.where, params, params.length + 1);
      sql += ` WHERE ${whereClause}`;
    }

    return { sql, params };
  }

  // ----- EXISTS -----
  private buildExists(config: QueryConfig): { sql: string; params: any[] } {
    const params: any[] = [];
    let sql = `SELECT EXISTS(SELECT 1 FROM ${this.quoteIdentifier(config.table!)}`;

    if (config.joins) {
      sql += this.buildJoins(config.joins, params, 1);
    }

    if (config.where) {
      const whereClause = this.buildWhere(config.where, params, params.length + 1);
      sql += ` WHERE ${whereClause}`;
    }

    sql += `) as exists`;
    return { sql, params };
  }

  // ----- BATCH INSERT -----
  private buildBatchInsert(config: QueryConfig): { sql: string; params: any[] } {
    const dataArray = config.data as Record<string, any>[];
    if (!dataArray.length) throw new Error('Batch insert requires data array');

    const first = dataArray[0];
    const columns = Object.keys(this.sanitizeData(first)).map(c => this.quoteIdentifier(c));
    const allValues: any[] = [];
    const rowPlaceholders: string[] = [];

    dataArray.forEach((row, rowIndex) => {
      const sanitized = this.sanitizeData(row);
      
      // Generate ID if not provided and not skipping generation
      if (!sanitized.id && !config.skipIdGeneration) {
        const prefix = config.idPrefix || this.getTablePrefix(config.table!);
        sanitized.id = this.generateMedusaId(prefix);
      }
      
      const rowValues = Object.values(sanitized);
      const placeholders = rowValues.map((_, i) => `$${allValues.length + i + 1}`).join(', ');
      rowPlaceholders.push(`(${placeholders})`);
      allValues.push(...rowValues);
    });

    let sql = `INSERT INTO ${this.quoteIdentifier(config.table!)} (${columns.join(', ')}) VALUES ${rowPlaceholders.join(', ')}`;
    sql += this.buildReturning(config.returning);
    return { sql, params: allValues };
  }

  // ----- WHERE BUILDER (Advanced) -----
  private buildWhere(condition: any, params: any[], startIndex: number): string {
    if (condition === null || condition === undefined) return '';

    // Helper to recursively process conditions
    const process = (cond: any, offset: number): { clause: string; paramCount: number } => {
      // Simple key-value object: { field: value } or { field: { $op: value } }
      if (typeof cond === 'object' && !Array.isArray(cond) && !cond.$and && !cond.$or && !cond.and && !cond.or) {
        const entries = Object.entries(cond);
        let clauseParts: string[] = [];
        let addedParams = 0;
        for (const [key, val] of entries) {
          const result = this.parseConditionWithOffset(key, val, params, offset + addedParams);
          clauseParts.push(result.clause);
          addedParams += result.paramCount;
        }
        return { clause: clauseParts.join(' AND '), paramCount: addedParams };
      }

      // Logical groups: $and, $or, and, or
      const andGroup = cond.$and || cond.and;
      const orGroup = cond.$or || cond.or;
      if (andGroup || orGroup) {
        const logical = andGroup ? 'AND' : 'OR';
        const group = andGroup || orGroup;
        if (!Array.isArray(group)) throw new Error('Logical group must be an array');

        let subClauses: string[] = [];
        let totalParams = 0;
        for (const subCond of group) {
          const result = process(subCond, offset + totalParams);
          subClauses.push(result.clause);
          totalParams += result.paramCount;
        }
        return {
          clause: `(${subClauses.join(` ${logical} `)})`,
          paramCount: totalParams
        };
      }

      // Legacy array format: [{ field, operator, value }]
      if (Array.isArray(cond)) {
        let clauseParts: string[] = [];
        let addedParams = 0;
        for (const item of cond) {
          if (item.conditions) {
            const nested = process(item.conditions, offset + addedParams);
            clauseParts.push(`(${nested.clause})`);
            addedParams += nested.paramCount;
          } else {
            const result = this.parseConditionWithOffset(
              item.field,
              { [item.operator]: item.value },
              params,
              offset + addedParams
            );
            clauseParts.push(result.clause);
            addedParams += result.paramCount;
          }
        }
        return { clause: clauseParts.join(' AND '), paramCount: addedParams };
      }

      throw new Error('Invalid where format');
    };

    const result = process(condition, startIndex - 1); // startIndex is 1-based, convert to 0-based offset
    return result.clause;
  }

  /**
   * Build fields with special aliases to enable nested object reconstruction
   * Format: main_table.field, joined_table.field as joinName_field
   */
  private transformJoinResult(rows: any[], config: QueryConfig): any[] {
    if (!config.joins || config.joins.length === 0) {
      return rows;
    }

    // Create a map of join aliases to their table names
    const joinMap: Record<string, { table: string, alias: string }> = {};
    for (const join of config.joins) {
      const alias = this.getTableAlias(join.table);
      const tableName = this.extractTableName(join.table);
      joinMap[alias] = { table: tableName, alias };
    }

    return rows.map(row => {
      const result: any = {};
      
      // First, identify all joined table prefixes
      const joinPrefixes = Object.keys(joinMap).map(alias => `${alias}_`);
      
      // Separate fields into main and joined
      const joinedFields: Record<string, Record<string, any>> = {};
      
      for (const [key, value] of Object.entries(row)) {
        let isJoinedField = false;
        
        // Check if this field belongs to a joined table
        for (const alias of Object.keys(joinMap)) {
          const prefix = `${alias}_`;
          if (key.startsWith(prefix)) {
            // This is a joined table field
            const fieldName = key.substring(prefix.length);
            if (!joinedFields[alias]) {
              joinedFields[alias] = {};
            }
            joinedFields[alias][fieldName] = value;
            isJoinedField = true;
            break;
          }
        }
        
        // If not a joined field, it belongs to the main table
        if (!isJoinedField) {
          result[key] = value;
        }
      }
      
      // Attach joined data as nested objects using the alias as the property name
      for (const [alias, fields] of Object.entries(joinedFields)) {
        // Check if there's at least one non-null value in the joined data
        const hasData = Object.values(fields).some(v => v !== null);
        
        if (hasData) {
          // Use the alias as the nested object property name (without _ suffix)
          result[alias] = fields;
        } else {
          // If all values are null, set to null (no join match)
          result[alias] = null;
        }
      }
      
      return result;
    });
  }
  
  /**
   * Override buildFieldsWithAliases to ensure proper field aliasing
   */
  private buildFieldsWithAliases(table: any, fields: string | string[], joins?: JoinConfig[]): string {
    const fieldList: string[] = [];
    
    // Handle main table fields
    if (fields === '*') {
      // When using *, we need to explicitly list fields to avoid conflicts
      // This is a limitation - better to specify fields explicitly
      fieldList.push(`${this.quoteIdentifier(table!)}.*`);
    } else if (Array.isArray(fields)) {
      // Add main table fields without special aliasing
      for (const field of fields) {
        // If field already has table prefix, use it as is
        if (field.includes('.')) {
          fieldList.push(this.quoteIdentifierWithAlias(field));
        } else {
          // Assume it's from main table
          fieldList.push(this.quoteIdentifierWithAlias(field));
        }
      }
    }

    // Handle joined table fields with special aliasing for nesting
    if (joins) {
      for (const join of joins) {
        if (join.fields) {
          const joinAlias = this.getTableAlias(join.table);
          const joinTableName = this.extractTableName(join.table);
          
          for (const field of join.fields) {
            let fieldExpr = field;
            // If field doesn't have table prefix, add the join table name
            if (!field.includes('.')) {
              fieldExpr = `${joinTableName}.${field}`;
            }
            
            // Extract the base field name (without alias if present)
            const fieldName = field.split('.').pop()?.split(' as ')[0] || field;
            
            // Create alias with format: joinAlias_fieldName
            // This allows us to identify which table the field belongs to
            const alias = `${joinAlias}_${fieldName}`;
            
            // Add the field with alias
            fieldList.push(`${this.quoteIdentifierWithAlias(fieldExpr)} AS "${alias}"`);
          }
        }
      }
    }

    return fieldList.join(', ');
  }

  /**
   * Extract table alias from table expression
   */
  private getTableAlias(tableExpr: string): string {
    // Check if there's an AS clause
    const asMatch = tableExpr.match(/\s+as\s+([^\s]+)/i);
    if (asMatch) {
      return asMatch[1];
    }
    
    // Check if there's a space (alias without AS)
    const parts = tableExpr.split(/\s+/);
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    
    // No alias, use table name as alias
    return tableExpr;
  }

  /**
   * Extract base table name without alias
   */
  private extractTableName(tableExpr: string): string {
    // Remove AS clause if present
    const withoutAs = tableExpr.replace(/\s+as\s+[^\s]+/i, '');
    // Get first part before any space
    return withoutAs.split(/\s+/)[0];
  }

  // Enhanced parseCondition that returns both clause and number of parameters added
  private parseConditionWithOffset(
    field: string,
    operatorValue: any,
    params: any[],
    offset: number // 0-based offset into params array
  ): { clause: string; paramCount: number } {
    const quotedField = this.quoteIdentifier(field);
    let operator: string;
    let value: any;

    if (typeof operatorValue === 'object' && operatorValue !== null && !Array.isArray(operatorValue)) {
      const op = Object.keys(operatorValue)[0];
      value = operatorValue[op];
      operator = this.mapOperator(op);
    } else {
      operator = '=';
      value = operatorValue;
    }

    // Handle NULL operators
    if (value === undefined) {
      if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
        return { clause: `${quotedField} ${operator}`, paramCount: 0 };
      }
      throw new Error(`Value required for operator ${operator}`);
    }

    let clause: string;
    let paramCount: number;

    if (operator === 'IN' || operator === 'NOT IN') {
      if (!Array.isArray(value)) value = [value];
      const placeholders = value.map((_, i) => `$${offset + i + 1}`).join(', ');
      clause = `${quotedField} ${operator} (${placeholders})`;
      paramCount = value.length;
      params.push(...value);
    } else if (operator === 'BETWEEN') {
      if (!Array.isArray(value) || value.length !== 2) throw new Error('BETWEEN requires [low, high]');
      clause = `${quotedField} BETWEEN $${offset + 1} AND $${offset + 2}`;
      paramCount = 2;
      params.push(value[0], value[1]);
    } else {
      clause = `${quotedField} ${operator} $${offset + 1}`;
      paramCount = 1;
      params.push(value);
    }

    return { clause, paramCount };
  }

  private mapOperator(op: string): string {
    const map: Record<string, string> = {
      '$eq': '=',
      '$ne': '!=',
      '$gt': '>',
      '$gte': '>=',
      '$lt': '<',
      '$lte': '<=',
      '$like': 'LIKE',
      '$ilike': 'ILIKE',
      '$in': 'IN',
      '$nin': 'NOT IN',
      '$isnull': 'IS NULL',
      '$notnull': 'IS NOT NULL',
      '$between': 'BETWEEN'
    };
    return map[op] || op;
  }

  // ----- HELPERS -----
  private quoteIdentifier(identifier: string): string {
    const parts = identifier.split('.');
    return parts.map(part => {
      if (this.reservedKeywords.has(part.toLowerCase())) {
        return `"${part}"`;
      }
      return part;
    }).join('.');
  }

  private quoteIdentifierWithAlias(fieldExpr: string): string {
    const parts = fieldExpr.split(/\s+as\s+/i);
    const field = this.quoteIdentifier(parts[0]);
    if (parts.length > 1) {
      return `${field} AS "${parts[1]}"`;
    }
    return field;
  }

  private buildReturning(returning?: string[] | '*'): string {
    if (!returning) return '';
    if (returning === '*') return ' RETURNING *';
    return ` RETURNING ${returning.map(f => this.quoteIdentifier(f)).join(', ')}`;
  }

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'object' && value !== null && !(value instanceof Buffer)) {
        // Don't stringify if it's already a string or needs to be kept as JSONB
        if (!(value instanceof Array) && typeof value !== 'string') {
          sanitized[key] = JSON.stringify(value);
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Generate Medusa-style ID with timestamp and random bytes
   * Format: {prefix}01KMDV7A9VST261B366XR72EQP
   */
  private generateMedusaId(prefix: string = ''): string {
    // Base32 characters (RFC 4648)
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    
    // Get current timestamp in milliseconds
    const timestamp = Date.now();
    
    // Convert timestamp to base32 (12 characters)
    let timePart = '';
    let remaining = timestamp;
    for (let i = 0; i < 12; i++) {
      timePart = base32Chars[remaining & 31] + timePart;
      remaining = Math.floor(remaining / 32);
    }
    // Pad with zeros if needed
    timePart = timePart.padStart(12, 'A');
    
    // Generate 12 bytes of random data (16 characters in base32)
    const randomBytes = this.generateRandomBase32(16);
    
    // Combine: prefix + timePart + randomPart
    return `${prefix}${timePart}${randomBytes}`;
  }

  /**
   * Generate random base32 string of specified length
   */
  private generateRandomBase32(length: number): string {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    const bytes = randomBytes(Math.ceil(length * 5 / 8));
    
    let bitBuffer = 0;
    let bitCount = 0;
    
    for (let i = 0; i < bytes.length; i++) {
      bitBuffer = (bitBuffer << 8) | bytes[i];
      bitCount += 8;
      
      while (bitCount >= 5 && result.length < length) {
        const index = (bitBuffer >> (bitCount - 5)) & 31;
        result += base32Chars[index];
        bitCount -= 5;
      }
    }
    
    // Pad if necessary
    if (result.length < length && bitCount > 0) {
      const index = (bitBuffer << (5 - bitCount)) & 31;
      result += base32Chars[index];
    }
    
    return result.padEnd(length, 'A');
  }

  /**
   * Get the Medusa ID prefix for a table
   */
  private getTablePrefix(table: string): string {
    const normalizedTable = table.toLowerCase();
    
    // Check for exact match
    if (this.tablePrefixMap.has(normalizedTable)) {
      return this.tablePrefixMap.get(normalizedTable)!;
    }
    
    // Check for singular/plural variations
    const singular = normalizedTable.replace(/s$/, '');
    if (this.tablePrefixMap.has(singular)) {
      return this.tablePrefixMap.get(singular)!;
    }
    
    // Default prefix based on table name
    return `${normalizedTable.slice(0, 4)}_`;
  }
}