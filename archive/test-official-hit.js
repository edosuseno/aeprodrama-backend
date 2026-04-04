import signatureGenerator from './src/utils/SignatureGenerator.js';
import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = 'https://sapi.dramaboxdb.com/drama-box';
const STARTUP_KEY = crypto.randomUUID();

const ENDPOINTS = [
    // TARGET BARU DARI SCREENSHOT BAPAK
    {
        name: 'LATEST DRAMA (From Screenshot)',
        path: '/he001/rank',
        body: {
            "rankType": 3,   // Sesuai screenshot
            "pageNo": 1,     // Parameter standar
            "pageSize": 20,
            "startUpKey": STARTUP_KEY
        }
    },
    // Parameter lain mungkin diperlukan, kita coba minimal dulu
];

async function testScreenshotEndpoint() {
    console.log('🚀 TESTING NEW TARGET FROM SCREENSHOT (/he001/rank)...\n');

    for (const ep of ENDPOINTS) {
        const urlBase = `${BASE_URL}${ep.path}`;
        const bodyString = JSON.stringify(ep.body);

        // Generate Headers V3 (Header Names Fixed)
        const { headers, query } = signatureGenerator.getHeaders(bodyString);

        // Append query param
        const url = `${urlBase}?timestamp=${query.timestamp}`;

        console.log(`📡 Hit: ${ep.name}`);
        console.log(`🔗 URL: ${url}`);
        console.log(`📦 Body: ${bodyString}`);

        try {
            const res = await axios.post(url, ep.body, { headers, timeout: 8000 });

            console.log(`✅ [${res.status}] SUKSES PENUH!`);
            const dataPreview = JSON.stringify(res.data, null, 2).substring(0, 800);
            console.log('📦 DATA RESPONSE:\n', dataPreview);

            if (res.data.status === 0 || res.data.success === true) {
                console.log('🎉🎉 JACKPOT! INI BENAR-BENAR TEMBUS!');
            } else {
                console.log('⚠️ Server Reply:', res.data.message);
            }

        } catch (e) {
            if (e.response) {
                console.log(`❌ [${e.response.status}] Server Message:`, e.response.data);
            } else {
                console.log(`❌ ERROR: ${e.message}`);
            }
        }
        console.log('-------------------------------------------');
    }
}

testScreenshotEndpoint();
