'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Background,
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  Controls,
  Panel,
  Handle,
  Position,
  MarkerType,
  Node,
  Edge,
  Connection,
  useKeyPress,
  EdgeLabelRenderer,
  BaseEdge,
  getSmoothStepPath,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import {
  Button,
  Text,
  Badge,
  Tooltip,
  IconButton,
  Container,
  usePrompt,
} from '@medusajs/ui';
import { resolveCollisions } from './resolve-collision';

import {
  Plus,
  ArrowLongRight,
  ArrowLongDown,
  Sparkles,
  Trash,
  Pencil,
  Check,
  XMark,
  FolderOpen,
  Folder,
  Expand,
  Minus,
} from '@medusajs/icons';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { ActionDrawer } from './action-relation-form';

// Types
export interface ActionNodeData {
  id?: string
  label: string
  type: string
  status: string
  config: Record<string, any>
  onClick?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  sourcePosition?: Position
  targetPosition?: Position
  isStartNode?: boolean
  isSubFlow?: boolean
  subFlowId?: string
  parentId?: string
  extent?: 'parent' | undefined
  expanded?: boolean
}

export interface ConnectionEdgeData {
  label?: string
  style?: 'solid' | 'dashed'
  condition?: string
  sourceHandle?: string
  targetHandle?: string
}

export type ActionNode = Node<ActionNodeData>
export type ConnectionEdge = Edge<ConnectionEdgeData>

type LayoutDirection = 'TB' | 'LR' | 'RL' | 'BT';

interface WorkflowEditorProps {
  nodes: ActionNode[]
  edges: ConnectionEdge[]
  onNodesChange: (nodes: ActionNode[]) => void
  onEdgesChange: (edges: ConnectionEdge[]) => void
  onSave: (nodes: ActionNode[], edges: ConnectionEdge[]) => void
  onAddAction: (position: { x: number; y: number }) => void
  onAddSubFlow: (position: { x: number; y: number }) => void
  onEdgeConnect: (connection: any) => void
  onCreateNodeFromEdge: (sourceNodeId: string, position: { x: number; y: number }, actionData: any) => void
  onNodeClick: (id: string) => void
  onNodeEdit?: (id: string) => void
  onNodeDelete?: (id: string) => void
  onEdgeDelete?: (edgeId: string) => void
  onLayoutChange?: (direction: LayoutDirection) => void
  onSubFlowToggle?: (subFlowId: string, expanded: boolean) => void
  selectedWorkflowId?: string | null
  isLoading?: boolean
  isSaving?: boolean
  readOnly?: boolean
}

// Custom hook for drawer toggle
const useDrawerToggle = (initialState = false) => {
  const [open, setOpen] = useState(initialState);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  return [open, openDrawer, closeDrawer] as const;
};

// Custom hook for tracking changes
const useHasChanges = (nodes: ActionNode[], edges: ConnectionEdge[], initialNodes: ActionNode[], initialEdges: ConnectionEdge[]) => {
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const nodesChanged = JSON.stringify(nodes) !== JSON.stringify(initialNodes);
    const edgesChanged = JSON.stringify(edges) !== JSON.stringify(initialEdges);
    setHasChanges(nodesChanged || edgesChanged);
  }, [nodes, edges, initialNodes, initialEdges]);

  return hasChanges;
};

// Custom Edge Component with hover effects and delete functionality
const ConnectionEdgeComponent = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: Edge<ConnectionEdgeData> & {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  selected?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 20,
  });

  const isSelfLoop = source === target;
  let selfLoopPath = edgePath;
  
  if (isSelfLoop) {
    const radius = 80;
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2 - radius;
    
    selfLoopPath = `M ${sourceX} ${sourceY} 
                    Q ${midX} ${midY} 
                    ${targetX} ${targetY}`;
  }

  const getStrokeColor = () => {
    if (selected) return '#2563eb';
    if (isHovered) return '#7c3aed';
    return style.stroke || '#4b5563';
  };

  const getStrokeWidth = () => {
    if (selected) return 3;
    if (isHovered) return 4;
    return style.strokeWidth || 2;
  };

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BaseEdge
        path={isSelfLoop ? selfLoopPath : edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: getStrokeColor(),
          strokeWidth: getStrokeWidth(),
          strokeDasharray: data?.style === 'dashed' ? '8,8' : 'none',
          transition: 'stroke 0.2s, stroke-width 0.2s',
          cursor: 'pointer',
        }}
      />
      
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: isHovered ? '#ede9fe' : '#f9fafb',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              color: isHovered ? '#6d28d9' : '#6b7280',
              border: isHovered ? '1px solid #8b5cf6' : '1px solid #e5e7eb',
              boxShadow: isHovered ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
              pointerEvents: 'all',
              zIndex: 10,
              transition: 'all 0.2s',
            }}
            className="nodrag nopan"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
};

