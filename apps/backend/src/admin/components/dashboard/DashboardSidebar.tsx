import React from "react"
import {
  Drawer,
  Button,
  Heading,
  Text,
  Badge,
  Container,
} from "@medusajs/ui"
import {
  ChartPie,
  Tablet,
  ListBullet,
  InformationCircle,
  XMark,
} from "@medusajs/icons"

interface DashboardSidebarProps {
  isOpen: boolean
  onClose: () => void
  onAddWidget: (type: "stat" | "chart" | "table" | "list") => void
}

const WIDGET_TYPES = [
  {
    type: "stat" as const,
    label: "Stat Card",
    icon: InformationCircle,
    description: "Display key metrics with trends and comparisons",
    colors: "bg-blue-50 text-blue-600",
  },
  {
    type: "chart" as const,
    label: "Chart",
    icon: ChartPie,
    description: "Visualize data with line, bar, or pie charts",
    colors: "bg-green-50 text-green-600",
  },
  {
    type: "table" as const,
    label: "Table",
    icon: Tablet,
    description: "Show tabular data with sorting and pagination",
    colors: "bg-purple-50 text-purple-600",
  },
  {
    type: "list" as const,
    label: "List",
    icon: ListBullet,
    description: "Display items in a formatted list",
    colors: "bg-orange-50 text-orange-600",
  },
]

export const DashboardSidebar = ({ isOpen, onClose, onAddWidget }: DashboardSidebarProps) => {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Add Widget</Drawer.Title>
        </Drawer.Header>

        <Drawer.Body>
          <div className="space-y-4">
            <Text className="text-gray-500">
              Choose a widget type to add to your dashboard. You can configure its
              appearance and data source after adding.
            </Text>

            <div className="space-y-3">
              {WIDGET_TYPES.map((widget) => {
                const Icon = widget.icon
                return (
                  <Container
                    key={widget.type}
                    className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      onAddWidget(widget.type)
                      onClose()
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${widget.colors}`}>
                        <Icon />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <Heading level="h3">{widget.label}</Heading>
                          <Badge size="small">{widget.type}</Badge>
                        </div>
                        <Text className="text-gray-500 text-sm">
                          {widget.description}
                        </Text>
                      </div>
                    </div>
                  </Container>
                )
              })}
            </div>

            {/* Pre-built Templates Section */}
            <div className="mt-8">
              <Heading level="h2" className="mb-4">Quick Templates</Heading>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => {
                    // Add sales dashboard template
                    onAddWidget("stat")
                    onAddWidget("chart")
                    onAddWidget("table")
                    onClose()
                  }}
                >
                  Sales Overview Dashboard
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => {
                    // Add inventory template
                    onAddWidget("stat")
                    onAddWidget("stat")
                    onAddWidget("list")
                    onClose()
                  }}
                >
                  Inventory Status Dashboard
                </Button>
              </div>
            </div>
          </div>
        </Drawer.Body>

        <Drawer.Footer>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}