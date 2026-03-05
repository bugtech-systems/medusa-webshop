import { Widget, WidgetPosition, DashboardTab } from "../../../types/dashboards"

/**
 * Default configurations for different widget types
 */
export const getDefaultConfig = (type: string): Record<string, any> => {
  switch (type) {
    case "stat":
      return {
        value: "0",
        description: "No data available",
        trend: null,
        trendDirection: null,
        icon: null,
        color: "blue",
        format: "number",
        prefix: "",
        suffix: "",
        decimals: 0,
      }
    
    case "chart":
      return {
        type: "line",
        data: [],
        options: {
          showLegend: true,
          showGrid: true,
          animate: true,
          showTooltips: true,
          maintainAspectRatio: false,
          responsive: true,
        },
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
        xAxisLabel: "",
        yAxisLabel: "",
      }
    
    case "table":
      return {
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "name", label: "Name", sortable: true },
          { key: "value", label: "Value", sortable: true },
          { key: "status", label: "Status", sortable: true },
        ],
        data: [],
        pageSize: 5,
        pageSizeOptions: [5, 10, 25, 50],
        sortable: true,
        filterable: true,
        searchable: true,
        exportable: false,
      }
    
    case "list":
      return {
        items: [],
        showIcons: true,
        dense: false,
        dividers: true,
        maxHeight: 400,
        emptyMessage: "No items to display",
        itemLayout: "default", // 'default', 'compact', 'detailed'
      }
    
    case "progress":
      return {
        items: [],
        showPercentage: true,
        showLabels: true,
        showValues: true,
        layout: "stacked", // 'stacked', 'grid'
        size: "medium", // 'small', 'medium', 'large'
        animated: true,
      }
    
    case "metrics":
      return {
        metrics: [],
        showSparkline: true,
        timeframe: "24h",
        comparison: "previous",
        showChange: true,
        layout: "grid", // 'grid', 'list'
        columns: 2,
      }
    
    case "activity":
      return {
        activities: [],
        maxItems: 10,
        showTimestamps: true,
        showAvatars: true,
        groupByDay: true,
        showLoadMore: true,
        refreshInterval: 30000, // 30 seconds
      }
    
    case "kpi":
      return {
        title: "Key Performance Indicator",
        value: 0,
        target: 100,
        unit: "%",
        format: "percentage",
        showProgress: true,
        showComparison: true,
        comparisonValue: 0,
        comparisonLabel: "vs last period",
        thresholds: {
          critical: 50,
          warning: 75,
          success: 90,
        },
      }
    
    default:
      return {}
  }
}

/**
 * Get widget display name based on type
 */
export const getWidgetTypeName = (type: string): string => {
  const names: Record<string, string> = {
    stat: "Statistic Card",
    chart: "Chart",
    table: "Data Table",
    list: "List",
    progress: "Progress Tracker",
    // metrics: "Metrics Grid",
    // activity: "Activity Feed",
    // kpi: "KPI Indicator",
  }
  return names[type] || type.charAt(0).toUpperCase() + type.slice(1)
}

/**
 * Get widget icon name based on type
 */
export const getWidgetIcon = (type: string): string => {
  const icons: Record<string, string> = {
    stat: "chart-bar",
    chart: "chart-line",
    table: "table",
    list: "list",
    progress: "progress",
    metrics: "gauge",
    activity: "clock",
    kpi: "star",
  }
  return icons[type] || "widget"
}

/**
 * Get available widget sizes
 */
export const getWidgetSizes = (): Array<{ value: string; label: string; dimensions: { minW: number; minH: number; maxW?: number; maxH?: number } }> => {
  return [
    { 
      value: "small", 
      label: "Small", 
      dimensions: { minW: 2, minH: 1, maxW: 4, maxH: 2 } 
    },
    { 
      value: "medium", 
      label: "Medium", 
      dimensions: { minW: 3, minH: 2, maxW: 6, maxH: 4 } 
    },
    { 
      value: "large", 
      label: "Large", 
      dimensions: { minW: 4, minH: 3, maxW: 12, maxH: 6 } 
    },
    { 
      value: "wide", 
      label: "Wide", 
      dimensions: { minW: 6, minH: 2, maxW: 12, maxH: 4 } 
    },
    { 
      value: "tall", 
      label: "Tall", 
      dimensions: { minW: 2, minH: 4, maxW: 4, maxH: 8 } 
    },
  ]
}

