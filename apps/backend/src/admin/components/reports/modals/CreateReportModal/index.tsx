import React, { useState } from "react"
import {
  FocusModal,
  ProgressTabs,
  toast,
} from "@medusajs/ui"
import { BasicInfoStep } from "./BasicInfoStep"
import { ConfigStep } from "./ConfigStep"
import { AdminCreateReport } from "../../../../../types/reports"
import { Config } from "../../types"

interface CreateReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AdminCreateReport) => Promise<void>
  config: Config
}

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  config,
}) => {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({
    title: "",
    description: "",
    type: "",
    action_id: "",
    fields: [],
    pageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
    showIcons: true,
    dense: false,
    dividers: true,
    maxItems: 10,
  })

  const handleClose = () => {
    setStep(0)
    setFormData({
      title: "",
      description: "",
      type: "",
      action_id: "",
      fields: [],
      pageSize: 10,
      pageSizeOptions: [10, 25, 50, 100],
      showIcons: true,
      dense: false,
      dividers: true,
      maxItems: 10,
    })
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    try {
      // Prepare the final report data
      const reportData = {
        ...formData,
        // Ensure fields are properly structured
        fields: formData.fields.map((field: any) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          sortable: field.sortable,
          filterable: field.filterable,
          searchable: field.searchable,
          visible: field.visible,
        })),
      }
      
      await onSubmit(reportData as AdminCreateReport)
      handleClose()
      toast.success("Report created successfully")
    } catch (error) {
      toast.error("Failed to create report")
    }
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
                  Configure Fields
                </ProgressTabs.Trigger>
              </ProgressTabs.List>
            </ProgressTabs>
          </div>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-col items-center overflow-y-auto">
          <div className="max-w-3xl w-full p-8">
            {step === 0 && (
              <BasicInfoStep
                data={formData}
                onChange={setFormData}
                onNext={() => setStep(1)}
              />
            )}

            {step === 1 && (
              <ConfigStep
                data={formData}
                onChange={setFormData}
                onBack={() => setStep(0)}
                onSave={handleSubmit}
                type={formData.type}
              />
            )}
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}