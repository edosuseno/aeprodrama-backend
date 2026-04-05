import axios from 'axios';

async function manualTest() {
    console.log("🔍 Mengetes Rute Velolo Murni...");
    const baseUrl = 'https://vidrama.asia';
    const keyword = 'pernikahan'; // Pakai 'pernikahan' dulu yang lebih umum dari 'julu'

    // Header Vidrama standar
    const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
        'Referer': 'https://vidrama.asia/',
        'Origin': 'https://vidrama.asia'
    };

    const urls = [
        `${baseUrl}/api/velolo/search?q=${encodeURIComponent(keyword)}`,
        `${baseUrl}/api/velolo?action=search&keyword=${encodeURIComponent(keyword)}`
    ];

    for (const url of urls) {
        try {
            console.log(`\nTesting URL: ${url}`);
            const res = await axios.get(url, { headers, timeout: 10000 });
            console.log(`✅ Success! Status: ${res.status}`);
            const data = res.data?.dataList || res.data?.rows || res.data?.data || res.data || [];
            console.log(`📦 Data Count: ${Array.isArray(data) ? data.length : "Not an array"}`);
            if (Array.isArray(data) && data.length > 0) {
                console.log("Contoh Hasil:", JSON.stringify(data[0], null, 2).substring(0, 300));
                break;
            } else {
                console.warn("⚠️ Hasil kosong untuk rute ini.");
            }
        } catch (e) {
            console.error(`❌ Gagal: ${e.message} (Status: ${e.response?.status})`);
        }
    }
}

manualTest();
