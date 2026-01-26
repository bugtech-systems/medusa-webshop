"use server";

export type ChatResponse = {
  message: string;
  context?: Record<string, any>;
  action?: { resource?: string };
  session_id?: string;
};

export async function sendChatMessage(payload: {
  message: string;
  attachments?: any[];
  speak?: boolean;
  session_id?: string | null;
  tenant_id?: string | null;
}): Promise<ChatResponse> {
  const res = await fetch(`${process.env.API_URL}/action-templates/sms_action/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      tenant_id: payload.tenant_id ?? "",
      session_id: payload.session_id ?? "",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to send message");
  }

  return res.json();
}

export async function clearChatSession(tenant_id?: string | null) {
  await fetch(`${process.env.API_URL}/action-templates/clear`, {
    headers: {
      "Content-Type": "application/json",
      tenant_id: tenant_id ?? "",
    },
    cache: "no-store",
  });
}
