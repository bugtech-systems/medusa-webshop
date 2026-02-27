import { Module } from "@medusajs/framework/utils";
import DynamicQueryService from "./service"
//import DynamicQueryService from "./ai-service"

export const DYNAMIC_QUERY_MODULE = "dynamicQueryService";

export default Module(DYNAMIC_QUERY_MODULE, {
  service: DynamicQueryService
});

