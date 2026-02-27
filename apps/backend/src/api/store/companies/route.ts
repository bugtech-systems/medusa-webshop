import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { MedusaRequest } from "@medusajs/framework";

import { ContainerRegistrationKeys } from "@medusajs/utils";
import { createCompaniesWorkflow } from "../../../workflows/company/workflows/create-companies";
import { StoreCreateCompanyType } from "./validators";
import { QueryContext } from "@medusajs/framework/utils";

export const POST = async (
  req: AuthenticatedMedusaRequest<
    StoreCreateCompanyType | StoreCreateCompanyType[]
  >,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { result: createdCompanies } = await createCompaniesWorkflow.run({
    input: Array.isArray(req.validatedBody)
      ? req.validatedBody.map((company) => ({ ...company }))
      : [{ ...req.validatedBody }],
    container: req.scope,
  });

  const { data: companies } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id: createdCompanies.map((company) => company.id) },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ companies });
};


export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { currency_code = "php", ...queryFilters } = req.query;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const companyQuery = {
    entity: "company",
    fields: [
      "id",
      "handle",
      "name",
      "address",
      "phone",
      "email",
      "image_url",
      "is_open",
      "products.*",
      "products.categories.*",
      "products.variants.*",
      "products.variants.calculated_price.*",
      "products.variants.prices.*"
    ],
    filters: queryFilters,
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

  const { data: companies } = await query.graph(companyQuery);

  return res.status(200).json({ companies });
}
