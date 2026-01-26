import { 
  createProductsWorkflow,
  createRemoteLinkStep
} from "@medusajs/core-flows";
import { CreateProductDTO } from "@medusajs/types";
import { Modules } from "@medusajs/utils"
import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/workflows-sdk";
import { COMPANY_MODULE } from "../../../modules/company";

type WorkflowInput = {
  products: CreateProductDTO[];
  company_id: string;
};

export const createCompanyProductsWorkflow = createWorkflow(
  "create-company-products-workflow",
  function (input: WorkflowData<WorkflowInput>) {
    const products = createProductsWorkflow.runAsStep({
      input: {
        products: input.products,
      },
    });

    const links = transform({
      products,
      input
    }, (data) => data.products.map((product) => ({
      [COMPANY_MODULE]: {
        company_id: data.input.company_id
      },
      [Modules.PRODUCT]: {
        product_id: product.id
      }
    })))

    createRemoteLinkStep(links)

    return new WorkflowResponse(links);
  }
);
