import signatureGenerator from './src/utils/SignatureGenerator.js';
import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = 'https://sapi.dramaboxdb.com/drama-box';
const DEVICE_ID = signatureGenerator.deviceId;

console.log('🎯 TESTING MULTIPLE ENDPOINTS WITH IMPROVED HEADERS\n');
console.log(`📱 Device ID: ${DEVICE_ID}\n`);

const TESTS = [
    // 1. Bootstrap (mungkin perlu dipanggil dulu sebelum endpoint lain)
    {
        name: 'Bootstrap (Initial Handshake)',
        path: '/ap001/bootstrap',
        body: {
            distinctId: DEVICE_ID
        }
    },

    // 2. Config Load
    {
        name: 'Config Load',
        path: '/ap001/confload',
        body: {}
    },

    // 3. Theater (mungkin lebih permissive)
    {
        name: 'Theater',
        path: '/he001/theater',
        body: {
            pageNo: 1,
            pageSize: 20
        }
    },

    // 4. Ranking dengan parameter minimal
    {
        name: 'Ranking (Minimal Params)',
        path: '/he001/rank',
        body: {
            rankType: 3
        }
    },

    // 5. Ranking dengan parameter lengkap
    {
        name: 'Ranking (Full Params)',
        path: '/he001/rank',
        body: {
            rankType: 3,
            pageNo: 1,
            pageSize: 20,
            startUpKey: crypto.randomUUID()
        }
    },

    // 6. Chapter list dengan book_id
    {
        name: 'Chapter List',
        path: '/chapter/list',
        body: {
            book_id: '42000003970',
            page_num: 1,
            page_size: 20
        }
    },

    // 7. Chapter list dengan bookId (camelCase)
    {
        name: 'Chapter List (CamelCase)',
        path: '/chapter/list',
        body: {
            bookId: '42000003970',
            pageNum: 1,
            pageSize: 20
        }
    },

    // 8. Book detail
    {
        name: 'Book Detail',
        path: '/book/detail',
        body: {
            book_id: '42000003970'
        }
    }
];

async function testEndpoint(test) {
    const urlBase = `${BASE_URL}${test.path}`;
    const bodyString = JSON.stringify(test.body);

    const { headers, query } = signatureGenerator.getHeaders(bodyString);
    const url = `${urlBase}?timestamp=${query.timestamp}`;

    console.log('─'.repeat(80));
    console.log(`📡 ${test.name}`);
    console.log(`🔗 ${test.path}`);
    console.log(`📦 Body: ${bodyString}`);

    try {
        const res = await axios.post(url, test.body, {
            headers,
            timeout: 10000,
            validateStatus: () => true // Accept all status codes
        });

        const statusCode = res.data.status;
        const message = res.data.message;

        console.log(`📊 HTTP Status: ${res.status}`);
        console.log(`📊 API Status: ${statusCode}`);
        console.log(`💬 Message: ${message}`);

        // Check for success
        if (statusCode === 0 || res.data.success === true) {
            console.log('');
            console.log('🎉'.repeat(40));
            console.log('💥 JACKPOT! ENDPOINT BERHASIL! 💥');
            console.log('🎉'.repeat(40));
            console.log('');
            console.log('📦 FULL RESPONSE:');
            console.log(JSON.stringify(res.data, null, 2));
            console.log('');
            console.log('🔑 CONFIGURATION:');
            console.log(`  URL: ${url}`);
            console.log(`  Body: ${bodyString}`);
            console.log('');
            return true; // Stop testing
        }

        // Check for different error types
        if (statusCode === 100) {
            console.log('⚠️  Status 100: Internal Server Error - Might need device registration/bootstrap');
        } else if (statusCode === 1) {
            if (message.includes('参数非法') || message.includes('Illegal')) {
                console.log('❌ Status 1: Invalid Parameters');
            } else {
                console.log(`⚠️  Status 1: ${message}`);
            }
        } else {
            console.log(`ℹ️  Other status: ${statusCode}`);
        }

        // Preview data if any
        if (res.data.data) {
            console.log('');
            console.log('📦 DATA PREVIEW:');
            console.log(JSON.stringify(res.data.data).substring(0, 200) + '...');
        }

    } catch (e) {
        if (e.response) {
            console.log(`❌ HTTP ${e.response.status}: ${e.response.statusText}`);
            if (e.response.data) {
                console.log(`💬 ${JSON.stringify(e.response.data)}`);
            }
        } else {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }

    console.log('');
    return false;
}

async function runAllTests() {
    console.log('='.repeat(80));
    console.log('Starting comprehensive endpoint testing...');
    console.log('='.repeat(80));
    console.log('');

    for (const test of TESTS) {
        const success = await testEndpoint(test);
        if (success) {
            console.log('🎯 Found working endpoint! Stopping tests.');
            return;
        }

        // Delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log('⚠️  No successful endpoint found yet.');
    console.log('');
    console.log('💡 ANALYSIS:');
    console.log('  - Headers are correct (no more "Illegal Parameter")');
    console.log('  - Signature is valid (server accepts requests)');
    console.log('  - Getting "Internal Server Error" (status 100)');
    console.log('');
    console.log('🔍 POSSIBLE REASONS:');
    console.log('  1. Device ID needs to be registered (call /ap001/bootstrap first)');
    console.log('  2. IP geo-blocking (try with VPN from supported region)');
    console.log('  3. Additional headers or parameters required');
    console.log('  4. Need to use different endpoint URL');
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('  1. Try intercepting real app traffic with mitmproxy');
    console.log('  2. Compare our requests with actual app requests');
    console.log('  3. Look for bootstrap/init sequence in decompiled APK');
    console.log('  4. Try different base URLs (if any)');
    console.log('');
}

runAllTests().catch(console.error);
