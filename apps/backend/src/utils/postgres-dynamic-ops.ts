// src/utils/postgres-dynamic-ops.ts
import { 
  Logger,
} from "@medusajs/types"
import { 
  MedusaError,
  TransactionState
} from "@medusajs/framework/utils"
import { 
  EntityManager, 
  QueryRunner, 
  Connection, 
  ObjectType, 
  Repository,
  InsertResult,
  UpdateResult,
  DeleteResult,
  DataSource,
  QueryBuilder,
  SelectQueryBuilder
} from "typeorm"
import { 
  camelCase, 
  snakeCase, 
  isObject, 
  isArray, 
  cloneDeep,
  get,
  set
} from "lodash"

export interface QueryOptions {
  alias?: string
  relations?: string[]
  select?: string[]
  where?: Record<string, any>
  order?: Record<string, 'ASC' | 'DESC'>
  skip?: number
  take?: number
  lock?: { mode: 'optimistic' | 'pessimistic'; version?: number }
  withDeleted?: boolean
  distinct?: boolean
  groupBy?: string[]
  having?: string
}

export interface JoinOptions {
  alias: string
  condition: string
  type?: 'inner' | 'left' | 'right'
  select?: string[]
}

export interface RawQueryOptions {
  parameters?: Record<string, any>
  transaction?: boolean
  timeout?: number
}

export class PostgresDynamicOps {
  private logger_: Logger
  private connection_: Connection

  constructor({ logger, connection }: { logger: Logger; connection: Connection }) {
    this.logger_ = logger
    this.connection_ = connection
  }

  // ============================================
  // RAW SQL QUERY METHODS
  // ============================================

