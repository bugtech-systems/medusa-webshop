// src/api/store/dynamic-query/route.ts

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"


export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
     const { entity, filters, pagination, ...query } = req.body as {
      entity: string
    } & any

    let queryObject = {} as any;

    if (!entity) {
      return res.status(400).json({
        success: false,
        message: "Entity name is required"
      })
    } else {
      queryObject['entity'] = entity;
    }
    
    if(filters){
      queryObject['filters'] = filters;
    }
    
    if(pagination){
           queryObject['pagination'] = pagination;
    }

    
    
    
  const queryEntity = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await queryEntity.graph({
    entity: entity,
    fields: query.fields || ["*"],
    ...queryObject
    
  })


  res.json({ data })

  
  } catch (error: any) {
    console.error("Dynamic query error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    res.status(400).json({
      success: false,
      message: error.message || "Failed to execute dynamic query",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const dynamicQueryService = req.scope.resolve<any>("dynamicQueryService")
    const { entity, entities, info } = req.query as { 
      entity?: string
      entities?: string | string[]
      info?: string 
    }

    // Get metadata for multiple entities
    if (entities) {
      const entityList = Array.isArray(entities) ? entities : [entities]
      
      if (info === 'relations') {
        const relations = await dynamicQueryService.getEntitiesRelations(entityList)
        res.json({
          success: true,
          entities: relations
        })
        return
      } else {
        const metadata = await dynamicQueryService.getEntitiesMetadata(entityList)
        res.json({
          success: true,
          entities: metadata
        })
        return
      }
    }

    // Get list of all entities
    if (!entity) {
      const entities = await dynamicQueryService.getAvailableEntities()
      res.json({
        success: true,
        entities
      })
      return
    }

    // Get metadata/relations for single entity
    if (info === 'relations') {
      const relations = await dynamicQueryService.getEntityRelations(entity)
      res.json({
        success: true,
        entity,
        relations
      })
    } else if (info === 'metadata') {
      const metadata = await dynamicQueryService.getEntityMetadata(entity)
      res.json({
        success: true,
        metadata
      })
    } else {
      // Return both metadata and relations if no specific info
      const [metadata, relations] = await Promise.all([
        dynamicQueryService.getEntityMetadata(entity),
        dynamicQueryService.getEntityRelations(entity)
      ])
      
      res.json({
        success: true,
        entity,
        metadata,
        relations
      })
    }
  } catch (error) {
    console.error("Dynamic query metadata error:", error)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}