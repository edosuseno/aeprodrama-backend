import BaseProvider from './BaseProvider.js';
import axios from 'axios';
import CryptoJS from 'crypto-js';

/**
 * DIRECT DRAMABOX API SERVICE
 * Mencoba hit langsung ke API official DramaBox dengan berbagai strategi signature
 * Experimental & Aggressive approach
 */
class DirectDramaboxService extends BaseProvider {
    constructor() {
        super('DirectDramabox', 'https://api.dramaboxdb.com');

        // Kandidat base URL yang mungkin
        this.apiCandidates = [
            'https://api.dramaboxdb.com/api/v1',
            'https://api.dramaboxdb.com/api/v2',
            'https://api.dramabox.com/api/v1',
            'https://apigateway.dramaboxdb.com/api',
            'https://app.dramaboxdb.com/api',
        ];

        // Secret keys yang mungkin (hasil reverse engineering umum)
        this.possibleSecrets = [
            'dramabox_2024_secret',
            'DB@2024#Secret',
            'dramabox_app_key',
            'db_mobile_secret',
            '1234567890abcdef', // Common fallback
        ];

        // Device info untuk signature
        this.deviceInfo = {
            model: 'Pixel 6',
            brand: 'Google',
            os: 'Android',
            osVersion: '12',
            appVersion: '1.6.0',
            channel: 'official',
            locale: 'id_ID'
        };
    }

    /**
     * Generate signature dengan berbagai metode
     */
    generateSignature(params, timestamp, secret, method = 'md5') {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const signString = `${sortedParams}&timestamp=${timestamp}&key=${secret}`;

        switch (method) {
            case 'md5':
                return CryptoJS.MD5(signString).toString();
            case 'sha256':
                return CryptoJS.SHA256(signString).toString();
            case 'hmac':
                return CryptoJS.HmacSHA256(signString, secret).toString();
            default:
                return CryptoJS.MD5(signString).toString();
        }
    }

    /**
     * Generate comprehensive headers dengan berbagai strategi
     */
    generateOfficialHeaders(params = {}, strategy = 'default') {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = CryptoJS.MD5(Date.now().toString()).toString().substring(0, 16);
        const deviceId = CryptoJS.MD5(`${this.deviceInfo.model}_${Date.now()}`).toString();

        // Base headers yang umum digunakan app mobile
        const baseHeaders = {
            'User-Agent': `DramaBox/${this.deviceInfo.appVersion} (${this.deviceInfo.os} ${this.deviceInfo.osVersion}; ${this.deviceInfo.model})`,
            'Accept': 'application/json',
            'Accept-Language': this.deviceInfo.locale,
            'Content-Type': 'application/json',
            'X-Requested-With': 'com.dramabox.app',
            'X-App-Version': this.deviceInfo.appVersion,
            'X-Device-Id': deviceId,
            'X-Device-Model': this.deviceInfo.model,
            'X-Device-Brand': this.deviceInfo.brand,
            'X-OS-Type': this.deviceInfo.os,
            'X-OS-Version': this.deviceInfo.osVersion,
            'X-Timestamp': timestamp.toString(),
            'X-Nonce': nonce,
            'X-Channel': this.deviceInfo.channel,
            'X-Locale': this.deviceInfo.locale,
            'X-Request-Id': CryptoJS.MD5(Date.now() + nonce).toString(),
        };

        // Strategy-specific headers
        switch (strategy) {
            case 'signature_v1':
                // Cobain signature MD5
                baseHeaders['X-Signature'] = this.generateSignature(params, timestamp, this.possibleSecrets[0], 'md5');
                baseHeaders['Authorization'] = `Bearer ${CryptoJS.MD5(deviceId + this.possibleSecrets[0]).toString()}`;
                break;

            case 'signature_v2':
                // Cobain signature SHA256
                baseHeaders['X-Sign'] = this.generateSignature(params, timestamp, this.possibleSecrets[1], 'sha256');
                baseHeaders['X-Token'] = CryptoJS.SHA256(deviceId + timestamp).toString();
                break;

            case 'signature_v3':
                // Cobain HMAC
                baseHeaders['X-Auth-Sign'] = this.generateSignature(params, timestamp, this.possibleSecrets[2], 'hmac');
                baseHeaders['X-Session-Token'] = CryptoJS.HmacSHA256(deviceId, this.possibleSecrets[2]).toString();
                break;

            case 'premium_bypass':
                // Headers untuk bypass premium
                baseHeaders['X-Is-Premium'] = 'true';
                baseHeaders['X-User-Level'] = 'VIP';
                baseHeaders['X-Subscription'] = 'active';
                baseHeaders['X-Unlock-All'] = 'true';
                baseHeaders['X-Signature'] = this.generateSignature({ ...params, premium: 'true' }, timestamp, this.possibleSecrets[0], 'md5');
                break;

            default:
                // Default: coba kombinasi
                baseHeaders['X-Signature'] = this.generateSignature(params, timestamp, this.possibleSecrets[0], 'md5');
                break;
        }

        return baseHeaders;
    }

