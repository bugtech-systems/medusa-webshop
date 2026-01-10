import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils"
import { SALESFORCE_AUTH } from "./src/modules/salesforce"

// Load environment variables based on NODE_ENV (default: development)
loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isProd = process.env.NODE_ENV === "production"

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "*", // allow your storefront domain
      adminCors: process.env.ADMIN_CORS || "*", // allow your admin panel domain
      authCors: process.env.AUTH_CORS || "*",
      jwtSecret: process.env.MEDUSA_JWT_SECRET || "supersecret",
      cookieSecret: process.env.MEDUSA_COOKIE_SECRET || "supersecret"
    },
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

    /* -------------------- Payments -------------------- */
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

    /* -------------------- Salesforce OAuth -------------------- */
    [SALESFORCE_AUTH]: {
      resolve: "./modules/salesforce",
      options: {
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        callbackUrl: process.env.SALESFORCE_CALLBACK_URL,
        sandbox: process.env.SALESFORCE_SANDBOX == "true",
      },
    },
  },
})
