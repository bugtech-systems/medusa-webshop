import { Module } from "@medusajs/framework/utils";
import AiModuleService from "./service"
import PostgresConnectionLoader from "./loaders/postgres-loader";

export const AI_MODULE = "aiModuleService";

export default Module(AI_MODULE, {
  service: AiModuleService,
  loaders: [PostgresConnectionLoader]
});

