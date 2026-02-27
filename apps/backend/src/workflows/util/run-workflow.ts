import { WorkflowResponse } from '@medusajs/framework/workflows-sdk';

export async function runWorkflow(
  container,
  workflowId: string,
  input: any
) {
  const manager = container.resolve(WorkflowResponse);
  return await manager.run(workflowId, input);
}
