// src/services/dynamic-query-simple.ts

import { MedusaService, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DynamicQuery, DynamicQueryResponse, EntityMetadata, EntityRelation, EntityField } from "../../types/dynamic-query"

class DynamicQuerySimpleService extends MedusaService({}) {
  private container: any

  constructor(container: any) {
    super(container)
    this.container = container
  }

  /**
   * Lazy get the query service when needed
   */
  private getQueryService(): any {
    // Try to get from container.query first (Medusa v2 pattern)
    if (this.container.query) {
      return this.container.query
    }
    
    // Try to resolve using ContainerRegistrationKeys
    try {
      // In some Medusa v2 setups, the container has a resolve method
      if (typeof this.container.resolve === 'function') {
        return this.container.resolve(ContainerRegistrationKeys.QUERY)
      }
    } catch {
      // Ignore and try next method
    }
    
    // Try to get from the container directly
    if (this.container[ContainerRegistrationKeys.QUERY]) {
      return this.container[ContainerRegistrationKeys.QUERY]
    }
    
    throw new Error("Query service not available in container")
  }

  /**
   * Execute dynamic query using Medusa's query utility
   */
  async queryEntity<T = any>(
    entity: string,
    query: any
  ): Promise<DynamicQueryResponse<T>> {
    try {
      const queryService = this.getQueryService()
      
      // Build the query object
      const queryObject: any = {
        entity,
        fields: query.select || ['*'],
        pagination: {
          take: query.limit || 50,
          skip: query.offset || 0
        }
      }

      // Add filters if present
      if (query.filters && query.filters.length > 0) {
        queryObject.filters = this.transformFilters(query.filters)
      }

      // Add sorting if present
      if (query.sort && query.sort.length > 0) {
        queryObject.order = this.transformSort(query.sort)
      }

      // Add relations if present
      if (query.relations && query.relations.length > 0) {
        queryObject.relations = this.transformRelations(query.relations)
      }

      // Execute the query
      const { data, metadata } = await queryService.graph(queryObject)

      return {
        data: data as T[],
        count: metadata?.count || 0,
        limit: query.limit || 50,
        offset: query.offset || 0
      }
    } catch (error) {
      console.error("Query error:", {
        message: error.message,
        stack: error.stack,
        entity
      })
      
      // Handle entity not found error
      if (error.message?.includes('Unknown entity') || error.message?.includes('not found')) {
        const availableEntities = await this.getAvailableEntities().catch(() => [])
        throw new Error(
          `Entity '${entity}' not found. Available entities: ${availableEntities.join(', ')}`
        )
      }
      
      throw new Error(`Failed to query ${entity}: ${error.message}`)
    }
  }

  /**
   * Execute query with custom options
   */
  async query(options: any): Promise<any> {
    const queryService = this.getQueryService()
    return await queryService.graph(options)
  }

  /**
   * Transform filters for Medusa query
   */
  private transformFilters(filters: any[]): any {
    const result: any = {}
    
    filters.forEach(filter => {
      const { field, operator, value } = filter
      
      switch (operator) {
        case 'eq':
          result[field] = { $eq: value }
          break
        case 'ne':
          result[field] = { $ne: value }
          break
        case 'gt':
          result[field] = { $gt: value }
          break
        case 'gte':
          result[field] = { $gte: value }
          break
        case 'lt':
          result[field] = { $lt: value }
          break
        case 'lte':
          result[field] = { $lte: value }
          break
        case 'in':
          result[field] = { $in: Array.isArray(value) ? value : [value] }
          break
        case 'nin':
          result[field] = { $nin: Array.isArray(value) ? value : [value] }
          break
        case 'like':
          result[field] = { $like: `%${value}%` }
          break
        case 'ilike':
          result[field] = { $ilike: `%${value}%` }
          break
        case 'is':
          result[field] = value === null ? { $is: null } : { $eq: value }
          break
        case 'isNot':
          result[field] = value === null ? { $isNot: null } : { $ne: value }
          break
        case 'between':
          const [min, max] = value
          result[field] = { $between: [min, max] }
          break
        case 'contains':
          result[field] = { $contains: value }
          break
        case 'contained':
          result[field] = { $contained: value }
          break
        case 'overlap':
          result[field] = { $overlap: value }
          break
        default:
          result[field] = { $eq: value }
      }
    })
    
    return result
  }

