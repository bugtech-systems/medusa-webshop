// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "../../../modules/ai"
import * as expressionEvaluator from "../../../modules/action-engine/expressionEvaluator"
import {
  chatCompletion,
  generateEmbedding,
  streamChatCompletion
} from "../../../utils/ollama";

//
// POST /ai/chat - send a chat message
//
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const aiModule = req.scope.resolve(AI_MODULE) as any;
    const data = req.body as any;
      const model = await aiModule.getModel(data.model);



      const systemInstruction = await expressionEvaluator.evaluatePlaceholders(
       data?.system || model?.metadata?.template || model.system,
        { context: data?.context || {} }
      );

     const messages = [
        { role: "system", content: data?.system ?? systemInstruction },
        { role: "user", content: data.message }
      ];


      let fullResponse: any;

        const result = await chatCompletion({
          model: model?.model_name,
          messages,
          options: data?.config ?? model.config
        });
        fullResponse = result.message;
        
        


console.log(result, messages, data, 'CHAT AII')

    return res.json(fullResponse?.content);
  } catch (error: any) {
    console.error(error, "AI_CHAT_ERROR");
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}