  /**
   * Execute raw SQL query
   */
  async query<T = any>(
    sql: string,
    options: RawQueryOptions = {},
    context: any = {}
  ): Promise<T[]> {
    const queryRunner = this.getQueryRunner(context)
    const { parameters = {}, timeout } = options

    try {
      this.logger_.debug(`Executing SQL query: ${sql}\nParameters: ${parameters}`)
      
      let result: any
      
      if (timeout) {
        // Set statement timeout for this query
        await queryRunner.query(`SET statement_timeout = ${timeout}`)
      }

      if (Object.keys(parameters).length > 0) {
        result = await queryRunner.query(sql, Object.values(parameters))
      } else {
        result = await queryRunner.query(sql)
      }

      return result as T[]
    } catch (error) {
      this.logger_.error(`SQL query failed: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.DB_ERROR,
        `Query execution failed: ${error.message}`
      )
    } finally {
      // Release query runner if we created it
      if (!context.transactionManager && queryRunner !== context.transactionManager) {
        await queryRunner.release()
      }
    }
  }

  /**
   * Execute raw SQL query with named parameters
   */
  async queryNamed<T = any>(
    sql: string,
    params: Record<string, any> = {},
    context: any = {}
  ): Promise<T[]> {
    // Convert named parameters to positional parameters
    let paramIndex = 1
    const positionalParams: any[] = []
    const positionalSql = sql.replace(/:(\w+)/g, (match, paramName) => {
      if (paramName in params) {
        positionalParams.push(params[paramName])
        return `$${paramIndex++}`
      }
      return match
    })

    return this.query<T>(positionalSql, { parameters: positionalParams }, context)
  }

  /**
   * Execute a stored procedure
   */
  async callProcedure<T = any>(
    procedureName: string,
    params: any[] = [],
    context: any = {}
  ): Promise<T[]> {
    const paramPlaceholders = params.map((_, i) => `$${i + 1}`).join(', ')
    const sql = `CALL ${this.quoteIdentifier(procedureName)}(${paramPlaceholders})`
    
    return this.query<T>(sql, { parameters: params }, context)
  }

  /**
   * Execute a function
   */
  async callFunction<T = any>(
    functionName: string,
    params: any[] = [],
    context: any = {}
  ): Promise<T> {
    const paramPlaceholders = params.map((_, i) => `$${i + 1}`).join(', ')
    const sql = `SELECT * FROM ${this.quoteIdentifier(functionName)}(${paramPlaceholders})`
    
    const result = await this.query<T>(sql, { parameters: params }, context)
    return result[0]
  }

  // ============================================
  // DYNAMIC QUERY BUILDER
  // ============================================

  /**
   * Create dynamic query builder for any table
   */
  createQueryBuilder(
    tableName: string,
    alias: string = 'entity',
    context: any = {}
  ): SelectQueryBuilder<any> {
    const queryRunner = this.getQueryRunner(context)
    return queryRunner.manager.createQueryBuilder().select().from(tableName, alias)
  }

  /**
   * Build dynamic SELECT query
   */
  async select<T = any>(
    tableName: string,
    options: QueryOptions = {},
    context: any = {}
  ): Promise<T[]> {
    const { 
      alias = 'e',
      select = ['*'],
      where = {},
      order = {},
      skip,
      take,
      distinct = false,
      groupBy = [],
      having = '',
      withDeleted = false
    } = options

    let qb = this.createQueryBuilder(tableName, alias, context) as any
    
    // Select columns
    if (select.length === 1 && select[0] === '*') {
      qb.select(`${alias}.*`)
    } else {
      qb.select(select.map(col => `${alias}.${this.quoteColumn(col)}`))
    }

    // Apply distinct
    if (distinct) {
      qb.distinct(true)
    }

    // Apply where conditions
    this.applyWhereConditions(qb, alias, where)

    // Apply ordering
    Object.entries(order).forEach(([column, direction]) => {
      qb.addOrderBy(`${alias}.${this.quoteColumn(column)}`, direction)
    })

    // Apply pagination
    if (skip !== undefined) {
      qb.skip(skip)
    }
    if (take !== undefined) {
      qb.take(take)
    }

    // Apply group by
    if (groupBy.length > 0) {
      qb.groupBy(groupBy.map(col => `${alias}.${this.quoteColumn(col)}`))
    }

    // Apply having
    if (having) {
      qb.having(having)
    }

    // Apply soft delete filter
    if (!withDeleted && await this.hasDeletedAtColumn(tableName)) {
      qb.andWhere(`${alias}.deleted_at IS NULL`)
    }

    const [sql, parameters] = qb.getQueryAndParameters()
    this.logger_.debug(`Dynamic SELECT: ${sql}`)

    return this.query<T>(sql, { parameters }, context)
  }

  /**
   * Build dynamic INSERT query
   */
  async insert<T = any>(
    tableName: string,
    data: Record<string, any> | Record<string, any>[],
    options: { 
      returning?: string[]
      conflict?: { 
        target: string[]
        action: 'nothing' | 'update'
        update?: string[]
      }
    } | any = {},
    context: any = {}
  ): Promise<T[]> {
    const isBatch = Array.isArray(data)
    const entities = isBatch ? data : [data]
    
    if (entities.length === 0) {
      return []
    }

    // Get column names from first entity
    const columns = Object.keys(entities[0])
    const columnNames = columns.map(col => this.quoteColumn(col))
    
    // Build values placeholders
    const valueSets = entities.map((entity, index) => {
      return columns.map((col, colIndex) => {
        const value = entity[col]
        return `$${index * columns.length + colIndex + 1}`
      }).join(', ')
    })

    let sql = `INSERT INTO ${this.quoteTable(tableName)} (${columnNames.join(', ')}) VALUES `

    // Add all value sets
    sql += valueSets.map(set => `(${set})`).join(', ')

    // Handle ON CONFLICT
    if (options.conflict) {
      sql += ` ON CONFLICT (${options.conflict.target.map(this.quoteColumn).join(', ')}) `
      
      if (options.conflict.action === 'nothing') {
        sql += 'DO NOTHING'
      } else if (options.conflict.action === 'update') {
        const updateColumns = options.conflict.update || columns.filter(col => !options?.conflict.target.includes(col))
        const updateSet = updateColumns.map(col => 
          `${this.quoteColumn(col)} = EXCLUDED.${this.quoteColumn(col)}`
        ).join(', ')
        sql += `DO UPDATE SET ${updateSet}`
      }
    }

    // Add RETURNING clause
    const returning = options.returning || ['*']
    sql += ` RETURNING ${returning.map(this.quoteColumn).join(', ')}`

    // Flatten parameters
    const parameters = entities.flatMap(entity => 
      columns.map(col => entity[col])
    )

    this.logger_.debug(`Dynamic INSERT: ${sql}`)

    return this.query<T>(sql, { parameters }, context)
  }

  /**
   * Build dynamic UPDATE query
   */
  async update<T = any>(
    tableName: string,
    setData: Record<string, any>,
    where: Record<string, any> = {},
    options: { 
      returning?: string[]
    } = {},
    context: any = {}
  ): Promise<T[]> {
    const alias = 'e'
    const setEntries = Object.entries(setData)
    
    if (setEntries.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        'No data provided for update'
      )
    }

    let sql = `UPDATE ${this.quoteTable(tableName)} AS ${alias} SET `
    
    // Build SET clause
    const setClauses = setEntries.map(([column, value], index) => {
      return `${alias}.${this.quoteColumn(column)} = $${index + 1}`
    })
    sql += setClauses.join(', ')

    // Build WHERE clause
    const whereClauses: string[] = []
    const whereParams: any[] = []
    
    this.buildWhereClause(where, whereClauses, whereParams, alias)
    
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    // Add RETURNING clause
    const returning = options.returning || ['*']
    sql += ` RETURNING ${returning.map(col => `${alias}.${this.quoteColumn(col)}`).join(', ')}`

    const parameters = [
      ...setEntries.map(([, value]) => value),
      ...whereParams
    ]

    this.logger_.debug(`Dynamic UPDATE: ${sql}`)

    return this.query<T>(sql, { parameters }, context)
  }

  /**
   * Build dynamic DELETE query
   */
  async delete<T = any>(
    tableName: string,
    where: Record<string, any> = {},
    options: { 
      returning?: string[]
      softDelete?: boolean
    } = {},
    context: any = {}
  ): Promise<T[]> {
    const alias = 'e'
    const { softDelete = false, returning = ['*'] } = options

    let sql: string
    const whereClauses: string[] = []
    const whereParams: any[] = []

    if (softDelete && await this.hasDeletedAtColumn(tableName)) {
      // Soft delete
      sql = `UPDATE ${this.quoteTable(tableName)} AS ${alias} SET deleted_at = NOW()`
    } else {
      // Hard delete
      sql = `DELETE FROM ${this.quoteTable(tableName)} AS ${alias}`
    }

    // Build WHERE clause
    this.buildWhereClause(where, whereClauses, whereParams, alias)
    
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    // Add RETURNING clause
    sql += ` RETURNING ${returning.map(col => `${alias}.${this.quoteColumn(col)}`).join(', ')}`

    this.logger_.debug(`Dynamic DELETE: ${sql}`)

    return this.query<T>(sql, { parameters: whereParams }, context)
  }

  /**
   * Build dynamic UPSERT query
   */
  async upsert<T = any>(
    tableName: string,
    data: Record<string, any>,
    conflictTarget: string[],
    updateColumns?: string[],
    context: any = {}
  ): Promise<T[]> {
    const columns = Object.keys(data)
    const columnNames = columns.map(col => this.quoteColumn(col))
    const values = columns.map(col => data[col])
    const valuePlaceholders = values.map((_, i) => `$${i + 1}`)

    let sql = `INSERT INTO ${this.quoteTable(tableName)} (${columnNames.join(', ')}) `
    sql += `VALUES (${valuePlaceholders.join(', ')}) `
    sql += `ON CONFLICT (${conflictTarget.map(this.quoteColumn).join(', ')}) `

    if (!updateColumns || updateColumns.length === 0) {
      sql += 'DO NOTHING'
    } else {
      const updateSet = updateColumns.map(col => 
        `${this.quoteColumn(col)} = EXCLUDED.${this.quoteColumn(col)}`
      ).join(', ')
      sql += `DO UPDATE SET ${updateSet}`
    }

    sql += ` RETURNING *`

    return this.query<T>(sql, { parameters: values }, context)
  }

  // ============================================
  // ADVANCED QUERY METHODS
  // ============================================

  /**
   * Execute query with JOINs
   */
  async join<T = any>(
    mainTable: string,
    joins: JoinOptions[],
    options: QueryOptions = {},
    context: any = {}
  ): Promise<T[]> {
    const { alias = 'main', select = ['main.*'], where = {}, order = {}, skip, take } = options

    let qb = this.createQueryBuilder(mainTable, alias, context)
    
    // Select columns
    qb.select(select.map(col => {
      if (col.includes('.')) {
        const [tableAlias, column] = col.split('.')
        return `${tableAlias}.${this.quoteColumn(column)}`
      }
      return `${alias}.${this.quoteColumn(col)}`
    }))

    // Apply JOINs
    joins.forEach(join => {
      const joinType = join.type || 'inner'
      const joinMethod = joinType === 'left' ? 'leftJoin' : 
                        joinType === 'right' ? 'rightJoin' : 'innerJoin'
      
      qb[joinMethod](join.alias, join.condition)
      
      // Add select for joined table if specified
      if (join.select) {
        qb.addSelect(join.select.map(col => `${join.alias}.${this.quoteColumn(col)}`))
      }
    })

    // Apply where conditions
    this.applyWhereConditions(qb, alias, where)

    // Apply ordering
    Object.entries(order).forEach(([column, direction]) => {
      if (column.includes('.')) {
        const [tableAlias, col] = column.split('.')
        qb.addOrderBy(`${tableAlias}.${this.quoteColumn(col)}`, direction)
      } else {
        qb.addOrderBy(`${alias}.${this.quoteColumn(column)}`, direction)
      }
    })

    // Apply pagination
    if (skip !== undefined) qb.skip(skip)
    if (take !== undefined) qb.take(take)

    const [sql, parameters] = qb.getQueryAndParameters()
    return this.query<T>(sql, { parameters }, context)
  }

  /**
   * Execute aggregate query
   */
  async aggregate(
    tableName: string,
    aggregates: Array<{
      function: 'count' | 'sum' | 'avg' | 'min' | 'max'
      column: string
      alias: string
    }>,
    groupBy?: string[],
    where: Record<string, any> = {},
    context: any = {}
  ): Promise<any[]> {
    const alias = 'e'
    const selectClauses = aggregates.map(agg => 
      `${agg.function.toUpperCase()}(${alias}.${this.quoteColumn(agg.column)}) AS ${this.quoteColumn(agg.alias)}`
    )

    let sql = `SELECT ${selectClauses.join(', ')} `
    sql += `FROM ${this.quoteTable(tableName)} AS ${alias}`

    // Build WHERE clause
    const whereClauses: string[] = []
    const whereParams: any[] = []
    this.buildWhereClause(where, whereClauses, whereParams, alias)

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    // Add GROUP BY
    if (groupBy && groupBy.length > 0) {
      sql += ` GROUP BY ${groupBy.map(col => `${alias}.${this.quoteColumn(col)}`).join(', ')}`
    }

    return this.query(sql, { parameters: whereParams }, context)
  }

  /**
   * Execute bulk operations in transaction
   */
  async bulkOperation<T = any>(
    operations: Array<{
      type: 'insert' | 'update' | 'delete' | 'upsert'
      table: string
      data?: any
      where?: any
      options?: any
    }>,
    context: any = {}
  ): Promise<T[][]> {
    const queryRunner = this.getQueryRunner(context)
    const isExternalTransaction = !!context.transactionManager
    
    if (!isExternalTransaction) {
      await queryRunner.startTransaction()
    }

    try {
      const results = [] as any;

      for (const op of operations) {
        let result: T[]

        switch (op.type) {
          case 'insert':
            result = await this.insert(op.table, op.data, op.options, {
              ...context,
              transactionManager: queryRunner.manager
            })
            break

          case 'update':
            result = await this.update(op.table, op.data, op.where, op.options, {
              ...context,
              transactionManager: queryRunner.manager
            })
            break

          case 'delete':
            result = await this.delete(op.table, op.where, op.options, {
              ...context,
              transactionManager: queryRunner.manager
            })
            break

          case 'upsert':
            result = await this.upsert(
              op.table, 
              op.data, 
              op.options?.conflictTarget || ['id'], 
              op.options?.updateColumns,
              {
                ...context,
                transactionManager: queryRunner.manager
              }
            )
            break

          default:
            throw new MedusaError(
              MedusaError.Types.INVALID_ARGUMENT,
              `Invalid operation type: ${op.type}`
            )
        }

        results.push(result)
      }

      if (!isExternalTransaction) {
        await queryRunner.commitTransaction()
      }

      return results
    } catch (error) {
      if (!isExternalTransaction) {
        await queryRunner.rollbackTransaction()
      }
      throw error
    } finally {
      if (!isExternalTransaction) {
        await queryRunner.release()
      }
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if table has deleted_at column
   */
  private async hasDeletedAtColumn(tableName: string): Promise<boolean> {
    const sql = `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND column_name = 'deleted_at'
      ) as exists
    `
    
    const result = await this.query<{ exists: boolean }>(sql, { parameters: [tableName] })
    return result[0]?.exists || false
  }

  /**
   * Get table schema information
   */
  async getTableSchema(
    tableName: string,
    context: any = {}
  ): Promise<Array<{
    column_name: string
    data_type: string
    is_nullable: string
    column_default: string
    is_primary: boolean
  }>> {
    const sql = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.table_catalog, ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku 
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_catalog = pk.table_catalog 
        AND c.table_schema = pk.table_schema 
        AND c.table_name = pk.table_name 
        AND c.column_name = pk.column_name
      WHERE c.table_name = $1
      ORDER BY c.ordinal_position
    `

    return this.query(sql, { parameters: [tableName] }, context)
  }

  /**
   * Create index dynamically
   */
  async createIndex(
    tableName: string,
    indexName: string,
    columns: string[],
    options: {
      unique?: boolean
      where?: string
      concurrently?: boolean
    } = {},
    context: any = {}
  ): Promise<void> {
    const { unique = false, where, concurrently = false } = options
    
    let sql = 'CREATE '
    
    if (unique) sql += 'UNIQUE '
    
    if (concurrently) sql += 'CONCURRENTLY '
    
    sql += `INDEX ${this.quoteIdentifier(indexName)} `
    sql += `ON ${this.quoteTable(tableName)} `
    sql += `(${columns.map(this.quoteColumn).join(', ')})`
    
    if (where) {
      sql += ` WHERE ${where}`
    }

    await this.query(sql, {}, context)
  }

  /**
   * Execute EXPLAIN query
   */
  async explain(
    query: string,
    parameters: any[] = [],
    analyze: boolean = false,
    context: any = {}
  ): Promise<any[]> {
    const explainQuery = `EXPLAIN ${analyze ? 'ANALYZE' : ''} ${query}`
    return this.query(explainQuery, { parameters }, context)
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private getQueryRunner(context: any): QueryRunner {
    if (context.transactionManager) {
      return (context.transactionManager as EntityManager).queryRunner!
    }
    
    return this.connection_.createQueryRunner()
  }

  private applyWhereConditions(
    qb: SelectQueryBuilder<any>,
    alias: string,
    where: Record<string, any>
  ): void {
    Object.entries(where).forEach(([key, value]) => {
      if (key === '$or') {
        const orConditions = (value as any[]).map(condition => {
          const subQb = this.createQueryBuilder('', alias)
          this.applyWhereConditions(subQb, alias, condition)
          return subQb.getQuery()
        })
        qb.andWhere(`(${orConditions.join(' OR ')})`)
      } else if (key === '$and') {
        (value as any[]).forEach(condition => {
          this.applyWhereConditions(qb, alias, condition)
        })
      } else if (key.startsWith('$')) {
        // Handle operators
        const [column, operator] = key.split('$')
        const cleanedColumn = column.endsWith('.') ? column.slice(0, -1) : column
        
        switch (operator) {
          case 'eq':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} = :${cleanedColumn}`, { [cleanedColumn]: value })
            break
          case 'ne':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} != :${cleanedColumn}`, { [cleanedColumn]: value })
            break
          case 'gt':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} > :${cleanedColumn}`, { [cleanedColumn]: value })
            break
          case 'gte':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} >= :${cleanedColumn}`, { [cleanedColumn]: value })
            break
          case 'lt':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} < :${cleanedColumn}`, { [cleanedColumn]: value })
            break
          case 'lte':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} <= :${cleanedColumn}`, { [cleanedColumn]: value })
            break
          case 'like':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} LIKE :${cleanedColumn}`, { [cleanedColumn]: `%${value}%` })
            break
          case 'in':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} IN (:...${cleanedColumn})`, { [cleanedColumn]: value })
            break
          case 'notIn':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} NOT IN (:...${cleanedColumn})`, { [cleanedColumn]: value })
            break
          case 'isNull':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} IS NULL`)
            break
          case 'isNotNull':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} IS NOT NULL`)
            break
          case 'between':
            qb.andWhere(`${alias}.${this.quoteColumn(cleanedColumn)} BETWEEN :${cleanedColumn}_from AND :${cleanedColumn}_to`, {
              [`${cleanedColumn}_from`]: value[0],
              [`${cleanedColumn}_to`]: value[1]
            })
            break
        }
      } else if (isObject(value) && !isArray(value)) {
        // Handle nested conditions
        Object.entries(value).forEach(([op, val]) => {
          switch (op) {
            case '$eq':
              qb.andWhere(`${alias}.${this.quoteColumn(key)} = :${key}`, { [key]: val })
              break
            case '$ne':
              qb.andWhere(`${alias}.${this.quoteColumn(key)} != :${key}`, { [key]: val })
              break
            case '$gt':
              qb.andWhere(`${alias}.${this.quoteColumn(key)} > :${key}`, { [key]: val })
              break
            case '$gte':
              qb.andWhere(`${alias}.${this.quoteColumn(key)} >= :${key}`, { [key]: val })
              break
            case '$lt':
              qb.andWhere(`${alias}.${this.quoteColumn(key)} < :${key}`, { [key]: val })
              break
            case '$lte':
              qb.andWhere(`${alias}.${this.quoteColumn(key)} <= :${key}`, { [key]: val })
              break
            case '$like':
              qb.andWhere(`${alias}.${this.quoteColumn(key)} LIKE :${key}`, { [key]: `%${val}%` })
              break
            case '$in':
              qb.andWhere(`${alias}.${this.quoteColumn(key)} IN (:...${key})`, { [key]: val })
              break
            case '$notIn':
              qb.andWhere(`${alias}.${this.quoteColumn(key)} NOT IN (:...${key})`, { [key]: val })
              break
          }
        })
      } else {
        // Simple equality
        qb.andWhere(`${alias}.${this.quoteColumn(key)} = :${key}`, { [key]: value })
      }
    })
  }

  private buildWhereClause(
    where: Record<string, any>,
    clauses: string[],
    params: any[],
    alias: string,
    paramIndex: number = 1
  ): number {
    Object.entries(where).forEach(([key, value]) => {
      if (key === '$or') {
        const orClauses: string[] = []
        const orParams: any[] = []
        let currentIndex = paramIndex
        
        value.forEach((condition: any) => {
          const conditionClauses: string[] = []
          const conditionParams: any[] = []
          currentIndex = this.buildWhereClause(
            condition, 
            conditionClauses, 
            conditionParams, 
            alias, 
            currentIndex
          )
          
          if (conditionClauses.length > 0) {
            orClauses.push(`(${conditionClauses.join(' AND ')})`)
            orParams.push(...conditionParams)
          }
        })
        
        if (orClauses.length > 0) {
          clauses.push(`(${orClauses.join(' OR ')})`)
          params.push(...orParams)
          paramIndex = currentIndex
        }
      } else if (isObject(value) && !isArray(value)) {
        // Handle operators
        Object.entries(value).forEach(([op, val]) => {
          switch (op) {
            case '$eq':
              clauses.push(`${alias}.${this.quoteColumn(key)} = $${paramIndex}`)
              params.push(val)
              paramIndex++
              break
            case '$ne':
              clauses.push(`${alias}.${this.quoteColumn(key)} != $${paramIndex}`)
              params.push(val)
              paramIndex++
              break
            case '$gt':
              clauses.push(`${alias}.${this.quoteColumn(key)} > $${paramIndex}`)
              params.push(val)
              paramIndex++
              break
            case '$gte':
              clauses.push(`${alias}.${this.quoteColumn(key)} >= $${paramIndex}`)
              params.push(val)
              paramIndex++
              break
            case '$lt':
              clauses.push(`${alias}.${this.quoteColumn(key)} < $${paramIndex}`)
              params.push(val)
              paramIndex++
              break
            case '$lte':
              clauses.push(`${alias}.${this.quoteColumn(key)} <= $${paramIndex}`)
              params.push(val)
              paramIndex++
              break
            case '$like':
              clauses.push(`${alias}.${this.quoteColumn(key)} LIKE $${paramIndex}`)
              params.push(`%${val}%`)
              paramIndex++
              break
            case '$in':
              if (Array.isArray(val) && val.length > 0) {
                const placeholders = val.map((_, i) => `$${paramIndex + i}`).join(', ')
                clauses.push(`${alias}.${this.quoteColumn(key)} IN (${placeholders})`)
                params.push(...val)
                paramIndex += val.length
              }
              break
            case '$notIn':
              if (Array.isArray(val) && val.length > 0) {
                const placeholders = val.map((_, i) => `$${paramIndex + i}`).join(', ')
                clauses.push(`${alias}.${this.quoteColumn(key)} NOT IN (${placeholders})`)
                params.push(...val)
                paramIndex += val.length
              }
              break
            case '$isNull':
              clauses.push(`${alias}.${this.quoteColumn(key)} IS NULL`)
              break
            case '$isNotNull':
              clauses.push(`${alias}.${this.quoteColumn(key)} IS NOT NULL`)
              break
            case '$between':
              if (Array.isArray(val) && val.length === 2) {
                clauses.push(`${alias}.${this.quoteColumn(key)} BETWEEN $${paramIndex} AND $${paramIndex + 1}`)
                params.push(val[0], val[1])
                paramIndex += 2
              }
              break
          }
        })
      } else if (value === null) {
        clauses.push(`${alias}.${this.quoteColumn(key)} IS NULL`)
      } else {
        clauses.push(`${alias}.${this.quoteColumn(key)} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    })

    return paramIndex
  }

  private quoteIdentifier(identifier: string): string {
    return `"${identifier}"`
  }

  private quoteColumn(column: string): string {
    return column.includes('"') ? column : `"${column}"`
  }

  private quoteTable(table: string): string {
    if (table.includes('"') || table.includes('.')) {
      return table
    }
    return `"${table}"`
  }
}

// Singleton instance helper
let instance: PostgresDynamicOps | null = null

export function getPostgresDynamicOps(
  logger: Logger,
  connection: Connection
): PostgresDynamicOps {
  if (!instance) {
    instance = new PostgresDynamicOps({ logger, connection })
  }
  return instance
}