import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { AI_MODULE } from "../../../modules/ai"
import { IAiModuleService } from "../../../modules/ai/types"

export const indexProductStep = createStep(
  "index-product",
  async (
    input: any,
    { container }
  ): Promise<StepResponse<any, string>> => {
    const aiService = container.resolve(AI_MODULE) as any

    // fetch product data
    const productService = container.resolve("product")
    const product = await productService.retrieveProduct(input.product_id, {
      relations: ["options"]
    })

    const content = `
Product: ${product.title}
Description: ${product.description}
Options: ${product.options.map(o => o.title).join(", ")}
    `

    const memory = await aiService.createAiMemory({
      scope: "product",
      scope_id: product.id,
      content,
      language: input.language
    })

    return new StepResponse(memory, memory.id)
  },
  async (id: string, { container }) => {
    const aiService = container.resolve<IAiModuleService>(AI_MODULE)
    await aiService.deleteAiMemory(id)
  }
)
