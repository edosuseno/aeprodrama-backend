import axios from 'axios';

async function inspectDramabox2() {
    const keyword = 'bangkit menjadi dewa';
    const url = `https://vidrama.asia/api/dramabox2/search?q=${encodeURIComponent(keyword)}`;
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    try {
        console.log(`🔎 Bedah respons di: ${url}`);
        const res = await axios.get(url, { headers });
        console.log("--- FULL JSON RESPONSE ---");
        console.log(JSON.stringify(res.data, null, 2).substring(0, 5000));
        console.log("--------------------------");
    } catch (e) { console.error(e.message); }
}

inspectDramabox2();
