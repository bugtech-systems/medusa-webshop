// src/api/dynamic-query/validators.ts

import { z } from "zod"

export const queryFilterSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 
    'in', 'nin', 'like', 'ilike', 'is', 
    'isNot', 'between', 'contains', 'contained', 'overlap'
  ]),
  value: z.any()
})

export const queryRelationSchema: z.ZodType<any> = z.lazy(() => 
  z.object({
    field: z.string(),
    alias: z.string().optional(),
    type: z.enum(['inner', 'left', 'right']).optional(),
    conditions: z.array(queryFilterSchema).optional(),
    relations: z.array(queryRelationSchema).optional()
  })
)

export const dynamicQuerySchema = z.object({
  entity: z.string(),
  select: z.array(z.string()).optional(),
  relations: z.array(queryRelationSchema).optional(),
  filters: z.array(queryFilterSchema).optional(),
  sort: z.array(z.object({
    field: z.string(),
    direction: z.enum(['ASC', 'DESC'])
  })).optional(),
  limit: z.number().min(1).max(100).default(50).optional(),
  offset: z.number().min(0).default(0).optional(),
  withDeleted: z.boolean().optional()
})

// Apply validation in the route
export const validateDynamicQuery = async (req, res, next) => {
  try {
    await dynamicQuerySchema.parseAsync(req.body)
    next()
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.errors
    })
  }
}