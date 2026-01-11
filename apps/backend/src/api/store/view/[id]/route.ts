import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(
  req: MedusaRequest<{ id: string }>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params

    const productModule = req.scope.resolve("product")
    const logger = req.scope.resolve("logger")

    // Retrieve product
    const product = await productModule.retrieveProduct(id)

    if (!product) {
      return res.status(404).json({
        error: "Product not found",
        message: `No product found with ID ${id}`,
      })
    }

    // Read current views (default 0)
    const currentViews =
      typeof product.metadata?.views === "number"
        ? product.metadata.views
        : 0

    const updatedViews = Number(currentViews) + 1

    // Update metadata
    await productModule.upsertProducts([
      {
        id,
        metadata: {
          ...(product.metadata ?? {}),
          views: updatedViews,
        },
      },
    ])

    res.status(200).json({
      status: "success",
      product_id: id,
      views: updatedViews,
    })
  } catch (error: any) {
    const logger = req.scope.resolve("logger")
    logger.error(`Failed to increment product views: ${error.message}`, error)

    res.status(500).json({
      error: "Failed to update product views",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    })
  }
}
