import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { MedusaError } from "@medusajs/utils";
import { z } from "zod";
import { updateCompanyProductsWorkflow } from "@/workflows/company/workflows";
import { AdminUpdateProduct } from "@medusajs/types";

/* ------------------------------------------------------------------ */
/* Schema                                                             */
/* ------------------------------------------------------------------ */

const updateSchema = z.object({
  products: z.array(z.custom<AdminUpdateProduct>()),
});

/* ------------------------------------------------------------------ */
/* UPDATE                                                             */
/* ------------------------------------------------------------------ */

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyId = req.params.id;
  const productId = req.params.product_id;

  if (!companyId || !productId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Company or product not found"
    );
  }

  const validatedBody = updateSchema.parse(req.body);

  const { result: updatedProducts } =
    await updateCompanyProductsWorkflow(
      req.scope
    ).run({
      input: {
        company_id: companyId,
        products: validatedBody.products.map(
          (product) => ({
            ...product,
            id: productId,
          })
        ),
      },
    });

  return res.status(200).json({
    company_products: updatedProducts,
  });
}
