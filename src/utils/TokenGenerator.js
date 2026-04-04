import CryptoJS from 'crypto-js';

/**
 * TOKEN & SIGNATURE GENERATOR
 * Untuk generate signature dan token otomatis seperti yang dibutuhkan API
 */
class TokenGenerator {
    constructor() {
        const cleanEnv = (key, def) => (process.env[key] || def || '').replace(/\r\n|\r|\n/g, '').trim();

        // Secret keys yang biasa dipakai platform drama
        // Jika Bapak punya key asli, bisa dimasukkan di sini
        this.secretKeys = {
            reelshort: cleanEnv('REELSHORT_KEY', 'reelshort_secret_2024'),
            dramabox: cleanEnv('DRAMABOX_KEY', 'dramabox_api_key'),
            default: 'universal_key_2024'
        };

        this.userAgents = [
            'Dramabox/1.6.0 (Android 12; Pixel 6 Build/SD1A.210817.036)',
            'Dramabox/1.5.5 (iPhone; iOS 15.4.1; Scale/3.00)',
            'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
        ];
    }

    /**
     * Generate timestamp dalam format yang dibutuhkan
     */
    getTimestamp() {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * Generate random nonce/request ID
     */
    generateNonce(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let nonce = '';
        for (let i = 0; i < length; i++) {
            nonce += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return nonce;
    }

    /**
     * Generate MD5 hash
     */
    generateMD5(data) {
        return CryptoJS.MD5(data).toString();
    }

    /**
     * Generate HMAC-SHA256 signature (Lebih aman & sering dipakai)
     */
    generateHMAC(data, key) {
        return CryptoJS.HmacSHA256(data, key).toString();
    }

    /**
     * Generate signature untuk Dramabox (Versi APP)
     */
    generateDramaboxSignature(params = {}, timestamp) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const signString = `${sortedParams}&timestamp=${timestamp}&key=${this.secretKeys.dramabox}`;
        return this.generateMD5(signString); // Beberapa aggregator pakai MD5 dari string ini
    }

    /**
     * Generate complete headers untuk request (ENHANCED)
     */
    generateRequestHeaders(platform = 'default', customParams = {}) {
        const timestamp = this.getTimestamp();
        const nonce = this.generateNonce(12);
        const deviceId = this.generateMD5(nonce + timestamp);
        const ua = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];

        // Generate realistic session token
        const sessionToken = this.generateMD5(`session_${deviceId}_${timestamp}`);
        const userId = `user_${this.generateMD5(deviceId).substring(0, 8)}`;

        const baseHeaders = {
            'User-Agent': ua,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Content-Type': 'application/json',
            'X-Device-Id': deviceId,
            'X-Timestamp': timestamp.toString(),
            'X-Nonce': nonce,
            'X-Platform': 'android',
            'X-App-Version': '1.6.0',
            'X-OS-Version': '12',
            'X-Device-Model': 'Pixel 6',
            'X-Session-Token': sessionToken,
            'X-User-Id': userId,
            'X-Trace-Id': this.generateNonce(32),
            'X-Request-Id': this.generateNonce(16)
        };

        if (platform === 'dramabox') {
            // Enhanced signature dengan lebih banyak parameter
            const signParams = {
                ...customParams,
                deviceId,
                userId,
                timestamp: timestamp.toString(),
                version: '1.6.0'
            };

            baseHeaders['X-Signature'] = this.generateDramaboxSignature(signParams, timestamp);
            baseHeaders['Authorization'] = `Bearer ${this.generateMD5(deviceId + userId + this.secretKeys.dramabox)}`;

            // Tambahan header untuk bypass
            baseHeaders['X-Is-Premium'] = 'true';
            baseHeaders['X-Unlock-Token'] = this.generateMD5(`unlock_${timestamp}_${deviceId}`);
        }

        return baseHeaders;
    }
}

export default new TokenGenerator();
