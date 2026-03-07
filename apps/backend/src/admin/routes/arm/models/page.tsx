import { defineRouteConfig } from "@medusajs/admin-sdk"
import { 
  AiAssistent, 
  Plus, 
  Sparkles,
  Puzzle,
  InformationCircle,
  XCircle,
  Calendar,
  
  ReplaySolid
} from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
  Toaster,
  IconButton,
  Tooltip,
  Skeleton,
  Input,
  Select,
  Switch,
  clx,
  toast,
  FocusModal,
} from "@medusajs/ui"
import { useState, useMemo } from "react"
import { useAiModels } from "../../../hooks/api/ai-models"
import { ModelFormDrawer } from "./components/model-form-drawer"
import { ModelActionsMenu } from "./components/model-actions-menu"
import { Globe, Workflow } from "lucide-react"

const providerIcons = {
  openai: Sparkles,
  anthropic: Workflow,
  cohere: Globe,
  huggingface: Workflow,
  custom: Puzzle,
  azure: Globe,
  google: Workflow,
  amazon: Workflow,
}

const providerColors = {
  openai: "green",
  anthropic: "blue",
  cohere: "purple",
  huggingface: "orange",
  custom: "grey",
  azure: "blue",
  google: "red",
  amazon: "yellow",
}

const modelTypeColors = {
  chat: "green",
  completion: "blue",
  embedding: "purple",
  image: "orange",
  audio: "pink",
  video: "red",
  multimodal: "cyan",
}

const statusColors = {
  active: "green",
  draft: "orange",
  inactive: "grey",
  training: "purple",
  archived: "grey",
}

