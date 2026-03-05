  import React from "react"
  import {
    Badge,
    Container,
    Heading,
    Text as UiText,
    Table,
    ProgressAccordion,
    Text,
    StatusBadge,
  } from "@medusajs/ui"
  import {
    ChartBar,
    ShoppingCart,
    Users,
    CubeSolid,
    CurrencyDollar,
    BuildingStorefront,
    DocumentText,
    ArrowUpCircleSolid,
    ArrowDown,
    Calendar,
  } from "@medusajs/icons"
  import { Widget } from "../types"
import { transformFieldsToColumns } from "../../widgets/modals/ViewWidgetModal"

  // Stat Card Widget - Fills entire container
  export const StatWidget: React.FC<{ widget: Widget }> = ({ widget }) => {
    const { value, description, trend, icon, color = "blue" } = widget.config
    
    const getIcon = () => {
      if (icon === "shopping-cart") return <ShoppingCart className="w-8 h-8" />
      if (icon === "users") return <Users className="w-8 h-8" />
      if (icon === "cube") return <CubeSolid className="w-8 h-8" />
      if (icon === "currency") return <CurrencyDollar className="w-8 h-8" />
      if (icon === "building") return <BuildingStorefront className="w-8 h-8" />
      return <ChartBar className="w-8 h-8" />
    }

    return (
      <div className="h-full w-full p-4 bg-ui-bg-base rounded-lg border border-ui-border-base hover:shadow-elevation-card-rest transition-shadow">
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between">
            <div>
              <UiText size="small" className="text-ui-fg-subtle">{widget.title}</UiText>
              <Heading level="h1" className="mt-2 text-3xl">{value || "0"}</Heading>
            </div>
            <div className={`p-3 rounded-full bg-ui-tag-${color}-bg text-ui-tag-${color}-text`}>
              {getIcon()}
            </div>
          </div>
          
          <div className="mt-auto">
            {description && (
              <UiText size="small" className="text-ui-fg-subtle block">{description}</UiText>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend > 0 ? (
                  <ArrowUpCircleSolid className="text-ui-tag-green-icon w-4 h-4" />
                ) : (
                  <ArrowDown className="text-ui-tag-red-icon w-4 h-4" />
                )}
                <UiText size="small" className={trend > 0 ? "text-ui-tag-green-text" : "text-ui-tag-red-text"}>
                  {Math.abs(trend)}% from last period
                </UiText>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Chart Widget - Fills entire container
  export const ChartWidget: React.FC<{ widget: Widget }> = ({ widget }) => {
    const { type = "line", data = [], options } = widget.config

    return (
      <div className="h-full w-full p-4 bg-ui-bg-base rounded-lg border border-ui-border-base flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <Heading level="h2" className="text-lg">{widget.title}</Heading>
          {options?.showLegend && (
            <div className="flex gap-2">
              <Badge color="blue" size="small">Series 1</Badge>
              <Badge color="green" size="small">Series 2</Badge>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {data.length > 0 ? (
            <div className="w-full h-full border border-ui-border-base rounded-lg bg-ui-bg-base-hover flex items-center justify-center">
              <UiText className="text-ui-fg-subtle">
                {type.charAt(0).toUpperCase() + type.slice(1)} Chart Visualization
              </UiText>
            </div>
          ) : (
            <div className="w-full h-full border border-ui-border-base rounded-lg bg-ui-bg-base-hover flex items-center justify-center">
              <UiText className="text-ui-fg-subtle">No data available</UiText>
            </div>
          )}
        </div>
      </div>
    )
  }

 export const TableWidget: React.FC<{ widget: Widget }> = ({ widget }) => {
    const { fields = [], data = []  } = widget as any;

 let tableColumns = transformFieldsToColumns(
      fields, 
      widget
    )

    
    const renderCell = (item: any, column: any) => {
    const value = item[column.id]

    switch (column.type) {
      case 'badge':
        return <Badge>{value}</Badge>
      case 'status':
        return (
          <StatusBadge color={value === 'active' ? 'green' : 'grey'}>
            {value}
          </StatusBadge>
        )
      case 'currency':
        return `$${value.toLocaleString()}`
      case 'date':
        return new Date(value).toLocaleDateString()
      default:
        return value
    }
  }


  return (
    <div className="space-y-6">
      {/* Summary Cards */}


      {/* Table */}
      <Container className="p-0 overflow-hidden">
        <Table>
          <Table.Header>
            <Table.Row>
              {tableColumns.map((column) => (
                <Table.HeaderCell key={column.key}>
                  {column.header}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.map((item, index) => (
              <Table.Row key={index}>
                {tableColumns.map((column) => (
                  <Table.Cell key={`${index}-${column.id}`}>
                    {renderCell(item, column)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        
      </Container>
    </div>
  )
}

  // Table Widget - Fills entire container with scrolling
  // export const TableWidget: React.FC<{ widget: Widget }> = ({ widget }) => {
  //   console.log(widget, 'TABLLE WID')
  //   const { columns = [], data = [], pageSize = 5 } = widget.config

  //   return (
  //     <div className="h-full w-full p-4 bg-ui-bg-base rounded-lg border border-ui-border-base flex flex-col">
  //       <Heading level="h2" className="text-lg mb-4 flex-shrink-0">{widget.title}</Heading>
        
  //       <div className="flex-1 min-h-0 overflow-auto">
  //         <Table>
  //           <Table.Header className="sticky top-0 bg-ui-bg-base">
  //             <Table.Row>
  //               {columns.map((col: string, idx: number) => (
  //                 <Table.HeaderCell key={idx}>{col}</Table.HeaderCell>
  //               ))}
  //             </Table.Row>
  //           </Table.Header>
  //           <Table.Body>
  //             {data.slice(0, pageSize).map((row: any, rowIdx: number) => (
  //               <Table.Row key={rowIdx}>
  //                 {columns.map((col: string, colIdx: number) => (
  //                   <Table.Cell key={colIdx}>{row[col] || "-"}</Table.Cell>
  //                 ))}
  //               </Table.Row>
  //             ))}
  //             {data.length === 0 && (
  //               <Table.Row>
  //                 <Table.Cell colSpan={columns.length} className="text-center py-8">
  //                   <UiText className="text-ui-fg-subtle">No data available</UiText>
  //                 </Table.Cell>
  //               </Table.Row>
  //             )}
  //           </Table.Body>
  //         </Table>
  //       </div>
  //     </div>
  //   )
  // }

  // List Widget - Fills entire container
  export const ListWidget: React.FC<{ widget: Widget }> = ({ widget }) => {
    const { items = [], showIcons = true } = widget.config

    return (
      <div className="h-full w-full p-4 bg-ui-bg-base rounded-lg border border-ui-border-base flex flex-col">
        <Heading level="h2" className="text-lg mb-4 flex-shrink-0">{widget.title}</Heading>
        
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="space-y-2">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-ui-border-base rounded-lg hover:bg-ui-bg-base-hover transition-colors">
                <div className="flex items-center gap-3">
                  {showIcons && (
                    <div className="p-2 rounded-full bg-ui-bg-base-hover">
                      <DocumentText className="w-4 h-4 text-ui-fg-subtle" />
                    </div>
                  )}
                  <div>
                    <UiText size="small" weight="plus">{item.label}</UiText>
                    {item.subLabel && (
                      <UiText size="xsmall" className="text-ui-fg-subtle">{item.subLabel}</UiText>
                    )}
                  </div>
                </div>
                {item.value && (
                  <Badge color={item.badgeColor || "grey"} size="small">{item.value}</Badge>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-8">
                <UiText className="text-ui-fg-subtle">No items to display</UiText>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Progress Widget - Fills entire container
  export const ProgressWidget: React.FC<{ widget: Widget }> = ({ widget }) => {
    const { items = [] } = widget.config

    return (
      <div className="h-full w-full p-4 bg-ui-bg-base rounded-lg border border-ui-border-base flex flex-col">
        <Heading level="h2" className="text-lg mb-4 flex-shrink-0">{widget.title}</Heading>
        
        <div className="flex-1 min-h-0 overflow-auto">
          <ProgressAccordion type="single" className="w-full">
            {items.map((item: any, idx: number) => (
              <ProgressAccordion.Item key={idx} value={`item-${idx}`}>
                <ProgressAccordion.Header>{item.label}</ProgressAccordion.Header>
                <ProgressAccordion.Content>
                  <div className="space-y-3 py-2">
                    {item.details?.map((detail: string, dIdx: number) => (
                      <UiText key={dIdx} size="small">{detail}</UiText>
                    ))}
                    {item.progress && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <UiText size="small">Progress</UiText>
                          <UiText size="small" weight="plus">{item.progress}%</UiText>
                        </div>
                        <div className="w-full h-2 bg-ui-bg-base-hover rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-ui-tag-blue-bg transition-all duration-300" 
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </ProgressAccordion.Content>
              </ProgressAccordion.Item>
            ))}
          </ProgressAccordion>
        </div>
      </div>
    )
  }

  // Widget registry
  export const widgetRegistry: Record<string, React.FC<{ widget: Widget }>> = {
    stat: StatWidget,
    chart: ChartWidget,
    table: TableWidget,
    list: ListWidget,
    progress: ProgressWidget,
  }