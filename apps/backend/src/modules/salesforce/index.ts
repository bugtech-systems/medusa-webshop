import SalesforceAuthService from "./service"
import { 
  Module
} from "@medusajs/framework/utils"

export const SALESFORCE_AUTH = "Salesforce_Auth";


export default Module(SALESFORCE_AUTH, {
  service: SalesforceAuthService
})