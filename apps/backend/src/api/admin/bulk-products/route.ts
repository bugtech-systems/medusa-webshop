import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { batchPriceListPricesWorkflow, batchProductsWorkflow,  } from "@medusajs/medusa/core-flows"

// ----------------------
// Incoming Types
// ----------------------
type IncomingPrice = {
  region?: any
  region_id_or_name: string      // e.g. "us", "eu", "au-member"
  amount: number
  currency_code: string
}

type IncomingVariant = {
  id: string | null
  sku: string
  prices: IncomingPrice[]
  inventory_quantity?: number
  manage_inventory?: boolean
}

type IncomingProduct = {
  external_id: string
  title: string
  description?: string 
  publishFormat?: string
  category?: string
  weight?: number
  additionalNotes?: string
  handle: string
  status: "draft" | "proposed" | "published" | "rejected"
  variants: IncomingVariant[]
  collection?: string
  metadata?: Record<string, any>
}

// ----------------------
// POST Route
// ----------------------
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
  const payload = req.body as IncomingProduct[]

  const pricingModule = req.scope.resolve("pricing")
  const productModule = req.scope.resolve("product")
  const customerModule = req.scope.resolve("customer")
  const inventoryModule = req.scope.resolve("inventory")
  const regionModule = req.scope.resolve("region")
    const salesChannelModule = req.scope.resolve("sales_channel")
    const fulfillmentModule = req.scope.resolve("fulfillment")

  // ----------------------
  // Helpers
  // ----------------------

  const resolveRegion = async (key: string) => {
    const regions = await regionModule.listRegions({ currency_code: String(key).toLowerCase() })
    if (!regions.length) throw new Error(`Region not found: ${key}`)
    return regions[0]
  }

  const resolveGroup = async (key: string) => {
        if (!key) return undefined

    const groups = await customerModule.listCustomerGroups({ name: key == "default" ? "nonmember" : key })
    if (groups.length) return groups[0]
    
          // Auto-create category if it does not exist
      const created = await customerModule.createCustomerGroups([{name: key == "default" ? "nonmember" : key}])
      return created[0]
  }

  const resolveCollectionId = async (title?: string) => {
    if (!title) return undefined
    const collections = await productModule.listProductCollections({ title })
    return collections[0]?.id
  }

    const resolveCategoryId = async (name?: string) => {
      if (!name) return undefined
      const categories = await productModule.listProductCategories({ name })
      if (categories.length) return categories[0].id

      // Auto-create category if it does not exist
      const created = await productModule.createProductCategories([{name}])
      return created[0].id
    }

  const resolvePriceRules = async (price: IncomingPrice) => {
    const [regionKey, groupKey] = price.region_id_or_name.split("-")
    const currency = price.currency_code

    const region = await resolveRegion(currency)
    const rules: Record<string, any> = (groupKey == 'nonmember' || groupKey == 'default') ? {} : {}


    if (groupKey && !(groupKey == 'nonmember' || groupKey == 'default')) {
      const group = await resolveGroup(groupKey) as any;
      // rules.customer_group_id = group.id
    }


    return {
      ...price,
      title: (groupKey == 'nonmember' || groupKey == 'default') ? 'nonmember' : groupKey,
      amount: Number(price.amount) / 100,
      currency_code: price.currency_code.toLowerCase(),
      region,
      rules,
    }
  }
  
  
      // We'll collect normalized incoming prices by sku for later use:
    const incomingPricesBySku: Record<string, Array<{
      amount: number
      currency_code: string
      group_name: string
      region_id?: string
    }>> = {}

    const defaultChannel = (await salesChannelModule.listSalesChannels()).find((c: any) => c.name == 'Online Store');
    
    if (!defaultChannel) throw new Error("Default sales channel not found")

    const defaultShipping = (await fulfillmentModule.listShippingProfiles()).find((c: any) => c.type == 'default');
    
    if (!defaultShipping) throw new Error("Default Shipping not found")



  // ----------------------
  // Build Create / Update Payload
  // ----------------------
  const createPayload: any[] = []
  const updatePayload: any[] = []



  for (const product of payload) {
    const collection_id = await resolveCollectionId(product.collection)
      const category_id = await resolveCategoryId(product.category)

    const variants = [] as any;
    let metadata = {...product.metadata};
    
    for (const variant of product.variants) {
      const prices = [] as any;
      
      incomingPricesBySku[variant.sku] = [];
      
      
      for (const p of variant.prices) {
      let price = await resolvePriceRules(p);
      
      
      
      // console.log(price, 'PRICE')
      if(price.amount){
        metadata[price.title] = price.amount;
        
        if(price.title == 'nonmember'){
        prices.push(price)
        } else {
        
        incomingPricesBySku[variant.sku].push({
           amount: price.amount,
           currency_code: price.currency_code,
           group_name: price.title,
           region_id: price.region.id
        })
        
        }
      }  
   }
      
      variants.push({
        ...(variant?.id ? {id: variant.id} : {}),
        title: variant.sku,
        sku: variant.sku,
        manage_inventory: variant.manage_inventory ?? true,
        ...(product.publishFormat ? { options: {
          Format: product.publishFormat
        }} : {}),
        prices,
      })
    }

    // Check if product exists by any variant SKU
    let existingProduct = null as any;
    for (const v of product.variants) {
    //   const found = await productModule.listProductVariants({ sku: v.sku }, {relations: ["variants"]})
      
      // List all products with variants
  const products = await productModule.listProducts(
    {},
    { relations: ["variants"] } // load variants & prices
  )

  // Filter in JS for the variant SKU
  const found = products.find((product: any) =>
    product.variants.some((vr: any) => vr.sku === v.sku)
  ) as any;
      
      
      if (found) {
        
        existingProduct = found as any;
        break
      }
    }


    const payloadObj = {
      title: product.title,
      description: product.description,
      handle: product.handle,
      external_id: product.external_id,
      status: product.status,
      metadata: metadata,
      collection_id,
      shipping_profile_id: defaultShipping.id,
      weight: product.weight,
      sales_channels: [{id:defaultChannel.id}], // Assign default sales channel
      ...(category_id ? { categories: [{id: category_id}]} : {}),
      options: [ {
              title: "Format",
              values: [product.publishFormat ? product.publishFormat : "default"],
            }],
      variants,
    }




if (existingProduct) {
  // Map incoming variants to existing ones
  const updatedVariants = product.variants.map((v) => {
    const existingVariant = existingProduct.variants.find((ev: any) => ev.sku === v.sku)
    if (existingVariant) {
      // Update existing variant
      return {
        id: existingVariant.id, // important!
        title: v.sku,
        sku: v.sku,
        manage_inventory: v.manage_inventory ?? existingVariant.manage_inventory,
        ...(product.publishFormat ? { options: {
          Format: product.publishFormat
        }} : {}),
        prices: v.prices.map(async (p) => await resolvePriceRules(p)), // resolve prices
      }
      
      
      
    } else {
      // New variant
      return {
        title: v.sku,
        sku: v.sku,
        manage_inventory: v.manage_inventory ?? true,
        ...(product.publishFormat ? { options: {
          Format: product.publishFormat
        }} : {}),
        prices: v.prices.map(async (p) => await resolvePriceRules(p)),
      }
    }
  })

  // Resolve prices properly
  const resolvedVariants = await Promise.all(updatedVariants)

  updatePayload.push({
    id: existingProduct.id,
    title: product.title,
    description: product.description,
    handle: product.handle,
    external_id: product.external_id,
    status: product.status,
    metadata: metadata,
    collection_id,
    shipping_profile_id: defaultShipping.id,
    weight: product.weight,
      ...(category_id ? { categories: [{id: category_id}]} : {}),
      options: [ {
              title: "Format",
              values: [product.publishFormat ? product.publishFormat : "default"],
            }],
    sales_channels: [{id: defaultChannel.id}], // Assign default sales channel
    variants: resolvedVariants,
  })
} else {
  // New product
  const resolvedVariants = await Promise.all(
    variants.map(async (v) => {
      v.prices = await Promise.all(v.prices)
      return v
    })
  )
  createPayload.push({ ...payloadObj, variants: resolvedVariants })
}

  }





  // ----------------------
  // Run Medusa v2 Workflow
  // ----------------------
  const { result } = await batchProductsWorkflow(req.scope).run({
    input: {
      create: createPayload,
      update: updatePayload,
    },
  })
  


    // ----------------------
    // Price lists + price items
    // ----------------------
    const existingGroups = await customerModule.listCustomerGroups({}, { take: 1000 })
    const groupNameMap: Record<string, any> = {}
    const productsArr = [...result.created, ...result.updated];
    for (const g of existingGroups) groupNameMap[g.name] = g;

    // Ensure nonmember exists
    if (!groupNameMap["nonmember"]) {
      const created = await customerModule.createCustomerGroups([{ name: "nonmember" }])
      groupNameMap["nonmember"] = created[0]
    }

    // 2) Collect any group names referenced in incoming payloads that don't exist yet and create them
    const incomingGroupNames = new Set<string>()
    for (const prod of payload) {
      for (const v of prod.variants) {
        for (const pr of v.prices) {
          const parts = (pr.region_id_or_name || "").split("-")
          if (parts[1]) incomingGroupNames.add(parts[1] === "default" ? "nonmember" : parts[1])
        }
      }
    }
    for (const groupName of incomingGroupNames) {
      if (!groupNameMap[groupName]) {
        const created = await customerModule.createCustomerGroups([{ name: groupName }])
        groupNameMap[groupName] = created[0]
      }
    }
    
    
    
        // 3) Ensure a price list for each group (title = price-list-<groupName>), type = override, status = ACTIVE
    const groupToPriceList: Record<string, any> = {}
    const allGroups = Object.values(groupNameMap)
    for (const g of allGroups) {
  
      const plTitle = `price-list-${g.name}`

    //  console.log(plTitle, 'FIND PLISST LISTS')

      let foundLists: any[] = []
        foundLists = await pricingModule.listPriceLists({ q: plTitle })

    //  console.log(foundLists, 'FOUND LISTS')
 
      let found = (foundLists || []).find((pl: any) => pl.title === plTitle)
      console.log(found, 'FOUNDED')
      if (!found) {
          found = await pricingModule.createPriceLists([{
            title: plTitle,
            description: `Auto-generated override price list for ${g.name}`,
            type: "override",
            status: "active",
            rules: {
               'customer.groups.id': [g.id]
            }
          }])
      } else {
       pricingModule.updatePriceLists([
          { 
            id: found.id,
            title: plTitle,
            description: `Auto-generated override price list for ${g.name}`,
            status: "active",
            rules: {
               'customer.groups.id': [g.id]
            }
          }
       ])
      
      }

      groupToPriceList[g.name] = found
    }


    // 4) Build price additions per price list (batch) and call addPrices
    const priceBatchesByListId: Record<string, any[]> = {}
    const metadataPricesByProduct: Record<string, Record<string, number>> = {}

    for (const prod of productsArr) {
      const prodId = prod.id
      metadataPricesByProduct[prodId] = metadataPricesByProduct[prodId] ?? {}

      // For each variant returned, find SKU-based incoming prices we built earlier
      for (const variant of prod.variants || []) {
        const sku = variant.sku
        const variantId = variant.id
        let incomingPrices = [] as any;
        
        if(sku){
        incomingPrices = incomingPricesBySku[sku] 
        }

        



        // For every price-group (groupToPriceList), choose a price for this group
        for (const [groupName, priceList] of Object.entries(groupToPriceList)) {
          // try exact group price, fallback to nonmember, fallback to first
          let chosen = incomingPrices.find((ip) => ip.group_name === groupName)
          if (!chosen) chosen = incomingPrices.find((ip) => ip.group_name === "nonmember")
          if (!chosen) chosen = incomingPrices[0]
          if (!chosen) continue

          const priceObj = {
            amount: Number(chosen.amount),
            variant_id: variantId,
            currency_code: chosen.currency_code,
          }

          priceBatchesByListId[priceList.id] = priceBatchesByListId[priceList.id] || []
          priceBatchesByListId[priceList.id].push(priceObj)

          if (["member", "student", "nonmember"].includes(groupName)) {
            // store cents
            metadataPricesByProduct[prodId][groupName] = chosen.amount
          }
        }
      }
    }
    
    
    console.log(groupToPriceList, priceBatchesByListId, 'PRICE BATCHERS')
    
  
    // Execute addPrices per price list id (Medusa will add or update)
    const addPricePromises: Promise<any>[] = []
    for (const [priceListId, prices] of Object.entries(priceBatchesByListId)) {
      if (!prices.length) continue
      
      
      
      console.log(priceListId, 'PRICELIST ID', prices.length)
    addPricePromises.push(batchPriceListPricesWorkflow(req.scope)
    .run({
      input: {
        data: {
          id: priceListId,
          create: prices,
          update: [],
          delete: []
        }
      }
    }))
    }

    await Promise.all(addPricePromises)
  
  


  res.json({
    status: "success",
    imported: result,
    created: createPayload.length,
    updated: updatePayload.length,
  })
  } catch (err){
    console.log(err, 'ERRROR')
    res.status(500).json({status: 'error', error: err})
  }
}
