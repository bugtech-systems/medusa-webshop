"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = seedAustraliaStore;
const utils_1 = require("@medusajs/framework/utils");
const core_flows_1 = require("@medusajs/medusa/core-flows");
async function seedAustraliaStore({ container }) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    const link = container.resolve(utils_1.ContainerRegistrationKeys.LINK);
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const fulfillmentModuleService = container.resolve(utils_1.Modules.FULFILLMENT);
    const salesChannelModuleService = container.resolve(utils_1.Modules.SALES_CHANNEL);
    const storeModuleService = container.resolve(utils_1.Modules.STORE);
    // Australia configuration
    const countryCode = "au";
    const currencyCode = "aud";
    const regionName = "Australia";
    logger.info("🇦🇺 Seeding Australia pharmacy store data...");
    // 1. Store setup
    logger.info("Seeding store data...");
    const [store] = await storeModuleService.listStores();
    // Create or get default sales channel
    let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
        name: "Online Store",
    });
    if (!defaultSalesChannel.length) {
        const { result: salesChannelResult } = await (0, core_flows_1.createSalesChannelsWorkflow)(container).run({
            input: {
                salesChannelsData: [
                    {
                        name: "Online Store",
                        description: "Australian Pharmacy Online Store",
                    },
                ],
            },
        });
        defaultSalesChannel = salesChannelResult;
    }
    // Update store with Australia settings
    await (0, core_flows_1.updateStoresWorkflow)(container).run({
        input: {
            selector: { id: store.id },
            update: {
                supported_currencies: [
                    {
                        currency_code: currencyCode.toUpperCase(),
                        is_default: true,
                    },
                ],
                default_sales_channel_id: defaultSalesChannel[0].id,
                name: "Australian Pharmacy Store",
            },
        },
    });
    logger.info("Finished store setup.");
    // 2. Australia region
    logger.info("Seeding Australia region data...");
    const { result: regionResult } = await (0, core_flows_1.createRegionsWorkflow)(container).run({
        input: {
            regions: [
                {
                    name: regionName,
                    currency_code: currencyCode,
                    countries: [countryCode],
                    payment_providers: ["pp_system_default"],
                },
            ],
        },
    });
    const region = regionResult[0];
    logger.info("Finished seeding Australia region.");
    // 3. Tax region for Australia (10% GST)
    logger.info("Seeding tax regions...");
    await (0, core_flows_1.createTaxRegionsWorkflow)(container).run({
        input: [
            {
                country_code: countryCode,
                provider_id: "tp_system",
                default_tax_rate: {
                    rate: 10.0,
                    code: "GST",
                    name: "Goods and Services Tax",
                },
            },
        ],
    });
    logger.info("Finished seeding tax regions.");
    // 4. Stock locations in Australia
    logger.info("Seeding stock location data...");
    const { result: stockLocationResult } = await (0, core_flows_1.createStockLocationsWorkflow)(container).run({
        input: {
            locations: [
                {
                    name: "Sydney Warehouse",
                    address: {
                        city: "Sydney",
                        country_code: countryCode,
                        address_1: "123 Pharmacy Street",
                        postal_code: "2000",
                        province: "NSW",
                    },
                },
            ],
        },
    });
    const stockLocation = stockLocationResult[0];
    // Link fulfillment provider
    await link.create({
        [utils_1.Modules.STOCK_LOCATION]: {
            stock_location_id: stockLocation.id,
        },
        [utils_1.Modules.FULFILLMENT]: {
            fulfillment_provider_id: "manual_manual",
        },
    });
    // 5. Fulfillment setup with free shipping
    logger.info("Seeding fulfillment data...");
    const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
        type: "default"
    });
    let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;
    if (!shippingProfile) {
        const { result: shippingProfileResult } = await (0, core_flows_1.createShippingProfilesWorkflow)(container).run({
            input: {
                data: [
                    {
                        name: "Australia Shipping Profile",
                        type: "default",
                    },
                ],
            },
        });
        shippingProfile = shippingProfileResult[0];
    }
    // Create fulfillment set for Australia
    const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
        name: "Australia Delivery",
        type: "shipping",
        service_zones: [
            {
                name: "Australia Wide",
                geo_zones: [
                    {
                        country_code: countryCode,
                        type: "country",
                    },
                ],
            },
        ],
    });
    // Link stock location to fulfillment set
    await link.create({
        [utils_1.Modules.STOCK_LOCATION]: {
            stock_location_id: stockLocation.id,
        },
        [utils_1.Modules.FULFILLMENT]: {
            fulfillment_set_id: fulfillmentSet.id,
        },
    });
    // Create free shipping option - FIXED: Added currency_code to all prices
    await (0, core_flows_1.createShippingOptionsWorkflow)(container).run({
        input: [
            {
                name: "Free Standard Shipping",
                price_type: "flat",
                provider_id: "manual_manual",
                service_zone_id: fulfillmentSet.service_zones[0].id,
                shipping_profile_id: shippingProfile.id,
                type: {
                    label: "Free Standard",
                    description: "Free shipping across Australia. Delivered in 3-7 business days.",
                    code: "free_standard",
                },
                prices: [
                    {
                        currency_code: currencyCode.toUpperCase(),
                        amount: 0, // Free shipping
                    }
                    // REMOVED: Don't add region-specific price without currency_code
                    // {
                    //   region_id: region.id,
                    //   amount: 0,
                    // },
                ],
                rules: [
                    {
                        attribute: "enabled_in_store",
                        value: "true",
                        operator: "eq",
                    },
                    {
                        attribute: "is_return",
                        value: "false",
                        operator: "eq",
                    },
                ],
            },
            {
                name: "Express Shipping",
                price_type: "flat",
                provider_id: "manual_manual",
                service_zone_id: fulfillmentSet.service_zones[0].id,
                shipping_profile_id: shippingProfile.id,
                type: {
                    label: "Express",
                    description: "Next business day delivery.",
                    code: "express",
                },
                prices: [
                    {
                        currency_code: currencyCode.toUpperCase(),
                        amount: 1500, // $15.00 AUD
                    }
                    // REMOVED: Don't add region-specific price without currency_code
                    // {
                    //   region_id: region.id,
                    //   amount: 1500,
                    // },
                ],
                rules: [
                    {
                        attribute: "enabled_in_store",
                        value: "true",
                        operator: "eq",
                    },
                    {
                        attribute: "is_return",
                        value: "false",
                        operator: "eq",
                    },
                ],
            },
        ],
    });
    logger.info("Finished seeding fulfillment data.");
    // 6. Link sales channel to stock location
    await (0, core_flows_1.linkSalesChannelsToStockLocationWorkflow)(container).run({
        input: {
            id: stockLocation.id,
            add: [defaultSalesChannel[0].id],
        },
    });
    logger.info("Finished linking sales channel to stock location.");
    // 7. Publishable API key
    logger.info("Seeding publishable API key data...");
    const { result: publishableApiKeyResult } = await (0, core_flows_1.createApiKeysWorkflow)(container).run({
        input: {
            api_keys: [
                {
                    title: "Australia Pharmacy API",
                    type: "publishable",
                    created_by: "system",
                },
            ],
        },
    });
    const publishableApiKey = publishableApiKeyResult[0];
    await (0, core_flows_1.linkSalesChannelsToApiKeyWorkflow)(container).run({
        input: {
            id: publishableApiKey.id,
            add: [defaultSalesChannel[0].id],
        },
    });
    logger.info("Finished seeding publishable API key data.");
    // 8. Product categories for pharmacy store
    logger.info("Seeding product categories...");
    const { result: categoryResult } = await (0, core_flows_1.createProductCategoriesWorkflow)(container).run({
        input: {
            product_categories: [
                {
                    name: "Pharmacy Products",
                    is_active: true,
                    description: "General pharmacy and health products",
                },
                {
                    name: "Australian Pharmaceutical Formulary",
                    is_active: true,
                    description: "Official pharmaceutical references and formularies",
                },
                {
                    name: "Complementary Medicines",
                    is_active: true,
                    description: "Vitamins, supplements, and natural health products",
                },
                {
                    name: "Drug References",
                    is_active: true,
                    description: "Medical and drug reference materials",
                },
                {
                    name: "Programs",
                    is_active: true,
                    description: "Training programs and educational materials",
                },
            ],
        },
    });
    logger.info("Finished seeding product categories.");
    // 9. Sample pharmacy products - FIXED: Simplified price structure
    logger.info("Seeding product data...");
    // await createProductsWorkflow(container).run({
    //   input: {
    //     products: [
    //       {
    //         title: "AMH Children's Dosing Companion 2023/24",
    //         category_ids: [
    //           categoryResult.find((cat) => cat.name === "Australian Pharmaceutical Formulary")!.id,
    //         ],
    //         description:
    //           "Essential pediatric dosing reference for Australian healthcare professionals. Contains up-to-date information on children's medication dosages, contraindications, and administration guidelines.",
    //         handle: "amh-childrens-dosing-companion-2023-24",
    //         weight: 500,
    //         status: ProductStatus.PUBLISHED,
    //         shipping_profile_id: shippingProfile.id,
    //         metadata: {
    //           isbn: "978-0-909059-24-4",
    //           publisher: "Australian Medicines Handbook",
    //           edition: "2023/24",
    //         },
    //         images: [
    //           {
    //             url: "https://via.placeholder.com/600x800/3B82F6/FFFFFF?text=AMH+Children%27s+Dosing+2023%2F24",
    //           },
    //         ],
    //         options: [
    //           {
    //             title: "Format",
    //             values: ["Print", "Digital"],
    //           },
    //         ],
    //         variants: [
    //           {
    //             title: "Print Edition",
    //             sku: "AMH-CDC-2023-PRINT",
    //             options: {
    //               Format: "Print",
    //             },
    //             // FIXED: Only use currency_code, not region_id
    //             prices: [
    //               {
    //                 amount: 3499, // $34.99 AUD
    //                 currency_code: currencyCode.toUpperCase(),
    //               }
    //             ],
    //             inventory_quantity: 100,
    //             manage_inventory: true,
    //           },
    //           {
    //             title: "Digital Edition",
    //             sku: "AMH-CDC-2023-DIGITAL",
    //             options: {
    //               Format: "Digital",
    //             },
    //             prices: [
    //               {
    //                 amount: 2999, // $29.99 AUD
    //                 currency_code: currencyCode.toUpperCase(),
    //               }
    //             ],
    //             inventory_quantity: 99999,
    //             manage_inventory: false,
    //           },
    //         ],
    //         sales_channels: [
    //           {
    //             id: defaultSalesChannel[0].id,
    //           },
    //         ],
    //       }
    //     ],
    //   },
    // });
    logger.info("Finished seeding product data.");
    // 10. Inventory levels
    logger.info("Seeding inventory levels...");
    const { data: inventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id"],
    });
    const inventoryLevels = [];
    for (const inventoryItem of inventoryItems) {
        const inventoryLevel = {
            location_id: stockLocation.id,
            stocked_quantity: 1000,
            inventory_item_id: inventoryItem.id,
        };
        inventoryLevels.push(inventoryLevel);
    }
    await (0, core_flows_1.createInventoryLevelsWorkflow)(container).run({
        input: {
            inventory_levels: inventoryLevels,
        },
    });
    logger.info("Finished seeding inventory levels data.");
    logger.info("🎉 Australia pharmacy store setup completed successfully!");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VlZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3NjcmlwdHMvc2VlZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBc0JBLHFDQXdhQztBQTdiRCxxREFJbUM7QUFDbkMsNERBY3FDO0FBRXRCLEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxFQUFFLFNBQVMsRUFBWTtJQUN0RSxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25FLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0QsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqRSxNQUFNLHdCQUF3QixHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3hFLE1BQU0seUJBQXlCLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDM0UsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUU1RCwwQkFBMEI7SUFDMUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQztJQUMzQixNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUM7SUFFL0IsTUFBTSxDQUFDLElBQUksQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO0lBRTdELGlCQUFpQjtJQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDckMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sa0JBQWtCLENBQUMsVUFBVSxFQUFFLENBQUM7SUFFdEQsc0NBQXNDO0lBQ3RDLElB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