import Dramabox2Service from '../src/services/Dramabox2Service.js';
(async () => {
    try {
        console.log("--- TEST GET HOME ---");
        const dramas = await Dramabox2Service.getHome(1);
        console.log("Count:", dramas.length);
        if (dramas.length > 0) {
            console.log("First Drama:", dramas[0]);
            
            console.log("\n--- TEST GET DETAIL ---");
            const detail = await Dramabox2Service.getDetail(dramas[0].id);
            console.log("Detail Title:", detail?.title);
            console.log("Episode Count:", detail?.episodes?.length);
            
            if (detail?.episodes?.length > 0) {
                console.log("\n--- TEST GET STREAM ---");
                const stream = await Dramabox2Service.getStream(dramas[0].id, detail.episodes[0].index);
                console.log("Stream URL Found:", !!stream?.url);
                console.log("Stream URL:", stream?.url);
            }
        }
    } catch(e) {
        console.log("Global Error:", e.message);
    }
    process.exit(0);
})();
