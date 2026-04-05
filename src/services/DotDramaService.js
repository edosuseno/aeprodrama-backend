import BaseProvider from './BaseProvider.js';
import axios from 'axios';

class DotDramaService extends BaseProvider {
    constructor() {
        super('DotDrama', 'https://vidrama.asia/api/dotdrama');
        this.supabaseUrl = 'https://gkcnbnlfqdlotnjaizxx.supabase.co';
        const cleanEnv = (key) => (process.env[key] || '').replace(/\r\n|\r|\n/g, '').trim();

        // Credentials mandiri (Edo Suseno) - Acuan dari StardustTV/GoodShort
        this.apiKey = cleanEnv('SUPABASE_KEY') || cleanEnv('STARDUSTTV_API_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrY25ibmxmcWRsb3RuamFpenh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjQ5ODEsImV4cCI6MjA4NDA0MDk4MX0.EFP6qcUAT_Dk0bV3ycjxpduZ1MBuhCWOTE0ArIsS9Xo';
        this.accessToken = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImY0NTAxYzU1LTY5ZmMtNDczNy05NzFkLTU1OTVjZmRmZDAwNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2drY25ibmxmcWRsb3RuamFpenh4LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjNmUxMWM0OS1hZmVhLTQ3NzAtOWY1Ni01ODVhN2JmMWI1OWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzczNzYwMDEzLCJpYXQiOjE3NzM3NTY0MTMsImVtYWlsIjoiZWRvc3VzZW5vQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJFZG8gU3VzZW5vIiwicmVmZXJyZWRfYnkiOiJWSUQ4RUFGQSIsInJlZ2lzdGVyZWRfaXAiOiIyMDIuMTI1LjEwMC4xMTEiLCJyZWdpc3RlcmVkX3VhIjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0Ni4wLjAuMCBTYWZhcmkvNTM3LjM2In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NzM3NTY0MTN9XSwic2Vzc2lvbl9pZCI6ImYxNDMyYTZkLWQyMDYtNDczNi04YWU2LTA0YjU1MjkyYzQ5OSIsImlzX2Fub255bW91cyI6ZmFsc2V9.yZtxKkp3Nau-ifL25feb4P1YaLcpsz_1TVy63l5noPyqEDtu95fH1w9TjsJy5duF7qYMz-bYQblZenKGjxCIsA";
        this.refreshToken = "ba4ve42w5kkh";
        this._isRefreshing = false;

        this._initTokenRefresh();
    }

    _initTokenRefresh() {
        try {
            const parts = this.accessToken.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            const now = Math.floor(Date.now() / 1000);
            if (now >= payload.exp) {
                console.log(`[DotDrama] Token expired, refreshing...`);
                this._refreshAccessToken().catch(() => { });
            }
        } catch (e) { }
    }

    async _refreshAccessToken() {
        if (this._isRefreshing) return;
        this._isRefreshing = true;
        try {
            const res = await axios.post(
                `${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
                { refresh_token: this.refreshToken },
                {
                    headers: { 'Content-Type': 'application/json', 'apikey': this.apiKey },
                    timeout: 10000
                }
            );
            if (res.data?.access_token) {
                this.accessToken = res.data.access_token;
                if (res.data.refresh_token) this.refreshToken = res.data.refresh_token;
            }
        } catch (e) {
            console.error('[DotDrama] Refresh failed:', e.message);
        } finally {
            this._isRefreshing = false;
        }
    }

    async _requestWithAuth(config) {
        try {
            const baseHeaders = {
                'Authorization': `Bearer ${this.accessToken}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://vidrama.asia/provider/dotdrama',
                'Origin': 'https://vidrama.asia'
            };

            const res = await axios({
                ...config,
                headers: { ...baseHeaders, ...config.headers },
                timeout: 20000
            });

            if (res.status === 401 || res.status === 403 || res.data?.error === 'invalid_token') {
                await this._refreshAccessToken();
                return await axios({
                    ...config,
                    headers: { ...baseHeaders, 'Authorization': `Bearer ${this.accessToken}`, ...config.headers },
                    timeout: 20000
                });
            }
            return res;
        } catch (e) {
            if (e.response?.status === 401 || e.response?.status === 403) {
                await this._refreshAccessToken();
                return await axios({
                    ...config,
                    headers: { 
                        'Authorization': `Bearer ${this.accessToken}`,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://vidrama.asia/provider/dotdrama',
                        ...config.headers 
                    },
                    timeout: 20000
                });
            }
            throw e;
        }
    }

    async getHome(page = 1) {
        try {
            console.log(`[DotDrama] 🚀 Fetching Home Page: ${page}`);
            const res = await this._requestWithAuth({
                method: 'GET',
                url: this.baseUrl,
                params: { action: 'list', page, page_size: 20 }
            });

            const items = res.data?.dramas || res.data?.data || (Array.isArray(res.data) ? res.data : []);
            
            return items.map(item => {
                const originalCover = item.cover || item.poster || item.horizontal_cover;
                return {
                    id: item.id || item.short_play_id,
                    title: item.title || item.name,
                    cover: `https://wsrv.nl/?url=${encodeURIComponent(originalCover)}&w=300&output=webp`,
                    description: item.description || item.summary,
                    chapterCount: item.total_episodes || item.totalEpisodes || (item.episodes ? item.episodes.length : 0),
                    provider: 'dotdrama'
                };
            });
        } catch (e) {
            console.error('[DotDrama] ❌ Home Error:', e.message);
            return [];
        }
    }

    async getDetail(id) {
        try {
            const res = await this._requestWithAuth({
                method: 'GET',
                url: this.baseUrl,
                params: { action: 'detail', id }
            });

            const data = res.data?.data || res.data;
            if (!data) return null;

            return {
                id: data.id || id,
                title: data.title || data.name,
                cover: `https://wsrv.nl/?url=${encodeURIComponent(data.cover || data.poster || data.horizontal_cover)}&w=500&output=webp`,
                description: data.description || data.summary || "Nikmati drama pendek berkualitas tinggi dari platform Dot Drama.",
                episodes: (data.episodes || []).map((ep, idx) => ({
                    id: ep.id || (idx + 1).toString(),
                    index: ep.episodeNo || ep.index || (idx + 1),
                    title: ep.title || `Episode ${idx + 1}`,
                    videoAddress: ep.videoUrl || ep.video_url || "",
                    subtitle: ep.subtitle || ""
                })),
                totalEpisodes: data.total_episodes || (data.episodes ? data.episodes.length : 0),
                provider: 'dotdrama'
            };
        } catch (e) {
            console.error('[DotDrama] Detail Error:', e.message);
            return null;
        }
    }

    async getStream(id, episodeIndex) {
        try {
            const detail = await this.getDetail(id);
            if (!detail) return null;

            const ep = detail.episodes.find(e => e.index.toString() === episodeIndex.toString());
            if (!ep) return null;

            let videoUrl = ep.videoAddress || "";
            if (videoUrl && videoUrl.startsWith('/api/')) {
                videoUrl = `https://vidrama.asia${videoUrl}`;
            }

            return {
                url: videoUrl,
                subtitle: ep.subtitle || ""
            };
        } catch (e) {
            console.error('[DotDrama] Stream Error:', e.message);
            return null;
        }
    }

    async search(keyword) {
        console.log(`[DotDrama] 🔎 Searching (via Melolo Aggregator): ${keyword}`);
        try {
            // Kita bypass auth token yang expired dengan menumpang di rute Melolo yang terbuka untuk publik
            const data = await this._pureRequest(`https://vidrama.asia/api/melolo`, {
                action: 'search',
                keyword: keyword
            }, 2, {
                forceReferer: 'https://vidrama.asia/'
            });

            const list = data?.dataList || data?.rows || data?.data || data || [];
            
            const items = (Array.isArray(list) ? list : []).map(item => {
                const id = item.id || item.intId || item.short_play_id || '';
                const title = item.name || item.title || item.book_name || '';
                let cover = item.image || item.cover || item.thumb_url || item.poster || '';
                
                if (cover && !cover.startsWith('http')) {
                    cover = `https://vidrama.asia${cover.startsWith('/') ? '' : '/'}${cover}`;
                }

                // FIX: Hindari wsrv.nl membungkus wsrv.nl lagi (menghindari 404 dari double auth)
                let finalCover = '';
                if (cover) {
                    if (cover.includes('wsrv.nl')) {
                        finalCover = cover;
                    } else {
                        finalCover = `https://wsrv.nl/?url=${encodeURIComponent(cover)}&w=300&output=webp`;
                    }
                }

                return {
                    id: String(id),
                    title: title,
                    cover: finalCover,
                    chapterCount: item.episode || item.chapterCount || item.total_episodes || 0,
                    provider: 'dotdrama'
                };
            }).filter(i => i.id && i.title);

            console.log(`[DotDrama] ✅ Found ${items.length} items (via Melolo) for "${keyword}"`);
            return items;
        } catch (e) {
            console.error('[DotDrama] Search Error:', e.message);
            return [];
        }
    }
}

export default new DotDramaService();