/**
 * Get default size for widget type
 */
export const getDefaultSizeForType = (type: string): { w: number; h: number } => {
  const sizes: Record<string, { w: number; h: number }> = {
    stat: { w: 3, h: 2 },
    chart: { w: 6, h: 4 },
    table: { w: 8, h: 4 },
    list: { w: 4, h: 3 },
    progress: { w: 4, h: 3 },
    metrics: { w: 6, h: 3 },
    activity: { w: 4, h: 4 },
    kpi: { w: 3, h: 2 },
  }
  return sizes[type] || { w: 4, h: 3 }
}

/**
 * Validate widget configuration
 */
export const validateWidgetConfig = (type: string, config: Record<string, any>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  switch (type) {
    case "stat":
      if (config.value === undefined) errors.push("Value is required")
      break
    
    case "chart":
      if (!config.type) errors.push("Chart type is required")
      if (config.data && !Array.isArray(config.data)) errors.push("Data must be an array")
      break
    
    case "table":
      if (!config.columns || !Array.isArray(config.columns) || config.columns.length === 0) {
        errors.push("At least one column is required")
      }
      if (config.pageSize && (config.pageSize < 1 || config.pageSize > 100)) {
        errors.push("Page size must be between 1 and 100")
      }
      break
    
    case "list":
      if (config.items && !Array.isArray(config.items)) errors.push("Items must be an array")
      break
    
    case "progress":
      if (config.items && !Array.isArray(config.items)) errors.push("Items must be an array")
      break
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Get available widget types
 */
export const getAvailableWidgetTypes = (): Array<{ value: string; label: string; category: string; description: string }> => {
  return [
    { 
      value: "stat", 
      label: "Statistic Card", 
      category: "Data Display",
      description: "Display key metrics with optional trends and icons" 
    },
    { 
      value: "chart", 
      label: "Chart", 
      category: "Data Visualization",
      description: "Visualize data with line, bar, or pie charts" 
    },
    { 
      value: "table", 
      label: "Data Table", 
      category: "Data Display",
      description: "Show tabular data with sorting and filtering" 
    },
    { 
      value: "list", 
      label: "List", 
      category: "Data Display",
      description: "Display items in a clean list format" 
    },
    { 
      value: "progress", 
      label: "Progress Tracker", 
      category: "Status",
      description: "Track progress on multiple items" 
    },
    { 
      value: "metrics", 
      label: "Metrics Grid", 
      category: "Data Display",
      description: "Display multiple metrics in a grid" 
    },
    { 
      value: "activity", 
      label: "Activity Feed", 
      category: "Timeline",
      description: "Show recent activities and events" 
    },
    { 
      value: "kpi", 
      label: "KPI Indicator", 
      category: "Data Display",
      description: "Display key performance indicators with targets" 
    },
  ]
}

/**
 * Get widget categories
 */
export const getWidgetCategories = (): string[] => {
  return ["Data Display", "Data Visualization", "Status", "Timeline"]
}

/**
 * Clone widget with new ID and optional modifications
 */
export const cloneWidget = (
  widget: Widget,
  modifications: Partial<Widget> = {}
): Widget => {
  return {
    ...widget,
    id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: modifications.title || `${widget.title} (Copy)`,
    ...modifications,
  }
}

/**
 * Get widget size label
 */
export const getSizeLabel = (w: number, h: number): string => {
  if (w >= 6 && h >= 4) return "Large"
  if (w >= 4 && h >= 3) return "Medium"
  if (w >= 3 && h >= 2) return "Small"
  if (w >= 6 && h >= 2) return "Wide"
  if (w >= 2 && h >= 4) return "Tall"
  return "Custom"
}

/**
 * Get widget size dimensions based on size label
 */
export const getDimensionsFromSize = (
  size: string,
  defaultW: number = 4,
  defaultH: number = 3
): { w: number; h: number } => {
  switch (size) {
    case "small":
      return { w: 3, h: 2 }
    case "medium":
      return { w: 4, h: 3 }
    case "large":
      return { w: 6, h: 4 }
    case "wide":
      return { w: 8, h: 3 }
    case "tall":
      return { w: 3, h: 6 }
    default:
      return { w: defaultW, h: defaultH }
  }
}

/**
 * Check if widget dimensions are valid for grid
 */
export const isValidWidgetDimensions = (
  w: number,
  h: number,
  gridColumns: number,
  minW: number = 1,
  minH: number = 1
): boolean => {
  return w >= minW && w <= gridColumns && h >= minH
}

/**
 * Get widget usage statistics
 */
export const getWidgetStats = (tabs: DashboardTab[] = []): Record<string, number> => {
  const stats: Record<string, number> = {}
 let newTabs = tabs ?? [];

  newTabs.forEach(tab => {
    tab.widgets ? tab.widgets.forEach(widget => {
      stats[widget.type] = (stats[widget.type] || 0) + 1
    }) : []
  })

  return stats
}

/**
 * Get most used widget types
 */
export const getMostUsedWidgets = (tabs: DashboardTab[], limit: number = 5): Array<{ type: string; count: number }> => {
  const stats = getWidgetStats(tabs)
  
  return Object.entries(stats)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Get widget recommendations based on existing widgets
 */
export const getWidgetRecommendations = (
  tabs: DashboardTab[],
  currentTabId: string
): Array<{ type: string; reason: string }> => {
  const currentTab = tabs.find(t => t.id === currentTabId)
  if (!currentTab) return []

  const existingTypes = new Set(currentTab.widgets.map(w => w.type))
  const recommendations: Array<{ type: string; reason: string }> = []

  // Recommend chart if there are stats but no charts
  if (existingTypes.has("stat") && !existingTypes.has("chart")) {
    recommendations.push({
      type: "chart",
      reason: "Visualize your statistics with a chart",
    })
  }

  // Recommend table if there's data to display
  if (existingTypes.has("list") && !existingTypes.has("table")) {
    recommendations.push({
      type: "table",
      reason: "Organize data in a structured table",
    })
  }

  // Recommend progress tracker for long-running items
  if (currentTab.widgets.length > 3 && !existingTypes.has("progress")) {
    recommendations.push({
      type: "progress",
      reason: "Track progress on multiple items",
    })
  }

  // Recommend activity feed for recent changes
  if (currentTab.widgets.length > 5 && !existingTypes.has("activity")) {
    recommendations.push({
      type: "activity",
      reason: "Monitor recent activities and changes",
    })
  }

  return recommendations
}

/**
 * Get widget template
 */
export const getWidgetTemplate = (type: string): Partial<Widget> => {
  const defaultConfig = getDefaultConfig(type)
  const defaultSize = getDefaultSizeForType(type)

  return {
    type,
    title: `New ${getWidgetTypeName(type)}`,
    size: getSizeLabel(defaultSize.w, defaultSize.h).toLowerCase(),
    position: { x: 0, y: 0, w: defaultSize.w, h: defaultSize.h },
    config: defaultConfig,
  }
}

/**
 * Export widget configuration as JSON
 */
export const exportWidgetConfig = (widget: Widget): string => {
  const exportData = {
    type: widget.type,
    title: widget.title,
    config: widget.config,
    size: widget.size,
    version: "1.0",
  }
  return JSON.stringify(exportData, null, 2)
}

/**
 * Import widget configuration from JSON
 */
export const importWidgetConfig = (jsonString: string): Partial<Widget> | null => {
  try {
    const data = JSON.parse(jsonString)
    
    // Validate required fields
    if (!data.type || !data.title) {
      return null
    }

    return {
      type: data.type,
      title: data.title,
      config: data.config || getDefaultConfig(data.type),
      size: data.size || "medium",
    }
  } catch (error) {
    console.error("Failed to import widget config:", error)
    return null
  }
}