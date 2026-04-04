
import axios from 'axios';

async function inspectVidramaM3u8() {
    console.log("--- INSPEKSI MANIFEST VIDRAMA.ASIA ---\n");
    
    const targetUrl = "https://akamai-static.shorttv.live/hls-encrypted/519730fa34c64df0900fdafa422188e3_720/main.m3u8?auth_key=1775016787-0-0-ad554644a9f4dca7a09638793437ca69";
    const proxyUrl = `https://vidrama.asia/api/shortmax/proxy?url=${encodeURIComponent(targetUrl)}`;

    try {
        const res = await axios.get(proxyUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const lines = res.data.split('\n');
        console.log("Daftar 15 baris pertama manifest:");
        lines.slice(0, 15).forEach((line, i) => {
            console.log(`L${i}: ${line}`);
        });

        if (res.data.includes('BYTERANGE')) {
            console.log("\n✅ TERDETEKSI: Vidrama menggunakan mekanisme BYTERANGE!");
        } else {
            console.log("\n❌ TIDAK ADA BYTERANGE. Rahasianya ada di hal lain.");
        }
    } catch (e) {
        console.log(`❌ GAGAL: ${e.message}`);
    }
}

inspectVidramaM3u8();
