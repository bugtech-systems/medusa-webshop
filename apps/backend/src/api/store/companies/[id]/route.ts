import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/utils";
import {
  deleteCompaniesWorkflow,
  updateCompaniesWorkflow,
} from "../../../../workflows/company/workflows/";
import {
  StoreGetCompanyParamsType,
  StoreUpdateCompanyType,
} from "../validators";

export const GET = async (
  req: MedusaRequest<StoreGetCompanyParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  const { data } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );
    
  console.log(data, 'GET COMPANIES')  
    
  res.json({ company: data[0] });
};

export const POST = async (
  req: MedusaRequest<StoreUpdateCompanyType>,
  res: MedusaResponse
) => {
  const { id } = req.params;

  const query = req.scope.resolve(
    ContainerRegistrationKeys.QUERY
  );

  /**
   * 1. Fetch existing company
   */
  const {
    data: [existingCompany],
  } = await query.graph(
    {
      entity: "companies",
      fields: ["*"],
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  /**
   * 2. Merge existing + incoming fields
   *    Incoming body takes precedence
   */
  const mergedPayload = {
    ...existingCompany,
    ...req.body,
    id, // always ensure ID is present
  };

  /**
   * 3. Run update workflow
   */
  await updateCompaniesWorkflow.run({
    input: mergedPayload,
    container: req.scope,
  });

  /**
   * 4. Fetch updated company with requested fields
   */
  const {
    data: [company],
  } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  return res.status(200).json({ company });
};

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params;

  await deleteCompaniesWorkflow.run({
    input: { id },
    container: req.scope,
    throwOnError: true,
  });

  res.status(204).send();
};
