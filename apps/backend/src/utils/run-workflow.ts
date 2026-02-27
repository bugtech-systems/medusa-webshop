import { AI_MODULE } from './../modules/ai/index';

export async function runWorkflow(
  container,
  workflowId: string,
  input: any
) {
  const manager = container.resolve(AI_MODULE);
  return await manager.run(workflowId, input);
}
