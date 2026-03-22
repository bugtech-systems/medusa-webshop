// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "../../../modules/ai"


//
// POST /ai/memory - index content / store memory
//
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const aiModule = req.scope.resolve(AI_MODULE) as any;
    const data = req.body as any;

    const memory = await aiModule.indexContent({
      scope: data.scope,
      scope_id: data.scope_id,
      content: data.content,
      language: data.language
    });

    return res.json({
      success: true,
      memory,
      message: "Memory stored successfully"
    });
  } catch (error: any) {
    console.error(error, "AI_MEMORY_ERROR");
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

//
// GET /ai/memory - search memories by query
//
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const aiModule = req.scope.resolve(AI_MODULE) as any;
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 5;

    const result = await aiModule.retrieveContext(query, limit);

    return res.json({
      success: true,
      memories: result.data
    });
  } catch (error: any) {
    console.error(error, "AI_MEMORY_SEARCH_ERROR");
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}