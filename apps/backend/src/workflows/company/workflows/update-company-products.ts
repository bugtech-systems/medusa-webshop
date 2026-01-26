import {
  updateProductsWorkflow,
} from "@medusajs/core-flows";
import { UpdateProductDTO } from "@medusajs/types";
import { Modules } from "@medusajs/utils";
import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/workflows-sdk";
import { COMPANY_MODULE } from "../../../modules/company";

type WorkflowInput = {
  products: UpdateProductDTO[];
  company_id: string;
};

export const updateCompanyProductsWorkflow = createWorkflow(
  "update-company-products-workflow",
  function (input: WorkflowData<WorkflowInput>) {
    /**
     * Update existing products
     * - Requires `id` on each product
     * - Only provided fields are updated
     */
    const products = updateProductsWorkflow.runAsStep({
      input: {
        products: input.products,
      },
    });

    /**
     * IMPORTANT:
     * We do NOT recreate remote links here.
     *
     * The product is already linked to the company
     * from creation time, and recreating links can
     * cause duplicates or constraint violations.
     */

    return new WorkflowResponse(products);
  }
);
