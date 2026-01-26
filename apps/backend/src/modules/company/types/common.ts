
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
  products?: any;
  customer_group?: any;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeDTO {
  id: string;
  spending_limit: number;
  is_admin: boolean;
  company_id: string;
  company?: CompanyDTO;
  customer?: any;
  created_at: Date;
  updated_at: Date;
}


// declare module "@medusajs/types" {
//   export interface ModuleImplementations {
//     companyModuleService: CompanyModuleService;
//   }
// }
