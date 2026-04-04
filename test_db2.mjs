import Dramabox2Service from './src/services/Dramabox2Service.js';

async function test() {
    console.log("Start getHome...");
    const data = await Dramabox2Service.getHome(1);
    console.log("Data length:", data.length);
}
test();
