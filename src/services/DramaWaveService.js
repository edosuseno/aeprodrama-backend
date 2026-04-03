
import BaseProvider from './BaseProvider.js';
import axios from 'axios';

class DramaWaveService extends BaseProvider {
    constructor() {
        super('DramaWave', 'https://vidrama.asia/api/dramawave');
        // Supabase project id: gkcnbnlfqdlotnjaizxx
        this.supabaseUrl = 'https://gkcnbnlfqdlotnjaizxx.supabase.co';
        // Menggunakan token yang sama dengan StardustTV karena berasal dari akun PRO yang sama
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
                console.log(`[DramaWave] Token expired, auto-refreshing...`);
                this._refreshAccessToken().catch(e => console.error('[DramaWave] Initial refresh failed:', e.message));
            } else {
                console.log(`[DramaWave] Token valid until: ${new Date(payload.exp * 1000).toISOString()}`);
            }
        } catch (e) {
            console.warn('[DramaWave] Could not check token expiry:', e.message);
        }
    }

    /**
     * Refresh access token menggunakan refresh_token dari Supabase
     */
    async _refreshAccessToken() {
        if (this._isRefreshing) return;
        this._isRefreshing = true;
        try {
            console.log('[DramaWave] Refreshing Supabase token...');
            const res = await axios.post(
                `${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
                { refresh_token: this.refreshToken },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                }
            );
            if (res.data?.access_token) {
                this.accessToken = res.data.access_token;
                if (res.data.refresh_token) {
                    this.refreshToken = res.data.refresh_token;
                }
                console.log('[DramaWave] ✅ Token berhasil di-refresh!');
            } else {
                console.error('[DramaWave] Refresh response tidak mengandung access_token:', JSON.stringify(res.data));
            }
        } catch (e) {
            console.error('[DramaWave] ❌ Refresh token gagal:', e.response?.data || e.message);
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
            if (res.status === 401 || res.status === 403 || res.data?.error === 'invalid_token') {
                console.log('[DramaWave] Token rejected (401/403), attempting refresh...');
                await this._refreshAccessToken();
                const retryHeaders = { ...headers, 'Authorization': `Bearer ${this.accessToken}` };
                return await axios({ ...config, headers: retryHeaders });
            }
            return res;
        } catch (e) {
            if (e.response?.status === 401 || e.response?.status === 403) {
                console.log('[DramaWave] Token rejected (401/403), attempting refresh...');
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
     * Ambil katalog drama DramaWave
     * category: 'popular', 'free', 'trending'
     */
    async getExplore(page = 1, category = 'popular') {
        try {
            const res = await this._requestWithAuth({
                method: 'get',
                url: this.baseUrl,
                params: {
                    action: 'list',
                    page: page,
                    pageSize: 30,
                    category: category
                }
            });

            // Vidrama DramaWave returns { success: true, data: { dataList: [...] } }
            const items = res.data?.data?.dataList || res.data?.data || res.data || [];
            if (!Array.isArray(items)) return [];

            return items.map(item => ({
                ...item,
                shortPlayId: item.shortPlayId || item.id || item.bookId,
                shortPlayName: item.shortPlayName || item.title || item.name || item.bookName,
                cover: item.shortPlayCover || item.cover || item.image || item.bookCover
            }));
        } catch (e) {
            console.error(`[DramaWave] Explore failed: ${e.message}`);
            return [];
        }
    }

    /**
     * Cari drama DramaWave
     */
    async search(query, page = 1) {
        try {
            const res = await this._requestWithAuth({
                method: 'get',
                url: this.baseUrl,
                params: {
                    action: 'search',
                    keyword: query
                }
            });
            // Search DramaWave returns { success: true, data: { dataList: [...] } }
            const items = res.data?.data?.dataList || res.data?.data || res.data || [];
            if (!Array.isArray(items)) return [];

            return items.map(item => ({
                ...item,
                shortPlayId: item.shortPlayId || item.id || item.bookId,
                shortPlayName: item.shortPlayName || item.title || item.name || item.bookName,
                cover: item.shortPlayCover || item.cover || item.image || item.bookCover
            }));
        } catch (e) {
            console.error(`[DramaWave] Search failed: ${e.message}`);
            return [];
        }
    }

    /**
     * Ambil detail drama
     */
    async getDetail(id) {
        try {
            const res = await this._requestWithAuth({
                method: 'get',
                url: this.baseUrl,
                params: { action: 'detail', id: id }
            });
            const data = res.data?.data || res.data || null;

            if (data) {
                // Normalisasi agar konsisten dengan frontend
                return {
                    ...data,
                    shortPlayId: data.shortPlayId || data.id || data.bookId || id,
                    shortPlayName: data.shortPlayName || data.title || data.name || data.bookName,
                    episodes: (data.episodes || data.list || []).map((ep, idx) => ({
                        ...ep,
                        id: ep.chapterId || ep.id || idx.toString(),
                        title: ep.chapterName || ep.title || `Episode ${idx + 1}`,
                        cover: ep.chapterImg || ep.cover || ep.image || data.cover,
                        videoUrl: ep.videoPath || ep.videoUrl || ep._h264 || ep._h265,
                        index: idx
                    })),
                    description: data.description || data.introduction || "Tidak ada deskripsi.",
                    tags: Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? data.tags.split(',') : [])
                };
            }
            return null;
        } catch (e) {
            console.error(`[DramaWave] Detail failed: ${e.message}`);
            return null;
        }
    }

    /**
     * Ambil link streaming
     * episode index mulai dari 0
     */
    async getStream(id, episodeIndex = 0) {
        try {
            const res = await this._requestWithAuth({
                method: 'get',
                url: this.baseUrl,
                params: {
                    action: 'stream',
                    id: id,
                    episode: episodeIndex
                }
            });
            const data = res.data?.data || res.data || null;

            if (data) {
                // Gunakan URL mentah dari API (seringkali sudah berupa proxy vidrama /api/video-proxy-dramawave)
                // Kita akan membungkusnya lagi dengan proxy kita sendiri agar bisa diakses dari frontend tanpa CORS
                const rawUrl = data.videoUrl || data.url || data.videoPath;

                let finalUrl = rawUrl;
                if (rawUrl) {
                    // Jika URL mengarah ke vidrama proxy, kita ambil target aslinya dulu
                    if (rawUrl.includes('url=')) {
                        const parts = rawUrl.split('url=');
                        finalUrl = decodeURIComponent(parts[1]);
                    }
                    // Mengembalikan URL aslinya agar frontend bisa menggunakan Universal Proxy
                }

                // Deteksi Subtitle Indonesia/Inggris secara otomatis (Lebih robust)
                let subtitle = '';
                const sublist = Array.isArray(data.subtitles) ? data.subtitles : (data.sub_list || []);
                if (sublist.length > 0) {
                    const findInList = (langs) => sublist.find(s => {
                        const l = (s.lang || s.language || s.label || '').toLowerCase();
                        return langs.some(target => l.includes(target));
                    });

                    const bestSub = findInList(['id', 'ind', 'bhs', 'indo']) 
                                    || findInList(['en', 'eng'])
                                    || sublist[0];

                    if (bestSub?.url || bestSub?.subtitle || bestSub?.src) {
                        const sUrl = bestSub.url || bestSub.subtitle || bestSub.src;
                        let rawSub = sUrl.includes('url=') ? decodeURIComponent(sUrl.split('url=')[1]) : sUrl;
                        try {
                            if (rawSub.startsWith('//')) rawSub = `https:${rawSub}`;
                            // Gunakan proxy subtitle backend (index.js) untuk konversi SRT ke VTT dan bypass CORS
                            subtitle = `/api/proxy?url=${encodeURIComponent(rawSub)}`;
                        } catch (e) {
                            subtitle = `/api/proxy?url=${encodeURIComponent(rawSub)}`;
                        }
                    }
                }

                const result = {
                    ...data,
                    url: finalUrl,
                    subtitle: subtitle, // Gunakan satu field tunggal agar seragam dengan Velolo
                    isVip: data.isVip || (data.isCharge == 1) || false
                };

                return result;
            }
        } catch (e) {
            console.error(`[DramaWave] Stream failed: ${e.message}`);
            return null;
        }
    }
}

export default new DramaWaveService();
