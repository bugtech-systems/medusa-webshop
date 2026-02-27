import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /admin/ai/memory
 * Fetch AI memory entries (optionally filter by scope or language)
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  // Medusa query builder
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { scope } = req.validatedQuery || {}

  let filters: any = {}

  if (scope) {
    filters.scope = scope
  }

  // Graph query to fetch AI memory entries
  const { data: memories, metadata } = await query.graph({
    entity: "ai_memory",
    ...req.queryConfig,
    fields: ["id", "scope", "scope_id", "content", "embedding"],
    filters,
  })

  res.json({
    memories,
    ...metadata,
  })
}
