"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const salesforce_1 = require("./src/modules/salesforce");
(0, utils_1.loadEnv)(process.env.NODE_ENV || "development", process.cwd());
exports.default = (0, utils_1.defineConfig)({
    projectConfig: {
        databaseUrl: process.env.DATABASE_URL,
        http: {
            storeCors: process.env.STORE_CORS || "https://*.ngrok-free.app",
            adminCors: process.env.ADMIN_CORS || "https://*.ngrok-free.app",
            authCors: process.env.AUTH_CORS || "https://*.ngrok-free.app",
            jwtSecret: process.env.JWT_SECRET || "psawebshop",
            cookieSecret: process.env.COOKIE_SECRET || "psawebshop",
        },
    },
    modules: {
        /* -------------------- Core Required Modules -------------------- */
        [utils_1.Modules.STOCK_LOCATION]: {
            resolve: "@medusajs/stock-location",
        },
        [utils_1.Modules.INVENTORY]: {
            resolve: "@medusajs/inventory",
        },
        [utils_1.Modules.CACHE]: {
            resolve: "@medusajs/medusa/cache-inmemory",
        },
        [utils_1.Modules.WORKFLOW_ENGINE]: {
            resolve: "@medusajs/medusa/workflow-engine-inmemory",
        },
        /* -------------------- Custom Modules -------------------- */
        /* -------------------- Payment -------------------- */
        [utils_1.Modules.PAYMENT]: {
            resolve: "@medusajs/payment",
            options: {
                providers: [
                    {
                        resolve: "@medusajs/payment-stripe",
                        id: "stripe",
                        options: {
                            apiKey: process.env.STRIPE_API_KEY,
                        },
                    },
                ],
            },
        },
        [salesforce_1.SALESFORCE_AUTH]: {
            resolve: "./modules/salesforce",
            options: {
                clientId: process.env.SALESFORCE_CLIENT_ID,
                clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
                callbackUrl: process.env.SALESFORCE_CALLBACK_URL,
                sandbox: process.env.SALESFORCE_SANDBOX === "true"
            }
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVkdXNhLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL21lZHVzYS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxREFBMEU7QUFDMUUseURBQTBEO0FBRzFELElBQUEsZUFBTyxFQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxJQUFJLGFBQWEsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQTtBQUU3RCxrQkFBZSxJQUFBLG9CQUFZLEVBQUM7SUFDMUIsYUFBYSxFQUFFO1FBQ2IsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWTtRQUNyQyxJQUFJLEVBQUU7WUFDSixTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksMEJBQTBCO1lBQy9ELFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSwwQkFBMEI7WUFDL0QsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLDBCQUEwQjtZQUM3RCxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksWUFBWTtZQUNqRCxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksWUFBWTtTQUN4RDtLQUNGO0lBRUQsT0FBTyxFQUFFO1FBQ1AscUVBQXFFO1FBQ3JFLENBQUMsZUFBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ3hCLE9BQU8sRUFBRSwwQkFBMEI7U0FDcEM7UUFFRCxDQUFDLGVBQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNuQixPQUFPLEVBQUUscUJBQXFCO1NBQy9CO1FBRUQsQ0FBQyxlQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDZixPQUFPLEVBQUUsaUNBQWlDO1NBQzNDO1FBRUQsQ0FBQyxlQUFPLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDekIsT0FBTyxFQUFFLDJDQUEyQztTQUNyRDtRQUVELDhEQUE4RDtRQUU5RCx1REFBdUQ7UUFDdkQsQ0FBQyxlQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDakIsT0FBTyxFQUFFLG1CQUFtQjtZQUM1QixPQUFPLEVBQUU7Z0JBQ1AsU0FBUyxFQUFFO29CQUNUO3dCQUNFLE9BQU8sRUFBRSwwQkFBMEI7d0JBQ25DLEVBQUUsRUFBRSxRQUFRO3dCQUNaLE9BQU8sRUFBRTs0QkFDUCxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjO3lCQUNuQztxQkFDRjtpQkFDRjthQUNGO1NBQ0Y7UUFDRCxDQUFDLDRCQUFlLENBQUMsRUFBRTtZQUNqQixPQUFPLEVBQUUsc0JBQXNCO1lBQy9CLE9BQU8sRUFBRTtnQkFDSCxRQUFRLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0I7Z0JBQzFDLFlBQVksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QjtnQkFDbEQsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCO2dCQUNoRCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsS0FBSyxNQUFNO2FBQ25EO1NBQ047S0FDRjtDQUNGLENBQUMsQ0FBQSJ9