    /**
     * Aggressive request ke berbagai kandidat API dengan berbagai strategi
     */
    async aggressiveRequest(endpoint, params = {}) {
        console.log(`🎯 [DirectAPI] Aggressive request to: ${endpoint}`);

        const strategies = ['default', 'signature_v1', 'signature_v2', 'signature_v3', 'premium_bypass'];

        // Coba semua kombinasi base URL + strategy
        for (const baseUrl of this.apiCandidates) {
            for (const strategy of strategies) {
                try {
                    const url = `${baseUrl}${endpoint}`;
                    const headers = this.generateOfficialHeaders(params, strategy);

                    console.log(`  🔸 Trying: ${baseUrl.split('/').pop()} with ${strategy}`);

                    const response = await axios.get(url, {
                        params,
                        headers,
                        timeout: 10000,
                        validateStatus: (status) => status < 500 // Accept 4xx as valid untuk analisis
                    });

                    // Jika dapat response (bahkan 401/403), log untuk analisis
                    if (response.status === 200) {
                        console.log(`  ✅ SUCCESS! ${baseUrl} with ${strategy}`);
                        console.log(`  📦 Response sample:`, JSON.stringify(response.data).substring(0, 200));
                        return { success: true, data: response.data, source: baseUrl, strategy };
                    } else if (response.status === 401 || response.status === 403) {
                        console.log(`  🔐 Auth required (${response.status}) - Headers might be close!`);
                        // Log response untuk analisis
                        if (response.data?.message) {
                            console.log(`  💬 Message: ${response.data.message}`);
                        }
                    }
                } catch (error) {
                    // Silent fail untuk setiap percobaan, coba yang lain
                    if (error.response?.status) {
                        console.log(`  ❌ ${error.response.status}: ${error.response.statusText}`);
                    }
                }
            }
        }

        console.log(`  ⚠️ All attempts failed for ${endpoint}`);
        return { success: false, data: null };
    }

    /**
     * Get Drama Detail dari API Official
     */
    async getDetail(bookId) {
        console.log(`📖 [DirectAPI] Fetching detail for: ${bookId}`);

        const endpoints = [
            `/drama/detail/${bookId}`,
            `/book/detail/${bookId}`,
            `/v1/drama/${bookId}`,
            `/content/detail`,
            // Tambahan endpoint detail yang lebih banyak
            `/api/drama/detail/${bookId}`,
            `/api/book/detail/${bookId}`,
            `/drama/get_detail/${bookId}`,
            `/book/get_book_detail`,
            `/drama/info/${bookId}`,
            `/video/detail/${bookId}`
        ];

        for (const endpoint of endpoints) {
            // Coba dengan params di query string juga
            const params = {
                bookId,
                book_id: bookId,
                id: bookId,
                lang: 'in', // Coba 'in' selain 'id'
                platform: 'android'
            };

            const result = await this.aggressiveRequest(endpoint, params);

            if (result.success) {
                return result.data;
            }
        }

        return null;
    }

    /**
     * Get Episodes dari API Official
     */
    async getEpisodes(bookId) {
        console.log(`🎬 [DirectAPI] Fetching episodes for: ${bookId}`);

        const endpoints = [
            `/drama/episodes/${bookId}`,
            `/book/chapters/${bookId}`,
            `/v1/episodes`,
            `/content/episodes`,
        ];

        for (const endpoint of endpoints) {
            const result = await this.aggressiveRequest(endpoint, {
                bookId,
                lang: 'id',
                unlock: 'true',
                free: 'true'
            });

            if (result.success) {
                return result.data;
            }
        }

        return [];
    }

    /**
     * Search Drama dari API Official
     */
    async search(query) {
        console.log(`🔍 [DirectAPI] Searching for: ${query}`);

        const endpoints = [
            `/drama/search`,
            `/search`,
            `/v1/search`,
            `/content/search`,
        ];

        for (const endpoint of endpoints) {
            const result = await this.aggressiveRequest(endpoint, {
                keyword: query,
                query: query,
                lang: 'id',
                page: 1,
                pageSize: 20
            });

            if (result.success) {
                return result.data;
            }
        }

        return [];
    }

    /**
     * Get Trending/Homepage
     */
    async getTrending() {
        console.log(`🔥 [DirectAPI] Fetching trending...`);

        const endpoints = [
            `/drama/trending`,
            `/home/trending`,
            `/v1/trending`,
            `/content/trending`,
        ];

        for (const endpoint of endpoints) {
            const result = await this.aggressiveRequest(endpoint, {
                lang: 'id',
                page: 1
            });

            if (result.success) {
                return result.data;
            }
        }

        return [];
    }
}

export default new DirectDramaboxService();