// SubFlow Node Component
const SubFlowNodeComponent = ({ 
  data, 
  id, 
  selected,
}: { 
  data: ActionNodeData; 
  id: string; 
  selected: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const targetPosition = data.targetPosition || Position.Left;
  const sourcePosition = data.sourcePosition || Position.Right;
  const isStartNode = data.isStartNode || data.label === 'Start Alayon';

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onEdit?.(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDelete?.(id);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onEdit) {
      data.onEdit(id);
    }
  };

  return (
    <>
      {/* Target handle - hidden for start node */}
      {!isStartNode && (
        <Handle
          type="target"
          position={targetPosition}
          style={{ 
            background: '#6b7280', 
            width: 12, 
            height: 12,
            border: '3px solid white',
            transition: 'all 0.2s',
          }}
          isConnectable={true}
        />
      )}
      
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Selection actions */}
        {selected && !isStartNode && (
          <div className="absolute -top-10 right-0 flex gap-1 z-20 bg-white rounded-lg shadow-lg p-1 border border-gray-200">
            <Tooltip content="Edit SubFlow">
              <IconButton
                size="small"
                variant="transparent"
                onClick={handleEdit}
                className="hover:bg-gray-100"
              >
                <Pencil className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete SubFlow">
              <IconButton
                size="small"
                variant="transparent"
                onClick={handleDelete}
                className="hover:bg-gray-100 text-red-600"
              >
                <Trash className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          </div>
        )}

        {/* SubFlow Container */}
        <div 
          className={`rounded-lg border-2 bg-white min-w-[300px] min-h-[200px] shadow-sm transition-all ${
            selected 
              ? 'border-purple-600 ring-2 ring-purple-200' 
              : isHovered
                ? 'border-purple-400 shadow-lg'
                : 'border-purple-300 hover:border-purple-400'
          }`}
          style={{
            borderStyle: 'dashed',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-purple-50 rounded-t-lg border-b border-purple-200">
            <div className="flex items-center gap-2">
              <Folder className="text-purple-600 w-4 h-4" />
              <Text size="small" weight="plus" className="text-purple-700">
                {data.label || 'Unnamed SubFlow'}
              </Text>
            </div>
            <div className="flex items-center gap-1">
              <Badge size="small" color="purple">
                SubFlow
              </Badge>
              <Tooltip content={data.expanded ? 'Collapse' : 'Expand'}>
                <IconButton
                  size="small"
                  variant="transparent"
                  onClick={handleToggleExpand}
                  className="hover:bg-purple-200"
                >
                  {data.expanded ? <Minus className="w-3 h-3" /> : <Expand className="w-3 h-3" />}
                </IconButton>
              </Tooltip>
            </div>
          </div>

          {/* Content Area - where child nodes will be rendered */}
          <div className="p-3 min-h-[150px] bg-white rounded-b-lg">
            <div className="text-xs text-gray-400 text-center border-2 border-dashed border-gray-200 rounded p-4">
              Drop actions here to add to subflow
            </div>
          </div>
        </div>
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={sourcePosition}
        style={{ 
          background: '#6b7280', 
          width: 12, 
          height: 12,
          border: '3px solid white',
          transition: 'all 0.2s',
        }}
        isConnectable={true}
      />
    </>
  );
};

// Regular Action Node Component
const ActionNodeComponent = ({ 
  data, 
  id, 
  selected,
}: { 
  data: ActionNodeData; 
  id: string; 
  selected: boolean;
}) => {
  const targetPosition = data.targetPosition || Position.Left;
  const sourcePosition = data.sourcePosition || Position.Right;
  const isStartNode = data.isStartNode || data.label === 'Start Alayon';
  const hasParent = !!data.parentId;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onEdit?.(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDelete?.(id);
  };

  return (
    <>
      {/* Target handle - hidden for start node */}
      {!isStartNode && (
        <Handle
          type="target"
          position={targetPosition}
          style={{ 
            background: '#6b7280', 
            width: 12, 
            height: 12,
            border: '3px solid white',
            transition: 'all 0.2s',
          }}
          isConnectable={true}
        />
      )}
      
      <div className="relative">
        {/* Selection actions */}
        {selected && !isStartNode && (
          <div className="absolute -top-10 right-0 flex gap-1 z-20 bg-white rounded-lg shadow-lg p-1 border border-gray-200">
            <Tooltip content="Edit Action">
              <IconButton
                size="small"
                variant="transparent"
                onClick={handleEdit}
                className="hover:bg-gray-100"
              >
                <Pencil className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete Action">
              <IconButton
                size="small"
                variant="transparent"
                onClick={handleDelete}
                className="hover:bg-gray-100 text-red-600"
              >
                <Trash className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          </div>
        )}

        <div 
          className={`px-4 py-3 rounded-lg border bg-white min-w-[200px] shadow-sm cursor-pointer transition-all ${
            selected 
              ? 'border-blue-600 ring-2 ring-blue-200' 
              : isStartNode
                ? 'border-green-500 bg-green-50'
                : hasParent
                  ? 'border-purple-300 bg-purple-50/30'
                  : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => data.onClick?.(id)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${
                isStartNode ? 'text-green-600' : 
                hasParent ? 'text-purple-500' : 'text-gray-500'
              }`} />
              <Text size="small" weight="plus" className={
                isStartNode ? 'text-green-700' : 
                hasParent ? 'text-purple-700' : 'text-gray-700'
              }>
                {data.label || 'Unnamed Action'}
              </Text>
            </div>
            {isStartNode ? (
              <Badge size="small" color="green">Start</Badge>
            ) : hasParent ? (
              <Badge size="small" color="purple">SubFlow</Badge>
            ) : (
              <Badge size="small" color={data.status === 'active' ? 'green' : 'grey'}>
                {data.status}
              </Badge>
            )}
          </div>
          {!isStartNode && (
            <div className="mt-1 text-xs text-gray-400">
              {data.type}
            </div>
          )}
        </div>
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={sourcePosition}
        style={{ 
          background: '#6b7280', 
          width: 12, 
          height: 12,
          border: '3px solid white',
          transition: 'all 0.2s',
        }}
        isConnectable={true}
      />
    </>
  );
};

const nodeTypes = {
  actionNode: ActionNodeComponent,
  subFlowNode: SubFlowNodeComponent,
};

const edgeTypes = {
  default: ConnectionEdgeComponent,
};

// Layout configuration
const LAYOUT_CONFIG = {
  nodeWidth: 200,
  nodeHeight: 90,
  subFlowWidth: 350,
  subFlowHeight: 250,
  rankSep: 150,
  nodeSep: 80,
};

// Main Workflow Editor Component
const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  nodes: externalNodes,
  edges: externalEdges,
  onNodesChange: parentOnNodesChange,
  onEdgesChange: parentOnEdgesChange,
  onEdgeConnect,
  onCreateNodeFromEdge,
  onNodeClick,
  onNodeEdit,
  onNodeDelete,
  onEdgeDelete,
  onLayoutChange,
  selectedWorkflowId,
  onSave,
  onAddAction,
  onAddSubFlow,
  onSubFlowToggle,
  isLoading = false,
  isSaving = false,
  readOnly = false,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(externalNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(externalEdges);
  const { screenToFlowPosition, fitView, getIntersectingNodes } = useReactFlow();
  const prompt = usePrompt();
  
  // Store initial state for change detection
  const [initialNodes] = useState(externalNodes);
  const [initialEdges] = useState(externalEdges);
  const hasChanges = useHasChanges(nodes, edges, initialNodes, initialEdges);
  
  const [drawerOpen, openDrawer, closeDrawer] = useDrawerToggle(false);
  const [selectedAction, setSelectedAction] = useState<ActionNodeData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{ fromNode: string; position: { x: number; y: number }; parentId?: string } | null>(null);
  const [edgeStyle, setEdgeStyle] = useState<'solid' | 'dashed'>('solid');
  const [isLayouting, setIsLayouting] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('LR');
  const [connectionLine, setConnectionLine] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({
    start: null,
    end: null
  });

  const deleteKeyPressed = useKeyPress(['Delete', 'Backspace']);

  // Ensure there's always a start node
  useEffect(() => {
    const hasStartNode = nodes.some(node => 
      node.data.isStartNode || node.data.label === 'Start Alayon'
    );

    if (!hasStartNode && !readOnly && nodes.length === 0) {
      const startNode: ActionNode = {
        id: 'start-node',
        type: 'actionNode',
        position: { x: 250, y: 150 },
        data: {
          id: 'start-node',
          label: 'Start Alayon',
          type: 'start',
          status: 'active',
          config: {},
          isStartNode: true,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        },
      };
      
      setNodes([startNode]);
      parentOnNodesChange([startNode]);
    }
  }, [nodes, readOnly, parentOnNodesChange]);

  // Sync with external nodes/edges
  useEffect(() => {
    setNodes((nds) => resolveCollisions(externalNodes, {
      maxIterations: Infinity,
      overlapThreshold: 0.5,
      margin: 15,
    }));
  }, [externalNodes, setNodes]);

  useEffect(() => {
    setEdges(externalEdges);
  }, [externalEdges, setEdges]);

  // Handle delete key press
  useEffect(() => {
    if (readOnly || !deleteKeyPressed) return;

    const deleteSelected = async () => {
      const selectedNodes = nodes.filter(node => node.selected);
      const selectedEdges = edges.filter(edge => edge.selected);

      const hasStartNodeSelected = selectedNodes.some(node => 
        node.data.isStartNode || node.data.label === 'Start Alayon'
      );

      if (hasStartNodeSelected) {
        return;
      }

      if (selectedNodes.length > 0 || selectedEdges.length > 0) {
        const confirmed = await prompt({
          title: 'Delete selected items',
          description: `Are you sure you want to delete ${selectedNodes.length} node(s) and ${selectedEdges.length} connection(s)?`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
        });

        if (confirmed) {
          if (selectedNodes.length > 0) {
            const nodeIds = selectedNodes.map(n => n.id);
            
            // Also delete all child nodes if deleting a subflow
            const childNodeIds = nodes
              .filter(n => n.data.parentId && nodeIds.includes(n.data.parentId))
              .map(n => n.id);
            
            const allNodeIdsToDelete = [...nodeIds, ...childNodeIds];
            
            const edgesToDelete = edges.filter(e => 
              allNodeIdsToDelete.includes(e.source) || allNodeIdsToDelete.includes(e.target)
            );
            
            const updatedNodes = nodes.filter(n => !allNodeIdsToDelete.includes(n.id));
            const updatedEdges = edges.filter(e => 
              !allNodeIdsToDelete.includes(e.source) && !allNodeIdsToDelete.includes(e.target)
            );
            
            setNodes(updatedNodes);
            setEdges(updatedEdges);
            
            parentOnNodesChange(updatedNodes);
            parentOnEdgesChange(updatedEdges);
            
            allNodeIdsToDelete.forEach(id => onNodeDelete?.(id));
            edgesToDelete.forEach(e => onEdgeDelete?.(e.id));
          }
          
          if (selectedEdges.length > 0) {
            const edgeIds = selectedEdges.map(e => e.id);
            const updatedEdges = edges.filter(e => !edgeIds.includes(e.id));
            
            setEdges(updatedEdges);
            parentOnEdgesChange(updatedEdges);
            
            edgeIds.forEach(id => onEdgeDelete?.(id));
          }
        }
      }
    };

    deleteSelected();
  }, [deleteKeyPressed, nodes, edges, prompt, onNodeDelete, onEdgeDelete, readOnly, parentOnNodesChange, parentOnEdgesChange]);

  // Handle node changes
  const handleNodesChange = useCallback((changes: any) => {
    if (readOnly) return;
    
    // Check if nodes are being dragged into subflows
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.dragging) {
        const node = nodes.find(n => n.id === change.id);
        if (node && node.type !== 'subFlowNode') {
          // Find intersecting subflows
          const intersectingNodes = getIntersectingNodes(node).filter(
            n => n.type === 'subFlowNode'
          );
          
          if (intersectingNodes.length > 0) {
            // Update node with parent
            const updatedNodes = nodes.map(n => 
              n.id === node.id 
                ? { ...n, parentId: intersectingNodes[0].id, extent: 'parent' as const }
                : n
            );
            setNodes(updatedNodes);
          }
        }
      }
    });
    
    const updatedNodes = applyNodeChanges(changes, nodes);
    setNodes(updatedNodes);
    parentOnNodesChange(updatedNodes);
  }, [nodes, parentOnNodesChange, readOnly, getIntersectingNodes]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes: any) => {
    if (readOnly) return;
    const updatedEdges = applyEdgeChanges(changes, edges);
    setEdges(updatedEdges);
    parentOnEdgesChange(updatedEdges);
  }, [edges, parentOnEdgesChange, readOnly]);

  // Handle node click
  const handleNodeClick = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node) {
      setSelectedAction(node.data);
      setIsEditing(true);
      onNodeClick(id);
      openDrawer();
    }
  }, [nodes, onNodeClick, openDrawer]);

  // Handle node edit
  const handleNodeEdit = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node) {
      setSelectedAction(node.data);
      setIsEditing(true);
      onNodeEdit?.(id);
      openDrawer();
    }
  }, [nodes, onNodeEdit, openDrawer]);

  // Handle node delete
  const handleNodeDelete = useCallback(async (id: string) => {
    if (readOnly) return;

    const node = nodes.find(n => n.id === id);
    if (node?.data.isStartNode || node?.data.label === 'Start Alayon') {
      return;
    }

    const confirmed = await prompt({
      title: node?.type === 'subFlowNode' ? 'Delete SubFlow' : 'Delete action',
      description: node?.type === 'subFlowNode' 
        ? 'Are you sure you want to delete this subflow and all actions inside it?'
        : 'Are you sure you want to delete this action and all its connections?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      if (node?.type === 'subFlowNode') {
        const childNodes = nodes.filter(n => n.data.parentId === id);
        const childNodeIds = childNodes.map(n => n.id);
        const allNodeIds = [id, ...childNodeIds];
        
        const updatedNodes = nodes.filter(n => !allNodeIds.includes(n.id));
        const updatedEdges = edges.filter(e => 
          !allNodeIds.includes(e.source) && !allNodeIds.includes(e.target)
        );
        
        setNodes(updatedNodes);
        setEdges(updatedEdges);
        
        parentOnNodesChange(updatedNodes);
        parentOnEdgesChange(updatedEdges);
        
        allNodeIds.forEach(nodeId => onNodeDelete?.(nodeId));
      } else {
        const updatedNodes = nodes.filter(node => node.id !== id);
        const updatedEdges = edges.filter(edge => edge.source !== id && edge.target !== id);
        
        setNodes(updatedNodes);
        setEdges(updatedEdges);
        
        parentOnNodesChange(updatedNodes);
        parentOnEdgesChange(updatedEdges);
        
        onNodeDelete?.(id);
      }
    }
  }, [nodes, edges, parentOnNodesChange, parentOnEdgesChange, onNodeDelete, prompt, readOnly]);

  // Handle edge delete
  const handleEdgeDelete = useCallback(async (edgeId: string) => {
    if (readOnly) return;

    const confirmed = await prompt({
      title: 'Delete connection',
      description: `Are you sure you want to delete this connection? ${edgeId}`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      const updatedEdges = edges.filter(e => e.id !== edgeId);
      setEdges(updatedEdges);
      parentOnEdgesChange(updatedEdges);
      onEdgeDelete?.(edgeId);
    }
  }, [edges, parentOnEdgesChange, onEdgeDelete, prompt, readOnly]);

  // Prepare node data with handlers
  const nodesWithHandlers = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onClick: handleNodeClick,
      onEdit: handleNodeEdit,
      onDelete: handleNodeDelete,
    }
  }));

  // Handle new connections
  const onConnect = useCallback((params: Connection) => {
    if (readOnly) return;
    
    const newEdge: ConnectionEdge = {
      ...params,
      id: `edge_${params.source}_${params.target}_${Date.now()}`,
      type: 'default',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#4b5563',
        width: 12,
        height: 12,
      },
      style: { 
        stroke: '#4b5563', 
        strokeWidth: 2,
      },
      data: {
        style: edgeStyle,
        label: edgeStyle === 'dashed' ? 'Conditional' : undefined,
      },
      animated: params.source === params.target,
    };
    
    setEdges((eds) => {
      const newEdges = addEdge(newEdge, eds);
      parentOnEdgesChange(newEdges);
      return newEdges;
    });
    
    onEdgeConnect(newEdge);
    setEdgeStyle(prev => prev === 'solid' ? 'dashed' : 'solid');
    
    setConnectionLine({ start: null, end: null });
  }, [edgeStyle, onEdgeConnect, parentOnEdgesChange, readOnly]);

  // Handle connect start
  const onConnectStart = useCallback((_: any, { nodeId }: { nodeId: string }) => {
    if (readOnly) return;
    
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setConnectionLine({
        start: node.position,
        end: null
      });
    }
    
    setPendingConnection({ fromNode: nodeId, position: { x: 0, y: 0 } });
  }, [nodes, readOnly]);

  // Handle edge drop to create new node
  const onConnectEnd = useCallback(
    (event: any, connectionState: any) => {
      if (readOnly) return;
      
      if (!connectionState.isValid && connectionState.fromNode) {
        const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
        
        const position = screenToFlowPosition({
          x: clientX,
          y: clientY,
        });

        // Check if dropping into a subflow
        const targetSubFlow = nodes.find(node => {
          if (node.type !== 'subFlowNode') return false;
          
          const nodeBounds = {
            left: node.position.x,
            right: node.position.x + (node.width || LAYOUT_CONFIG.subFlowWidth),
            top: node.position.y,
            bottom: node.position.y + (node.height || LAYOUT_CONFIG.subFlowHeight),
          };
          
          return (
            position.x >= nodeBounds.left &&
            position.x <= nodeBounds.right &&
            position.y >= nodeBounds.top &&
            position.y <= nodeBounds.bottom
          );
        });
        
        setPendingConnection({
          fromNode: connectionState.fromNode.id,
          position: position,
          parentId: targetSubFlow?.id,
        });
        
        setSelectedAction(null);
        setIsEditing(false);
        openDrawer();
      }
      
      setConnectionLine({ start: null, end: null });
    },
    [screenToFlowPosition, readOnly, openDrawer, nodes]
  );

  // Handle edge click
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    
    if (!readOnly) {
      const updatedEdges = edges.map(e => ({
        ...e,
        selected: e.id === edge.id ? !e.selected : false
      }));
      
      setEdges(updatedEdges);
      parentOnEdgesChange(updatedEdges);
    }
  }, [edges, parentOnEdgesChange, readOnly]);

  // Handle edge double click
  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    handleEdgeDelete(edge.id);
  }, [handleEdgeDelete]);

  // Handle edge context menu
  const handleEdgeContextMenu = useCallback(async (event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    
    if (readOnly) return;
    
    const result = await prompt({
      title: 'Connection Options',
      description: 'What would you like to do with this connection?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (result) {
      await handleEdgeDelete(edge.id);
    }
  }, [handleEdgeDelete, prompt, readOnly]);

  // Handle add action
  const handleAddAction = useCallback(() => {
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    
    setPendingConnection({
      fromNode: 'start-node',
      position: center,
    });
    
    setSelectedAction(null);
    setIsEditing(false);
    openDrawer();
  }, [screenToFlowPosition, openDrawer]);

  // Handle add subflow
  const handleAddSubFlow = useCallback(() => {
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    
    const newSubFlowId = `subflow_${Date.now()}`;
    const newSubFlow: ActionNode = {
      id: newSubFlowId,
      type: 'subFlowNode',
      position: center,
      style: {
        width: LAYOUT_CONFIG.subFlowWidth,
        height: LAYOUT_CONFIG.subFlowHeight,
      },
      data: {
        id: newSubFlowId,
        label: 'New SubFlow',
        type: 'subflow',
        status: 'active',
        config: {},
        isSubFlow: true,
        expanded: true,
        sourcePosition: layoutDirection === 'TB' || layoutDirection === 'BT' ? Position.Bottom : Position.Right,
        targetPosition: layoutDirection === 'TB' || layoutDirection === 'BT' ? Position.Top : Position.Left,
      },
    };

    const updatedNodes = [...nodes, newSubFlow];
    setNodes(updatedNodes);
    parentOnNodesChange(updatedNodes);
    
    if (onAddSubFlow) {
      onAddSubFlow(center);
    }
  }, [nodes, parentOnNodesChange, onAddSubFlow, screenToFlowPosition, layoutDirection]);

  // Handle drawer submit
  const handleDrawerSubmit = async (actionData: any) => {
    if (readOnly) return;

    if (actionData._delete && selectedAction) {
      await handleNodeDelete(selectedAction.id);
    } else if (isEditing && selectedAction) {
      const updatedNodes = nodes.map((node) =>
        node.id === selectedAction.id
          ? { 
              ...node, 
              data: { 
                ...actionData, 
                onClick: handleNodeClick,
                sourcePosition: node.data.sourcePosition,
                targetPosition: node.data.targetPosition,
                isSubFlow: node.type === 'subFlowNode',
              } 
            }
          : node
      );
      
      setNodes(updatedNodes);
      parentOnNodesChange(updatedNodes);
      
      if (onNodeEdit) {
        onNodeEdit(selectedAction.id);
      }
    } else if (pendingConnection) {
      const newNodeId = `node_${Date.now()}`;
      const newNode: ActionNode = {
        // id: newNodeId,
        type: 'actionNode',
        position: pendingConnection.position,
        parentId: pendingConnection.parentId,
        extent: pendingConnection.parentId ? 'parent' : undefined,
        data: {
          id: newNodeId,
          ...actionData,
          onClick: handleNodeClick,
          onEdit: handleNodeEdit,
          onDelete: handleNodeDelete,
          parentId: pendingConnection.parentId,
          sourcePosition: layoutDirection === 'TB' || layoutDirection === 'BT' ? Position.Bottom : Position.Right,
          targetPosition: layoutDirection === 'TB' || layoutDirection === 'BT' ? Position.Top : Position.Left,
        },
      };

      let newAct = await onCreateNodeFromEdge(
        pendingConnection.fromNode, 
        pendingConnection.position, 
        actionData
      ) as any;

      
      const updatedNodes = [...nodes, {...newNode, id: newAct.id}];
      setNodes(updatedNodes);
      parentOnNodesChange(updatedNodes);





const newEdge: ConnectionEdge = {
        id: `edge_${pendingConnection.fromNode}_${newAct?.id || newNodeId}_${Date.now()}`,
        source: pendingConnection.fromNode,
        target: newAct?.id || newNodeId,
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#4b5563',
          width: 12,
          height: 12,
        },
        style: { 
          stroke: '#4b5563', 
          strokeWidth: 2,
        },
        data: {
          style: 'solid',
        },
      };
     

   let createdConnection = await onEdgeConnect(newEdge);


    setEdges((eds) => {
      const newEdges = addEdge(newEdge, eds);
      parentOnEdgesChange(newEdges);
      return newEdges;
    });



      // const updatedEdges = [...edges, newEdge];
      // setEdges(updatedEdges);
      // parentOnEdgesChange(updatedEdges);
    }
    
    closeDrawer();
    setSelectedAction(null);
    setIsEditing(false);
    setPendingConnection(null);
    setConnectionLine({ start: null, end: null });
    setTimeout(() => {
      fitView({ padding: 0.2 });
    }, 100);
  };
  
  const onNodeDragStop = useCallback(() => {
    setNodes((nds) =>
      resolveCollisions(nds, {
        maxIterations: Infinity,
        overlapThreshold: 0.5,
        margin: 15,
      }),
    );
  }, [setNodes]);

  // Apply dagre layout
  const applyDagreLayout = (direction: LayoutDirection) => {
    if (nodes.length === 0 || readOnly) return;
    
    setIsLayouting(true);
    setLayoutDirection(direction);
    onLayoutChange?.(direction);

    try {
      const g = new dagre.graphlib.Graph();
      
      g.setGraph({ 
        rankdir: direction, 
        nodesep: LAYOUT_CONFIG.nodeSep, 
        ranksep: LAYOUT_CONFIG.rankSep,
        marginx: 50,
        marginy: 50,
      });
      g.setDefaultEdgeLabel(() => ({}));

      // Group nodes by parent for hierarchical layout
      const rootNodes = nodes.filter(n => !n.parentId);
      const childNodes = nodes.filter(n => n.parentId);

      rootNodes.forEach(node => {
        g.setNode(node.id, { 
          width: node.type === 'subFlowNode' ? LAYOUT_CONFIG.subFlowWidth : (node.width || LAYOUT_CONFIG.nodeWidth), 
          height: node.type === 'subFlowNode' ? LAYOUT_CONFIG.subFlowHeight : (node.height || LAYOUT_CONFIG.nodeHeight),
        });
      });

      edges.forEach(edge => {
        g.setEdge(edge.source, edge.target);
      });

      dagre.layout(g);

      const isVertical = direction === 'TB' || direction === 'BT';
      
      const layoutedNodes = nodes.map(node => {
        if (node.parentId) {
          // Child nodes position relative to parent
          const parent = nodes.find(n => n.id === node.parentId);
          if (parent) {
            return {
              ...node,
              position: {
                x: parent.position.x + 50 + (Math.random() * 100),
                y: parent.position.y + 50 + (Math.random() * 100),
              },
              data: {
                ...node.data,
                sourcePosition: isVertical ? Position.Bottom : Position.Right,
                targetPosition: isVertical ? Position.Top : Position.Left,
              },
            };
          }
          return node;
        } else {
          const nodeWithPos = g.node(node.id);
          if (nodeWithPos) {
            return {
              ...node,
              position: { 
                x: nodeWithPos.x - (node.type === 'subFlowNode' ? LAYOUT_CONFIG.subFlowWidth : (node.width || LAYOUT_CONFIG.nodeWidth)) / 2, 
                y: nodeWithPos.y - (node.type === 'subFlowNode' ? LAYOUT_CONFIG.subFlowHeight : (node.height || LAYOUT_CONFIG.nodeHeight)) / 2,
              },
              data: {
                ...node.data,
                sourcePosition: isVertical ? Position.Bottom : Position.Right,
                targetPosition: isVertical ? Position.Top : Position.Left,
              },
            };
          }
          return node;
        }
      });

      setNodes(layoutedNodes);
      parentOnNodesChange(layoutedNodes);
      
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    } catch (error) {
      console.error('Layout failed:', error);
    } finally {
      setIsLayouting(false);
    }
  };

  return (
    <Container className="h-full w-full p-0">
      <div className="h-[800px] w-full relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onEdgeClick={onEdgeClick}
          onNodeDragStop={onNodeDragStop}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onEdgeContextMenu={handleEdgeContextMenu}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          nodeOrigin={[0.5, 0]}
          connectionLineStyle={{ stroke: '#9ca3af', strokeWidth: 2 }}
          connectionLineType="smoothstep"
          deleteKeyCode={null}
          multiSelectionKeyCode="Shift"
          selectionKeyCode="Shift"
          panOnScroll
          selectionOnDrag
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls showFitView={true} showInteractive={true} />
          
          {/* Save/Cancel Panel */}
           {/* {hasChanges && !readOnly && (
            <Panel position="top-center" className="flex gap-2 bg-white rounded-lg shadow-lg p-2 z-10">
              <Button
                variant="primary"
                size="small"
                onClick={handleSave}
                isLoading={isSaving}
              >
                <Check className="mr-1" />
                Save Changes
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={handleDiscard}
              >
                <XMark className="mr-1" />
                Discard
              </Button>
            </Panel>
          )}  */}
          
          {/* Main Controls */}
          <Panel position="top-right" className="flex flex-col gap-2">
            {/* Add buttons */}
            {!readOnly && (
              <div className="flex gap-2 bg-white rounded-lg shadow-lg p-2">
                <Tooltip content="Add Action">
                  <IconButton onClick={handleAddAction} variant="primary">
                    <Plus />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Add SubFlow">
                  <IconButton onClick={handleAddSubFlow} variant="secondary">
                    <FolderOpen />
                  </IconButton>
                </Tooltip>
              </div>
            )}
            
            {/* Layout Controls */}
            <div className="flex gap-2 bg-white rounded-lg shadow-lg p-2">
              <Tooltip content="Left to Right">
                <IconButton 
                  onClick={() => applyDagreLayout('LR')}
                  isLoading={isLayouting}
                  variant={layoutDirection === 'LR' ? 'primary' : 'transparent'}
                >
                  <ArrowLongRight />
                </IconButton>
              </Tooltip>
              <Tooltip content="Right to Left">
                <IconButton 
                  onClick={() => applyDagreLayout('RL')}
                  isLoading={isLayouting}
                  variant={layoutDirection === 'RL' ? 'primary' : 'transparent'}
                >
                  <ArrowLongRight className="rotate-180" />
                </IconButton>
              </Tooltip>
              <Tooltip content="Top to Bottom">
                <IconButton 
                  onClick={() => applyDagreLayout('TB')}
                  isLoading={isLayouting}
                  variant={layoutDirection === 'TB' ? 'primary' : 'transparent'}
                >
                  <ArrowLongDown />
                </IconButton>
              </Tooltip>
              <Tooltip content="Bottom to Top">
                <IconButton 
                  onClick={() => applyDagreLayout('BT')}
                  isLoading={isLayouting}
                  variant={layoutDirection === 'BT' ? 'primary' : 'transparent'}
                >
                  <ArrowLongDown className="rotate-180" />
                </IconButton>
              </Tooltip>
            </div>
          </Panel>

          {/* Info Panel */}
          <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-3">
            <div className="flex flex-col gap-2">
              <Badge color="grey" size="large">
                {nodes.filter(n => !n.parentId).length} Actions • {edges.length} Relations • {nodes.filter(n => n.type === 'subFlowNode').length} Models
              </Badge>
              {selectedWorkflowId && (
                <Badge color="blue" size="large">
                  Editing: {selectedWorkflowId}
                </Badge>
              )}
            </div>
          </Panel>

          {/* Loading States */}
          {(isLoading || isLayouting) && (
            <Panel position="center">
              <Badge color="blue" size="large" className="shadow-lg">
                {isLoading ? 'Loading workflow...' : 'Applying layout...'}
              </Badge>
            </Panel>
          )}
        </ReactFlow>

        <ActionDrawer
          open={drawerOpen}
          onClose={() => {
            closeDrawer();
            setSelectedAction(null);
            setIsEditing(false);
            setPendingConnection(null);
          }}
          onSubmit={handleDrawerSubmit}
          action={selectedAction}
          isEditing={isEditing}
        />
      </div>
    </Container>
  );
};

// Wrap with ReactFlowProvider
export default function WorkflowEditorWrapper(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditor {...props} />
    </ReactFlowProvider>
  );
}