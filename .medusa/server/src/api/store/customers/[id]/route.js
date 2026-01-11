"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
async function GET(req, res) {
    try {
        const { id } = req.params;
        const { fields, expand, include_orders, include_groups } = req.query;
        const customerService = req.scope.resolve("customer");
        const logger = req.scope.resolve("logger");
        // Parse fields parameter (support both "*orders,*groups" format and "orders,groups" format)
        const requestedFields = parseFieldsParameter(fields || expand || "");
        // Backward compatibility with old query parameters
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
        console.log(customer, baseConfig, 'custt');
        res.status(200).json({
            customer: filteredCustomer
        });
    }
    catch (error) {
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
function parseFieldsParameter(fields) {
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
function filterCustomerResponse(customer, requestedFields) {
    // If no specific fields requested, return all
    if (requestedFields.length === 0) {
        return customer;
    }
    const result = {};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL2N1c3RvbWVycy9baWRdL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBYUEsa0JBZ0VDO0FBaEVNLEtBQUssVUFBVSxHQUFHLENBQ3ZCLEdBQTBELEVBQzFELEdBQW1CO0lBRW5CLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBQzFCLE1BQU0sRUFDSixNQUFNLEVBQ04sTUFBTSxFQUNOLGNBQWMsRUFDZCxjQUFjLEVBQ2YsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBR2QsTUFBTSxlQUFlLEdBQTJCLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTNDLDRGQUE0RjtRQUM1RixNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLElBQUksTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRXJFLG1EQUFtRDtRQUVuRCxNQUFNLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLGlCQUFpQixlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVsRixpQkFBaUI7UUFDakIsTUFBTSxVQUFVLEdBQUc7WUFDakIsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDO1lBQ3ZILFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQztTQUN0QixDQUFDO1FBRUYsSUFBSSxRQUFRLENBQUM7UUFFWCxvQ0FBb0M7UUFDcEMs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