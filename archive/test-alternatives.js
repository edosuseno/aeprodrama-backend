import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

console.log('🔬 TESTING ALTERNATIVE CONFIGURATIONS');
console.log('Mencoba berbagai kombinasi Base URL, Device ID, dan Headers\n');

// Load private key
const KEY_PATH = path.join(process.cwd(), 'private_key.pem');
const privateKey = fs.readFileSync(KEY_PATH, 'utf8');

// Alternative base URLs (tanpa geo-blocking mungkin?)
const BASE_URLS = [
    'https://sapi.dramaboxdb.com/drama-box',
    'https://api.dramaboxdb.com/drama-box',
    'https://api.dramabox.com/drama-box',
    'https://h5api.dramaboxdb.com/drama-box',
    'https://app.dramaboxdb.com/drama-box',
    'https://m.dramaboxdb.com/drama-box',
    // Try without /drama-box prefix
    'https://sapi.dramaboxdb.com',
    'https://api.dramaboxdb.com',
];

// Different device IDs (mungkin ada yang sudah registered?)
const DEVICE_IDS = [
    '9774d56d682e549c',        // Current
    'ffffffffffffffff',        // From documentation
    'd2d40675ca3d9e03',        // Alternative
    crypto.randomUUID().replace(/-/g, '').substring(0, 16), // Random
    '0000000000000000',        // Zero
    '1234567890abcdef',        // Sequential
];

// Test endpoints
const TEST_ENDPOINTS = [
    { path: '/he001/rank', body: { rankType: 3 } },
    { path: '/ap001/bootstrap', body: { distinctId: 'test' } },
    { path: '/chapter/list', body: { book_id: '42000003970' } },
];

/**
 * Generate signature
 */
function generateSignature(content, timestamp, deviceId, androidId, token = '') {
    const signString = `timestamp=${timestamp}${content}${deviceId}${androidId}${token}`;

    try {
        const sign = crypto.createSign('SHA256');
        sign.update(signString);
        sign.end();
        return sign.sign(privateKey, 'base64');
    } catch (e) {
        return null;
    }
}

/**
 * Generate headers
 */
function generateHeaders(content, deviceId, androidId, platformVariant = 'android') {
    const timestamp = Date.now().toString();
    const sig = generateSignature(content, timestamp, deviceId, androidId);

    return {
        'p': platformVariant,
        'sn': sig,
        'pline': 'ANDROID',
        'vn': '3.1.2',
        'version': '312',
        'device-id': deviceId,
        'android-id': androidId,
        'active-time': timestamp,
        'tn': '',
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'okhttp/4.9.1',
    };
}

/**
 * Test single combination
 */
async function testCombination(baseUrl, endpoint, deviceId) {
    const androidId = deviceId; // Use same for simplicity
    const bodyString = JSON.stringify(endpoint.body);
    const headers = generateHeaders(bodyString, deviceId, androidId);
    const timestamp = Date.now();

    const url = `${baseUrl}${endpoint.path}?timestamp=${timestamp}`;

    try {
        const res = await axios.post(url, endpoint.body, {
            headers,
            timeout: 8000,
            validateStatus: () => true
        });

        const status = res.data.status;
        const message = res.data.message;

        // Success!
        if (status === 0 || res.data.success === true || (res.data.data && status !== 100)) {
            console.log('\n' + '🎉'.repeat(40));
            console.log('💥 JACKPOT! KOMBINASI BERHASIL! 💥');
            console.log('🎉'.repeat(40) + '\n');
            console.log(`✅ Base URL: ${baseUrl}`);
            console.log(`✅ Endpoint: ${endpoint.path}`);
            console.log(`✅ Device ID: ${deviceId}`);
            console.log(`✅ Android ID: ${androidId}`);
            console.log('\n📦 RESPONSE:');
            console.log(JSON.stringify(res.data, null, 2));
            console.log('\n🔑 HEADERS:');
            console.log(JSON.stringify(headers, null, 2));

            // Save config
            const config = {
                success: true,
                timestamp: new Date().toISOString(),
                baseUrl,
                endpoint: endpoint.path,
                deviceId,
                androidId,
                headers,
                response: res.data
            };
            fs.writeFileSync(`success-${Date.now()}.json`, JSON.stringify(config, null, 2));
            console.log('\n💾 Config saved!');

            return true;
        }

        // Log different statuses
        if (status === 100) {
            process.stdout.write('⚪'); // Internal error
        } else if (status === 1) {
            process.stdout.write('🔴'); // Invalid param
        } else if (status === 404) {
            process.stdout.write('⚫'); // Not found
        } else {
            console.log(`\n🟡 Unexpected status ${status}: ${message}`);
            console.log(`   URL: ${baseUrl}${endpoint.path}`);
            console.log(`   Device: ${deviceId.substring(0, 8)}...`);
        }

    } catch (e) {
        if (e.response?.status === 404) {
            process.stdout.write('⚫'); // URL not found
        } else if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED') {
            process.stdout.write('⛔'); // Can't connect
        } else {
            process.stdout.write('❌'); // Other error
        }
    }

    return false;
}

