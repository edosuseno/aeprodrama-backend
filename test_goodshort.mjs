import gs from './src/services/GoodShortService.js';

async function testGoodShortSearch() {
    console.log("Testing GoodShort Service Search...");
    try {
        const results = await gs.search("cinta");
        console.log(`Found ${results.length} items`);
        results.forEach((r, i) => console.log(`[${i+1}] ID: ${r.id} | Title: ${r.title}`));
        console.log(JSON.stringify(results, null, 2).substring(0, 500));
    } catch (e) {
        console.error("Test failed: ", e);
    }
}

testGoodShortSearch();
