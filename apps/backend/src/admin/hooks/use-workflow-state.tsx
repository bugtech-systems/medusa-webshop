import { useCallback, useEffect, useRef } from "react"
import useUndo from "use-undo"
import { Node, Edge, Connection } from "@xyflow/react"
import { useLocalStorageDraft } from "./use-local-storage-draft"
import { useWorkflow } from "./api/workflows"

type State = { nodes: Node[]; edges: Edge[] }

export const useWorkflowState = (workflowId: string | null) => {
  // Fetch workflow data using the hook API
  const { data, isLoading, error } = useWorkflow(workflowId || "", undefined, {
    enabled: !!workflowId,
  }) as any

  const [state, { set: setState, undo, redo, canUndo, canRedo }] = useUndo<State>({
    nodes: [],
    edges: [],
  })

  const { nodes, edges } = state.present
  const initialized = useRef(false)

  // Load workflow data when it's fetched from API
  useEffect(() => {
    if (data?.data && !initialized.current) {
      const { nodes: serverNodes, edges: serverEdges} = data?.data
      
      // Convert server data to React Flow format if needed
      const formattedNodes = serverNodes.map((node: any) => ({
        ...node,
        type: node.type || "action",
        data: {
          ...node.data,
          label: node.data?.label || node.data?.name || "Action",
        },
      }))

      const formattedEdges = serverEdges.map((edge: any) => ({
        ...edge,
        type: edge.type || "custom",
        animated: edge.animated ?? true,
      }))

      setState({ nodes: formattedNodes, edges: formattedEdges }, true)
      initialized.current = true
    }
  }, [data, setState])

  // Reset initialized when workflowId changes
  useEffect(() => {
    initialized.current = false
  }, [workflowId])

  const updateNodes = useCallback(
    (updater: (nodes: Node[]) => Node[]) => {
      setState((prev) => ({ ...prev, nodes: updater(prev.nodes) }))
    },
    [setState]
  )

  const updateEdges = useCallback(
    (updater: (edges: Edge[]) => Edge[]) => {
      setState((prev) => ({ ...prev, edges: updater(prev.edges) }))
    },
    [setState]
  )

  const { clearDraft } = useLocalStorageDraft(workflowId, nodes, edges, updateNodes, updateEdges)

  const isValidConnection = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes ? nodes.find((n) => n.id === connection.source) : null
      const targetNode = nodes ? nodes.find((n) => n.id === connection.target) : null

      if (!sourceNode || !targetNode) return false

      const sourceHandle = connection.sourceHandle || ""
      const targetHandle = connection.targetHandle || ""
      const sourceType = sourceHandle.split("-")[1] || "any"
      const targetType = targetHandle.split("-")[1] || "any"

      // Check if trying to connect to itself
      if (connection.source === connection.target) {
        alert("Cannot connect a node to itself")
        return false
      }

      // Check for existing connections (optional - can be removed if multiple connections allowed)
      const existingConnection = edges.find(
        (e) => e.source === connection.source && e.target === connection.target
      )
      if (existingConnection) {
        alert("Connection already exists between these nodes")
        return false
      }

      if (sourceType !== "any" && targetType !== "any" && sourceType !== targetType) {
        alert(`Type mismatch: cannot connect ${sourceType} to ${targetType}`)
        return false
      }

      return true
    },
    [nodes, edges]
  )

  const loadWorkflow = useCallback(
    (loadedNodes: Node[], loadedEdges: Edge[]) => {
      setState({ nodes: loadedNodes, edges: loadedEdges }, true)
      initialized.current = true
    },
    [setState]
  )

  const resetWorkflow = useCallback(() => {
    setState({ nodes: [], edges: [] }, true)
    initialized.current = false
  }, [setState])



  return {
    nodes,
    edges,
    updateNodes,
    updateEdges,
    isValidConnection,
    undo,
    redo,
    canUndo,
    canRedo,
    clearDraft,
    loadWorkflow,
    resetWorkflow,
    isLoading,
    error,
    isInitialized: initialized.current,
  }
}