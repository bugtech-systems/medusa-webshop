import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { batchProductsWorkflow } from "@medusajs/medusa/core-flows"

// ----------------------
// Incoming Types
// ----------------------
type IncomingPrice = {
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
      rules.customer_group_id = group.id
    }


    return {
      ...price,
      title: (groupKey == 'nonmember' || groupKey == 'default') ? 'nonmember' : groupKey,
      amount: Number(price.amount) / 100,
      currency_code: price.currency_code.toLowerCase(),
      rules,
    }
  }

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
    for (const variant of product.variants) {
      const prices = [] as any;
      for (const p of variant.prices) {
        prices.push(await resolvePriceRules(p))
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
      metadata: product.metadata,
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
    metadata: product.metadata,
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
