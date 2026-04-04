import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * 🔐 ADVANCED SIGNATURE GENERATOR
 * Implementasi signature RSA-SHA256 untuk DramaBox API
 * Berdasarkan reverse engineering dari APK
 */

class DramaBoxSignatureGenerator {
    constructor() {
        // Load private key jika ada
        this.privateKey = this.loadPrivateKey();

        // Device identifiers (bisa diganti sesuai kebutuhan)
        this.deviceId = 'ffffffffffffffff'; // 16 char hex
        this.androidId = 'd2d40675ca3d9e03'; // 16 char hex

        console.log('🔐 Signature Generator Initialized');
        if (this.privateKey) {
            console.log('✅ Private key loaded');
        } else {
            console.log('⚠️ Private key not found - will use alternative methods');
        }
    }

    /**
     * Load private key dari file
     */
    loadPrivateKey() {
        const possiblePaths = [
            path.join(process.cwd(), 'private_key.pem'),
            path.join(process.cwd(), 'private_key_v5.pem'),
            path.join(process.cwd(), 'backend', 'private_key.pem'),
            path.join(process.cwd(), 'backend', 'private_key_v5.pem'),
        ];

        for (const keyPath of possiblePaths) {
            if (fs.existsSync(keyPath)) {
                try {
                    const key = fs.readFileSync(keyPath, 'utf8');
                    console.log(`📁 Loaded key from: ${keyPath}`);
                    return key;
                } catch (error) {
                    console.warn(`⚠️ Failed to load ${keyPath}: ${error.message}`);
                }
            }
        }

        return null;
    }

    /**
     * Generate signature string template
     * Format: timestamp={ts}{body}{deviceId}{androidId}{token}
     */
    generateSignatureString(timestamp, body = '', token = '') {
        const bodyStr = typeof body === 'object' ? JSON.stringify(body) : String(body || '');

        const signString = `timestamp=${timestamp}${bodyStr}${this.deviceId}${this.androidId}${token}`;

        return signString;
    }

    /**
     * Generate RSA-SHA256 signature
     */
    generateRSASignature(signString) {
        if (!this.privateKey) {
            console.warn('⚠️ No private key available for RSA signing');
            return null;
        }

        try {
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(signString);
            sign.end();

            const signature = sign.sign(this.privateKey, 'base64');
            return signature;
        } catch (error) {
            console.error('❌ RSA Signature generation failed:', error.message);
            return null;
        }
    }

    /**
     * Generate MD5 signature (fallback)
     */
    generateMD5Signature(signString, secret = 'dramabox_secret') {
        const hash = crypto.createHash('md5')
            .update(signString + secret)
            .digest('hex');
        return hash;
    }

    /**
     * Generate SHA256 signature (fallback)
     */
    generateSHA256Signature(signString, secret = 'dramabox_secret') {
        const hash = crypto.createHash('sha256')
            .update(signString + secret)
            .digest('hex');
        return hash;
    }

    /**
     * Generate HMAC-SHA256 signature (fallback)
     */
    generateHMACSignature(signString, secret = 'dramabox_secret') {
        const hmac = crypto.createHmac('sha256', secret)
            .update(signString)
            .digest('hex');
        return hmac;
    }

    /**
     * Generate comprehensive headers untuk DramaBox API
     */
    generateHeaders(body = null, token = '', strategy = 'rsa') {
        const timestamp = Date.now();
        const signString = this.generateSignatureString(timestamp, body, token);

        let signature;

        switch (strategy) {
            case 'rsa':
                signature = this.generateRSASignature(signString);
                break;
            case 'md5':
                signature = this.generateMD5Signature(signString);
                break;
            case 'sha256':
                signature = this.generateSHA256Signature(signString);
                break;
            case 'hmac':
                signature = this.generateHMACSignature(signString);
                break;
            default:
                signature = this.generateRSASignature(signString) || this.generateMD5Signature(signString);
        }

        const headers = {
            // Platform identifier
            'p': 'android',

            // Signature
            'sn': signature,

            // App type
            'pline': 'ANDROID',

            // Version
            'vn': '3.1.2',
            'version': '312',

            // Device identifiers
            'device-id': this.deviceId,
            'android-id': this.androidId,

            // Timestamp
            'active-time': String(timestamp),

            // Token (jika ada)
            'tn': token || '',

            // Common headers
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'okhttp/4.9.2'
        };

        return headers;
    }

    /**
     * Generate multiple signature variations
     */
    generateAllVariations(body = null, token = '') {
        const variations = {};
        const strategies = ['rsa', 'md5', 'sha256', 'hmac'];

        for (const strategy of strategies) {
            variations[strategy] = this.generateHeaders(body, token, strategy);
        }

        return variations;
    }

