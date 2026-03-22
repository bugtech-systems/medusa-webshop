// src/modules/action-engine/index.ts
import { Module } from "@medusajs/framework/utils"
import ActionEngineService from "./service"
import PostgresConnectionLoader from "./loaders/postgres-loader";
import ScriptWorkerLoader from "./loaders/script-worker-loader";
import EventBusLoader from "./loaders/event-bus-loader";

export const ACTION_ENGINE_MODULE = "actionEngine"

export default Module(ACTION_ENGINE_MODULE, {
  service: ActionEngineService,
  loaders: [ScriptWorkerLoader,  PostgresConnectionLoader, EventBusLoader]
})