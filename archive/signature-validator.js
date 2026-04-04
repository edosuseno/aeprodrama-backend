import crypto from 'crypto';
import fs from 'fs';

/**
 * 🔍 SIGNATURE VALIDATOR & COMPARATOR
 * Tool untuk validasi signature dan compare dengan expected format
 * Berguna untuk troubleshooting kenapa signature tidak diterima
 */

console.log('='.repeat(80));
console.log('🔍 SIGNATURE VALIDATOR & COMPARATOR');
console.log('='.repeat(80));
console.log('');

class SignatureValidator {
    constructor() {
        this.privateKey = this.loadPrivateKey();
    }

    loadPrivateKey() {
        const paths = [
            './private_key.pem',
            './private_key_v5.pem',
            '../private_key.pem'
        ];

        for (const path of paths) {
            try {
                if (fs.existsSync(path)) {
                    return fs.readFileSync(path, 'utf8');
                }
            } catch (e) { }
        }

        return null;
    }

    /**
     * Validate signature string format
     */
    validateSignatureString(params) {
        const timestamp = params.timestamp || Date.now();
        const body = params.body || '';
        const deviceId = params.deviceId || 'ffffffffffffffff';
        const androidId = params.androidId || 'd2d40675ca3d9e03';
        const token = params.token || '';

        // Format seharusnya: timestamp={ts}{body}{deviceId}{androidId}{token}
        const signString = `timestamp=${timestamp}${body}${deviceId}${androidId}${token}`;

        console.log('📝 Signature String Components:');
        console.log(`  Timestamp: ${timestamp}`);
        console.log(`  Body: ${body ? body : '(empty)'}`);
        console.log(`  Device ID: ${deviceId}`);
        console.log(`  Android ID: ${androidId}`);
        console.log(`  Token: ${token || '(empty)'}`);
        console.log('');
        console.log('📄 Full Signature String:');
        console.log(`  ${signString}`);
        console.log('');
        console.log(`  Length: ${signString.length} characters`);
        console.log('');

        return signString;
    }

    /**
     * Generate and show all possible signature variations
     */
    generateAllSignatures(signString) {
        const signatures = {};

        console.log('✍️ Generated Signatures:');
        console.log('');

        // RSA-SHA256
        if (this.privateKey) {
            try {
                const sign = crypto.createSign('RSA-SHA256');
                sign.update(signString);
                sign.end();
                const rsaSig = sign.sign(this.privateKey, 'base64');
                signatures.rsa = rsaSig;
                console.log('🔐 RSA-SHA256:');
                console.log(`  ${rsaSig}`);
                console.log('');
            } catch (e) {
                console.log('❌ RSA-SHA256: Failed -', e.message);
                console.log('');
            }
        } else {
            console.log('⚠️ RSA-SHA256: No private key loaded');
            console.log('');
        }

        // MD5
        const md5 = crypto.createHash('md5').update(signString).digest('hex');
        signatures.md5 = md5;
        console.log('🔒 MD5:');
        console.log(`  ${md5}`);
        console.log('');

        // SHA256
        const sha256 = crypto.createHash('sha256').update(signString).digest('hex');
        signatures.sha256 = sha256;
        console.log('🔒 SHA256:');
        console.log(`  ${sha256}`);
        console.log('');

        // SHA256 Base64
        const sha256b64 = crypto.createHash('sha256').update(signString).digest('base64');
        signatures.sha256_base64 = sha256b64;
        console.log('🔒 SHA256 (Base64):');
        console.log(`  ${sha256b64}`);
        console.log('');

        return signatures;
    }

    /**
     * Compare dengan signature yang expected (dari intercept)
     */
    compareWithExpected(generated, expected) {
        console.log('🔍 COMPARISON:');
        console.log('');

        console.log('Expected Signature:');
        console.log(`  ${expected}`);
        console.log('');

        let found = false;

        for (const [method, signature] of Object.entries(generated)) {
            if (signature === expected) {
                console.log(`✅ MATCH FOUND! Method: ${method.toUpperCase()}`);
                console.log(`  Signature matches using ${method} algorithm`);
                found = true;
                break;
            }
        }

        if (!found) {
            console.log('❌ NO MATCH FOUND');
            console.log('');
            console.log('💡 Possible reasons:');
            console.log('  1. Wrong private key');
            console.log('  2. Wrong signature string format');
            console.log('  3. Wrong timestamp');
            console.log('  4. Body not minified correctly');
            console.log('  5. Different encoding (UTF-8 vs others)');
            console.log('');

            // Show similarity scores
            console.log('📊 Similarity Analysis:');
            for (const [method, signature] of Object.entries(generated)) {
                const similarity = this.calculateSimilarity(signature, expected);
                console.log(`  ${method}: ${similarity.toFixed(2)}% similar`);
            }
        }

        console.log('');
    }

    /**
     * Calculate simple similarity percentage
     */
    calculateSimilarity(str1, str2) {
        const len = Math.max(str1.length, str2.length);
        let matches = 0;

        for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
            if (str1[i] === str2[i]) matches++;
        }

