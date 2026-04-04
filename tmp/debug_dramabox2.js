import Dramabox2Service from '../src/services/Dramabox2Service.js';
(async () => {
    const data = await Dramabox2Service.getDetail('6919b2c404d14ccf3aabdd29');
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
})();
