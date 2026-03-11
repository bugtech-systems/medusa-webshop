import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";
import { QUOTE_MODULE } from "./src/modules/quote";
import { COMPANY_MODULE } from "./src/modules/company";
import { AI_MODULE } from "./src/modules/ai";
import { ACTION_ENGINE_MODULE } from "./src/modules/action-engine";
import { DYNAMIC_QUERY_MODULE } from "./src/modules/dynamic-query";
import { SALESFORCE_AUTH } from "./src/modules/salesforce";
import { APPROVAL_MODULE } from './src/modules/approval';

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
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  },
  modules: {
  [ACTION_ENGINE_MODULE]: { 
    resolve: "./modules/action-engine",
    options: { 
          connection_url: process.env.DATABASE_URL,
          max_connections: 20,
          idle_timeout_ms: 30000,
          connection_timeout_ms: 5000,
          ssl: process.env.NODE_ENV === 'production',
          worker: {
              minThreads: 1,
            maxThreads: 2,
            idleTimeout: 30000,
            maxQueue: 50,
            concurrentTasksPerWorker: 1,
            // Use require.resolve so it works after build
            // workerPath: "./src/modules/action-engine/services/script-worker.js",
      }

      },
    },
    [APPROVAL_MODULE]: { resolve: "./modules/approval" },
    [AI_MODULE]: { resolve: "./modules/ai" },
    [COMPANY_MODULE]: { resolve: "./modules/company" },
    [QUOTE_MODULE]: { resolve: "./modules/quote" },
    [DYNAMIC_QUERY_MODULE]: { resolve: "./modules/dynamic-query" },
    [Modules.CACHE]: { resolve: "@medusajs/medusa/cache-inmemory" },
    [Modules.STOCK_LOCATION]: {
      resolve: "@medusajs/stock-location",
    },
    [Modules.INVENTORY]: {
      resolve: "@medusajs/inventory",
    },
    [Modules.WORKFLOW_ENGINE]: { resolve: "@medusajs/medusa/workflow-engine-inmemory" },
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
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
            },
          },
        ],
      },
    },
    [Modules.FILE]: {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              backend_url: 'http://localhost:9000/static'
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
        sandbox: process.env.SALESFORCE_SANDBOX === "true",
      },
    },
  
  }
});