const AiModelsPage = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [showInactive, setShowInactive] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, isError, refetch } = useAiModels({
    fields: "id,name,model_name,base_model,system,description,provider,base_model_id,model_type,status,config,created_at,updated_at,metadata",
    limit: 100,
    offset: 0,
  })

  // Filter and search functionality
  const filteredModels = useMemo(() => {
    if (!data?.ai_models) return []

    return data.ai_models.filter((model) => {
      // Search
      if (searchQuery && !model.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !model.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Status filter
      if (statusFilter !== "all" && model.status !== statusFilter) {
        return false
      }

      // // Provider filter
      // if (providerFilter !== "all" && model.provider !== providerFilter) {
      //   return false
      // }

      // // Type filter
      // if (typeFilter !== "all" && model.model_type !== typeFilter) {
      //   return false
      // }

      // Show inactive toggle
      // if (!showInactive && model.status === "inactive") {
      //   return false
      // }

      return true
    })
  }, [data?.ai_models, searchQuery, statusFilter, providerFilter, typeFilter, showInactive])

  const stats = useMemo(() => {
    if (!data?.ai_models) return null

    const total = data.ai_models.length
    const active = data.ai_models.filter(m => m.status === "active").length
    const draft = data.ai_models.filter(m => m.status === "draft").length
    const training = data.ai_models.filter(m => m.status === "training").length
    const inactive = data.ai_models.filter(m => m.status === "inactive").length
    
    const providers = data.ai_models.reduce((acc, model) => {
      acc[model.provider] = (acc[model.provider] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const types = data.ai_models.reduce((acc, model) => {
      acc[model.model_type] = (acc[model.model_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { total, active, draft, training, inactive, providers, types }
  }, [data?.ai_models])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getProviderIcon = (provider: string) => {
    const Icon = providerIcons[provider as keyof typeof providerIcons] || Puzzle
    return <Icon className="w-4 h-4" />
  }

  const getStatusBadge = (status: string) => {
    const color = statusColors[status as keyof typeof statusColors] || "grey"
    return (
      <Badge
        size="small"
        color={color as any}
        className="capitalize"
      >
        {status}
      </Badge>
    )
  }

  const getModelTypeBadge = (type: string) => {
    const color = modelTypeColors[type as keyof typeof modelTypeColors] || "grey"
    return (
      <Badge
        size="small"
        color={color as any}
        className="capitalize"
      >
        {type}
      </Badge>
    )
  }

  const getProviderBadge = (provider: string) => {
    const color = providerColors[provider as keyof typeof providerColors] || "grey"
    return (
      <Badge
        size="small"
        color={color as any}
        className="capitalize gap-1"
      >
        {getProviderIcon(provider)}
        {provider}
      </Badge>
    )
  }

  if (isError) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
        <div className="flex items-center gap-3">
          <InformationCircle className="w-12 h-12 text-ui-fg-muted" />
          <div className="flex flex-col gap-1">
            <Heading level="h2" className="text-ui-fg-base">
              Unable to load AI models
            </Heading>
            <Text className="text-ui-fg-muted">
              There was an error loading the AI models. Please try again.
            </Text>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetch()}>
            <ReplaySolid className="w-4 h-4" /> Retry
          </Button>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </Container>
    )
  }

  const renderEmptyState = () => {
    const hasFilters = searchQuery || statusFilter !== "all" || providerFilter !== "all" || typeFilter !== "all"
    
    return (
      <Container className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
        <div className="flex flex-col items-center gap-4">
          <AiAssistent className="w-16 h-16 text-ui-fg-muted" />
          <div className="flex flex-col items-center gap-1">
            <Heading level="h2" className="text-ui-fg-base">
              {hasFilters ? "No matching models found" : "No AI models yet"}
            </Heading>
            <Text className="text-ui-fg-muted text-center">
              {hasFilters 
                ? "Try adjusting your filters or search query"
                : "Create your first AI model to get started"
              }
            </Text>
          </div>
        </div>
        <div className="flex gap-2">
          {hasFilters ? (
            <Button variant="secondary" onClick={() => {
              setSearchQuery("")
              setStatusFilter("all")
              setProviderFilter("all")
              setTypeFilter("all")
            }}>
              Clear filters
            </Button>
          ) : (
            <ModelFormDrawer>
              <Button>
                <Plus /> Create Model
              </Button>
            </ModelFormDrawer>
          )}
        </div>
      </Container>
    )
  }

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Total Models */}
      <div className="bg-ui-bg-subtle border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-ui-bg-base rounded-lg">
            <AiAssistent className="w-5 h-5 text-ui-fg-base" />
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-xs uppercase font-semibold tracking-wider">
              Total Models
            </Text>
            <Heading level="h2" className="text-2xl mt-1">
              {stats?.total || 0}
            </Heading>
          </div>
        </div>
      </div>

      {/* Active */}
      <div className="bg-ui-bg-subtle border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Workflow className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-xs uppercase font-semibold tracking-wider">
              Active
            </Text>
            <Heading level="h2" className="text-2xl text-green-500 mt-1">
              {stats?.active || 0}
            </Heading>
          </div>
        </div>
      </div>

      {/* Draft */}
      <div className="bg-ui-bg-subtle border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Calendar className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-xs uppercase font-semibold tracking-wider">
              Draft
            </Text>
            <Heading level="h2" className="text-2xl text-orange-500 mt-1">
              {stats?.draft || 0}
            </Heading>
          </div>
        </div>
      </div>

      {/* Training */}
      <div className="bg-ui-bg-subtle border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <ReplaySolid className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-xs uppercase font-semibold tracking-wider">
              Training
            </Text>
            <Heading level="h2" className="text-2xl text-purple-500 mt-1">
              {stats?.training || 0}
            </Heading>
          </div>
        </div>
      </div>
    </div>
  )

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredModels.map((model) => (
        <div
          key={model.id}
          className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4 hover:bg-ui-bg-subtle hover:border-ui-border-interactive transition-colors cursor-pointer group"
          onClick={() => {
            window.location.href = `/app/ai-models/${model.id}`
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={clx(
                  "p-2 rounded-lg",
                  model.provider === "openai" ? "bg-green-50" :
                  model.provider === "anthropic" ? "bg-blue-50" :
                  model.provider === "cohere" ? "bg-purple-50" :
                  model.provider === "huggingface" ? "bg-orange-50" :
                  "bg-grey-50"
                )}>
                  {getProviderIcon(model.provider)}
                </div>
                <div className="flex flex-col">
                  <Text className="font-medium line-clamp-1">{model.name}</Text>
                  <Text className="text-ui-fg-subtle text-xs capitalize">
                    {model.provider}
                  </Text>
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <ModelActionsMenu model={model} />
              </div>
            </div>

            <Text className="text-ui-fg-subtle text-sm line-clamp-2">
              {model.description || "No description provided"}
            </Text>

            <div className="flex flex-wrap gap-2">
              {getModelTypeBadge(model.model_type)}
              {getStatusBadge(model.status)}
              {model.config?.max_tokens && (
                <Badge size="small" className="bg-ui-bg-base">
                  {model.config.max_tokens.toLocaleString()} tokens
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-ui-border-base">
              <Text size="xsmall" className="text-ui-fg-muted">
                Created {formatDate(model.created_at)}
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                Updated {formatDate(model.updated_at)}
              </Text>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
  
  
  

  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden gap-6">
        {/* Header */}
        <div className="p-6 border-b border-ui-border-base">
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <Heading className="font-sans font-medium h1-core">AI Models</Heading>
                <Text className="text-ui-fg-subtle">
                  Manage and configure AI models for your application
                </Text>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>
                <ModelFormDrawer>
                  <Button>
                    <Plus /> Create Model
                  </Button>
                </ModelFormDrawer>
              </div>
            </div>

            {/* Stats */}
            {stats && renderStats()}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-6">
            <div className="flex flex-col gap-4 p-4 bg-ui-bg-subtle border border-ui-border-base rounded-lg">
              <div className="flex items-center justify-between">
                <Heading level="h3" size="small">Filters</Heading>
                <Button
                  variant="transparent"
                  size="small"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                    setProviderFilter("all")
                    setTypeFilter("all")
                    setShowInactive(false)
                  }}
                >
                  Clear all
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-2">
                  <Text size="small" weight="plus">Search</Text>
                  <Input
                    placeholder="Search by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Text size="small" weight="plus">Status</Text>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <Select.Trigger>
                      <Select.Value placeholder="All statuses" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="all">All Statuses</Select.Item>
                      <Select.Item value="active">Active</Select.Item>
                      <Select.Item value="draft">Draft</Select.Item>
                      <Select.Item value="inactive">Inactive</Select.Item>
                      <Select.Item value="training">Training</Select.Item>
                    </Select.Content>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Text size="small" weight="plus">Provider</Text>
                  <Select value={providerFilter} onValueChange={setProviderFilter}>
                    <Select.Trigger>
                      <Select.Value placeholder="All providers" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="all">All Providers</Select.Item>
                      {stats?.providers && Object.entries(stats.providers).map(([provider, count]) => (
                        <Select.Item key={provider} value={provider}>
                          <div className="flex items-center justify-between w-full">
                            <span className="capitalize">{provider}</span>
                            <Badge size="small" className="ml-2">{count}</Badge>
                          </div>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Text size="small" weight="plus">Type</Text>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <Select.Trigger>
                      <Select.Value placeholder="All types" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="all">All Types</Select.Item>
                      {stats?.types && Object.entries(stats.types).map(([type, count]) => (
                        <Select.Item key={type} value={type}>
                          <div className="flex items-center justify-between w-full">
                            <span className="capitalize">{type}</span>
                            <Badge size="small" className="ml-2">{count}</Badge>
                          </div>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-ui-border-base">
                <Switch
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Text size="small">Show inactive models</Text>
              </div>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="px-6">
          <div className="flex items-center justify-between">
            <Text className="text-ui-fg-subtle">
              {isLoading ? "Loading models..." : `${filteredModels.length} ${filteredModels.length === 1 ? 'model' : 'models'} found`}
            </Text>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-ui-border-base rounded-lg p-1">
                <Button
                  variant="transparent"
                  size="small"
                  className={clx(
                    "px-3",
                    viewMode === "table" && "bg-ui-bg-base-pressed"
                  )}
                  onClick={() => setViewMode("table")}
                >
                  Table
                </Button>
                <Button
                  variant="transparent"
                  size="small"
                  className={clx(
                    "px-3",
                    viewMode === "grid" && "bg-ui-bg-base-pressed"
                  )}
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="px-6 pb-6">
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-full h-16" />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredModels.length === 0 && renderEmptyState()}

        {/* Table View */}
        {!isLoading && filteredModels.length > 0 && viewMode === "table" && (
          <div className="px-6 pb-6">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Model</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Created</Table.HeaderCell>
                  <Table.HeaderCell>Last Updated</Table.HeaderCell>
                  <Table.HeaderCell className="w-[50px]"></Table.HeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {filteredModels.map((model) => (
                  <Table.Row
                    key={model.id}
                    className="cursor-pointer hover:bg-ui-bg-base-hover group"
                    onClick={() => {
                      window.location.href = `/app/arm/models/${model.id}`
                    }}
                  >
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <div className={clx(
                          "p-2 rounded-lg",
                          model.provider === "openai" ? "bg-green-50" :
                          model.provider === "anthropic" ? "bg-blue-50" :
                          model.provider === "cohere" ? "bg-purple-50" :
                          model.provider === "huggingface" ? "bg-orange-50" :
                          "bg-grey-50"
                        )}>
                          {getProviderIcon(model.provider)}
                        </div>
                        <div className="flex flex-col">
                          <Text className="font-medium">{model.name}</Text>
                          <Text className="text-ui-fg-subtle text-xs line-clamp-1">
                            {model.description || "No description"}
                          </Text>
                        </div>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      {getStatusBadge(model.status)}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <Text size="small" className="text-ui-fg-base">
                          {formatDate(model.created_at)}
                        </Text>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {new Date(model.created_at).toLocaleDateString()}
                        </Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <Text size="small" className="text-ui-fg-base">
                          {formatDate(model.updated_at)}
                        </Text>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {new Date(model.updated_at).toLocaleDateString()}
                        </Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <ModelActionsMenu model={model} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}

        {/* Grid View */}
        {!isLoading && filteredModels.length > 0 && viewMode === "grid" && (
          <div className="px-6 pb-6">
            {renderGridView()}
          </div>
        )}
      </Container>
      <Toaster />
    </>
  )
}

export const config = defineRouteConfig({
  label: "Models",
  rank: 5,
  icon: AiAssistent,
})

export default AiModelsPage