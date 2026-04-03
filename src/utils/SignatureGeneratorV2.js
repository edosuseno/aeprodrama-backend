
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SignatureGeneratorV2 {
    constructor() {
        this.privateKeyPath = path.join(__dirname, '../../private_key_v5.pem');
        this.privateKey = null;
        this.loadKey();

        // Mock Device Info - using the successful ones or generating new ones
        this.deviceId = 'ffffffffd2d40675ffffffffca3d9e03'; // Removed hyphens
        this.androidId = 'd2d40675ca3d9e03'; // Example

        // App Start Time for active-time calculation
        this.appStartTime = Date.now() - 15000; // Started 15s ago
    }

    loadKey() {
        try {
            if (fs.existsSync(this.privateKeyPath)) {
                this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
                console.log('✅ [SigGen V2] Private Key loaded.');
            } else {
                console.error('❌ [SigGen V2] Private Key NOT found at:', this.privateKeyPath);
            }
        } catch (e) {
            console.error('❌ [SigGen V2] Error loading key:', e.message);
        }
    }

    /**
     * Generates the signature based on the V3/V5 logic found in decompiled code.
     * Logic: SHA256WithRSA( "timestamp=" + ts + body + deviceId + androidId + token )
     */
    generate(bodyString, timestampMs, token = '') {
        if (!this.privateKey) {
            console.error('❌ [SigGen V2] Cannot generate signature: No Private Key');
            return null;
        }

        // 1. Construct the signing string
        // Logic from lb.dramabox.java:
        // sb.append("timestamp=")
        // sb.append(timestamp)
        // sb.append(bodyString) (if POST and not multipart)
        // sb.append(headers.get("device-id"))
        // sb.append(headers.get("android-id"))
        // sb.append(headers.get("tn"))

        let signString = `timestamp=${timestampMs}`;
        if (bodyString) {
            signString += bodyString;
        }

        signString += (this.deviceId || '');
        signString += (this.androidId || '');
        signString += (token || '');

        // console.log('📝 [SigGen V2] Signing String:', signString);

        // 2. Sign with SHA256withRSA
        try {
            const sign = crypto.createSign('SHA256');
            sign.update(signString);
            sign.end();
            const signature = sign.sign(this.privateKey, 'base64');
            return signature;
        } catch (e) {
            console.error('❌ [SigGen V2] Signing error:', e.message);
            return null;
        }
    }

    getHeaders(bodyString = '', token = '') {
        const timestampMs = Date.now().toString();
        const sig = this.generate(bodyString, timestampMs, token);
        const activeTime = (Date.now() - this.appStartTime).toString();

        const headers = {
            'sn': sig,
            'active-time': activeTime,
            'device-id': this.deviceId,
            'android-id': this.androidId,

            // Standard headers (mimicking okhttp/retrofit)
            'Content-Type': 'application/json; charset=UTF-8',
            // 'User-Agent': handled in axios

            // Add mimic headers
            'vn': '3.1.2',
            'version': '312',
            'package-name': 'com.storymatrix.drama',
            'brand': 'google',
            'md': 'Pixel 4',
            'mf': 'Google',
            // 'pline': 'Android', // Removed as it caused trouble
            'cid': 'CODE00001',
            'language': 'en',
            'locale': 'en_US',
            'ov': 'android33',
            'time-zone': 'GMT+08:00',
            'tz': '+0800'
        };

        if (token) {
            headers['tn'] = token;
        }

        return {
            headers: headers,
            query: {
                timestamp: timestampMs
            }
        };
    }
}

export default new SignatureGeneratorV2();
