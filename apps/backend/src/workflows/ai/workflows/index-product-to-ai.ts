import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { indexProductStep } from "../steps/index-product"

/*
  Workflow: Index a product into AI memory for RAG retrieval.
  - Each product's title, description, and options are converted to embeddings
  - Stored as AI memory in Medusa with vector embeddings
  - Fully type-safe and modular using workflow + step
*/

export const indexProductToAiWorkflow = createWorkflow(
  "index-product-to-ai-workflow",
  function (
    input: any
  ): WorkflowResponse<any> {
    // delegate the actual indexing to a step
    return new WorkflowResponse(indexProductStep(input))
  }
)
