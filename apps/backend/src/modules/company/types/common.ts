import { CustomerDTO, CustomerGroupDTO, ProductDTO } from "@medusajs/framework/types";
import CompanyModuleService from "../service";

export interface CompanyDTO {
  id: string;
  handle?: string;
  is_open?: boolean;
  name: string;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  logo_url: string | null;
  employees?: EmployeeDTO[];
  currency_code: string | null;
  business_type?: string | null;
  products?: ProductDTO[];
  customer_group?: CustomerGroupDTO;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeDTO extends CustomerDTO {
  id: string;
  spending_limit: number;
  is_admin: boolean;
  company_id: string;
  company?: CompanyDTO;
  customer?: CustomerDTO;
  created_at: Date;
  updated_at: Date;
}


declare module "@medusajs/types" {
  export interface ModuleImplementations {
    companyModuleService: CompanyModuleService;
  }
}
