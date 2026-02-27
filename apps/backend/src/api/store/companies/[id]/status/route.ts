import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import zod from "zod";
import { COMPANY_MODULE } from "../../../../../modules/company";

const schema = zod.object({
  is_open: zod.boolean(),
});

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const { is_open } = schema.parse(req.body);

  const companyService = req.scope.resolve(COMPANY_MODULE);

  try {
    const company = await companyService.updateCompanies({
      id,
      is_open,
    });
    res.status(200).json({ company });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
