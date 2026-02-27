// src/modules/action-engine/loaders/event-bus-loader.ts
import { LoaderOptions } from "@medusajs/framework/types"
import { asValue } from "@medusajs/framework/awilix"
import EventEmitter from "events"

export default async function eventBusLoader({
  container,
  logger,
}: LoaderOptions) {
  const eventEmitter = new EventEmitter()
  
  const eventBus = {
    emit: (event: string, data: any) => {
      logger?.debug(`Emitting event: ${event}`)
      eventEmitter.emit(event, data)
    },
    
    on: (event: string, handler: (data: any) => void) => {
      eventEmitter.on(event, handler)
    },
    
    once: (event: string, handler: (data: any) => void) => {
      eventEmitter.once(event, handler)
    },
    
    removeListener: (event: string, handler: (data: any) => void) => {
      eventEmitter.removeListener(event, handler)
    }
  }
  
  container.register({
    eventBus: asValue(eventBus)
  })
  
  logger?.info("✅ Custom event bus registered")
}