import { indexProductToAiWorkflow } from "../workflows/ai/workflows/index-product-to-ai"

export default async function productCreatedHandler({
  event,
  container,
}) {
  if (!event.data?.id) return

  await indexProductToAiWorkflow(container).run({
    input: { product_id: event.data.id },
  })
}
