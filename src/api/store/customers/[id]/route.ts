// src/api/admin/customers/[id]/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ICustomerModuleService } from "@medusajs/types";
import { isFeatureFlagEnabled } from "@medusajs/utils";

// Type for query parameters
interface GetCustomerQueryParams {
  fields?: string;
  expand?: string;
  // For backward compatibility
  include_orders?: string;
  include_groups?: string;
}

export async function GET(
  req: MedusaRequest<{ id: string }, GetCustomerQueryParams>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;
    const { 
      fields, 
      expand,
      include_orders,
      include_groups 
    } = req.query;
    

    const customerService: ICustomerModuleService = req.scope.resolve("customer");
    const logger = req.scope.resolve("logger");
    
    // Parse fields parameter (support both "*orders,*groups" format and "orders,groups" format)
    const requestedFields = parseFieldsParameter(fields || expand || "");
    
    // Backward compatibility with old query parameters
    const includeOrders = include_orders === "true" || requestedFields.includes("orders");
    const includeGroups = include_groups === "true" || requestedFields.includes("groups");
    
    logger.debug(`Fetching customer ${id} with fields: ${requestedFields.join(",")}`);
    
    // Base retrieval
    const baseConfig = {
      select: ["id", "email", "first_name", "last_name", "phone", "metadata", "created_at", "updated_at", "groups", "orders"],
      relations: ["groups"]
    };
    
    let customer;

      // Standard retrieval without orders
      customer = await customerService.retrieveCustomer(id, baseConfig);
    
   
    // Filter response based on requested fields
    const filteredCustomer = filterCustomerResponse(customer, requestedFields);
    
    
    
    console.log(customer, baseConfig, 'custt')
    
    
    res.status(200).json({ 
      customer: filteredCustomer 
    });
    
  } catch (error) {
    const logger = req.scope.resolve("logger");
    logger.error(`Error fetching customer: ${error.message}`, error);
    
    if (error.name === "NotFoundError") {
      return res.status(404).json({ 
        error: "Customer not found",
        message: `No customer found with ID ${req.params.id}`
      });
    }
    
    res.status(500).json({ 
      error: "Failed to fetch customer",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
}

// Helper function to parse fields parameter
function parseFieldsParameter(fields: string): string[] {
  if (!fields || fields === "*") {
    return []; // Return all fields
  }
  
  // Remove asterisks and split by commas
  return fields
    .split(",")
    .map(field => field.replace("*", "").trim())
    .filter(field => field.length > 0);
}

// Helper function to filter customer response based on requested fields
function filterCustomerResponse(customer: any, requestedFields: string[]): any {
  // If no specific fields requested, return all
  if (requestedFields.length === 0) {
    return customer;
  }
  
  const result: any = {};
  
  // Always include basic fields
  const basicFields = ["id", "email", "first_name", "last_name", "phone", "created_at", "updated_at", "orders", "groups"];
  basicFields.forEach(field => {
    if (customer[field] !== undefined) {
      result[field] = customer[field];
    }
  });
  
  // Include requested additional fields
  requestedFields.forEach(field => {
    if (customer[field] !== undefined) {
      result[field] = customer[field];
    }
  });
  
  return result;
}