    /**
     * Test signature dengan berbagai metode
     */
    async testSignatures(axios, baseUrl, endpoint, body = null) {
        console.log('\n' + '='.repeat(80));
        console.log(`🧪 TESTING SIGNATURES: ${endpoint}`);
        console.log('='.repeat(80));

        const variations = this.generateAllVariations(body);
        const results = [];

        for (const [strategy, headers] of Object.entries(variations)) {
            console.log(`\n🔸 Testing strategy: ${strategy.toUpperCase()}`);

            try {
                const url = `${baseUrl}${endpoint}`;
                const config = {
                    headers,
                    timeout: 10000,
                    validateStatus: () => true // Accept semua status untuk analisa
                };

                const response = body
                    ? await axios.post(url, body, config)
                    : await axios.get(url, config);

                console.log(`  Status: ${response.status} ${response.statusText}`);

                if (response.data) {
                    const status = response.data.status || response.data.code;
                    const message = response.data.message || response.data.msg;

                    console.log(`  Response Code: ${status}`);
                    console.log(`  Message: ${message || 'N/A'}`);

                    if (response.data.data) {
                        console.log(`  ✅ SUCCESS! Data received!`);
                        console.log(`  Data preview: ${JSON.stringify(response.data.data).substring(0, 100)}...`);
                    }
                }

                results.push({
                    strategy,
                    status: response.status,
                    success: response.status === 200 && response.data?.data,
                    response: response.data
                });

            } catch (error) {
                console.log(`  ❌ Error: ${error.message}`);
                results.push({
                    strategy,
                    status: 'error',
                    success: false,
                    error: error.message
                });
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(80));

        results.forEach(result => {
            const icon = result.success ? '✅' : '❌';
            console.log(`${icon} ${result.strategy.toUpperCase()}: ${result.status}`);
        });

        const successfulStrategy = results.find(r => r.success);
        if (successfulStrategy) {
            console.log(`\n🎉 SUCCESS! Strategy "${successfulStrategy.strategy}" worked!`);
        } else {
            console.log('\n⚠️ No successful strategy found. Try analyzing error messages.');
        }

        return results;
    }

    /**
     * Export headers untuk manual testing
     */
    exportForCURL(body = null, token = '', strategy = 'rsa') {
        const headers = this.generateHeaders(body, token, strategy);

        console.log('\n' + '='.repeat(80));
        console.log('📋 CURL COMMAND');
        console.log('='.repeat(80));
        console.log('');

        let headerString = '';
        for (const [key, value] of Object.entries(headers)) {
            headerString += ` -H "${key}: ${value}" \\\n`;
        }

        const bodyStr = body ? ` -d '${JSON.stringify(body)}' \\` : '';

        console.log(`curl -X POST \\`);
        console.log(headerString);
        console.log(bodyStr);
        console.log(`  "https://sapi.dramaboxdb.com/YOUR_ENDPOINT_HERE"`);
        console.log('');
    }

    /**
     * Debug signature generation
     */
    debugSignature(body = null, token = '') {
        const timestamp = Date.now();
        const signString = this.generateSignatureString(timestamp, body, token);

        console.log('\n' + '='.repeat(80));
        console.log('🐛 SIGNATURE DEBUG INFO');
        console.log('='.repeat(80));
        console.log('');
        console.log('📌 Input Parameters:');
        console.log(`  Timestamp: ${timestamp}`);
        console.log(`  Body: ${body ? JSON.stringify(body) : '(empty)'}`);
        console.log(`  Token: ${token || '(empty)'}`);
        console.log(`  Device ID: ${this.deviceId}`);
        console.log(`  Android ID: ${this.androidId}`);
        console.log('');
        console.log('📝 Signature String:');
        console.log(`  ${signString}`);
        console.log('');
        console.log('✍️ Generated Signatures:');

        if (this.privateKey) {
            const rsaSig = this.generateRSASignature(signString);
            console.log(`  RSA-SHA256: ${rsaSig?.substring(0, 50)}...`);
        }

        const md5Sig = this.generateMD5Signature(signString);
        console.log(`  MD5: ${md5Sig}`);

        const sha256Sig = this.generateSHA256Signature(signString);
        console.log(`  SHA256: ${sha256Sig}`);

        const hmacSig = this.generateHMACSignature(signString);
        console.log(`  HMAC-SHA256: ${hmacSig}`);
        console.log('');
    }
}

export default DramaBoxSignatureGenerator;

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const generator = new DramaBoxSignatureGenerator();

    console.log('\n📖 USAGE EXAMPLES:\n');
    console.log('1. Debug signature generation:');
    generator.debugSignature({ book_id: '42000003970' });

    console.log('\n2. Export as cURL command:');
    generator.exportForCURL({ book_id: '42000003970' });
}
