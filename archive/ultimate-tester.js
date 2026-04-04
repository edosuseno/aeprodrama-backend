import axios from 'axios';
import AdvancedSignatureGenerator from './src/utils/AdvancedSignatureGenerator.js';
import fs from 'fs';

console.log('='.repeat(80));
console.log('⚔️  ULTIMATE DRAMABOX API CRACKER  ⚔️');
console.log('Menggunakan hasil analisa APK + Advanced Signatures');
console.log('='.repeat(80));
console.log('');

// Load hasil analisa APK jika ada
let apkAnalysis = null;
try {
    const analysisPath = './apk-analysis-result.json';
    if (fs.existsSync(analysisPath)) {
        apkAnalysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
        console.log('✅ Loaded APK analysis results');
    }
} catch (error) {
    console.log('⚠️ No APK analysis file found, using defaults');
}

// Initialize signature generator
const sigGen = new AdvancedSignatureGenerator();

// Target configuration
const TARGETS = {
    baseUrls: apkAnalysis?.urls?.length > 0 ? apkAnalysis.urls : [
        'https://sapi.dramaboxdb.com',
        'https://api.dramaboxdb.com',
        'https://api.dramabox.com',
        'https://h5api.dramaboxdb.com',
    ],

    endpoints: apkAnalysis?.endpoints?.length > 0 ? apkAnalysis.endpoints : [
        // Chapter/Episode endpoints
        '/drama-box/chapter/list',
        '/drama-box/box/book/chapter/list',
        '/drama-box/box/chapter/list',
        '/he001/chapter/list',

        // Book/Detail endpoints
        '/drama-box/book/detail',
        '/drama-box/box/book/detail',
        '/he001/book/detail',

        // List/Ranking endpoints
        '/drama-box/book/list',
        '/he001/rank',
        '/he001/theater',

        // Bootstrap/Config
        '/ap001/bootstrap',
        '/ap001/confload',
    ]
};

const TEST_BOOK_ID = '42000003970';
const TEST_PAYLOADS = [
    // Simple variations
    { book_id: TEST_BOOK_ID },
    { bookId: TEST_BOOK_ID },
    { id: TEST_BOOK_ID },

    // With pagination
    { book_id: TEST_BOOK_ID, page_num: 1, page_size: 20 },
    { book_id: TEST_BOOK_ID, pageNum: 1, pageSize: 20 },

    // With platform
    { book_id: TEST_BOOK_ID, platform: 'android' },
    { book_id: TEST_BOOK_ID, platform: 'h5' },

    // Ranking payload
    { rankType: 3 },

    // Bootstrap payload
    { distinctId: sigGen.deviceId },

    // Empty untuk error probing
    {}
];

/**
 * Test single combination
 */
async function testCombination(baseUrl, endpoint, payload, method = 'POST') {
    const url = baseUrl + endpoint;

    // Generate semua variasi signature
    const signatureVariations = sigGen.generateAllVariations(payload);

    for (const [strategy, headers] of Object.entries(signatureVariations)) {
        try {
            const config = {
                headers,
                timeout: 8000,
                validateStatus: () => true // Accept all status for analysis
            };

            const response = method === 'POST'
                ? await axios.post(url, payload, config)
                : await axios.get(url, { ...config, params: payload });

            // Analyze response
            const status = response.status;
            const data = response.data;

            // Filter out common errors
            if (data?.message || data?.msg) {
                const message = data.message || data.msg;

                // Skip common invalid parameter errors
                if (message.includes('非法') || message.includes('Invalid') || message.includes('Illegal')) {
                    return { skip: true };
                }

                // Log interesting errors
                if (status === 401 || status === 403) {
                    console.log(`🔐 Auth Error [${strategy}]: ${url}`);
                    console.log(`   Message: ${message}`);
                    return { interesting: true, status, message, strategy };
                }
            }

            // Check for success
            if (status === 200 && data?.data) {
                console.log('');
                console.log('🎉'.repeat(40));
                console.log('💥 JACKPOT! WE FOUND IT! 💥');
                console.log('🎉'.repeat(40));
                console.log('');
                console.log(`✅ URL: ${url}`);
                console.log(`✅ Method: ${method}`);
                console.log(`✅ Strategy: ${strategy}`);
                console.log(`✅ Payload: ${JSON.stringify(payload)}`);
                console.log('');
                console.log('📦 Response:');
                console.log(JSON.stringify(data, null, 2).substring(0, 500));
                console.log('');
                console.log('🔑 Headers used:');
                console.log(JSON.stringify(headers, null, 2));
                console.log('');

                // Save successful config
                saveSuccessfulConfig(baseUrl, endpoint, method, payload, strategy, headers, data);

                return { success: true, data, strategy };
            }

            // Log unexpected statuses
            if (status !== 404 && status !== 500) {
                console.log(`📍 Status ${status} [${strategy}]: ${url} - ${data?.message || ''}`);
            }

        } catch (error) {
            // Silent fail untuk connection errors
            if (!error.response) {
                return { error: true };
            }
        }
    }

    return { tested: true };
}

/**
 * Save successful configuration
 */
