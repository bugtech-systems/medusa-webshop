import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { COMPANY_MODULE } from "@/modules/company";
// import { DELIVERY_MODULE } from "../../../../modules/delivery";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { user_id, actor_type } = req.user as {
    user_id: string;
    actor_type: "company" | "driver";
  };

  if (actor_type === "company") {
    const service = req.scope.resolve(COMPANY_MODULE);
    const user = await service.retrieveEmployee(user_id);
     
     
     
    return res.json({ user });
  }

  // if (actor_type === "driver") {
  //   const service = req.scope.resolve(DELIVERY_MODULE);
  //   const user = await service.retrieveDriver(user_id);
  //   return res.json({ user });
  // }

  return res.status(404).json({ message: "User not found" });
};
