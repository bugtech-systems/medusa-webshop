type Message = {
  role: "user" | "assistant"
  content: string
}

export function groupMessages(messages: Message[]) {
  const pairs: {
    user: Message
    assistant?: Message
  }[] = []

  let currentUser: Message | null = null

  for (const message of messages) {
    if (message.role === "user") {
      currentUser = message
      pairs.push({ user: message })
    }

    if (message.role === "assistant" && currentUser) {
      pairs[pairs.length - 1].assistant = message
      currentUser = null
    }
  }

  return pairs
}
