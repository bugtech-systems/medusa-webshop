"use client"
import { useParams } from "react-router"
import ChatInput from "../../components/ChatInput"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { AiAssistent } from "@medusajs/icons"
import { ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react"
import Sidebar from "../../components/Sidebar"
// 👉 replace with your actual hook
import { useExecuteAction } from "../../../../hooks/api/actions"
import { useEffect, useState } from "react"
import { groupMessages } from "../../../../utils/groupMessages"
import { SidebarProvider } from "../../../../lib/context/sidebar-context"

interface Props {
  params: {
    conversation_id: string
  }
}

function ConversationPage({ params }: Props) {
  const { conversation_id } = useParams();
  const {data: convos, mutateAsync: fetchConversationMessages, isPending: isLoading, error, } =
    useExecuteAction("get-conversation-query-by-id") as any;


let {data} = convos?.data ?? {data: [{ai_conversation_messages: []}]} ;


const handleMessages = async () => {
     await fetchConversationMessages({
            parameters: {
                conversation_id
            }
        }) as any;
}

let conversation = data[0];

console.log(data, conversation, 'CONVVER', conversation_id)



  useEffect(() => {
        handleMessages();
  }, [conversation_id])



//   if (isLoading) {
//     return (
//       <main className="flex items-center justify-center h-screen text-sm text-neutral-400">
//         Loading conversation…
//       </main>
//     )
//   }

console.log(error, conversation, 'CONVVV')

  if (error || !conversation) {
    return (
      <main className="flex items-center text-sm text-red-500">
        Failed to load conversation
      </main>
    )
  }
  


  return (
  <SidebarProvider>
    <main className="w-full flex flex-col justify-center items-center h-[90vh] max-h-[90vh] overflow-hidden">
      {/* Messages */}
      <Sidebar/>

      <div className="w-full flex-1 overflow-y-auto max-w-4xl max-h-[70vh] mb-10">
        {groupMessages(conversation.ai_conversation_messages ?? []).map((pair, index) => (
          <div key={index} className="space-y-2">
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl bg-blue-600 text-white px-4 py-2 text-sm">
                {pair.user.content}
              </div>
            </div>

            {/* Assistant message */}
            {pair.assistant && (
              <div className="flex flex-col items-start gap-2">
                <div className="max-w-[75%] rounded-2xl bg-neutral-100 px-4 py-2 text-sm">
                  {pair.assistant.content}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pl-2 text-neutral-400">
                  <button
                    className="hover:text-neutral-700"
                    title="Like"
                  >
                    <ThumbsUp size={14} />
                  </button>

                  <button
                    className="hover:text-neutral-700"
                    title="Dislike"
                  >
                    <ThumbsDown size={14} />
                  </button>

                  <button
                    className="hover:text-neutral-700"
                    title="Regenerate"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Input */}
      <div className="border-t w-full max-w-4xl">
        <ChatInput conversationId={conversation_id} onSend={handleMessages}/>
      </div>
    </main>
    </SidebarProvider>
  )
}

export default ConversationPage
