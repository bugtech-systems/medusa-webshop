import { asClass } from "awilix"
import { asValue } from "@medusajs/framework/awilix"
import { LoaderOptions } from "@medusajs/framework/types"

import {
  AiModel,
  AiMemory,
  AiConversationSession,
  AiConversationMessage
} from "../models"
import AiModuleService from "../service"

export default async ({ container }: LoaderOptions) => {

  container.register({
    aiModuleService: asClass(AiModuleService).singleton(),
    // aiModelService: asValue(manager.getRepository(AiModel)),
    // aiMemoryService: asValue(manager.getRepository(AiMemory)),
    // aiConversationSessionService: asValue(manager.getRepository(AiConversationSession)),
    // aiConversationMessageService: asValue(manager.getRepository(AiConversationMessage))
  })
}
