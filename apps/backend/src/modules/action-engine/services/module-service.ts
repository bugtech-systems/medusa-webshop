// src/modules/action-engine/module-service.ts
import ActionEngineService from "../service"

// Export the base service
export default ActionEngineService

// Create default export for module
export const moduleServices = {
  actionEngine: ActionEngineService,
}

// Repository injection helper
export const injectRepositories = (repositories: any) => {
  return {
    actionTemplateRepository: repositories.ActionTemplateRepository,
    executionRepository: repositories.ExecutionRepository,
    actionExecutionRepository: repositories.ActionExecutionRepository,
    // Add other repositories as needed
  }
}