function saveSuccessfulConfig(baseUrl, endpoint, method, payload, strategy, headers, response) {
    const config = {
        foundAt: new Date().toISOString(),
        baseUrl,
        endpoint,
        method,
        payload,
        strategy,
        headers,
        sampleResponse: response,
        deviceId: sigGen.deviceId,
        androidId: sigGen.androidId
    };

    const filename = `successful-config-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(config, null, 2));

    console.log(`💾 Configuration saved to: ${filename}`);
}

/**
 * Brute force attack
 */
async function bruteForceAttack() {
    console.log('🚀 Starting brute force attack...');
    console.log(`📊 Testing ${TARGETS.baseUrls.length} base URLs`);
    console.log(`📊 Testing ${TARGETS.endpoints.length} endpoints`);
    console.log(`📊 Testing ${TEST_PAYLOADS.length} payloads`);
    console.log(`📊 Testing 4 signature strategies per combination`);
    console.log('');

    const totalTests = TARGETS.baseUrls.length * TARGETS.endpoints.length * TEST_PAYLOADS.length * 4 * 2; // x2 for GET/POST
    console.log(`⚡ Total combinations: ~${totalTests.toLocaleString()}`);
    console.log('');
    console.log('⏱️ This may take several minutes...');
    console.log('💡 Press Ctrl+C to stop if you find what you need');
    console.log('');
    console.log('='.repeat(80));

    let tested = 0;
    let skipped = 0;
    let interesting = 0;

    // Test each combination
    for (const baseUrl of TARGETS.baseUrls) {
        console.log(`\n🌐 Testing base URL: ${baseUrl}`);

        for (const endpoint of TARGETS.endpoints) {
            process.stdout.write(`\n  🎯 ${endpoint} `);

            for (const payload of TEST_PAYLOADS) {
                // Try POST
                const postResult = await testCombination(baseUrl, endpoint, payload, 'POST');
                if (postResult.success) {
                    return; // Stop on success
                }
                if (postResult.skip) skipped++;
                if (postResult.interesting) interesting++;
                tested++;

                // Try GET untuk beberapa endpoint
                if (!endpoint.includes('bootstrap') && !endpoint.includes('rank')) {
                    const getResult = await testCombination(baseUrl, endpoint, payload, 'GET');
                    if (getResult.success) {
                        return; // Stop on success
                    }
                    if (getResult.skip) skipped++;
                    if (getResult.interesting) interesting++;
                    tested++;
                }

                // Progress indicator
                if (tested % 20 === 0) {
                    process.stdout.write('.');
                }
            }
        }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('📊 ATTACK SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total tested: ${tested}`);
    console.log(`Skipped (invalid params): ${skipped}`);
    console.log(`Interesting (auth errors): ${interesting}`);
    console.log('');

    if (interesting > 0) {
        console.log('💡 Found some authentication errors - you might be close!');
        console.log('📝 Review the logged auth errors above for clues.');
    } else {
        console.log('⚠️ No promising results found.');
        console.log('');
        console.log('🔍 NEXT STEPS:');
        console.log('  1. Decompile APK terbaru dan jalankan apk-analyzer.js');
        console.log('  2. Cari private key yang benar di APK');
        console.log('  3. Analisa network traffic dengan mitmproxy');
        console.log('  4. Coba intercept request langsung dari aplikasi asli');
    }
    console.log('');
}

/**
 * Quick test mode - coba endpoint paling promising
 */
async function quickTest() {
    console.log('⚡ QUICK TEST MODE');
    console.log('Testing most promising endpoints...\n');

    const quickTargets = [
        {
            url: 'https://sapi.dramaboxdb.com/drama-box/chapter/list',
            payload: { book_id: TEST_BOOK_ID, page_num: 1, page_size: 20 }
        },
        {
            url: 'https://sapi.dramaboxdb.com/he001/rank',
            payload: { rankType: 3 }
        },
        {
            url: 'https://sapi.dramaboxdb.com/ap001/bootstrap',
            payload: { distinctId: sigGen.deviceId }
        }
    ];

    for (const target of quickTargets) {
        const [baseUrl, endpoint] = target.url.split('/').reduce((acc, part, i, arr) => {
            if (i < 3) acc[0] += (i > 0 ? '/' : '') + part;
            else acc[1] += '/' + part;
            return acc;
        }, ['', '']);

        console.log(`\n🎯 Testing: ${target.url}`);
        await sigGen.testSignatures(axios, baseUrl, endpoint, target.payload);
    }
}

/**
 * Debug mode - show signature details
 */
function debugMode() {
    console.log('🐛 DEBUG MODE\n');

    const testPayload = { book_id: TEST_BOOK_ID, page_num: 1, page_size: 20 };

    sigGen.debugSignature(testPayload);
    sigGen.exportForCURL(testPayload);

    console.log('\n✅ Debug information generated above');
    console.log('💡 Use the cURL command to test manually');
}

// ===== MAIN EXECUTION =====

async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'help';

    switch (mode) {
        case 'brute':
        case 'bruteforce':
            await bruteForceAttack();
            break;

        case 'quick':
        case 'test':
            await quickTest();
            break;

        case 'debug':
            debugMode();
            break;

        default:
            console.log('📖 USAGE:');
            console.log('');
            console.log('  node ultimate-tester.js [mode]');
            console.log('');
            console.log('🎯 MODES:');
            console.log('  brute    - Brute force semua kombinasi (lambat tapi teliti)');
            console.log('  quick    - Test endpoint paling promising saja (cepat)');
            console.log('  debug    - Show signature generation details');
            console.log('');
            console.log('📝 EXAMPLES:');
            console.log('  node ultimate-tester.js quick');
            console.log('  node ultimate-tester.js brute');
            console.log('  node ultimate-tester.js debug');
            console.log('');
            console.log('💡 TIPS:');
            console.log('  - Jalankan apk-analyzer.js dulu untuk hasil optimal');
            console.log('  - Mode "quick" bagus untuk testing awal');
            console.log('  - Mode "brute" untuk exhaustive testing');
            console.log('  - Mode "debug" untuk troubleshooting signature');
            console.log('');
    }
}

main().catch(console.error);
