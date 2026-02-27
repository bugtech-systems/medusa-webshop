// src/workflows/execute-action.ts
import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { ACTION_ENGINE_MODULE } from "../../../modules/action-engine"


type ExecuteActionWorkflowInput = {
  actionId: string
  parameters: Record<string, any>
  session: any
}

export const executeActionStep = createStep(
  "execute-action",
  async ({ actionId, parameters, session }: ExecuteActionWorkflowInput, { container }) => {
    const actionEngine = container.resolve(ACTION_ENGINE_MODULE) as any;
    
    const result = await actionEngine.executeAction(actionId, parameters, session)
    
    return new StepResponse(result, result)
  },
  async (result, { container }) => {
    // Compensation logic if needed
    if (result?.executionId) {
      const actionEngine = container.resolve(ACTION_ENGINE_MODULE)
      // Clean up or rollback if necessary
    }
  }
)