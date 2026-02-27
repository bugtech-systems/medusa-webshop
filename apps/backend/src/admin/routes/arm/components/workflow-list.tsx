"use client"

import { useState } from "react"
import { useWorkflows, useCreateWorkflow } from "../../../hooks/api/workflows"

type Props = {
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function WorkflowList({ selectedId, onSelect }: Props) {
  const [newName, setNewName] = useState("")
  const { data, isLoading } = useWorkflows() as any
  const { mutate: createWorkflow, isPending: isCreating } = useCreateWorkflow()

  const workflows = data?.data || []

  const handleCreate = () => {
  
  
    if (!newName.trim() || isCreating) return
    createWorkflow(
      { name: newName },
      {
        onSuccess: (data) => {
          setNewName("")
          onSelect(data.workflow.id)
        },
      }
    )
  }
  
  
  console.log(isCreating, data, isLoading, 'wwwork')

  return (
    <div>
      <h2 className="font-bold text-lg mb-4">Workflows</h2>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New workflow name"
          className="border rounded px-2 py-1 flex-1"
        />
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Create
        </button>
      </div>

      {isLoading && <p>Loading...</p>}
      <ul className="space-y-1">
        {workflows.map((wf) => (
          <li
            key={wf.id}
            onClick={() => onSelect(wf.id)}
            className={`cursor-pointer p-2 rounded ${
              selectedId === wf.id ? "bg-blue-100" : "hover:bg-gray-200"
            }`}
          >
            {wf.name}
          </li>
        ))}
      </ul>
    </div>
  )
}