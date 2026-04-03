import BaseProvider from './BaseProvider.js';
import axios from 'axios';

class StardustTVService extends BaseProvider {
    constructor() {
        super('StardustTV', 'https://vidrama.asia/api/stardusttv');
        // Supabase project id: gkcnbnlfqdlotnjaizxx
        this.supabaseUrl = 'https://gkcnbnlfqdlotnjaizxx.supabase.co';
        
        const cleanEnv = (key) => (process.env[key] || '').replace(/\r\n|\r|\n/g, '').trim();
        this.apiKey = cleanEnv('STARDUSTTV_API_KEY') || cleanEnv('SUPABASE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrY25ibmxmcWRsb3RuamFpenh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjQ5ODEsImV4cCI6MjA4NDA0MDk4MX0.EFP6qcUAT_Dk0bV3ycjxpduZ1MBuhCWOTE0ArIsS9Xo';
        
        // Token PRO dari Edo Suseno - akan di-refresh otomatis jika expired
        this.accessToken = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImY0NTAxYzU1LTY5ZmMtNDczNy05NzFkLTU1OTVjZmRmZDAwNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2drY25ibmxmcWRsb3RuamFpenh4LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjNmUxMWM0OS1hZmVhLTQ3NzAtOWY1Ni01ODVhN2JmMWI1OWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc0NjMzMzA5LCJpYXQiOjE3NzQ2Mjk3MDksImVtYWlsIjoiZWRvc3VzZW5vQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJFZG8gU3VzZW5vIiwicmVmZXJyZWRfYnkiOiJWSUQ4RUFGQSIsInJlZ2lzdGVyZWRfaXAiOiIyMDIuMTI1LjEwMC4xMTEiLCJyZWdpc3RlcmVkX3VhIjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMC4wIFdpbjY0OyB4NjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xNDYuMC4wLjAgU2FmYXJpLzUzNy4zNiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc0NjI2MjM5fV0sInNlc3Npb25faWQiOiJkMmU1MzdlOS1iMzhhLTRjYzMtYjY2MC1hNzIyMzU3ZmY3NzIiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.2umVGYnRf85g7NV9mgeV7UyCm5OEQU19iRJarwG-lPBkq5eKbPXQ7yYyxyjeJkTitKBMgtpcvU_Ca_cgFPrYWQ";
        this.refreshToken = "ba4ve42w5kkh";
        this._isRefreshing = false;
        // Cek dan refresh token saat startup jika sudah expired
        this._initTokenRefresh();
    }

    /**
     * Cek apakah token sudah expired, jika iya langsung refresh
     */
    _initTokenRefresh() {
        try {
            const parts = this.accessToken.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            const now = Math.floor(Date.now() / 1000);
            if (now >= payload.exp) {
                console.log(`[StardustTV] Token expired, auto-refreshing...`);
                this._refreshAccessToken().catch(e => console.error('[StardustTV] Initial refresh failed:', e.message));
            } else {
                console.log(`[StardustTV] Token valid until: ${new Date(payload.exp * 1000).toISOString()}`);
            }
        } catch (e) {
            console.warn('[StardustTV] Could not check token expiry:', e.message);
        }
    }

    /**
     * Refresh access token menggunakan refresh_token dari Supabase
     */
    async _refreshAccessToken() {
        if (this._isRefreshing) return;
        this._isRefreshing = true;
        try {
            console.log('[StardustTV] Refreshing Supabase token...');
            const res = await axios.post(
                `${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
                { refresh_token: this.refreshToken },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.apiKey
                    },
                    timeout: 15000
                }
            );
            if (res.data?.access_token) {
                this.accessToken = res.data.access_token;
                if (res.data.refresh_token) {
                    this.refreshToken = res.data.refresh_token;
                }
                console.log('[StardustTV] ✅ Token berhasil di-refresh!');
            } else {
                console.error('[StardustTV] Refresh response tidak mengandung access_token:', JSON.stringify(res.data));
            }
        } catch (e) {
            console.error('[StardustTV] ❌ Refresh token gagal:', e.response?.data || e.message);
        } finally {
            this._isRefreshing = false;
        }
    }

    /**
     * Helper request dengan auto-refresh token jika 401/403
     */
    async _requestWithAuth(config) {
        const randomIP = `114.122.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Forwarded-For': randomIP,
            'X-Real-IP': randomIP,
            ...config.headers
        };
        try {
            const res = await axios({ ...config, headers });
            // Jika 401 atau respons menunjukkan token expired, refresh dan retry
            if (res.status === 401 || res.status === 403 || res.data?.error === 'invalid_token') {
                console.log('[StardustTV] Token rejected (401/403), attempting refresh...');
                await this._refreshAccessToken();
                const retryHeaders = { ...headers, 'Authorization': `Bearer ${this.accessToken}` };
                return await axios({ ...config, headers: retryHeaders });
            }
            return res;
        } catch (e) {
            if (e.response?.status === 401 || e.response?.status === 403) {
                console.log('[StardustTV] Token rejected (401/403), attempting refresh...');
                await this._refreshAccessToken();
                const randomIP2 = `114.122.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
                const retryHeaders = {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-Forwarded-For': randomIP2,
                    'X-Real-IP': randomIP2,
                    ...config.headers
                };
                return await axios({ ...config, headers: retryHeaders });
            }
            throw e;
        }
    }

    /**
     * Ambil katalog drama StardustTV
     */
    async getExplore(page = 1, categoryId = null) {
        try {
            const params = {
                action: categoryId ? 'category' : 'combined',
                page: page,
                page_size: 20
            };

            if (categoryId) params.category_id = categoryId;

            const res = await this._requestWithAuth({
                method: 'get',
                url: this.baseUrl,
                params
            });

            const items = res.data?.data || res.data || [];
            return Array.isArray(items) ? items : [];
        } catch (e) {
            console.error(`[StardustTV] Explore failed: ${e.message}`);
            return [];
        }
    }
    /**
     * Ambil daftar kategori StardustTV
     */
    async getCategories() {
        try {
            const res = await this._requestWithAuth({
                method: 'get',
                url: this.baseUrl,
                params: { action: 'categories' }
            });
            return res.data?.data || res.data || [];
        } catch (e) {
            console.error(`[StardustTV] Get Categories failed: ${e.message}`);
            return [];
        }
    }

    /**
     * Ambil detail drama dan daftar episode
     */
    async getDetail(shortPlayId) {
        try {
            const res = await this._requestWithAuth({
                method: 'get',
                url: this.baseUrl,
                params: { action: 'detail', id: shortPlayId }
            });

            return res.data?.data || res.data || null;
        } catch (e) {
            console.error(`[StardustTV] Detail failed: ${e.message}`);
            return null;
        }
    }

    /**
     * Ambil link streaming (M3U8)
     */
    async getStream(shortPlayId, episodeIndex) {
        const detail = await this.getDetail(shortPlayId);
        if (!detail) return null;

        const eps = detail.episodes || detail.list || [];
        if (eps.length === 0) return null;

        // Temukan episode berdasarkan episodeNo atau episodeNumber
        const episode = eps.find(e =>
            e.episodeNo == episodeIndex ||
            e.episodeNumber == episodeIndex ||
            e.index == episodeIndex
        );

        // StardustTV di Vidrama menyediakan _h264 atau _h265
        return episode ? (episode._h264 || episode._h265 || episode.videoUrl) : null;
    }

    /**
     * Cari drama StardustTV berdasarkan kata kunci
     */
    async search(query, page = 1) {
        try {
            const res = await this._requestWithAuth({
                method: 'get',
                url: this.baseUrl,
                params: {
                    action: 'search',
                    q: query,
                    page: page,
                    page_size: 20
                }
            });
            return res.data?.data || res.data || [];
        } catch (e) {
            console.error(`[StardustTV] Search failed: ${e.message}`);
            return [];
        }
    }
}

export default new StardustTVService();
