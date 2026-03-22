// src/modules/ai-module/loaders/index.ts
import { asClass, asValue } from "awilix"
import { LoaderOptions } from "@medusajs/framework/types"
import AiModuleService from "../service"

export default async ({ container }: LoaderOptions) => {
  console.log('🔧 REGISTERING AI MODULE LOADER')
  
  // Register the main service with multiple names for compatibility
  container.register({
    // Primary registration
    aiModuleService: asClass(AiModuleService).singleton(),
    // // Alternative names for compatibility
    // AiModuleService: asClass(AiModuleService).singleton(),
    // ai: asClass(AiModuleService).singleton(),
  })

  // Log all registered services
  const registeredKeys = Object.keys(container.registrations || {})
  console.log('📦 AI Module registered services:', registeredKeys)
}