import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils"
import { SALESFORCE_AUTH } from "./src/modules/salesforce"


loadEnv(process.env.NODE_ENV || "development", process.cwd())

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "*",
      adminCors: process.env.ADMIN_CORS || "*",
      authCors: process.env.AUTH_CORS || "*",
      jwtSecret: process.env.JWT_SECRET || "psawebshop",
      cookieSecret: process.env.COOKIE_SECRET || "psawebshop",
    },
    cookieOptions: {
      secure: true, // Set to false for HTTP on localhost
      sameSite: "none", // or "none" if required; see Step 4
    }
  },

  modules: {
    /* -------------------- Core Required Modules -------------------- */
    [Modules.STOCK_LOCATION]: {
      resolve: "@medusajs/stock-location",
    },

    [Modules.INVENTORY]: {
      resolve: "@medusajs/inventory",
    },

    [Modules.CACHE]: {
      resolve: "@medusajs/medusa/cache-inmemory",
    },

    [Modules.WORKFLOW_ENGINE]: {
      resolve: "@medusajs/medusa/workflow-engine-inmemory",
    },
    
    /* -------------------- Custom Modules -------------------- */

    /* -------------------- Payment -------------------- */
    [Modules.PAYMENT]: {
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
    [SALESFORCE_AUTH]: {
      resolve: "./modules/salesforce",
      options: {
            clientId: process.env.SALESFORCE_CLIENT_ID,
            clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
            callbackUrl: process.env.SALESFORCE_CALLBACK_URL,
            sandbox: process.env.SALESFORCE_SANDBOX === "true"
          }
    },
  },
})
