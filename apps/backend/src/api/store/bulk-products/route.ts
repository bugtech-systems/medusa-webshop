import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { batchPriceListPricesWorkflow, batchProductsWorkflow, upsertVariantPricesWorkflow, batchProductVariantsWorkflow  } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import pLimit from "p-limit"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const payload = req.body
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const pricingModule = req.scope.resolve("pricing")
    const productModule = req.scope.resolve("product")
    const customerModule = req.scope.resolve("customer")
    const regionModule = req.scope.resolve("region")
    const salesChannelModule = req.scope.resolve("sales_channel")
    const fulfillmentModule = req.scope.resolve("fulfillment")

    const defaultChannel = (await salesChannelModule.listSalesChannels()).find(c => c.name === 'Online Store')
    if (!defaultChannel) throw new Error("Default sales channel not found")

    const defaultShipping = (await fulfillmentModule.listShippingProfiles()).find(c => c.type === 'default')
    if (!defaultShipping) throw new Error("Default shipping profile not found")

    // -----------------------------
    // 1. Load existing products with variants + price_set
    // -----------------------------
    // const existingProducts = await productModule.listProducts({}, {
    //   relations: ["variants"],
    //   populate: [
    //     "variants.price_set",
    //     "variants.price_set.prices"
    //   ],
    //   loadStrategy: "query-graph"
    // })


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

const resolveListPrices = async () => {
  const { data: priceLists } = await query.graph({
    entity: "price_list",
    fields: [
      "id",
      "title",
      "status",

      "prices.amount",
      "prices.title",
      "prices.currency_code",

      "prices.price_set.variant.id",
      "prices.price_set.variant.title",
      "prices.price_set.variant.product.id",
      "prices.price_set.variant.product.title"

    ]
  })

  return priceLists
}

    const resolveGroup = async (key: string) => {
        if (!key) return undefined

    const groups = await customerModule.listCustomerGroups({ name: key == "au-default" ? "au-nonmember" : key })
    if (groups.length) return groups[0]
    
          // Auto-create category if it does not exist
      const created = await customerModule.createCustomerGroups([{name: key == "au-default" ? "au-nonmember" : key}])
      return created[0]
  }


      const resolvePriceList = async (key: string) => {
        if (!key) return undefined

        let group = await resolveGroup(key) as any;
        let priceLists = await resolveListPrices();

        let pl = priceLists.find(pl => pl.title === key) as any;

    if (pl) return pl
    
 pl = (await pricingModule.createPriceLists([{
          title: key,
          description: `Auto-generated override price list for ${key}`,
          type: "override",
          status: "active",
          rules: { 'customer.groups.id': [group.id] }
        }]))[0]

          // Auto-create category if it does not exist
      return pl
  }


  const resolveRegion = async (key: string) => {
    const regions = await regionModule.listRegions({ currency_code: String(key).toLowerCase() })
    if (!regions.length) throw new Error(`Region not found: ${key}`)
    return regions[0]
  }





    const existingPriceLists = await resolveListPrices();
    const existingRegion = await resolveRegion('aud');
