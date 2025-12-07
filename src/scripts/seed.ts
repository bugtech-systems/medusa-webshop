import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedAustraliaStore({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

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
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
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
  await updateStoresWorkflow(container).run({
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
  const { result: regionResult } = await createRegionsWorkflow(container).run({
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
  await createTaxRegionsWorkflow(container).run({
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
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
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
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
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
    const { result: shippingProfileResult } =
    await createShippingProfilesWorkflow(container).run({
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
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  // Create free shipping option - FIXED: Added currency_code to all prices
  await createShippingOptionsWorkflow(container).run({
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
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished linking sales channel to stock location.");

  // 7. Publishable API key
  logger.info("Seeding publishable API key data...");
  const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
    container
  ).run({
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

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  // 8. Product categories for pharmacy store
  logger.info("Seeding product categories...");
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
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

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 1000,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");
  
  logger.info("🎉 Australia pharmacy store setup completed successfully!");
}