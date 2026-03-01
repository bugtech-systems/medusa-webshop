import React, { useState } from "react"
import {
  FocusModal,
  ProgressTabs,
  toast,
} from "@medusajs/ui"
import { BasicInfoStep } from "./BasicInfoStep"
import { ConfigStep } from "./ConfigStep"
import { Widget } from "../../../dashboard/types"

interface AddWidgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (widget: Partial<Widget>) => void
}

export const AddWidgetModal: React.FC<AddWidgetModalProps> = ({
  open,
  onOpenChange,
  onAdd,
}) => {
  const [step, setStep] = useState(0)
  const [widgetData, setWidgetData] = useState<Partial<Widget>>({
    title: "",
    description: "",
    type: "",
    config: {},
  })

  const handleClose = () => {
    setStep(0)
    setWidgetData({
      title: "",
      description: "",
      type: "",
      config: {},
    })
    onOpenChange(false)
  }

  const handleAdd = () => {
    onAdd({
      ...widgetData,
      id: `widget-${Date.now()}`,
    })
    handleClose()
    toast.success("Widget added successfully")
  }

  return (
    <FocusModal open={open} onOpenChange={handleClose}>
      <FocusModal.Content className="z-50">
        <FocusModal.Header>
          <div className="flex items-center gap-4 w-full">
            <ProgressTabs value={step.toString()} className="w-full">
              <ProgressTabs.List className="border-0">
                <ProgressTabs.Trigger value="0" className="text-sm">
                  Basic Information
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger value="1" className="text-sm">
                  Configure Widget
                </ProgressTabs.Trigger>
              </ProgressTabs.List>
            </ProgressTabs>
          </div>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-col items-center overflow-y-auto">
          <div className="max-w-2xl w-full p-8">
            {step === 0 && (
              <BasicInfoStep
                data={widgetData}
                onChange={setWidgetData}
                onNext={() => setStep(1)}
              />
            )}

            {step === 1 && widgetData.type && (
              <ConfigStep
                type={widgetData.type}
                config={widgetData.config || {}}
                onChange={(config) => setWidgetData({ ...widgetData, config })}
                onBack={() => setStep(0)}
                onSave={handleAdd}
              />
            )}
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}