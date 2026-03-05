import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"


interface ChatRequestBody {
  session_id: string
  message: string
  language?: string
}

interface ChatResponseBody {
  session_id: string
  user_message: string
  assistant_response: string
}

export const POST = async (
  req: AuthenticatedMedusaRequest<ChatRequestBody>,
  res: MedusaResponse
) => {
  const aiService = req.scope.resolve("aiModuleService")
  
  const { session_id, message, language } = req.body


console.log(req.body, 'REQQQ')

  if (!session_id || !message) {
    return res.status(400).json({ error: "session_id and message are required" })
  }

  let assistantResponse = ""

  // Streaming callback (for future SSE or token streaming)
  const onToken = (token: string) => {
    assistantResponse += token
  }

  try {
    // Call AI service
      //  const aiClassService = new AiClassService(aiService)

// 
    
    
    // const embedding: number[] = await generateEmbedding(message)

    
   
    // let memories = {data: []}
    
    

  let aiResponse =  await aiService.streamChat({ session_id, user_message: message, language, onToken })
    // Return the AI response
    const response: any = {
      session_id,
      user_message: message,
      assistant_response: assistantResponse,
      aiResponse
    }

    res.json(response)
  } catch (err) {
    console.error("[AI CHAT ENDPOINT] Error:", err)
    res.status(500).json({ error: "AI response failed" })
  }
}
