import React, { useState, useEffect } from "react"
import {
  Container,
  Heading,
  Button,
  Toaster,
  Badge,
  toast
} from "@medusajs/ui"
import { DashboardSidebar } from "./DashboardSidebar"
import { DashboardTabs } from "./DashboardTabs"
import { WidgetGrid } from "./WidgetGrid"
import { Plus, CogSixTooth, FilePlus, ArrowDownCircle, FlyingBox } from "@medusajs/icons"

export interface DashboardTab {
  id: string
  title: string
  widgets: WidgetConfig[]
  layout: GridLayout
}

export interface WidgetConfig {
  id: string
  type: "stat" | "chart" | "table" | "list"
  title: string
  size: "small" | "medium" | "large" | "full"
  position: { x: number; y: number; w: number; h: number }
  config: any // Dynamic configuration for the widget
  dataSource?: {
    type: "static" | "api" | "query"
    endpoint?: string
    query?: any
  }
}

export interface GridLayout {
  columns: number
  rowHeight: number
  gap: number
}

const DEFAULT_LAYOUT: GridLayout = {
  columns: 12,
  rowHeight: 100,
  gap: 16,
}

export const DashboardContainer = () => {
  const [tabs, setTabs] = useState<DashboardTab[]>([
    {
      id: "default-1",
      title: "Overview",
      widgets: [],
      layout: DEFAULT_LAYOUT,
    },
  ])
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id)
  const [isEditing, setIsEditing] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)

  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0]

  // Load dashboard from localStorage on mount
  useEffect(() => {
    const savedDashboard = localStorage.getItem("custom-dashboard")
    if (savedDashboard) {
      try {
        setTabs(JSON.parse(savedDashboard))
      } catch (e) {
        console.error("Failed to load dashboard", e)
      }
    }
  }, [])

  // Save dashboard to localStorage
  const saveDashboard = () => {
    localStorage.setItem("custom-dashboard", JSON.stringify(tabs))
    toast.success('Dashboard Saved', {
      description: "Your dashboard configuration has been saved.",
    })
  }

  // Export dashboard configuration
  const exportDashboard = () => {
    const dataStr = JSON.stringify(tabs, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
    const exportFileDefaultName = `dashboard-${new Date().toISOString().slice(0,10)}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Import dashboard configuration
  const importDashboard = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importedTabs = JSON.parse(content)
        setTabs(importedTabs)
        setActiveTabId(importedTabs[0].id)
        toast.success("Dashboard Imported", {
          description: "Your dashboard has been imported successfully.",
        })
      } catch (error) {
        toast.error("Import Failed", {
          description: "The file format is invalid.",
        })
      }
    }
    reader.readAsText(file)
  }

  // Add new tab
  const addTab = () => {
    const newTab: DashboardTab = {
      id: `tab-${Date.now()}`,
      title: `Tab ${tabs.length + 1}`,
      widgets: [],
      layout: DEFAULT_LAYOUT,
    }
    setTabs([...tabs, newTab])
    setActiveTabId(newTab.id)
  }

  // Update tab
  const updateTab = (tabId: string, updates: Partial<DashboardTab>) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    ))
  }

  // Delete tab
  const deleteTab = (tabId: string) => {
    if (tabs.length === 1) {
      toast.error("Cannot Delete", {
        description: "You must have at least one tab.",
      })
      return
    }
    
    setTabs(tabs.filter(tab => tab.id !== tabId))
    if (activeTabId === tabId) {
      setActiveTabId(tabs[0].id)
    }
  }

  // Add widget to active tab
  const addWidget = (widgetType: WidgetConfig["type"]) => {
    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      title: getDefaultTitle(widgetType),
      size: "medium",
      position: findAvailablePosition(activeTab.widgets, activeTab.layout),
      config: getDefaultConfig(widgetType),
    }

    updateTab(activeTabId, {
      widgets: [...activeTab.widgets, newWidget]
    })
  }

  // Update widget in active tab
  const updateWidget = (widgetId: string, updates: Partial<WidgetConfig>) => {
    updateTab(activeTabId, {
      widgets: activeTab.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, ...updates } : widget
      )
    })
  }

  // Delete widget from active tab
  const deleteWidget = (widgetId: string) => {
    updateTab(activeTabId, {
      widgets: activeTab.widgets.filter(w => w.id !== widgetId)
    })
  }

  // Find available position for new widget
  const findAvailablePosition = (widgets: WidgetConfig[], layout: GridLayout) => {
    // Simple algorithm - place in first available spot
    // You can implement more sophisticated grid placement logic here
    const occupiedPositions = new Set(
      widgets.map(w => `${w.position.x},${w.position.y}`)
    )
    
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < layout.columns; x++) {
        if (!occupiedPositions.has(`${x},${y}`)) {
          return { x, y, w: 4, h: 2 } // Default size
        }
      }
    }
    return { x: 0, y: widgets.length, w: 4, h: 2 }
  }

  const getDefaultTitle = (type: WidgetConfig["type"]): string => {
    const titles = {
      stat: "Statistic Card",
      chart: "Chart Widget",
      table: "Data Table",
      list: "List Widget",
    }
    return titles[type]
  }

  const getDefaultConfig = (type: WidgetConfig["type"]): any => {
    const configs = {
      stat: { 
        value: "0", 
        description: "No data",
        trend: null,
        icon: null 
      },
      chart: { 
        type: "line", 
        data: [],
        options: { showLegend: true }
      },
      table: { 
        columns: [],
        data: [],
        pageSize: 5
      },
      list: { 
        items: [],
        showIcons: true
      },
    }
    return configs[type]
  }

  return (
    <div className="flex h-full">
      {/* Sidebar for adding widgets */}
      <DashboardSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onAddWidget={addWidget}
      />

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Container>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Heading level="h1">Custom Dashboard</Heading>
              <Badge variant={isEditing ? "orange" : "green"}>
                {isEditing ? "Editing Mode" : "View Mode"}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".json"
                onChange={importDashboard}
                style={{ display: 'none' }}
                id="import-dashboard"
              />
              <label htmlFor="import-dashboard">
                <Button variant="secondary" as="span">
                  <FlyingBox />
                  Import
                </Button>
              </label>
              <Button variant="secondary" onClick={exportDashboard}>
                <ArrowDownCircle />
                Export
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(!isEditing)}>
                <CogSixTooth />
                {isEditing ? "View Mode" : "Edit Mode"}
              </Button>
              <Button variant="primary" onClick={saveDashboard}>
                <FilePlus />
                Save
              </Button>
              {isEditing && (
                <Button variant="secondary" onClick={() => setShowSidebar(true)}>
                  <Plus />
                  Add Widget
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <DashboardTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
            onTabAdd={addTab}
            onTabUpdate={(tabId, title) => updateTab(tabId, { title })}
            onTabDelete={deleteTab}
            isEditing={isEditing}
          />

          {/* Widget Grid */}
          <div className="mt-6">
            <WidgetGrid
              tab={activeTab}
              isEditing={isEditing}
              onUpdateWidget={updateWidget}
              onDeleteWidget={deleteWidget}
            />
          </div>
        </Container>
      </div>

      <Toaster />
    </div>
  )
}