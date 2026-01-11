"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
async function GET(req, res) {
    try {
        const { id } = req.params;
        const productModule = req.scope.resolve("product");
        const logger = req.scope.resolve("logger");
        // Retrieve product
        const product = await productModule.retrieveProduct(id);
        if (!product) {
            return res.status(404).json({
                error: "Product not found",
                message: `No product found with ID ${id}`,
            });
        }
        // Read current views (default 0)
        const currentViews = typeof product.metadata?.views === "number"
            ? product.metadata.views
            : 0;
        const updatedViews = Number(currentViews) + 1;
        // Update metadata
        await productModule.upsertProducts([
            {
                id,
                metadata: {
                    ...(product.metadata ?? {}),
                    views: updatedViews,
                },
            },
        ]);
        res.status(200).json({
            status: "success",
            product_id: id,
            views: updatedViews,
        });
    }
    catch (error) {
        const logger = req.scope.resolve("logger");
        logger.error(`Failed to increment product views: ${error.message}`, error);
        res.status(500).json({
            error: "Failed to update product views",
            message: process.env.NODE_ENV === "development"
                ? error.message
                : "Internal server error",
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL3ZpZXcvW2lkXS9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLGtCQXdEQztBQXhETSxLQUFLLFVBQVUsR0FBRyxDQUN2QixHQUFrQyxFQUNsQyxHQUFtQjtJQUVuQixJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsRUFBRSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQTtRQUV6QixNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNsRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUUxQyxtQkFBbUI7UUFDbkIsTUFBTSxPQUFPLEdBQUcsTUFBTSxhQUFhLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXZELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLEtBQUssRUFBRSxtQkFBbUI7Z0JBQzFCLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxFQUFFO2FBQzFDLENBQUMsQ0FBQTtRQUNKLENBQUM7UUFFRCxpQ0FBaUM7UUFDakMsTUFBTSxZQUFZLEdBQ2hCLE9BQU8sT0FBTyxDQUFDLFFBQVEsRUFBRSxLQUFLLEtBQUssUUFBUTtZQUN6QyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLO1lBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFUCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRTdDLGtCQUFrQjtRQUNsQixNQUFNLGFBQWEsQ0FBQyxjQUFjLENBQUM7WUFDakM7Z0JBQ0UsRUFBRTtnQkFDRixRQUFRLEVBQUU7b0JBQ1IsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO29CQUMzQixLQUFLLEVBQUUsWUFBWTtpQkFDcEI7YUFDRjtTQUNGLENBQUMsQ0FBQTtRQUVGLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ25CLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFVBQVUsRUFBRSxFQUFFO1lBQ2QsS0FBSyxFQUFFLFlBQVk7U0FDcEIsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ25CLEtBQUssRUFBRSxnQ0FBZ0M7WUFDdkMsT0FBTyxFQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLGFBQWE7Z0JBQ3BDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTztnQkFDZixDQUFDLENBQUMsdUJBQXVCO1NBQzlCLENBQUMsQ0FBQTtJQUNKLENBQUM7QUFDSCxDQUFDIn0=