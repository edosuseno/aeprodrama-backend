import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lokasi Private Key yang sudah kita crack tadi
const KEY_PATH = path.join(__dirname, '../../private_key.pem');

class SignatureGenerator {
    constructor() {
        try {
            this.privateKey = fs.readFileSync(KEY_PATH, 'utf8');
            console.log('✅ [SigGen V2] Private Key loaded.');
        } catch (e) {
            console.error('❌ [SigGen V2] Failed to load key!', e.message);
            this.privateKey = null;
        }

        // Device Info (Bisa di-rotate)
        this.deviceId = '9774d56d682e549c';
        this.androidId = '9774d56d682e549c';
    }

    /**
     * Generate Signature V2 (Sesuai z4/dramabox.java)
     * Rumus: "timestamp=" + timeMs + content + DeviceID + AndroidID + Token
     */
    generate(content, timestampMs, token = '') {
        if (!this.privateKey) return null;

        const safeContent = content || '';
        const safeToken = token || '';

        // Perhatikan string "timestamp=" di awal!
        const signString = `timestamp=${timestampMs}${safeContent}${this.deviceId}${this.androidId}${safeToken}`;

        // Debug untuk menyamakan dengan server
        // console.log('📝 [SigData] Raw String:', signString);

        try {
            const sign = crypto.createSign('SHA256');
            sign.update(signString);
            sign.end();
            return sign.sign(this.privateKey, 'base64');
        } catch (e) {
            console.error('❌ [SigGen] Signing error:', e.message);
            return null;
        }
    }

    /**
     * Helper Headers V2 (UPDATED - Added Mandatory Headers)
     * Return: Headers Object + Query String (timestamp)
     */
    getHeaders(content = '', token = '') {
        const timestampMs = Date.now().toString();
        const sig = this.generate(content, timestampMs, token);

        return {
            headers: {
                // MANDATORY HEADERS (dari DIRECT_API_REVERSE_ENGINEERING.md)
                'p': 'android',                // Platform - WAJIB!
                'sn': sig,                     // Signature - WAJIB!
                'pline': 'ANDROID',            // App Type - WAJIB!
                'vn': '3.1.2',                 // Version Name - WAJIB!
                'version': '312',              // Version Code - WAJIB!
                'device-id': this.deviceId,    // Device ID - WAJIB!
                'android-id': this.androidId,  // Android ID - WAJIB!
                'active-time': timestampMs,    // Timestamp - WAJIB! (gunakan timestamp asli, bukan 12500)
                'tn': token || '',             // Token (kosong jika belum login)

                // HEADERS TAMBAHAN
                'Content-Type': 'application/json; charset=utf-8',
                'User-Agent': 'okhttp/4.9.1',
                'package-name': 'com.storymatrix.drama',
                'brand': 'google',
                'md': 'Pixel 4'
            },
            query: {
                timestamp: timestampMs
            }
        };
    }
}

export default new SignatureGenerator();
