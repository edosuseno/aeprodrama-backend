import signatureGenerator from './src/utils/SignatureGenerator.js';
import axios from 'axios';
import crypto from 'crypto';

console.log('🚀 TESTING NEW FOUND ENDPOINTS & HEADERS\n');

// Device Info yang konsisten
const DEVICE_ID = '9774d56d682e549c';
const ANDROID_ID = '9774d56d682e549c';

// Endpoints found from APK Analyzer
const TARGETS = [
    {
        name: 'Official API (Base)',
        baseUrl: 'https://sapi.dramaboxdb.com',
        path: '/drama-box/he001/rank'
    },
    {
        name: 'YFB API (Alternative)',
        baseUrl: 'https://yfbapi.dramaboxdb.com', // Found in APK
        path: '/drama-box/he001/rank'
    },
    {
        name: 'API Domain (Alternative)',
        baseUrl: 'https://api.dramaboxdb.com', // Found in APK
        path: '/drama-box/he001/rank'
    },
    {
        name: 'HW API (China/Huawei?)',
        baseUrl: 'https://dramaapi.hw.dzods.cn', // Found in APK
        path: '/drama-box/he001/rank'
    }
];

// Header tambahan yang ditemukan di APK
const EXTRA_HEADERS = {
    'x-startup': '1', // Sering dipakai untuk first launch check
    'X-c': '1',       // Common custom header
    'X-f': '1'        // Common custom header
};

async function testTarget(target) {
    const url = `${target.baseUrl}${target.path}`;

    // Body standard untuk ranking
    const body = {
        rankType: 3,
        pageNo: 1,
        pageSize: 20
    };
    const bodyString = JSON.stringify(body);

    // Generate Standard Headers
    const { headers: sigHeaders, query } = signatureGenerator.getHeaders(bodyString);

    // Gabungkan dengan extra headers
    const finalHeaders = {
        ...sigHeaders,
        ...EXTRA_HEADERS
    };

    const finalUrl = `${url}?timestamp=${query.timestamp}`;

    console.log(`📡 Targeting: ${target.name}`);
    console.log(`🔗 URL: ${finalUrl}`);

    try {
        const res = await axios.post(finalUrl, body, {
            headers: finalHeaders,
            timeout: 10000,
            validateStatus: () => true // Jangan throw error dulu
        });

        console.log(`📊 Status: ${res.status}`);

        if (res.data) {
            const apiStatus = res.data.status;
            const msg = res.data.message;
            console.log(`💬 API Response: [${apiStatus}] ${msg || 'No message'}`);

            if (apiStatus === 0 || res.data.success === true) {
                console.log('🎉🎉 JACKPOT! Endpoint works!');
                console.log('Response Preview:', JSON.stringify(res.data).substring(0, 200));
                return true;
            } else if (apiStatus === 100) {
                console.log('⚠️  Server Error (100) - Masih kena blokir/error');
            }
        }
    } catch (e) {
        console.log(`❌ Connection Error: ${e.message}`);
        if (e.code === 'ENOTFOUND') console.log('   (Domain tidak bisa diresolve)');
    }
    console.log('-------------------------------------------');
    return false;
}

async function run() {
    for (const target of TARGETS) {
        await testTarget(target);
        // Delay dikit biar gak spam
        await new Promise(r => setTimeout(r, 1000));
    }
}

run();
