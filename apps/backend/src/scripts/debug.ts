export default async function debugProductService({ container }: any) {
  console.log("🔍 Debugging Product Service Methods");
  console.log("=====================================");
  
  try {
    // Try to resolve product service
    const productService = container.resolve("productModuleService");
    
    console.log("✅ Successfully resolved productModuleService");
    console.log(`Type: ${typeof productService}`);
    console.log(`Constructor: ${productService.constructor.name}`);
    
    // Get all methods
    console.log("\n📋 All available methods:");
    const allProps = Object.getOwnPropertyNames(Object.getPrototypeOf(productService));
    const methods = allProps.filter(prop => typeof productService[prop] === 'function');
    
    methods.forEach((method, index) => {
      console.log(`${index + 1}. ${method}`);
    });
    
    // Check specific common methods
    console.log("\n🎯 Checking specific methods:");
    const specificMethods = [
      'list', 'listProducts',
      'create', 'createProducts',
      'update', 'updateProducts',
      'retrieve', 'retrieveProduct',
      'delete', 'deleteProducts',
      'listCategories', 'createCategories',
      'listAndCount', 'softDelete', 'restore'
    ];
    
    for (const method of specificMethods) {
      console.log(`${typeof productService[method] === 'function' ? '✓' : '✗'} ${method}`);
    }
    
    // Try to call list to see what it returns
    console.log("\n🧪 Testing list method...");
    try {
      const products = await productService.list({}, { take: 1 });
      console.log(`list() works, found ${products.length} products`);
    } catch (error: any) {
      console.log(`list() error: ${error.message}`);
    }
    
    // Try listProducts
    console.log("\n🧪 Testing listProducts method...");
    try {
      const products = await productService.listProducts({}, { take: 1 });
      console.log(`listProducts() works, found ${products.length} products`);
    } catch (error: any) {
      console.log(`listProducts() error: ${error.message}`);
    }
    
  } catch (error: any) {
    console.error("❌ Could not resolve productModuleService:", error.message);
    
    // Try alternative service names
    console.log("\n🔄 Trying alternative service names...");
    const alternativeNames = ["productService", "product"];
    
    for (const name of alternativeNames) {
      try {
        const service = container.resolve(name);
        console.log(`✅ Found service: ${name}`);
        console.log(`   Type: ${typeof service}`);
        const props = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
          .filter(prop => typeof service[prop] === 'function');
        console.log(`   Methods (first 10): ${props.slice(0, 10).join(', ')}`);
      } catch (e) {
        console.log(`✗ ${name}: Not found`);
      }
    }
  }
  
  console.log("\n🔚 Debug complete!");
}