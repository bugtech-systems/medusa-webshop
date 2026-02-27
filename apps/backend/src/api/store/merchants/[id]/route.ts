import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { QueryContext } from "@medusajs/framework/utils";
import { ContainerRegistrationKeys } from "@medusajs/utils";
import { query } from "express";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { currency_code = "php", ...reqQuery } = req.query;

console.log(reqQuery, 'REQ QUERY')

  const companyId = req.params.id;

  const companyQuery = {
    entity: "company",
    fields: [
      "*",
      "products.*",
      "products.categories.*",
      "products.categories.*",
      "products.variants.*",
      "products.variants.calculated_price.*",
      "deliveries.*",
      "deliveries.cart.*",
      "deliveries.cart.items.*",
      "deliveries.order.*",
      "deliveries.order.items.*",
      "spending_limit_reset_frequency",
      "employees.customer.*",
      "approval_settings.*"
    ],
    filters: {
      id: companyId,
    },
    context: {
      products: {
        variants: {
          calculated_price: QueryContext({
            currency_code,
          }),
        },
      },
    },
  };

  const {
    data: [company],
  } = await query.graph(companyQuery);


  return res.status(200).json({ company });
}
