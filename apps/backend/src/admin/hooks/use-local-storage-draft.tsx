import { useEffect, useRef, useCallback } from "react"
import debounce from "lodash.debounce"
import { Node, Edge } from "@xyflow/react"

const STORAGE_KEY = "workflow-draft"

export const useLocalStorageDraft = (
  workflowId: string | null,
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void
) => {
  const initialized = useRef(false)

  useEffect(() => {
    if (!workflowId || initialized.current) return

    const saved = localStorage.getItem(`${STORAGE_KEY}-${workflowId}`)
    if (saved) {
      try {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved)
        setNodes(savedNodes)
        setEdges(savedEdges)
      } catch (error) {
        console.error("Failed to parse draft", error)
      }
    }
    initialized.current = true
  }, [workflowId, setNodes, setEdges])

  const saveDraft = useCallback(
    debounce((nodes: Node[], edges: Edge[]) => {
      if (!workflowId) return
      localStorage.setItem(
        `${STORAGE_KEY}-${workflowId}`,
        JSON.stringify({ nodes, edges })
      )
    }, 500),
    [workflowId]
  )

  useEffect(() => {
    if (!workflowId || !initialized.current) return
    saveDraft(nodes, edges)
  }, [nodes, edges, workflowId, saveDraft])

  const clearDraft = useCallback(() => {
    if (!workflowId) return
    localStorage.removeItem(`${STORAGE_KEY}-${workflowId}`)
  }, [workflowId])

  return { clearDraft }
}