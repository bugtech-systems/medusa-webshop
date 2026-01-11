"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const core_flows_1 = require("@medusajs/medusa/core-flows");
// ----------------------
// POST Route
// ----------------------
async function POST(req, res) {
    try {
        const payload = req.body;
        const pricingModule = req.scope.resolve("pricing");
        const productModule = req.scope.resolve("product");
        const customerModule = req.scope.resolve("customer");
        const inventoryModule = req.scope.resolve("inventory");
        const regionModule = req.scope.resolve("region");
        const salesChannelModule = req.scope.resolve("sales_channel");
        const fulfillmentModule = req.scope.resolve("fulfillment");
        // ----------------------
        // Helpers
        // ----------------------
        const resolveRegion = async (key) => {
            const regions = await regionModule.listRegions({ currency_code: String(key).toLowerCase() });
            if (!regions.length)
                throw new Error(`Region not found: ${key}`);
            return regions[0];
        };
        const resolveGroup = async (key) => {
            if (!key)
                return undefined;
            const groups = await customerModule.listCustomerGroups({ name: key == "default" ? "nonmember" : key });
            if (groups.length)
                return groups[0];
            // Auto-create category if it does not exist
            const created = await customerModule.createCustomerGroups([{ name: key == "default" ? "nonmember" : key }]);
            return created[0];
        };
        const resolveCollectionId = async (title) => {
            if (!title)
                return undefined;
            const collections = await productModule.listProductCollections({ title });
            return collections[0]?.id;
        };
        const resolveCategoryId = async (name) => {
            if (!name)
                return undefined;
            const categories = await productModule.listProductCategories({ name });
            if (categories.length)
                return categories[0].id;
            // Auto-create category if it does not exist
            const created = await productModule.createProductCategories([{ name }]);
            return created[0].id;
        };
        const resolvePriceRules = async (price) => {
            const [regionKey, groupKey] = price.region_id_or_name.split("-");
            const currency = price.currency_code;
            const region = await resolveRegion(currency);
            const rules = (groupKey == 'nonmember' || groupKey == 'default') ? {} : {};
            if (groupKey && !(groupKey == 'nonmember' || groupKey == 'default')) {
                const group = await resolveGroup(groupKey);
                // rules.customer_group_id = group.id
            }
            return {
                ...price,
                title: (groupKey == 'nonmember' || groupKey == 'default') ? 'nonmember' : groupKey,
                amount: Number(price.amount) / 100,
                currency_code: price.currency_code.toLowerCase(),
                region,
                rules,
            };
        };
        // We'll collect normalized incoming prices by sku for later use:
        const incomingPricesBySku = {};
        const defaultChannel = (await salesChannelModule.listSalesChannels()).find((c) => c.name == 'Online Store');
        if (!defaultChannel)
            throw new Error("Default sales channel not found");
        const defaultShipping = (await fulfillmentModule.listShippingProfiles()).find((c) => c.type == 'default');
        if (!defaultShipping)
            throw new Error("Default Shipping not found");
        // ----------------------
        // Build Create / Update Payload
        // ----------------------
        const createPayload = [];
        const updatePayload = [];
        for (const product of payload) {
            const collection_id = await resolveCollectionId(product.collection);
            const category_id = await resolveCategoryId(product.category);
            const variants = [];
            let metadata = { ...product.metadata };
            for (const variant of product.variants) {
                const prices = [];
                incomingPricesBySku[variant.sku] = [];
                for (const p of variant.prices) {
                    let price = await resolvePriceRules(p);
                    // console.log(price, 'PRICE')
                    if (price.amount) {
                        metadata[price.title] = price.amount;
                        if (price.title == 'nonmember') {
                            prices.push(price);
                        }
                        else {
                            incomingPricesBySku[variant.sku].push({
                                amount: price.amount,
                                currency_code: price.currency_code,
                                group_name: price.title,
                                region_id: price.region.id
                            });
                        }
                    }
                }
                variants.push({
                    ...(variant?.id ? { id: variant.id } : {}),
                    title: variant.sku,
                    sku: variant.sku,
                    manage_inventory: variant.manage_inventory ?? true,
                    ...(product.publishFormat ? { options: {
                            Format: product.publishFormat
                        } } : {}),
                    prices,
                });
            }
            // Check if product exists by any variant SKU
            let existingProduct = null;
            for (const v of product.variants) {
                //   const found = await productModule.listProductVariants({ sku: v.sku }, {relations: ["variants"]})
                // List all products with variants
                const products = await productModule.listProducts({}, { relations: ["variants"] } // load variants & prices
                );
                // Filter in JS for the variant SKU
                const found = products.find((product) => product.variants.some((vr) => vr.sku === v.sku));
                if (found) {
                    existingProduct = found;
                    break;
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
                sales_channels: [{ id: defaultChannel.id }], // Assign default sales channel
                ...(category_id ? { categories: [{ id: category_id }] } : {}),
                options: [{
                        title: "Format",
                        values: [product.publishFormat ? product.publishFormat : "default"],
                    }],
                variants,
            };
            if (existingProduct) {
                // Map incoming variants to existing ones
                const updatedVariants = product.variants.map((v) => {
                    const existingVariant = existingProduct.variants.find((ev) => ev.sku === v.sku);
                    if (existingVariant) {
                        // Update existing variant
                        return {
                            id: existingVariant.id, // important!
                            title: v.sku,
                            sku: v.sku,
                            manage_inventory: v.manage_inventory ?? existingVariant.manage_inventory,
                            ...(product.publishFormat ? { options: {
                                    Format: product.publishFormat
                                } } : {}),
                            prices: v.prices.map(async (p) => await resolvePriceRules(p)), // resolve prices
                        };
                    }
                    else {
                        // New variant
                        return {
                            title: v.sku,
                            sku: v.sku,
                            manage_inventory: v.manage_inventory ?? true,
                            ...(product.publishFormat ? { options: {
                                    Format: product.publishFormat
                                } } : {}),
                            prices: v.prices.map(async (p) => await resolvePriceRules(p)),
                        };
                    }
                });
                // Resolve prices properly
                const resolvedVariants = await Promise.all(updatedVariants);
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
                    ...(category_id ? { categories: [{ id: category_id }] } : {}),
                    options: [{
                            title: "Format",
                            values: [product.publishFormat ? product.publishFormat : "default"],
                        }],
                    sales_channels: [{ id: defaultChannel.id }], // Assign default sales channel
                    variants: resolvedVariants,
                });
            }
            else {
                // New product
                const resolvedVariants = await Promise.all(variants.map(async (v) => {
                    v.prices = await Promise.all(v.prices);
                    return v;
                }));
                createPayload.push({ ...payloadObj, variants: resolvedVariants });
            }
        }
        // ----------------------
        // Run Medusa v2 Workflow
        // ----------------------
        const { result } = await (0, core_flows_1.batchProductsWorkflow)(req.scope).run({
            input: {
                create: createPayload,
                update: updatePayload,
            },
        });
        // ----------------------
        // Price lists + price items
        // ----------------------
        const existingGroups = await customerModule.listCustomerGroups({}, { take: 1000 });
        const groupNameMap = {};
        const productsArr = [...result.created, ...result.updated];
        for (const g of existingGroups)
            groupNameMap[g.name] = g;
        // Ensure nonmember exists
        if (!groupNameMap["nonmember"]) {
            const created = await customerModule.createCustomerGroups([{ name: "nonmember" }]);
            groupNameMap["nonmember"] = created[0];
        }
        // 2) Collect any group names referenced in incoming payloads that don't exist yet and create them
        const incomingGroupNames = new Set();
        for (const prod of payload) {
            for (const v of prod.variants) {
                for (const pr of v.prices) {
                    const parts = (pr.region_id_or_name || "").split("-");
                    if (parts[1])
                        incomingGroupNames.add(parts[1] === "default" ? "nonmember" : parts[1]);
                }
            }
        }
        for (const groupName of incomingGroupNames) {
            if (!groupNameMap[groupName]) {
                const created = await customerModule.createCustomerGroups([{ name: groupName }]);
                groupNameMap[groupName] = created[0];
            }
        }
        // 3) Ensure a price list for each group (title = price-list-<groupName>), type = override, status = ACTIVE
        const groupToPriceList = {};
        const allGroups = Object.values(groupNameMap);
        for (const g of allGroups) {
            const plTitle = `price-list-${g.name}`;
            //  console.log(plTitle, 'FIND PLISST LISTS')
            let foundLists = [];
            foundLists = await pricingModule.listPriceLists({ q: plTitle });
            //  console.log(foundLists, 'FOUND LISTS')
            let found = (foundLists || []).find((pl) => pl.title === plTitle);
            console.log(found, 'FOUNDED');
            if (!found) {
                found = await pricingModule.createPriceLists([{
                        title: plTitle,
                        description: `Auto-generated override price list for ${g.name}`,
                        type: "override",
                        status: "active",
                        rules: {
                            'customer.groups.id': [g.id]
                        }
                    }]);
            }
            else {
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
                ]);
            }
            groupToPriceList[g.name] = found;
        }
        // 4) Build price additions per price list (batch) and call addPrices
        const priceBatchesByListId = {};
        const metadataPricesByProduct = {};
        for (const prod of productsArr) {
            const prodId = prod.id;
            metadataPricesByProduct[prodId] = metadataPricesByProduct[prodId] ?? {};
            // For each variant returned, find SKU-based incoming prices we built earlier
            for (const variant of prod.variants || []) {
                const sku = variant.sku;
                const variantId = variant.id;
                let incomingPrices = [];
                if (sku) {
                    incomingPrices = incomingPricesBySku[sku];
                }
                // For every price-group (groupToPriceList), choose a price for this group
                for (const [groupName, priceList] of Object.entries(groupToPriceList)) {
                    // try exact group price, fallback to nonmember, fallback to first
                    let chosen = incomingPrices.find((ip) => ip.group_name === groupName);
                    if (!chosen)
                        chosen = incomingPrices.find((ip) => ip.group_name === "nonmember");
                    if (!chosen)
                        chosen = incomingPrices[0];
                    if (!chosen)
                        continue;
                    const priceObj = {
                        amount: Number(chosen.amount),
                        variant_id: variantId,
                        currency_code: chosen.currency_code,
                    };
                    priceBatchesByListId[priceList.id] = priceBatchesByListId[priceList.id] || [];
                    priceBatchesByListId[priceList.id].push(priceObj);
                    if (["member", "student", "nonmember"].includes(groupName)) {
                        // store cents
                        metadataPricesByProduct[prodId][groupName] = chosen.amount;
                    }
                }
            }
        }
        console.log(groupToPriceList, priceBatchesByListId, 'PRICE BATCHERS');
        // Execute addPrices per price list id (Medusa will add or update)
        const addPricePromises = [];
        for (const [priceListId, prices] of Object.entries(priceBatchesByListId)) {
            if (!prices.length)
                continue;
            console.log(priceListId, 'PRICELIST ID', prices.length);
            addPricePromises.push((0, core_flows_1.batchPriceListPricesWorkflow)(req.scope)
                .run({
                input: {
                    data: {
                        id: priceListId,
                        create: prices,
                        update: [],
                        delete: []
                    }
                }
            }));
        }
        await Promise.all(addPricePromises);
        res.json({
            status: "success",
            imported: result,
            created: createPayload.length,
            updated: updatePayload.length,
        });
    }
    catch (err) {
        console.log(err, 'ERRROR');
        res.status(500).json({ status: 'error', error: err });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2J1bGstcHJvZHVjdHMvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUF1Q0Esb0JBNmJDO0FBbmVELDREQUFtRztBQW1DbkcseUJBQXlCO0FBQ3pCLGFBQWE7QUFDYix5QkFBeUI7QUFDbEIsS0FBSyxVQUFVLElBQUksQ0FBQyxHQUFrQixFQUFFLEdBQW1CO0lBQ2hFLElBQUksQ0FBQztRQUNMLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUF5QixDQUFBO1FBRTdDLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDN0QsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUU1RCx5QkFBeUI7UUFDekIsVUFBVTtRQUNWLHlCQUF5QjtRQUV6QixNQUFNLGFBQWEsR0FBRyxLQUFLLEVBQUUsR0FBVyxFQUFFLEVBQUU7WUFDMUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDNUYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNO2dCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDaEUsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkIsQ0FBQyxDQUFBO1FBRUQsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLEdBQVcsRUFBRSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxHQUFHO2dCQUFFLE9BQU8sU0FBUyxDQUFBO1lBRTlCLE1BQU0sTUFBTSxHQUFHLE1BQU0sY0FBYyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQTtZQUN0RyxJQUFJLE1BQU0sQ0FBQyxNQUFNO2dCQUFFLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTdCLDRDQUE0QztZQUNoRCxNQUFNLE9BQU8sR0FBRyxNQUFNLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pHLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLENBQUMsQ0FBQTtRQUVELE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxFQUFFLEtBQWMsRUFBRSxFQUFFO1lBQ25ELElBQUksQ0FBQyxLQUFLO2dCQUFFLE9BQU8sU0FBUyxDQUFBO1lBQzVCLE1BQU0sV0FBVyxHQUFHLE1BQU0sYUFBYSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUN6RSxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUE7UUFDM0IsQ0FBQyxDQUFBO1FBRUMsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLEVBQUUsSUFBYSxFQUFFLEVBQUU7WUFDaEQsSUFBSSxDQUFDLElBQUk7Z0JBQUUsT0FBTyxTQUFTLENBQUE7WUFDM0IsTUFBTSxVQUFVLEdBQUcsTUFBTSxhQUFhLENBQUMscUJBQXFCLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ3RFLElBQUksVUFBVSxDQUFDLE1BQU07Z0JBQUUsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1lBRTlDLDRDQUE0QztZQUM1QyxNQUFNLE9BQU8sR0FBRyxNQUFNLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3JFLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUN0QixDQUFDLENBQUE7UUFFSCxNQUFNLGlCQUFpQixHQUFHLEtBQUssRUFBRSxLQUFvQixFQUFFLEVBQUU7WUFDdkQsTUFBTSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2hFLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUE7WUFFcEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDNUMsTUFBTSxLQUFLLEdBQXdCLENBQUMsUUFBUSxJQUFJLFdBQVcsSUFBSSxRQUFRLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1lBRy9GLElBQUksUUFBUSxJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksV0FBVyxJQUFJLFFBQVEsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxNQUFNLEtBQUssR0FBRyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQVEsQ0FBQztnQkFDbEQscUNBQXFDO1lBQ3ZDLENBQUM7WUFHRCxPQUFPO2dCQUNMLEdBQUcsS0FBSztnQkFDUixLQUFLLEVBQUUsQ0FBQyxRQUFRLElBQUksV0FBVyxJQUFJLFFBQVEsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRO2dCQUNsRixNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHO2dCQUNsQyxhQUFhLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUU7Z0JBQ2hELE1BQU07Z0JBQ04sS0FBSzthQUNOLENBQUE7UUFDSCxDQUFDLENBQUE7UUFHRyxpRUFBaUU7UUFDbkUsTUFBTSxtQkFBbUIsR0FLbkIsRUFBRSxDQUFBO1FBRVIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxNQUFNLGtCQUFrQixDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksY0FBYyxDQUFDLENBQUM7UUFFakgsSUFBSSxDQUFDLGNBQWM7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7UUFFdkUsTUFBTSxlQUFlLEdBQUcsQ0FBQyxNQUFNLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksU0FBUyxDQUFDLENBQUM7UUFFL0csSUFBSSxDQUFDLGVBQWU7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUE7UUFJckUseUJBQXlCO1FBQ3pCLGdDQUFnQztRQUNoQyx5QkFBeUI7UUFDekIsTUFBTSxhQUFhLEdBQVUsRUFBRSxDQUFBO1FBQy9CLE1BQU0sYUFBYSxHQUFVLEVBQUUsQ0FBQTtRQUkvQixLQUFLLE1BQU0sT0FBTyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzlCLE1BQU0sYUFBYSxHQUFHLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2pFLE1BQU0sV0FBVyxHQUFHLE1BQU0saUJBQWlCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRS9ELE1BQU0sUUFBUSxHQUFHLEVBQVMsQ0FBQztZQUMzQixJQUFJLFFBQVEsR0FBRyxFQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBQyxDQUFDO1lBRXJDLEtBQUssTUFBTSxPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN2QyxNQUFNLE1BQU0sR0FBRyxFQUFTLENBQUM7Z0JBRXpCLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBR3RDLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNqQyxJQUFJLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUl2Qyw4QkFBOEI7b0JBQzlCLElBQUcsS0FBSyxDQUFDLE1BQU0sRUFBQyxDQUFDO3dCQUNmLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQzt3QkFFckMsSUFBRyxLQUFLLENBQUMsS0FBSyxJQUFJLFdBQVcsRUFBQyxDQUFDOzRCQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO3dCQUNsQixDQUFDOzZCQUFNLENBQUM7NEJBRVIsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQ0FDbkMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO2dDQUNwQixhQUFhLEVBQUUsS0FBSyxDQUFDLGFBQWE7Z0NBQ2xDLFVBQVUsRUFBRSxLQUFLLENBQUMsS0FBSztnQ0FDdkIsU0FBUyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRTs2QkFDNUIsQ0FBQyxDQUFBO3dCQUVGLENBQUM7b0JBQ0gsQ0FBQztnQkFDSixDQUFDO2dCQUVFLFFBQVEsQ0FBQyxJQUFJLENBQUM7b0JBQ1osR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN4QyxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUc7b0JBQ2xCLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztvQkFDaEIsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixJQUFJLElBQUk7b0JBQ2xELEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRTs0QkFDckMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxhQUFhO3lCQUM5QixFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDUixNQUFNO2lCQUNQLENBQUMsQ0FBQTtZQUNKLENBQUM7WUFFRCw2Q0FBNkM7WUFDN0MsSUFBSSxlQUFlLEdBQUcsSUFBVyxDQUFDO1lBQ2xDLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQyxxR0FBcUc7Z0JBRW5HLGtDQUFrQztnQkFDdEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxhQUFhLENBQUMsWUFBWSxDQUMvQyxFQUFFLEVBQ0YsRUFBRSxTQUFTLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLHlCQUF5QjtpQkFDdEQsQ0FBQTtnQkFFRCxtQ0FBbUM7Z0JBQ25DLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFZLEVBQUUsRUFBRSxDQUMzQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzlDLENBQUM7Z0JBR0wsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFFVixlQUFlLEdBQUcsS0FBWSxDQUFDO29CQUMvQixNQUFLO2dCQUNQLENBQUM7WUFDSCxDQUFDO1lBR0QsTUFBTSxVQUFVLEdBQUc7Z0JBQ2pCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztnQkFDcEIsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO2dCQUNoQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07Z0JBQ3RCLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztnQkFDaEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO2dCQUN0QixRQUFRLEVBQUUsUUFBUTtnQkFDbEIsYUFBYTtnQkFDYixtQkFBbUIsRUFBRSxlQUFlLENBQUMsRUFBRTtnQkFDdkMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO2dCQUN0QixjQUFjLEVBQUUsQ0FBQyxFQUFDLEVBQUUsRUFBQyxjQUFjLENBQUMsRUFBRSxFQUFDLENBQUMsRUFBRSwrQkFBK0I7Z0JBQ3pFLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBQyxFQUFFLEVBQUUsV0FBVyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzFELE9BQU8sRUFBRSxDQUFFO3dCQUNILEtBQUssRUFBRSxRQUFRO3dCQUNmLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztxQkFDcEUsQ0FBQztnQkFDUixRQUFRO2FBQ1QsQ0FBQTtZQUtMLElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQ3BCLHlDQUF5QztnQkFDekMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDakQsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUNwRixJQUFJLGVBQWUsRUFBRSxDQUFDO3dCQUNwQiwwQkFBMEI7d0JBQzFCLE9BQU87NEJBQ0wsRUFBRSxFQUFFLGVBQWUsQ0FBQyxFQUFFLEVBQUUsYUFBYTs0QkFDckMsS0FBSyxFQUFFLENBQUMsQ0FBQyxHQUFHOzRCQUNaLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRzs0QkFDVixnQkFBZ0IsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLElBQUksZUFBZSxDQUFDLGdCQUFnQjs0QkFDeEUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFO29DQUNyQyxNQUFNLEVBQUUsT0FBTyxDQUFDLGFBQWE7aUNBQzlCLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDOzRCQUNSLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCO3lCQUNqRixDQUFBO29CQUlILENBQUM7eUJBQU0sQ0FBQzt3QkFDTixjQUFjO3dCQUNkLE9BQU87NEJBQ0wsS0FBSyxFQUFFLENBQUMsQ0FBQyxHQUFHOzRCQUNaLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRzs0QkFDVixnQkFBZ0IsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLElBQUksSUFBSTs0QkFDNUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFO29DQUNyQyxNQUFNLEVBQUUsT0FBTyxDQUFDLGFBQWE7aUNBQzlCLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDOzRCQUNSLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO3lCQUM5RCxDQUFBO29CQUNILENBQUM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUE7Z0JBRUYsMEJBQTBCO2dCQUMxQixNQUFNLGdCQUFnQixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFFM0QsYUFBYSxDQUFDLElBQUksQ0FBQztvQkFDakIsRUFBRSxFQUFFLGVBQWUsQ0FBQyxFQUFFO29CQUN0QixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7b0JBQ3BCLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztvQkFDaEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO29CQUN0QixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7b0JBQ2hDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtvQkFDdEIsUUFBUSxFQUFFLFFBQVE7b0JBQ2xCLGFBQWE7b0JBQ2IsbUJBQW1CLEVBQUUsZUFBZSxDQUFDLEVBQUU7b0JBQ3ZDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtvQkFDcEIsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDMUQsT0FBTyxFQUFFLENBQUU7NEJBQ0gsS0FBSyxFQUFFLFFBQVE7NEJBQ2YsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO3lCQUNwRSxDQUFDO29CQUNWLGNBQWMsRUFBRSxDQUFDLEVBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFFLCtCQUErQjtvQkFDMUUsUUFBUSxFQUFFLGdCQUFnQjtpQkFDM0IsQ0FBQyxDQUFBO1lBQ0osQ0FBQztpQkFBTSxDQUFDO2dCQUNOLGNBQWM7Z0JBQ2QsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ3hDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUN2QixDQUFDLENBQUMsTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ3RDLE9BQU8sQ0FBQyxDQUFBO2dCQUNWLENBQUMsQ0FBQyxDQUNILENBQUE7Z0JBQ0QsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsVUFBVSxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7WUFDbkUsQ0FBQztRQUVDLENBQUM7UUFNRCx5QkFBeUI7UUFDekIseUJBQXlCO1FBQ3pCLHlCQUF5QjtRQUN6QixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFBLGtDQUFxQixFQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDNUQsS0FBSyxFQUFFO2dCQUNMLE1BQU0sRUFBRSxhQUFhO2dCQUNyQixNQUFNLEVBQUUsYUFBYTthQUN0QjtTQUNGLENBQUMsQ0FBQTtRQUlBLHlCQUF5QjtRQUN6Qiw0QkFBNEI7UUFDNUIseUJBQXlCO1FBQ3pCLE1BQU0sY0FBYyxHQUFHLE1BQU0sY0FBYyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sWUFBWSxHQUF3QixFQUFFLENBQUE7UUFDNUMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0QsS0FBSyxNQUFNLENBQUMsSUFBSSxjQUFjO1lBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFekQsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUMvQixNQUFNLE9BQU8sR0FBRyxNQUFNLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNsRixZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFFRCxrR0FBa0c7UUFDbEcsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBQzVDLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFLENBQUM7WUFDM0IsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzlCLEtBQUssTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUMxQixNQUFNLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ3JELElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFBRSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdkYsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBQ0QsS0FBSyxNQUFNLFNBQVMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hGLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEMsQ0FBQztRQUNILENBQUM7UUFJRywyR0FBMkc7UUFDL0csTUFBTSxnQkFBZ0IsR0FBd0IsRUFBRSxDQUFBO1FBQ2hELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDN0MsS0FBSyxNQUFNLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUUxQixNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUV4Qyw2Q0FBNkM7WUFFM0MsSUFBSSxVQUFVLEdBQVUsRUFBRSxDQUFBO1lBQ3hCLFVBQVUsR0FBRyxNQUFNLGFBQWEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUVuRSwwQ0FBMEM7WUFFeEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLE9BQU8sQ0FBQyxDQUFBO1lBQ3RFLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzdCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDVCxLQUFLLEdBQUcsTUFBTSxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzt3QkFDNUMsS0FBSyxFQUFFLE9BQU87d0JBQ2QsV0FBVyxFQUFFLDBDQUEwQyxDQUFDLENBQUMsSUFBSSxFQUFFO3dCQUMvRCxJQUFJLEVBQUUsVUFBVTt3QkFDaEIsTUFBTSxFQUFFLFFBQVE7d0JBQ2hCLEtBQUssRUFBRTs0QkFDSixvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7eUJBQzlCO3FCQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ1AsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDNUI7d0JBQ0UsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFO3dCQUNaLEtBQUssRUFBRSxPQUFPO3dCQUNkLFdBQVcsRUFBRSwwQ0FBMEMsQ0FBQyxDQUFDLElBQUksRUFBRTt3QkFDL0QsTUFBTSxFQUFFLFFBQVE7d0JBQ2hCLEtBQUssRUFBRTs0QkFDSixvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7eUJBQzlCO3FCQUNGO2lCQUNILENBQUMsQ0FBQTtZQUVILENBQUM7WUFFRCxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFBO1FBQ2xDLENBQUM7UUFHRCxxRUFBcUU7UUFDckUsTUFBTSxvQkFBb0IsR0FBMEIsRUFBRSxDQUFBO1FBQ3RELE1BQU0sdUJBQXVCLEdBQTJDLEVBQUUsQ0FBQTtRQUUxRSxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQy9CLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUE7WUFDdEIsdUJBQXVCLENBQUMsTUFBTSxDQUFDLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFBO1lBRXZFLDZFQUE2RTtZQUM3RSxLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUE7Z0JBQ3ZCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUE7Z0JBQzVCLElBQUksY0FBYyxHQUFHLEVBQVMsQ0FBQztnQkFFL0IsSUFBRyxHQUFHLEVBQUMsQ0FBQztvQkFDUixjQUFjLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3pDLENBQUM7Z0JBTUQsMEVBQTBFO2dCQUMxRSxLQUFLLE1BQU0sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7b0JBQ3RFLGtFQUFrRTtvQkFDbEUsSUFBSSxNQUFNLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsQ0FBQTtvQkFDckUsSUFBSSxDQUFDLE1BQU07d0JBQUUsTUFBTSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEtBQUssV0FBVyxDQUFDLENBQUE7b0JBQ2hGLElBQUksQ0FBQyxNQUFNO3dCQUFFLE1BQU0sR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3ZDLElBQUksQ0FBQyxNQUFNO3dCQUFFLFNBQVE7b0JBRXJCLE1BQU0sUUFBUSxHQUFHO3dCQUNmLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzt3QkFDN0IsVUFBVSxFQUFFLFNBQVM7d0JBQ3JCLGFBQWEsRUFBRSxNQUFNLENBQUMsYUFBYTtxQkFDcEMsQ0FBQTtvQkFFRCxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUcsb0JBQW9CLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtvQkFDN0Usb0JBQW9CLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFFakQsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7d0JBQzNELGNBQWM7d0JBQ2QsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQTtvQkFDNUQsQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFHRCxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFHckUsa0VBQWtFO1FBQ2xFLE1BQU0sZ0JBQWdCLEdBQW1CLEVBQUUsQ0FBQTtRQUMzQyxLQUFLLE1BQU0sQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7WUFDekUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNO2dCQUFFLFNBQVE7WUFJNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN6RCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBQSx5Q0FBNEIsRUFBQyxHQUFHLENBQUMsS0FBSyxDQUFDO2lCQUM1RCxHQUFHLENBQUM7Z0JBQ0gsS0FBSyxFQUFFO29CQUNMLElBQUksRUFBRTt3QkFDSixFQUFFLEVBQUUsV0FBVzt3QkFDZixNQUFNLEVBQUUsTUFBTTt3QkFDZCxNQUFNLEVBQUUsRUFBRTt3QkFDVixNQUFNLEVBQUUsRUFBRTtxQkFDWDtpQkFDRjthQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBS3JDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDUCxNQUFNLEVBQUUsU0FBUztZQUNqQixRQUFRLEVBQUUsTUFBTTtZQUNoQixPQUFPLEVBQUUsYUFBYSxDQUFDLE1BQU07WUFDN0IsT0FBTyxFQUFFLGFBQWEsQ0FBQyxNQUFNO1NBQzlCLENBQUMsQ0FBQTtJQUNGLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBQyxDQUFDO1FBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDMUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFBO0lBQ3JELENBQUM7QUFDSCxDQUFDIn0=