  /**
   * Transform sort for Medusa query
   */
  private transformSort(sort: any[]): any {
    const result: any = {}
    
    sort.forEach(s => {
      result[s.field] = s.direction === 'DESC' ? 'DESC' : 'ASC'
    })
    
    return result
  }

  /**
   * Transform relations for Medusa query
   */
  private transformRelations(relations: any[]): any {
    const result: any = {}
    
    relations.forEach(relation => {
      const { field, select, relations: nestedRelations, limit } = relation
      
      result[field] = {
        fields: select || ['*'],
        ...(nestedRelations && nestedRelations.length > 0 && {
          relations: this.transformRelations(nestedRelations)
        }),
        ...(limit && { limit })
      }
    })
    
    return result
  }

  /**
   * Get entity schema from Medusa
   */
  private async getEntitySchema(entityName: string): Promise<any> {
    try {
      const queryService = this.getQueryService()
      
      if (queryService && typeof queryService.getSchema === 'function') {
        const schema = await queryService.getSchema()
        return schema?.[entityName]
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Get detailed metadata for a specific entity
   */
  async getEntityMetadata(entityName: string): Promise<EntityMetadata> {
    try {
      // Try to get schema from Medusa
      const schema = await this.getEntitySchema(entityName)
      
      if (schema) {
        return this.buildEntityMetadataFromSchema(entityName, schema)
      }

      // Fallback: Try to infer from a sample query
      const sample = await this.queryEntity(entityName, { 
        select: ['*'],
        limit: 1 
      }).catch(() => null) as any;
      
      if (sample?.data?.length > 0) {
        return this.buildMetadataFromRecord(entityName, sample.data[0])
      }
      
      return this.getFallbackMetadata(entityName)
    } catch (error) {
      console.error(`Error getting metadata for ${entityName}:`, error)
      return this.getFallbackMetadata(entityName)
    }
  }

  /**
   * Get all relations for a specific entity
   */
  async getEntityRelations(entityName: string): Promise<EntityRelation[]> {
    try {
      const metadata = await this.getEntityMetadata(entityName)
      return metadata.relations || []
    } catch (error) {
      console.error(`Error getting relations for ${entityName}:`, error)
      return []
    }
  }

  /**
   * Get metadata for multiple entities
   */
  async getEntitiesMetadata(entityNames?: string[]): Promise<Record<string, EntityMetadata>> {
    const entities = entityNames || await this.getAvailableEntities()
    const metadataMap: Record<string, EntityMetadata> = {}
    
    await Promise.all(
      entities.map(async (entity) => {
        try {
          metadataMap[entity] = await this.getEntityMetadata(entity)
        } catch (error) {
          metadataMap[entity] = this.getFallbackMetadata(entity)
        }
      })
    )
    
    return metadataMap
  }

  /**
   * Get relations for multiple entities
   */
  async getEntitiesRelations(entityNames?: string[]): Promise<Record<string, EntityRelation[]>> {
    const entities = entityNames || await this.getAvailableEntities()
    const relationsMap: Record<string, EntityRelation[]> = {}
    
    await Promise.all(
      entities.map(async (entity) => {
        try {
          relationsMap[entity] = await this.getEntityRelations(entity)
        } catch (error) {
          relationsMap[entity] = []
        }
      })
    )
    
    return relationsMap
  }

  /**
   * Build entity metadata from schema
   */
  private buildEntityMetadataFromSchema(entityName: string, schema: any): EntityMetadata {
    const fields: EntityField[] = []
    const relations: EntityRelation[] = []
    
    // Parse fields from schema
    if (schema.fields) {
      Object.entries(schema.fields).forEach(([key, value]: [string, any]) => {
        fields.push({
          name: key,
          type: this.getFieldType(value),
          required: !value.nullable,
          unique: value.unique || false,
          primary: key === 'id',
          default: value.default,
          description: value.description
        })
      })
    }
    
    // Parse relations from schema
    if (schema.relations) {
      Object.entries(schema.relations).forEach(([key, value]: [string, any]) => {
        relations.push({
          name: key,
          type: this.getRelationType(value),
          target: value.target || value.entity,
          inverse: value.inverse,
          nullable: value.nullable || false,
          cascade: value.cascade || false
        })
      })
    }
    
    return {
      name: entityName,
      displayName: this.formatEntityName(entityName),
      fields,
      relations,
      timestamps: fields.some(f => f.name === 'created_at'),
      softDelete: fields.some(f => f.name === 'deleted_at')
    }
  }

  /**
   * Build metadata from a sample record
   */
  private buildMetadataFromRecord(entityName: string, record: any): EntityMetadata {
    const fields: EntityField[] = []
    const relations: EntityRelation[] = []
    
    Object.keys(record).forEach(key => {
      if (key.startsWith('_')) return
      
      const value = record[key]
      
      // Check if it's a relation (object with id)
      if (value && typeof value === 'object' && !Array.isArray(value) && value.id) {
        relations.push({
          name: key,
          type: 'belongsTo',
          target: this.inferEntityNameFromValue(key, value),
          nullable: true
        })
      } 
      // Check if it's an array of relations
      else if (Array.isArray(value) && value.length > 0 && value[0]?.id) {
        relations.push({
          name: key,
          type: 'hasMany',
          target: this.inferEntityNameFromValue(key, value[0]),
          nullable: true
        })
      }
      else {
        fields.push({
          name: key,
          type: this.inferFieldType(value),
          required: value !== null && value !== undefined,
          primary: key === 'id',
          unique: key === 'id'
        })
      }
    })
    
    // Add common fields if missing
    this.addCommonFields(fields)
    
    return {
      name: entityName,
      displayName: this.formatEntityName(entityName),
      fields,
      relations,
      timestamps: fields.some(f => f.name === 'created_at'),
      softDelete: fields.some(f => f.name === 'deleted_at')
    }
  }

  /**
   * Get relation type from definition
   */
  private getRelationType(relationDef: any): 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany' | 'unknown' {
    if (relationDef.type) {
      const type = String(relationDef.type).toLowerCase()
      if (type.includes('hasmany')) return 'hasMany'
      if (type.includes('hasonetoone')) return 'hasOne'
      if (type.includes('manytomany')) return 'belongsToMany'
      if (type.includes('manytoone')) return 'belongsTo'
      if (type.includes('onetomany')) return 'hasMany'
      if (type.includes('onetoone')) return 'hasOne'
    }
    
    if (relationDef.isList) return 'hasMany'
    
    return 'unknown'
  }

  /**
   * Get field type from definition
   */
  private getFieldType(fieldDef: any): string {
    if (!fieldDef) return 'string'
    
    if (fieldDef.type) {
      if (typeof fieldDef.type === 'function') {
        const typeName = fieldDef.type.name.toLowerCase()
        if (typeName === 'string') return 'string'
        if (typeName === 'number') return 'number'
        if (typeName === 'boolean') return 'boolean'
        if (typeName === 'date') return 'datetime'
        return typeName
      }
      return String(fieldDef.type).toLowerCase()
    }
    
    return 'string'
  }

  /**
   * Infer field type from value
   */
  private inferFieldType(value: any): string {
    if (value === null || value === undefined) return 'unknown'
    if (typeof value === 'string') {
      if (this.isDateString(value)) return 'datetime'
      if (this.isUUID(value)) return 'uuid'
      return 'string'
    }
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object') return 'json'
    return typeof value
  }

  /**
   * Infer entity name from relation value
   */
  private inferEntityNameFromValue(key: string, value: any): string {
    if (value.constructor?.name) {
      // Convert PascalCase to snake_case
      return value.constructor.name
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
    }
    
    // Convert camelCase to snake_case
    return key
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
  }

  /**
   * Check if string is a date
   */
  private isDateString(value: string): boolean {
    const timestamp = Date.parse(value)
    return !isNaN(timestamp)
  }

  /**
   * Check if string is a UUID
   */
  private isUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  }

  /**
   * Add common fields to inferred metadata
   */
  private addCommonFields(fields: EntityField[]): void {
    const commonFields = [
      { name: 'id', type: 'uuid', primary: true, unique: true, required: true },
      { name: 'created_at', type: 'datetime', required: true },
      { name: 'updated_at', type: 'datetime', required: true }
    ]
    
    commonFields.forEach(commonField => {
      if (!fields.some(f => f.name === commonField.name)) {
        fields.push(commonField as EntityField)
      }
    })
  }

  /**
   * Format entity name for display
   */
  private formatEntityName(entityName: string): string {
    return entityName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Get fallback metadata for common Medusa entities
   */
  private getFallbackMetadata(entityName: string): EntityMetadata {
    const baseFields = [
      { name: 'id', type: 'uuid', required: true, primary: true, unique: true },
      { name: 'created_at', type: 'datetime', required: true },
      { name: 'updated_at', type: 'datetime', required: true }
    ]
    
    // Handle ai_conversation_session
    if (entityName === 'ai_conversation_session') {
      return {
        name: entityName,
        displayName: 'AI Conversation Session',
        fields: [
          ...baseFields,
          { name: 'session_id', type: 'string', required: true, unique: true },
          { name: 'user_id', type: 'string', required: true },
          { name: 'status', type: 'string', required: true },
          { name: 'metadata', type: 'json', required: false },
          { name: 'last_activity', type: 'datetime', required: true },
          { name: 'ended_at', type: 'datetime', required: false }
        ],
        relations: [
          { name: 'messages', type: 'hasMany', target: 'ai_conversation_message', nullable: true },
          { name: 'user', type: 'belongsTo', target: 'user', nullable: true }
        ],
        timestamps: true,
        softDelete: false
      }
    }

    // Handle ai_conversation_message
    if (entityName === 'ai_conversation_message') {
      return {
        name: entityName,
        displayName: 'AI Conversation Message',
        fields: [
          ...baseFields,
          { name: 'session_id', type: 'string', required: true },
          { name: 'role', type: 'string', required: true },
          { name: 'content', type: 'text', required: true },
          { name: 'metadata', type: 'json', required: false },
          { name: 'tokens', type: 'number', required: false },
          { name: 'model', type: 'string', required: false }
        ],
        relations: [
          { name: 'session', type: 'belongsTo', target: 'ai_conversation_session', nullable: false }
        ],
        timestamps: true,
        softDelete: false
      }
    }
    
    // Add other common entities
    switch (entityName) {
      case 'product':
        return {
          name: entityName,
          displayName: 'Product',
          fields: [
            ...baseFields,
            { name: 'title', type: 'string', required: true },
            { name: 'subtitle', type: 'string', required: false },
            { name: 'description', type: 'text', required: false },
            { name: 'handle', type: 'string', required: false, unique: true },
            { name: 'status', type: 'string', required: true },
            { name: 'thumbnail', type: 'string', required: false }
          ],
          relations: [
            { name: 'variants', type: 'hasMany', target: 'product_variant' },
            { name: 'categories', type: 'belongsToMany', target: 'product_category' }
          ],
          timestamps: true,
          softDelete: true
        }
      case 'order':
        return {
          name: entityName,
          displayName: 'Order',
          fields: [
            ...baseFields,
            { name: 'display_id', type: 'number', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'email', type: 'string', required: true },
            { name: 'total', type: 'number', required: true }
          ],
          relations: [
            { name: 'items', type: 'hasMany', target: 'line_item' },
            { name: 'customer', type: 'belongsTo', target: 'customer' }
          ],
          timestamps: true
        }
      default:
        return {
          name: entityName,
          displayName: this.formatEntityName(entityName),
          fields: baseFields,
          relations: [],
          timestamps: true
        }
    }
  }

  /**
   * Get available entities
   */
  async getAvailableEntities(): Promise<string[]> {
    try {
      const queryService = this.getQueryService()
      
      if (queryService && typeof queryService.listEntities === 'function') {
        const entities = await queryService.listEntities()
        if (entities && entities.length > 0) {
          return entities
        }
      }
      
      if (queryService && typeof queryService.getSchema === 'function') {
        const schema = await queryService.getSchema()
        if (schema) {
          return Object.keys(schema)
        }
      }
    } catch {
      // Ignore and return defaults
    }

    // Return comprehensive list of Medusa entities
    return [
      "product",
      "product_variant",
      "product_category",
      "product_collection",
      "product_tag",
      "product_type",
      "product_option",
      "product_option_value",
      "product_image",
      "order",
      "line_item",
      "customer",
      "customer_group",
      "address",
      "cart",
      "price_list",
      "price",
      "inventory_item",
      "inventory_level",
      "reservation_item",
      "return",
      "fulfillment",
      "payment",
      "payment_collection",
      "discount",
      "discount_rule",
      "gift_card",
      "shipping_option",
      "shipping_profile",
      "shipping_method",
      "tax_rate",
      "tax_region",
      "sales_channel",
      "store",
      "user",
      "role",
      "publishable_api_key",
      "api_key",
      "currency",
      "country",
      "region",
      "ai_conversation_session",
      "ai_conversation_message"
    ]
  }
}

export default DynamicQuerySimpleService