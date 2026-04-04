
import axios from 'axios';
import sigGen from './src/utils/SignatureGeneratorV2.js';
import crypto from 'crypto';

// CONFIG
const BASE_URL = 'https://sapi.dramaboxdb.com/drama-box';

const TEST_CASES = [
    {
        name: 'Search Index (No Body)',
        urlPath: '/search/index',
        method: 'POST',
        bodyObj: {} // Empty body
    },
    {
        name: 'Bootstrap Test (BAD SIGNATURE)',
        urlPath: '/ap001/bootstrap',
        method: 'POST',
        bodyObj: {
            "distinctId": "d2d40675ca3d9e03"
        },
        badSignature: true
    },
    {
        name: 'Recommend Book (Manual Payload)',
        urlPath: '/he001/recommendBook',
        method: 'POST',
        bodyObj: {
            "pageNo": 1,
            "pageSize": 20
        }
    }
];

async function runTests() {
    console.log('🕵️‍♀️ MANUAL API TESTING WITH V5 SIGNATURE...\n');

    for (const test of TEST_CASES) {
        console.log(`\n🧪 TEST CASE: ${test.name}`);
        console.log(`TYPE: ${test.method}`);

        const bodyString = test.bodyObj ? JSON.stringify(test.bodyObj) : '';

        // Generate Headers
        const headerData = sigGen.getHeaders(bodyString, '');
        const { headers, query } = headerData;

        if (test.badSignature) {
            headers.sn = 'BAD_SIGNATURE_XXXX';
        }

        const finalUrl = `${BASE_URL}${test.urlPath}?timestamp=${query.timestamp}`;
        console.log(`🔗 URL: ${finalUrl}`);
        console.log(`📦 Body: ${bodyString}`);
        // console.log(`🛡️ Signature: ${headers.sn}`);

        try {
            const res = await axios({
                method: test.method,
                url: finalUrl,
                data: bodyString,
                headers: {
                    ...headers,
                    // User agent standar Android
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
                },
                validateStatus: () => true
            });

            console.log(`✅ [${res.status}] STATUS`);
            console.log('Response:', JSON.stringify(res.data, null, 2));

        } catch (error) {
            console.error(`❌ ERROR: ${error.message}`);
            if (error.response) {
                console.log('Response Data:', error.response.data);
            }
        }
    }
}

runTests();
