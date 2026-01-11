"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = debugProductService;
async function debugProductService({ container }) {
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
        }
        catch (error) {
            console.log(`list() error: ${error.message}`);
        }
        // Try listProducts
        console.log("\n🧪 Testing listProducts method...");
        try {
            const products = await productService.listProducts({}, { take: 1 });
            console.log(`listProducts() works, found ${products.length} products`);
        }
        catch (error) {
            console.log(`listProducts() error: ${error.message}`);
        }
    }
    catch (error) {
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
            }
            catch (e) {
                console.log(`✗ ${name}: Not found`);
            }
        }
    }
    console.log("\n🔚 Debug complete!");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvc2NyaXB0cy9kZWJ1Zy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNDQTZFQztBQTdFYyxLQUFLLFVBQVUsbUJBQW1CLENBQUMsRUFBRSxTQUFTLEVBQU87SUFDbEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0lBQ3BELE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsQ0FBQztJQUVyRCxJQUFJLENBQUM7UUFDSCxpQ0FBaUM7UUFDakMsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRWpFLE9BQU8sQ0FBQyxHQUFHLENBQUMsOENBQThDLENBQUMsQ0FBQztRQUM1RCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsT0FBTyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLGNBQWMsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUUvRCxrQkFBa0I7UUFDbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLFVBQVUsQ0FBQyxDQUFDO1FBRXBGLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEtBQUssTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN6QyxDQUFD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