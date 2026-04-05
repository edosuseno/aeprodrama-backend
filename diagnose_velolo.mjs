import veloloService from './src/services/VeloloService.js';
import stardustTVService from './src/services/StardustTVService.js';

async function diagnoseVelolo() {
    console.log("--- Diagnosa Pencarian Velolo ---");
    try {
        // Pastikan token fresh
        console.log("Step 1: Checking Token...");
        await stardustTVService._refreshAccessToken();
        
        console.log("Step 2: Searching for 'julu'...");
        const results = await veloloService.search('julu');
        
        console.log("Step 3: Results Summary:");
        console.log("Total items found:", results.length);
        if (results.length > 0) {
            console.log("Sample first item:", JSON.stringify(results[0], null, 2));
        } else {
            console.warn("⚠️ API Velolo mengembalikan 0 hasil.");
        }
    } catch (e) {
        console.error("❌ Diagnosa Gagal:", e.message);
    }
}

diagnoseVelolo();
