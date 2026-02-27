// src/workflows/execute-action.ts
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { executeActionStep } from "../steps/execute-action"

type ExecuteActionWorkflowInput = {
  actionId: string
  parameters: Record<string, any>
  session: any
}



export const executeActionWorkflow = createWorkflow(
  "execute-action-workflow",
  (input: ExecuteActionWorkflowInput) => {
    const result = executeActionStep(input)
    return new WorkflowResponse(result)
  }
)