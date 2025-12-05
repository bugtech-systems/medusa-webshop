import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
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
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

const psaProducts = [
  {
    productId: "01tGB00000DEazHYAT",
    name: "AMH Aged Care Companion 2024",
    sku: "AACC24",
    family: "Online Shop",
    active: true,
    prices: [
      {
        pricebookName: "PSA Member",
        unitPrice: 109.091,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "Standard Price Book", 
        unitPrice: 113.64,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "PSA Non-member",
        unitPrice: 113.64,
        useStandardPrice: true,
        priceActive: true
      }
    ]
  },
  {
    productId: "01t0o00000CnyzqAAB",
    name: "AMH Children's Dosing Companion 2023/24",
    sku: "ACDC23", 
    family: "Online Shop",
    active: true,
    prices: [
      {
        pricebookName: "PSA Member",
        unitPrice: 130.91,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "PSA Student Member",
        unitPrice: 130.91,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "Standard Price Book",
        unitPrice: 140.91,
        useStandardPrice: false, 
        priceActive: true
      },
      {
        pricebookName: "PSA Non-member",
        unitPrice: 140.91,
        useStandardPrice: true,
        priceActive: true
      }
    ]
  },
  {
    productId: "01tRF00000FhqynYAB",
    name: "AMH Children's Dosing Companion 2025/26", 
    sku: "ACDC25",
    family: "Online Shop",
    active: true,
    prices: [
      {
        pricebookName: "PSA Member",
        unitPrice: 140.91,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "PSA Student Member",
        unitPrice: 140.91,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "Standard Price Book",
        unitPrice: 154.55,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "PSA Non-member",
        unitPrice: 154.55,
        useStandardPrice: true,
        priceActive: true
      }
    ]
  },
  {
    productId: "01t0o00000BFLegAAH",
    name: "AMH: Australian Medicines Handbook 2023",
    sku: "AMH23",
    family: "Online Shop", 
    active: true,
    prices: [
      {
        pricebookName: "PSA Student Member",
        unitPrice: 219.09,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "PSA Member",
        unitPrice: 262.73,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "Standard Price Book",
        unitPrice: 272.73,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "PSA Non-member",
        unitPrice: 272.73,
        useStandardPrice: true,
        priceActive: true
      }
    ]
  },
  {
    productId: "01t0o00000BTEUJAA5",
    name: "APF Digital Single User Licence (12-month subscription)",
    sku: "APFDIGSING",
    family: "Online Shop",
    active: true,
    prices: [
      {
        pricebookName: "PSA Member",
        unitPrice: 160.95,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "PSA Student Member",
        unitPrice: 160.95,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "Standard Price Book",
        unitPrice: 229.24,
        useStandardPrice: false,
        priceActive: true
      },
      {
        pricebookName: "PSA Non-member",
        unitPrice: 229.24,
        useStandardPrice: true,
        priceActive: true
      }
    ]
  }
];

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);
  const pricingModuleService = container.resolve(Modules.PRICING);
  const taxModuleService = container.resolve(Modules.TAX);

  const australianStates = [
    "act", "nsw", "nt", "qld", "sa", "tas", "vic", "wa"
  ];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "aud",
          is_default: true,
        },
        {
          currency_code: "usd",
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });

  logger.info("Seeding region data...");
  let region;
  try {
    // Check if region already exists
    const existingRegions = await container.resolve(Modules.REGION).listRegions({
      name: "Australia"
    });
    
    if (existingRegions.length > 0) {
      region = existingRegions[0];
      logger.info("Australia region already exists, using existing one");
    } else {
      // Create region without payment providers to avoid the error
      const { result: regionResult } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "Australia",
              currency_code: "aud",
              countries: ["au"],
              // No payment_providers - they can be added later through admin
            },
          ],
        },
      });
      region = regionResult[0];
      logger.info("Created Australia region");
    }
  } catch (error) {
    logger.error("Error creating region:", error.message);
    // Try to get existing region as fallback
    const existingRegions = await container.resolve(Modules.REGION).listRegions();
    region = existingRegions[0];
  }
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  try {
    // Check which tax regions already exist to avoid duplicates
    const existingTaxRegions = await taxModuleService.listTaxRegions({
      country_code: "au"
    });

    const taxRegionsToCreate = [];
    
    // Check and create country-level tax region (no province_code)
    const countryTaxRegionExists = existingTaxRegions.some(tr => 
      tr.country_code === "au" && !tr.province_code
    );
    
    if (!countryTaxRegionExists) {
      taxRegionsToCreate.push({
        country_code: "au",
        provider_id: "system",
      });
    }

    // Check and create state-level tax regions
    for (const state of australianStates) {
      const stateTaxRegionExists = existingTaxRegions.some(tr => 
        tr.country_code === "au" && tr.province_code === state
      );
      
      if (!stateTaxRegionExists) {
        taxRegionsToCreate.push({
          country_code: "au",
          province_code: state,
          provider_id: "system",
        });
      }
    }

    if (taxRegionsToCreate.length > 0) {
      await createTaxRegionsWorkflow(container).run({
        input: taxRegionsToCreate,
      });
      logger.info(`Created ${taxRegionsToCreate.length} tax regions`);
    } else {
      logger.info("All tax regions already exist, skipping creation");
    }
  } catch (error) {
    logger.warn("Tax regions may already exist, skipping:", error.message);
  }
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding customer groups...");
  let memberGroup = null;
  let studentGroup = null;
  let nonMemberGroup = null;

  try {
    const customerModuleService = container.resolve(Modules.CUSTOMER);
    
    // Check if groups already exist
    const existingGroups = await customerModuleService.listCustomerGroups();

    // Create groups that don't exist
    if (!existingGroups.find((g: any) => g.name === "PSA Member")) {
      memberGroup = await customerModuleService.createCustomerGroup({
        name: "PSA Member",
      });
      logger.info("Created PSA Member group");
    } else {
      memberGroup = existingGroups.find((g: any) => g.name === "PSA Member");
      logger.info("PSA Member group already exists");
    }

    if (!existingGroups.find((g: any) => g.name === "PSA Student Member")) {
      studentGroup = await customerModuleService.createCustomerGroup({
        name: "PSA Student Member", 
      });
      logger.info("Created PSA Student Member group");
    } else {
      studentGroup = existingGroups.find((g: any) => g.name === "PSA Student Member");
      logger.info("PSA Student Member group already exists");
    }

    if (!existingGroups.find((g: any) => g.name === "PSA Non-member")) {
      nonMemberGroup = await customerModuleService.createCustomerGroup({
        name: "PSA Non-member",
      });
      logger.info("Created PSA Non-member group");
    } else {
      nonMemberGroup = existingGroups.find((g: any) => g.name === "PSA Non-member");
      logger.info("PSA Non-member group already exists");
    }

  } catch (error) {
    logger.warn("Customer groups could not be created, continuing without them:", error.message);
    // Continue without customer groups
  }
  logger.info("Finished seeding customer groups.");

  logger.info("Seeding product categories...");
  let categoryResult;
  try {
    // Check if category already exists
    const { data: existingCategories } = await query.graph({
      entity: "product_category",
      fields: ["id", "name"],
    });
    
    const onlineShopCategory = existingCategories.find((cat: any) => cat.name === "Online Shop");
    
    if (onlineShopCategory) {
      categoryResult = [onlineShopCategory];
      logger.info("Online Shop category already exists");
    } else {
      const { result: categoryResultData } = await createProductCategoriesWorkflow(
        container
      ).run({
        input: {
          product_categories: [
            {
              name: "Online Shop",
              is_active: true,
            },
          ],
        },
      });
      categoryResult = categoryResultData;
      logger.info("Created Online Shop category");
    }
  } catch (error) {
    logger.error("Error creating product category:", error.message);
    categoryResult = [];
  }
  logger.info("Finished seeding product categories.");

  logger.info("Seeding stock location data...");
  let stockLocation;
  try {
    const stockLocationService = container.resolve(Modules.STOCK_LOCATION);
    const existingLocations = await stockLocationService.listStockLocations({
      name: "Australian Digital Warehouse"
    });
    
    if (existingLocations.length > 0) {
      stockLocation = existingLocations[0];
      logger.info("Australian Digital Warehouse already exists");
    } else {
      const { result: stockLocationResult } = await createStockLocationsWorkflow(
        container
      ).run({
        input: {
          locations: [
            {
              name: "Australian Digital Warehouse",
              address: {
                city: "Sydney",
                country_code: "AU",
                address_1: "Digital Product Fulfillment",
              },
            },
          ],
        },
      });
      stockLocation = stockLocationResult[0];
      logger.info("Created Australian Digital Warehouse");
    }
    
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          default_location_id: stockLocation.id,
        },
      },
    });

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });
  } catch (error) {
    logger.error("Error with stock location:", error.message);
    // Try to get any existing location as fallback
    const stockLocationService = container.resolve(Modules.STOCK_LOCATION);
    const existingLocations = await stockLocationService.listStockLocations();
    stockLocation = existingLocations[0];
  }
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    try {
      const { result: shippingProfileResult } =
        await createShippingProfilesWorkflow(container).run({
          input: {
            data: [
              {
                name: "Default Shipping Profile",
                type: "default",
              },
            ],
          },
        });
      shippingProfile = shippingProfileResult[0];
    } catch (error) {
      logger.warn("Error creating shipping profile:", error.message);
    }
  }

  let fulfillmentSet;
  try {
    const existingFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({
      name: "Australian Digital Delivery"
    });
    
    if (existingFulfillmentSets.length > 0) {
      fulfillmentSet = existingFulfillmentSets[0];
      logger.info("Australian Digital Delivery fulfillment set already exists");
    } else {
      fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
        name: "Australian Digital Delivery",
        type: "digital",
        service_zones: [
          {
            name: "Australia",
            geo_zones: [
              {
                country_code: "au",
                type: "country",
              },
            ],
          },
        ],
      });
      logger.info("Created Australian Digital Delivery fulfillment set");
    }

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });
  } catch (error) {
    logger.warn("Error with fulfillment set:", error.message);
  }

  try {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Digital Delivery",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet?.service_zones?.[0]?.id,
          shipping_profile_id: shippingProfile?.id,
          type: {
            label: "Digital",
            description: "Instant digital access.",
            code: "digital",
          },
          prices: [
            {
              currency_code: "aud",
              amount: 0,
            },
            {
              currency_code: "usd", 
              amount: 0,
            },
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
    logger.info("Created Digital Delivery shipping option");
  } catch (error) {
    logger.warn("Shipping option may already exist:", error.message);
  }
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });

  logger.info("Seeding publishable API key data...");
  let publishableApiKey;
  try {
    const existingApiKeys = await container.resolve(Modules.API_KEY).listApiKeys({
      title: "Webshop"
    });
    
    if (existingApiKeys.length > 0) {
      publishableApiKey = existingApiKeys[0];
      logger.info("Webshop API key already exists");
    } else {
      const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
        container
      ).run({
        input: {
          api_keys: [
            {
              title: "Webshop",
              type: "publishable",
              created_by: "",
            },
          ],
        },
      });
      publishableApiKey = publishableApiKeyResult[0];
      logger.info("Created Webshop API key");
    }

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [defaultSalesChannel[0].id],
      },
    });
  } catch (error) {
    logger.warn("Error with API key:", error.message);
  }
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding PSA product data...");
  try {
    // Check if products already exist
    const { data: existingProducts } = await query.graph({
      entity: "product",
      fields: ["id", "title", "external_id"],
    });

    const productsToCreate = psaProducts.filter(product => 
      !existingProducts.find((p: any) => p.external_id === product.productId)
    );

    if (productsToCreate.length > 0) {
      const productCreationInput = {
        products: productsToCreate.map(product => {
          const standardPrice = product.prices.find(p => p.pricebookName === "Standard Price Book")?.unitPrice || product.prices[0]?.unitPrice;
          const category = Array.isArray(categoryResult) 
            ? categoryResult.find((cat: any) => cat.name === product.family)
            : categoryResult?.find((cat: any) => cat.name === product.family);
          
          return {
            title: product.name,
            category_ids: category ? [category.id] : [],
            description: `${product.name} - Digital access product`,
            handle: product.sku.toLowerCase(),
            weight: 0,
            status: product.active ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
            shipping_profile_id: shippingProfile?.id,
            external_id: product.productId,
            metadata: {
              family: product.family,
              is_digital: true,
              requires_shipping: false,
              fulfillment_type: "digital",
            },
            options: [
              {
                title: "License Type",
                values: ["Digital Access"],
              },
            ],
            variants: [
              {
                title: "Digital Access",
                sku: product.sku,
                options: {
                  "License Type": "Digital Access",
                },
                prices: [
                  {
                    amount: Math.round(standardPrice * 100),
                    currency_code: "aud",
                  },
                  {
                    amount: Math.round((standardPrice * 0.65) * 100),
                    currency_code: "usd", 
                  },
                ],
                manage_inventory: false,
                metadata: {
                  is_digital: true,
                  digital_fulfillment: true,
                },
              },
            ],
            sales_channels: [
              {
                id: defaultSalesChannel[0].id,
              },
            ],
          };
        }),
      };

      await createProductsWorkflow(container).run({
        input: productCreationInput,
      });
      logger.info(`Created ${productsToCreate.length} PSA products`);
    } else {
      logger.info("All PSA products already exist, skipping creation");
    }
  } catch (error) {
    logger.error("Error creating products:", error.message);
  }
  logger.info("Finished seeding PSA product data.");

  logger.info("Setting up pricing...");
  try {
    // Get all products with their variants
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "external_id", "variants.id", "variants.sku"],
    });

    // Check if price lists already exist
    const existingPriceLists = await pricingModuleService.listPriceLists({
      name: ["PSA Member Pricing", "PSA Student Member Pricing", "PSA Non-member Pricing"]
    });

    const priceListData = [];
    const memberPrices = [];
    const studentPrices = [];
    const nonMemberPrices = [];

    // Collect all prices for each price list
    for (const product of psaProducts) {
      const createdProduct = products.find((p: any) => p.external_id === product.productId);
      if (!createdProduct) continue;

      const variant = createdProduct.variants[0];
      if (!variant) continue;

      for (const price of product.prices) {
        if (price.useStandardPrice) continue;

        const priceData = {
          variant_id: variant.id,
          amount: Math.round(price.unitPrice * 100),
          currency_code: "aud",
        };

        switch (price.pricebookName) {
          case "PSA Member":
            memberPrices.push(priceData);
            break;
          case "PSA Student Member":
            studentPrices.push(priceData);
            break;
          case "PSA Non-member":
            nonMemberPrices.push(priceData);
            break;
        }
      }
    }

    // Create price lists only if they don't exist and we have prices
    if (memberPrices.length > 0 && !existingPriceLists.find(pl => pl.name === "PSA Member Pricing")) {
      priceListData.push({
        name: "PSA Member Pricing",
        type: "sale",
        status: "active",
        prices: memberPrices,
        customer_groups: memberGroup ? [{ id: memberGroup.id }] : undefined,
      });
    }

    if (studentPrices.length > 0 && !existingPriceLists.find(pl => pl.name === "PSA Student Member Pricing")) {
      priceListData.push({
        name: "PSA Student Member Pricing",
        type: "sale", 
        status: "active",
        prices: studentPrices,
        customer_groups: studentGroup ? [{ id: studentGroup.id }] : undefined,
      });
    }

    if (nonMemberPrices.length > 0 && !existingPriceLists.find(pl => pl.name === "PSA Non-member Pricing")) {
      priceListData.push({
        name: "PSA Non-member Pricing",
        type: "sale",
        status: "active",
        prices: nonMemberPrices,
        customer_groups: nonMemberGroup ? [{ id: nonMemberGroup.id }] : undefined,
      });
    }

    // Create price lists with prices
    if (priceListData.length > 0) {
      await createPriceListsWorkflow(container).run({
        input: {
          price_lists: priceListData,
        },
      });
      logger.info(`Created ${priceListData.length} price lists`);
    } else {
      logger.info("All price lists already exist, skipping creation");
    }
  } catch (error) {
    logger.error("Error setting up pricing:", error.message);
  }
  logger.info("Finished setting up pricing.");

  logger.info("Seeding inventory levels.");
  try {
    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: ["id"],
    });

    const inventoryLevels: CreateInventoryLevelInput[] = [];
    for (const inventoryItem of inventoryItems) {
      const inventoryLevel = {
        location_id: stockLocation.id,
        stocked_quantity: 1000000,
        inventory_item_id: inventoryItem.id,
      };
      inventoryLevels.push(inventoryLevel);
    }

    if (inventoryLevels.length > 0) {
      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: inventoryLevels,
        },
      });
      logger.info(`Created inventory levels for ${inventoryLevels.length} items`);
    }
  } catch (error) {
    logger.warn("Error seeding inventory levels:", error.message);
  }
  logger.info("Finished seeding inventory levels data.");

  logger.info("Demo data seeding completed successfully!");
}