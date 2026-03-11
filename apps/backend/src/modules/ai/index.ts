import { Module } from "@medusajs/framework/utils";
import AiModuleService from "./service"

export const AI_MODULE = "aiService";

export default Module(AI_MODULE, {
  service: AiModuleService
  // loaders: [AiServiceLoader]
});

