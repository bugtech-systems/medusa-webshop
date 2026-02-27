import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/utils";
import zod from "zod";
import { QueryContext } from "@medusajs/framework/utils";

const schema = zod.object({
  name: zod.string(),
  handle: zod.string(),
  address: zod.string(),
  phone: zod.string(),
  email: zod.string(),
  image_url: zod.string().optional(),
});

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { currency_code = "php", ...queryFilters } = req.query;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const restaurantsQuery = {
    entity: "company",
    fields: [
      "id",
      "handle",
      "name",
      "address",
      "phone",
      "email",
      "image_url",
      "logo_url",
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

  const { data: companies } = await query.graph(restaurantsQuery);

  return res.status(200).json({ companies });
}
