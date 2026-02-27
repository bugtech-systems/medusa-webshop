// src/types/dynamic-query.ts

export type QueryOperator = 
  | 'eq' | 'ne' 
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'nin' 
  | 'like' | 'ilike'
  | 'is' | 'isNot'
  | 'between'
  | 'contains' | 'contained'
  | 'overlap'

export type QueryJoinType = 'inner' | 'left' | 'right'

export interface QueryFilter {
  field: string
  operator: QueryOperator
  value: any
}

export interface QuerySort {
  field: string
  direction: 'ASC' | 'DESC'
}

export interface QueryRelation {
  field: string
  alias?: string
  type?: QueryJoinType
  conditions?: QueryFilter[]
  relations?: QueryRelation[]
}

export interface DynamicQuery {
  fields?: string[]
  filters?: any
  sort?: QuerySort[]
  limit?: number
  offset?: number
  withDeleted?: boolean
}

export interface DynamicQueryResponse<T> {
  data: T[]
  count: number
  limit: number
  offset: number
}


// src/types/dynamic-query.ts

export interface EntityField {
  name: string
  type: string
  required?: boolean
  unique?: boolean
  primary?: boolean
  default?: any
  description?: string
  min?: number
  max?: number
  enum?: string[]
}

export interface EntityRelation {
  name: string
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany' | 'unknown'
  target: string
  inverse?: string
  nullable?: boolean
  cascade?: boolean
  eager?: boolean
}

export interface EntityMetadata {
  name: string
  displayName: string
  fields: EntityField[]
  relations: EntityRelation[]
  timestamps: boolean
  softDelete?: boolean
  description?: string
}

export interface DynamicQueryResponse<T> {
  data: T[]
  count: number
  limit: number
  offset: number
}

// ... rest of your existing types