/**
 * Test with platform variations
 */
async function testPlatformVariations(baseUrl, endpoint, deviceId) {
    const platforms = ['android', 'h5', 'web', 'ios'];

    for (const platform of platforms) {
        const androidId = deviceId;
        const bodyString = JSON.stringify(endpoint.body);
        const timestamp = Date.now().toString();
        const sig = generateSignature(bodyString, timestamp, deviceId, androidId);

        const headers = {
            'p': platform,
            'sn': sig,
            'pline': platform === 'ios' ? 'IOS' : 'ANDROID',
            'vn': '3.1.2',
            'version': '312',
            'device-id': deviceId,
            'android-id': androidId,
            'active-time': timestamp,
            'tn': '',
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': platform === 'h5' ? 'Mozilla/5.0' : 'okhttp/4.9.1',
        };

        const url = `${baseUrl}${endpoint.path}?timestamp=${timestamp}`;

        try {
            const res = await axios.post(url, endpoint.body, {
                headers,
                timeout: 5000,
                validateStatus: () => true
            });

            if (res.data.status === 0 || res.data.success === true) {
                console.log(`\n\n✅ Success with platform: ${platform}`);
                return true;
            }
        } catch (e) { }
    }

    return false;
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('📊 Configuration:');
    console.log(`   Base URLs: ${BASE_URLS.length}`);
    console.log(`   Device IDs: ${DEVICE_IDS.length}`);
    console.log(`   Endpoints: ${TEST_ENDPOINTS.length}`);
    console.log(`   Total combinations: ${BASE_URLS.length * DEVICE_IDS.length * TEST_ENDPOINTS.length}`);
    console.log('');
    console.log('Legend:');
    console.log('  ⚪ = Internal Error (status 100)');
    console.log('  🔴 = Invalid Parameter (status 1)');
    console.log('  ⚫ = Not Found (404)');
    console.log('  ⛔ = Cannot Connect');
    console.log('  ❌ = Other Error');
    console.log('');
    console.log('Starting tests...\n');

    let tested = 0;

    for (const baseUrl of BASE_URLS) {
        console.log(`\n🌐 Testing: ${baseUrl}`);

        for (const endpoint of TEST_ENDPOINTS) {
            process.stdout.write(`  ${endpoint.path}: `);

            for (const deviceId of DEVICE_IDS) {
                const success = await testCombination(baseUrl, endpoint, deviceId);
                if (success) return; // Stop if found

                tested++;

                // Delay untuk avoid rate limit
                await new Promise(r => setTimeout(r, 100));
            }

            console.log(''); // New line after endpoint
        }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total combinations tested: ${tested}`);
    console.log('');
    console.log('⚠️  No successful combination found.');
    console.log('');
    console.log('💡 RECOMMENDATIONS:');
    console.log('  1. Try dengan VPN dari region lain (USA, UK, India)');
    console.log('  2. Download & decompile APK terbaru untuk cari clue');
    console.log('  3. Coba gunakan tool baru: node ultimate-tester.js brute');
    console.log('  4. Kemungkinan besar geo-blocking - perlu VPN');
    console.log('');
}

// Run!
console.log('✅ Private key loaded\n');
runTests().catch(console.error);
