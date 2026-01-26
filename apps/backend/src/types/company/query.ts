import { CustomerDTO } from "@medusajs/types";
import { ModuleCompany, ModuleEmployee } from "./module";
import { QueryApprovalSettings } from "../approval/query";

export type QueryCompany = ModuleCompany & {
  employees: QueryEmployee[];
  approval_settings: QueryApprovalSettings;
  carts: any;
};

export type QueryEmployee = ModuleEmployee & {
  company: QueryCompany;
  customer: CustomerDTO;
};
