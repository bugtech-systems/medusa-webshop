import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS! || "https://*.ngrok-free.app",
      adminCors: process.env.ADMIN_CORS! || "https://*.ngrok-free.app",
      authCors: process.env.AUTH_CORS! || "https://*.ngrok-free.app",
      jwtSecret: process.env.JWT_SECRET || "psawebshop",
      cookieSecret: process.env.COOKIE_SECRET || "psawebshop",
    }
  },
   modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
            },
          },
        ],
      },
    },
  ]
})