console.log('CURRENCY', existingRegion)

  const { data: productsData } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "external_id",
      "handle",
      "variants.*",
      "variants.prices.*",
      // "variants.sku",
      // "variants.prices.amount",
      // "variants.prices.currency_code"
    ]
  })



    // -----------------------------
    // 2. Load customer groups + price lists
    // -----------------------------
    const existingGroups = await customerModule.listCustomerGroups({}, { take: 1000 })
    const groupNameMap: Record<string, any> = {}
    for (const g of existingGroups) groupNameMap[g.name] = g

    if (!groupNameMap["au-nonmember"]) {
      const created = await customerModule.createCustomerGroups([{ name: "au-nonmember" }])
      groupNameMap["au-nonmember"] = created[0]
    }



    const groupToPriceList: Record<string, any> = {}
    for (const g of Object.values(groupNameMap)) {
      const title = g.name
      let pl = existingPriceLists.find(pl => pl.title === title) as any;
      if (!pl) {
        pl = (await pricingModule.createPriceLists([{
          title,
          description: `Auto-generated override price list for ${title}`,
          type: "override",
          status: "active",
          rules: { 'customer.groups.id': [g.id] },
          prices: []
        }]))[0]
      }
      groupToPriceList[title] = pl
    }

    const createPayload: any[] = []
    const updatePayload: any[] = []
    const updateVariants: any[] = [];
    const priceBatchesByListId: Record<string, { create: any[], update: any[] }> = {}
    const creaateVariants: any[] = [];
    const incomingPricesBySku: Record<string, any[]> = {}


  for (const product of payload as any) {

    const collection_id = await resolveCollectionId(product.collection)
    const category_id = await resolveCategoryId(product.category)
    let pubFormat = String(product.publishFormat).toLowerCase();

    let metadata = {
      external_id: product.external_id
    } as any;
    const variants = [] as any;

    // Check if product exists by any variant SKU
    let existingProduct = null as any;


  

       existingProduct = productsData.find(ep =>
        ep.external_id == product.external_id ||
        (product.variants && ep.variants.some(ev => product.variants.map(v => v.sku).includes(ev.sku)))
      )













if (existingProduct) {
  // Map incoming variants to existing ones
 for(let v of product.variants){
    const existingVariant = existingProduct.variants.find((ev: any) => ev.sku === v.sku)
    if (existingVariant) {
       let prices = [] as any;

    for(const p of v.prices) {
                let selectedPriceList = existingPriceLists.find(a => a.title == p.region_id_or_name) as any;
                let title = p.region_id_or_name == 'au-default' ? "au-nonmember" : p.region_id_or_name;
           let splitTitle = String(title).split('-')[1];
                if(splitTitle){
                metadata[splitTitle] =  Number(p.amount) / 100;
                } else {
                metadata[title] =  Number(p.amount) / 100;
                }

        if(title == 'au-nonmember' || title == 'au-default'){
        let existingPrice = existingVariant.prices.find(a => a.title == "au-nonmember");
        prices.push({
             ...(existingPrice ? {id: existingPrice.id} : {}),
             title: "au-nonmember",
             amount: Number(p.amount) / 100,
             currency_code: existingRegion.currency_code,
             region_id: existingRegion.id,
            //  rules: {}
        })
        } else {


     
                
                if(!selectedPriceList){
                    selectedPriceList  = await resolvePriceList(title);
                } 

                let existingPrice = selectedPriceList?.prices.find(a => a.title == title);
                priceBatchesByListId[selectedPriceList?.id] = priceBatchesByListId[selectedPriceList?.id] || { create: [], update: [] }

          if (existingPrice) {
            // update existing price
            priceBatchesByListId[selectedPriceList.id].update.push({ id: existingPrice.id, variant_id: existingVariant.id, amount: Number(p.amount) / 100, title: p.region_id_or_name })
          } else {
            // create new price
            priceBatchesByListId[selectedPriceList.id].create.push({
              variant_id: existingVariant.id,
              amount:  Number(p.amount) / 100,
              title: p.region_id_or_name,
              currency_code: existingRegion.currency_code,
              // region_id: existingRegion.id
            })
          }
      
         }
      
         }

















     


    let varaiantData = {
        // ...existingVariant,
        id: existingVariant.id, // important!
        // title: v.sku,
        // variant_id:  existingVariant.id,
        product_id: existingProduct.id,
        // sku: v.sku,
        manage_inventory: v.manage_inventory ?? existingVariant.manage_inventory,
        ...(product.publishFormat ? { options: {
          Format: product.publishFormat
        }} : {}),
        prices: prices, // resolve prices
      }


     updateVariants.push(varaiantData)
     





      // Update existing variant
      // return varaiantData
      
      
    } else {
      // New variant
        //     prices.push({
        //      ...(existingPrice ? {id: existingPrice.id} : {}),
        //      title: "au-nonmember",
        //      amount: Number(p.amount) / 100,
        //      currency_code: p.currency_code.toLowerCase(),
        //      region_id: existingRegion.id
        // })


     creaateVariants.push({
        product_id: existingProduct.id,
        title: v.sku,
        sku: v.sku,
        manage_inventory: v.manage_inventory ?? true,
        ...(product.publishFormat ? { options: {
          Format: product.publishFormat
        }} : {}),
        prices: []
        // prices: v.prices.map(async (p, index) => resolvePriceRules(p, existingVariant.prices[index])), // resolve prices
      })


      // return {
      //   title: v.sku,
      //   sku: v.sku,
      //   manage_inventory: v.manage_inventory ?? true,
      //   ...(product.publishFormat ? { options: {
      //     Format: product.publishFormat
      //   }} : {})
      //   // prices: v.prices.map(async (p, index) => resolvePriceRules(p, existingVariant.prices[index])), // resolve prices
      // }
    }
  }

  // Resolve prices properly
  // const resolvedVariants = await Promise.all(updatedVariants)



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
    // variants: creaateVariants,
  })
} else {

    for (const variant of product.variants) {
    //   const found = await productModule.listProductVariants({ sku: v.sku }, {relations: ["variants"]})
     

            variants.push({
        ...(variant?.id ? {id: variant.id} : {}),
        title: variant.sku,
        sku: variant.sku,
        manage_inventory: variant.manage_inventory ?? true,
        ...(product.publishFormat ? { options: {
          Format: product.publishFormat
        }} : {})
      })


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


  createPayload.push({ ...payloadObj, variants: [] })
}
}















    // // -----------------------------
    // // 3. Build product payloads safely
    // // -----------------------------
    // const concurrency = pLimit(5)
    // await Promise.all(payload.map(product => concurrency(async () => {
    //   const collection_id = product.collection
    //     ? (await productModule.listProductCollections({ title: product.collection }))[0]?.id
    //     : undefined
    //   const category_id = product.category
    //     ? (await productModule.listProductCategories({ name: product.category }))[0]?.id
    //     : undefined

    //   const variants: any[] = []

    //   for (const v of product.variants) {
    //     const prices: any[] = []

    //     for (const p of v.prices) {
    //       const region = (await regionModule.listRegions({ currency_code: p.currency_code.toLowerCase() }))[0]
    //       if (!region) throw new Error(`Region not found: ${p.currency_code}`)

    //       const group = p.region_id_or_name && p.region_id_or_name !== 'au-nonmember'
    //         ? (groupNameMap[p.region_id_or_name] ?? (await customerModule.createCustomerGroups([{ name: p.region_id_or_name }]))[0])
    //         : undefined

    //       const normalized = {
    //         ...p,
    //         amount: Number(p.amount) / 100,
    //         region,
    //         title: p.region_id_or_name,
    //         rules: group ? { 'customer_group_id': group.id } : {}
    //       }

    //       if (normalized.amount > 0) prices.push(normalized)

    //       incomingPricesBySku[v.sku] = incomingPricesBySku[v.sku] || []
    //       incomingPricesBySku[v.sku].push({
    //         amount: normalized.amount,
    //         currency_code: normalized.currency_code,
    //         region_id: normalized.region.id,
    //         group_name: normalized.title
    //       })
    //     }

    //     // Find existing product & variant
    //     const existingProduct = existingProducts.find(ep =>
    //       ep.external_id === product.external_id ||
    //       ep.variants.some(ev => ev.sku === v.sku)
    //     )
    //     const existingVariant = existingProduct?.variants.find(ev => ev.sku === v.sku)

    //     if (existingVariant && !existingVariant.price_set) existingVariant.price_set = { prices: [] }

    //     variants.push({
    //       ...(existingVariant ? { id: existingVariant.id } : {}),
    //       title: v.sku,
    //       sku: v.sku,
    //       manage_inventory: v.manage_inventory ?? true,
    //       options: product.publishFormat ? { Format: product.publishFormat } : {},
    //       prices
    //     })
    //   }

    //   const existingProduct = existingProducts.find(ep =>
    //     ep.external_id === product.external_id ||
    //     ep.variants.some(ev => product.variants.map(v => v.sku).includes(ev.sku))
    //   )

    //   const payloadObj = {
    //     title: product.title,
    //     description: product.description,
    //     handle: product.handle,
    //     external_id: product.external_id,
    //     status: product.status,
    //     collection_id,
    //     shipping_profile_id: defaultShipping.id,
    //     weight: product.weight,
    //     sales_channels: [{ id: defaultChannel.id }],
    //     ...(category_id ? { categories: [{ id: category_id }] } : {}),
    //     variants,
    //     options: [{ title: "Format", values: [product.publishFormat || "default"] }],
    //     metadata: product.metadata ?? {}
    //   }

    //   if (existingProduct) {
    //     updatePayload.push({ id: existingProduct.id, ...payloadObj })
    //   } else {
    //     createPayload.push(payloadObj)
    //   }
    // })))

    // // -----------------------------
    // // 4. Run products workflow
    // // -----------------------------
      // const updatedVariantsData = await productModule.updateProductVariants(updateVariants);
      // const createVariantsData = await productModule.createProductVariants(creaateVariants);

    
    const { result: resultProducts } = await batchProductsWorkflow(req.scope).run({
      input: { create: createPayload, update: updatePayload }
    })

    


    // const updatedVariantsData = await upsertVariantPricesWorkflow(req.scope).run({
    //       input: {variantPrices: updateVariants, previousVariantIds: []}
    // })

        const {result} = await batchProductVariantsWorkflow(req.scope).run({
          input: {update: updateVariants, delete: [], create: creaateVariants}
    })

    
    

    // // -----------------------------
    // // 5. Build price batches to **update existing or create new only once per price list**
    // // -----------------------------
    // const productsArr = [...result.created, ...result.updated]
    // const priceBatchesByListId: Record<string, { create: any[], update: any[] }> = {}

    // for (const prod of productsArr) {
    //   for (const variant of prod.variants) {
    //     if (!variant.price_set) variant.price_set = { prices: [] }

    //     const existingPrices = new Map(
    //       (variant.price_set.prices || []).map(p => [`${p.currency_code}-${variant.id}`, p])
    //     )

    //     const incomingPrices = incomingPricesBySku[variant.sku] || []

    //     for (const [groupName, priceList] of Object.entries(groupToPriceList)) {
    //       let chosen = incomingPrices.find(ip => ip.group_name === groupName)
    //       if (!chosen) chosen = incomingPrices.find(ip => ip.group_name === "au-nonmember") || incomingPrices[0]
    //       if (!chosen) continue

    //       const key = `${chosen.currency_code}-${variant.id}`
    //       priceBatchesByListId[priceList.id] = priceBatchesByListId[priceList.id] || { create: [], update: [] }

    //       if (existingPrices.has(key)) {
    //         // update existing price
    //         priceBatchesByListId[priceList.id].update.push({ id: existingPrices.get(key).id, amount: chosen.amount })
    //       } else {
    //         // create new price
    //         priceBatchesByListId[priceList.id].create.push({
    //           variant_id: variant.id,
    //           amount: chosen.amount,
    //           currency_code: chosen.currency_code
    //         })
    //       }
    //     }
    //   }
    // }

    // // -----------------------------
    // // 6. Run batch price workflow **per price list once**
    // // -----------------------------
    for (const [priceListId, batch] of Object.entries(priceBatchesByListId)) {
      if (batch.create.length || batch.update.length) {
        await batchPriceListPricesWorkflow(req.scope).run({
          input: { data: { id: priceListId, create: batch.create, update: batch.update, delete: [] } }
        })
      }
    }

    res.json({
      status: "success",
      resultProducts,
      resultVariants: result,
      updateVariants,
      existingPriceLists,
      priceBatchesByListId,
      // createPayload,
      updatePayload,
      // updatedVariantsData
      // updatedVariantsData,
      // createVariantsData
      // imported: productsData,
      // groupToPriceList,
      // existingPriceLists,
      // priceBatchesByListId
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ status: 'error', error: err.message })
  }
}