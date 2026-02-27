"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { PizzaIcon } from "../../components/icons";
import { defineRouteConfig } from "@medusajs/admin-sdk";

interface AiMemory {
  id: string
  scope: string
  scope_id: string
  content: string
  language?: string
}

function AiMemoryAdminPage() {
  const [memories, setMemories] = useState<AiMemory[]>([])

  useEffect(() => {
    axios.get("/admin/ai/memory").then((res) => setMemories(res.data.memories))
  }, [])



  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">AI Memory</h1>
      <table className="w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Scope</th>
            <th className="p-2 border">Scope ID</th>
            <th className="p-2 border">Content</th>
            <th className="p-2 border">Language</th>
          </tr>
        </thead>
        <tbody>
          {memories.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="p-2 border">{m.id}</td>
              <td className="p-2 border">{m.scope}</td>
              <td className="p-2 border">{m.scope_id}</td>
              <td className="p-2 border">{m.content.slice(0, 80)}...</td>
              <td className="p-2 border">{m.language}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}



// export const config = defineRouteConfig({
//   label: "Workflows",
//   icon: PizzaIcon,
// });

export default AiMemoryAdminPage;