        return (matches / len) * 100;
    }

    /**
     * Validate headers format
     */
    validateHeaders(headers) {
        console.log('📋 HEADER VALIDATION:');
        console.log('');

        const requiredHeaders = {
            'p': 'Platform (should be "android")',
            'sn': 'Signature',
            'pline': 'App type (should be "ANDROID")',
            'vn': 'Version name (e.g., "3.1.2")',
            'version': 'Version code (e.g., "312")',
            'device-id': 'Device ID (16 char hex)',
            'android-id': 'Android ID (16 char hex)',
            'active-time': 'Timestamp (milliseconds)'
        };

        let allPresent = true;

        for (const [key, description] of Object.entries(requiredHeaders)) {
            if (headers[key]) {
                console.log(`✅ ${key}: ${headers[key]}`);
                console.log(`   (${description})`);
            } else {
                console.log(`❌ ${key}: MISSING!`);
                console.log(`   (${description})`);
                allPresent = false;
            }
            console.log('');
        }

        if (allPresent) {
            console.log('✅ All required headers present');
        } else {
            console.log('⚠️ Some headers are missing!');
        }

        console.log('');
    }

    /**
     * Test dengan real request yang sudah di-intercept
     */
    testWithInterceptedRequest(intercepted) {
        console.log('='.repeat(80));
        console.log('🔬 TESTING WITH INTERCEPTED REQUEST');
        console.log('='.repeat(80));
        console.log('');

        // Extract info dari intercepted request
        const timestamp = intercepted.headers['active-time'] || intercepted.timestamp;
        const body = intercepted.body ? JSON.stringify(intercepted.body) : '';
        const deviceId = intercepted.headers['device-id'] || 'ffffffffffffffff';
        const androidId = intercepted.headers['android-id'] || 'd2d40675ca3d9e03';
        const token = intercepted.headers['tn'] || '';
        const expectedSignature = intercepted.headers['sn'];

        // Generate signature string
        const signString = this.validateSignatureString({
            timestamp,
            body,
            deviceId,
            androidId,
            token
        });

        // Generate all signatures
        const generated = this.generateAllSignatures(signString);

        // Compare
        if (expectedSignature) {
            this.compareWithExpected(generated, expectedSignature);
        }

        // Validate headers
        if (intercepted.headers) {
            this.validateHeaders(intercepted.headers);
        }

        console.log('='.repeat(80));
    }
}

// ===== USAGE EXAMPLES =====

const validator = new SignatureValidator();

console.log('📖 CONTOH PENGGUNAAN:\n');

// Example 1: Generate signature untuk request baru
console.log('─'.repeat(80));
console.log('EXAMPLE 1: Generate Signature untuk Request Baru');
console.log('─'.repeat(80));
console.log('');

const signString1 = validator.validateSignatureString({
    timestamp: 1706943600000,
    body: JSON.stringify({ book_id: '42000003970', page_num: 1, page_size: 20 }),
    deviceId: 'ffffffffffffffff',
    androidId: 'd2d40675ca3d9e03',
    token: ''
});

const sigs1 = validator.generateAllSignatures(signString1);

console.log('💡 Gunakan salah satu signature di atas untuk header "sn"');
console.log('');

// Example 2: Validate signature yang sudah ada (dari intercept)
console.log('─'.repeat(80));
console.log('EXAMPLE 2: Validasi Signature dari Intercepted Request');
console.log('─'.repeat(80));
console.log('');

// Contoh data dari mitmproxy atau browser DevTools
const interceptedRequest = {
    url: 'https://sapi.dramaboxdb.com/drama-box/chapter/list',
    headers: {
        'p': 'android',
        'sn': 'SIGNATURE_DARI_INTERCEPT_TARUH_SINI',
        'pline': 'ANDROID',
        'vn': '3.1.2',
        'version': '312',
        'device-id': 'ffffffffffffffff',
        'android-id': 'd2d40675ca3d9e03',
        'active-time': '1706943600000',
        'tn': ''
    },
    body: {
        book_id: '42000003970',
        page_num: 1,
        page_size: 20
    }
};

console.log('📝 Untuk test dengan intercepted request:');
console.log('   1. Intercept request dari app asli dengan mitmproxy');
console.log('   2. Copy headers dan body ke object interceptedRequest');
console.log('   3. Uncomment baris berikut:\n');
console.log('// validator.testWithInterceptedRequest(interceptedRequest);');
console.log('');

// Example 3: Export untuk manual testing
console.log('─'.repeat(80));
console.log('EXAMPLE 3: Export untuk Manual Testing (Postman/Insomnia)');
console.log('─'.repeat(80));
console.log('');

const testParams = {
    timestamp: Date.now(),
    body: JSON.stringify({ book_id: '42000003970' }),
    deviceId: 'ffffffffffffffff',
    androidId: 'd2d40675ca3d9e03',
    token: ''
};

const testSignString = validator.validateSignatureString(testParams);
const testSigs = validator.generateAllSignatures(testSignString);

console.log('📋 Copy config ini ke Postman/Insomnia:');
console.log('');
console.log('URL: https://sapi.dramaboxdb.com/drama-box/chapter/list');
console.log('Method: POST');
console.log('');
console.log('Headers:');
console.log(JSON.stringify({
    'p': 'android',
    'sn': testSigs.rsa || testSigs.md5, // Use RSA if available, else MD5
    'pline': 'ANDROID',
    'vn': '3.1.2',
    'version': '312',
    'device-id': testParams.deviceId,
    'android-id': testParams.androidId,
    'active-time': String(testParams.timestamp),
    'tn': '',
    'Content-Type': 'application/json'
}, null, 2));
console.log('');
console.log('Body:');
console.log(testParams.body);
console.log('');

console.log('='.repeat(80));
console.log('✅ VALIDATOR READY TO USE');
console.log('='.repeat(80));
console.log('');
console.log('💡 TIPS:');
console.log('  - Untuk compare dengan intercepted request, edit interceptedRequest object');
console.log('  - Signature harus match 100% character-by-character');
console.log('  - Timestamp harus sama persis dengan yang di signature string');
console.log('  - Body harus minified (no spaces) di signature string');
console.log('');

export default SignatureValidator;
