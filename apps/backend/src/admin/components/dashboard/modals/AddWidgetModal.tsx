import React, { useState } from "react"
import {
  FocusModal,
  Button,
  Heading,
  Text as UiText,
  Label,
  Select,
} from "@medusajs/ui"

interface AddWidgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddWidget: (type: string) => void
}

export const AddWidgetModal: React.FC<AddWidgetModalProps> = ({
  open,
  onOpenChange,
  onAddWidget,
}) => {
  const [selectedType, setSelectedType] = useState("stat")

  const handleAdd = () => {
    onAddWidget(selectedType)
    setSelectedType("stat")
    // onOpenChange(false)
  }

  const widgetTypes = [
    { value: "stat", label: "Statistic Card", description: "Display key metrics" },
    { value: "chart", label: "Chart", description: "Visualize data trends" },
    { value: "table", label: "Table", description: "Show tabular data" },
    { value: "list", label: "List", description: "Display item lists" },
    { value: "progress", label: "Progress", description: "Track progress" },
  ]



  console.log(open, 'WIDGET SSTATE')
  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content className="z-20">
        <FocusModal.Header>
          <Button variant="primary" onClick={handleAdd}>
            Add Widget
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center">
          <div className="max-w-lg w-full p-8">
            <Heading level="h1" className="mb-2">Add Widget</Heading>
            <UiText className="text-ui-fg-subtle mb-6">
              Choose a widget type to add to your dashboard
            </UiText>
            
            <div className="mb-4">
              <Label>Widget Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {widgetTypes.map(type => (
                    <Select.Item key={type.value} value={type.value}>
                      {type.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              {widgetTypes.map(type => (
                <button
                  key={type.value}
                  className={`p-4 border rounded-lg text-left hover:border-ui-border-interactive transition-colors ${
                    selectedType === type.value 
                      ? "border-ui-border-interactive bg-ui-bg-base-hover" 
                      : "border-ui-border-base"
                  }`}
                  onClick={() => setSelectedType(type.value)}
                >
                  <UiText weight="plus" className="capitalize">{type.label}</UiText>
                  <UiText size="small" className="text-ui-fg-subtle">
                    {type.description}
                  </UiText>
                </button>
              ))}
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}