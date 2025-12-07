import { 
  IProductModuleService, 
  IRegionModuleService, 
  IPricingModuleService 
} from "@medusajs/types"
import SyncProductService from "./sync-product-service"

export default SyncProductService

// Export the constructor dependencies
export type SyncProductServiceConstructorParams = {
  productModuleService: IProductModuleService
  regionModuleService: IRegionModuleService
  pricingModuleService: IPricingModuleService
}

// Factory function for dependency injection
export const syncProductServiceFactory = ({
  productModuleService,
  regionModuleService,
  pricingModuleService
}: SyncProductServiceConstructorParams) => {
  return new SyncProductService({
    productModuleService,
    regionModuleService,
    pricingModuleService
  })
}