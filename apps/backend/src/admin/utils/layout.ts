import dagre from "dagre"
import { Node, Edge } from "@xyflow/react"
import * as d3 from "d3-force"

const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

export const applyLayout = (
  nodes: Node[],
  edges: Edge[],
  layoutType: string,
  setNodes: (nodes: Node[]) => void
) => {
  if (layoutType === "force") {
    applyForceLayout(nodes, edges, setNodes)
  } else {
    applyDagreLayout(nodes, edges, layoutType, setNodes)
  }
}

const applyDagreLayout = (
  nodes: Node[],
  edges: Edge[],
  direction: string,
  setNodes: (nodes: Node[]) => void
) => {
  const isHorizontal = direction === "horizontal"
  dagreGraph.setGraph({ rankdir: isHorizontal ? "LR" : "TB" })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 100 })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    }
  })

  setNodes(layoutedNodes)
}

const applyForceLayout = (
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[]) => void
) => {
  const d3Nodes = nodes.map((n) => ({ ...n, x: n.position.x, y: n.position.y }))
  const d3Links = edges.map((e) => ({ source: e.source, target: e.target }))

  const simulation = d3
    .forceSimulation(d3Nodes as any)
    .force("link", d3.forceLink(d3Links).id((d: any) => d.id).distance(200))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(300, 300))
    .stop()

  for (let i = 0; i < 300; i++) simulation.tick()

  const updatedNodes = d3Nodes.map((n) => ({
    ...n,
    position: { x: n.x, y: n.y },
  }))

  setNodes(updatedNodes)
}