import BaseProvider from './BaseProvider.js';
import axios from 'axios';

class GoodShortService extends BaseProvider {
    constructor() {
        super('GoodShort', 'https://vidrama.asia/api/goodshort');
        this.supabaseUrl = 'https://gkcnbnlfqdlotnjaizxx.supabase.co';
        const cleanEnv = (key) => (process.env[key] || '').replace(/\r\n|\r|\n/g, '').trim();
        
        // Credentials mandiri (Edo Suseno) - Acuan dari StardustTV
        this.apiKey = cleanEnv('SUPABASE_KEY') || cleanEnv('STARDUSTTV_API_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrY25ibmxmcWRsb3RuamFpenh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjQ5ODEsImV4cCI6MjA4NDA0MDk4MX0.EFP6qcUAT_Dk0bV3ycjxpduZ1MBuhCWOTE0ArIsS9Xo';
        this.accessToken = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImY0NTAxYzU1LTY5ZmMtNDczNy05NzFkLTU1OTVjZmRmZDAwNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2drY25ibmxmcWRsb3RuamFpenh4LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjNmUxMWM0OS1hZmVhLTQ3NzAtOWY1Ni01ODVhN2JmMWI1OWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzczNzYwMDEzLCJpYXQiOjE3NzM3NTY0MTMsImVtYWlsIjoiZWRvc3VzZW5vQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJFZG8gU3VzZW5vIiwicmVmZXJyZWRfYnkiOiJWSUQ4RUFGQSIsInJlZ2lzdGVyZWRfaXAiOiIyMDIuMTI1LjEwMC4xMTEiLCJyZWdpc3RlcmVkX3VhIjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0Ni4wLjAuMCBTYWZhcmkvNTM3LjM2In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NzM3NTY0MTN9XSwic2Vzc2lvbl9pZCI6ImYxNDMyYTZkLWQyMDYtNDczNi04YWU2LTA0YjU1MjkyYzQ5OSIsImlzX2Fub255bW91cyI6ZmFsc2V9.yZtxKkp3Nau-ifL25feb4P1YaLcpsz_1TVy63l5noPyqEDtu95fH1w9TjsJy5duF7qYMz-bYQblZenKGjxCIsA";
        this.refreshToken = "ba4ve42w5kkh";
        
        // Cookie opsional: terbukti RSC POST bisa berjalan tanpa cf_clearance.
        this.sessionCookie = cleanEnv('GOODSHORT_COOKIE') || cleanEnv('VIDRAMA_COOKIE') || '';
        this._isRefreshing = false;
        this.dramaStore = new Map(); // Metadata cache
        
        this._initTokenRefresh();
    }

    _initTokenRefresh() {
        try {
            const parts = this.accessToken.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            const now = Math.floor(Date.now() / 1000);
            if (now >= payload.exp) {
                console.log(`[GoodShort] Token expired, auto-refreshing...`);
                this._refreshAccessToken().catch(e => console.error('[GoodShort] Initial refresh failed:', e.message));
            }
        } catch (e) { }
    }

    async _refreshAccessToken() {
        if (this._isRefreshing) return;
        this._isRefreshing = true;
        try {
            console.log('[GoodShort] Refreshing internal Supabase token...');
            const res = await axios.post(
                `${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
                { refresh_token: this.refreshToken },
                {
                    headers: { 'Content-Type': 'application/json', 'apikey': this.apiKey },
                    timeout: 15000
                }
            );
            if (res.data?.access_token) {
                this.accessToken = res.data.access_token;
                if (res.data.refresh_token) this.refreshToken = res.data.refresh_token;
                console.log('[GoodShort] ✅ Internal Token Refreshed!');
            }
        } catch (e) {
            console.error('[GoodShort] ❌ Internal Refresh failed:', e.message);
        } finally {
            this._isRefreshing = false;
        }
    }

    async _requestWithAuth(config) {
        try {
            const baseHeaders = {
                'Authorization': `Bearer ${this.accessToken}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Origin': 'https://vidrama.asia',
                'Referer': 'https://vidrama.asia/provider/goodshort',
                ...(config.headers || {})
            };
            
            if (this.sessionCookie) baseHeaders['Cookie'] = this.sessionCookie;

            const res = await axios({ ...config, headers: baseHeaders, timeout: 20000 });
            
            if (res.status === 401 || res.status === 403 || res.data?.error === 'invalid_token') {
                console.log('[GoodShort] Token rejected, refreshing...');
                await this._refreshAccessToken();
                baseHeaders['Authorization'] = `Bearer ${this.accessToken}`;
                return await axios({ ...config, headers: baseHeaders, timeout: 20000 });
            }

            return res;
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log('[GoodShort] Token rejected in catch, refreshing...');
                await this._refreshAccessToken();
                const retryHeaders = {
                    ...config.headers,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://vidrama.asia/provider/goodshort'
                };
                if (this.sessionCookie) retryHeaders['Cookie'] = this.sessionCookie;
                return await axios({ ...config, headers: retryHeaders, timeout: 20000 });
            }
            console.error(`[GoodShort] Upstream Error: ${error.message}`);
            throw error;
        }
    }

    async getHome(page = 1) {
        try {
            console.log(`[GoodShort] 🚀 Fetching Home Page via POST RSC: ${page}`);
            const url = 'https://vidrama.asia/provider/goodshort';
            const res = await this._requestWithAuth({
                method: 'POST',
                url,
                data: `[0,${page}]`, // [index, page], index 0 = Tren
                headers: {
                    'content-type': 'text/plain;charset=UTF-8',
                    'next-action': '6089b5cf97cb3900b17f2c62159ce745f98d2a4b8b',
                    'accept': 'text/x-component',
                }
            });

            const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            const items = [];

            // Regex RSC yang sudah terbukti bekerja
            const itemRegex = /\{"shortPlayId":"(\d+)","shortPlayName":"([^"]+)","shortPlayCover":"([^"]+)"/g;
            let match;

            while ((match = itemRegex.exec(content)) !== null) {
                const id = match[1];
                const title = match[2];
                const cover = match[3].replace(/\\u0026/g, '&');

                if (!items.find(i => i.id === id)) {
                    const originalCover = match[3].replace(/\\u0026/g, '&');
                    const item = {
                        id,
                        title,
                        cover: `https://wsrv.nl/?url=${encodeURIComponent(originalCover)}&w=300&output=webp`,
                        provider: 'goodshort',
                        chapterCount: 0
                    };
                    items.push(item);
                    this.dramaStore.set(id, item); // Simpan ke metadata cache
                }
            }

            console.log(`[GoodShort] ✅ Found ${items.length} items from RSC`);
            return items;
        } catch (e) {
            console.error(`[GoodShort] ❌ Home Error: ${e.message}`);
            return [{
                id: 'ERROR',
                title: String(e.message || 'Unknown Error').substring(0, 50),
                cover: 'https://s.shortswave.com/image/cover/12631.webp',
                provider: 'goodshort'
            }];
        }
    }

    async getDetail(bookId) {
        try {
            console.log(`[GoodShort] 🔍 Fetching Detail ID: ${bookId}`);

            // Pola 1: Coba API REST standar terlebih dahulu (siapa tahu masih hidup untuk beberapa ID)
            const patterns = [
                { bookId: bookId, title: 'drama', lang: 'in' },
                { id: bookId, title: 'drama', lang: 'in' },
                { shortPlayId: bookId, lang: 'in' }
            ];

            let data = null;
            for (const params of patterns) {
                try {
                    const queryStr = new URLSearchParams(params).toString();
                    const url = `${this.baseUrl}/detail?${queryStr}`;
                    const res = await this._requestWithAuth({ url });

                    if (res.data && (res.data.code === 200 || res.data.code === 0 || res.data.success || res.data.data)) {
                        const info = res.data.data?.videoInfo || res.data.data;
                        if (info && (info.name || info.title || info.shortPlayName)) {
                            data = res.data;
                            console.log(`[GoodShort] ✅ Detail Success via REST API: ${JSON.stringify(params)}`);
                            break;
                        }
                    }
                } catch (e) { }
            }

            // Pola 2: Fallback ke Scraping Halaman Movie (Arsitektur Baru Vidrama)
            if (!data) {
                console.log(`[GoodShort] 🌐 REST API failed, trying Page Scraping for ID: ${bookId}`);
                try {
                    const pageUrl = `https://vidrama.asia/movie/drama--${bookId}?provider=goodshort`;
                    const res = await this._requestWithAuth({
                        method: 'GET',
                        url: pageUrl,
                        headers: { 'accept': 'text/html' }
                    });

                    if (res.data && typeof res.data === 'string') {
                        const html = res.data;

                        // Ekstrak data dari RSC/JSON dalam script (Struktur Baru Vidrama)
                        // Menggunakan regex yang lebih fleksibel terhadap escaping quotes pada payload Next.js
                        const titleMatch = html.match(/class[Nn]ame\\":\\"[^\\"]+title\\",\\"children\\":\\"([^\\"]+?)\\"/) ||
                            html.match(/\\"shortPlayName\\":\\"([^\\"]+?)\\"/) ||
                            html.match(/"og:title"\s+content="([^"]+)"/);

                        const synopsisMatch = html.match(/class[Nn]ame\\":\\"[^\\"]+synopsis\\",\\"children\\":\\"([^\\"]+?)\\"/) ||
                            html.match(/\\"shortPlayIntroduction\\":\\"([^\\"]+?)\\"/) ||
                            html.match(/"og:description"\s+content="([^"]+)"/);

                        const coverMatch = html.match(/\\"backdropImage\\",\\"style\\":\{"backgroundImage\\":\\"url\(([^)]+)\)\\"/) ||
                            html.match(/\\"shortPlayCover\\":\\"([^\\"]+?)\\"/) ||
                            html.match(/"og:image"\s+content="([^"]+)"/);

                        const epTotalMatch = html.match(/(\d+) total episode/) ||
                            html.match(/\\"totalEpisodes\\":(\d+)/) ||
                            html.match(/"episodes":(\d+)/);

                        if (titleMatch) {
                            console.log(`[GoodShort] ✅ Found drama info in HTML for ID: ${bookId}`);
                            const title = titleMatch[1];
                            const description = synopsisMatch ? synopsisMatch[1].replace(/\\"/g, '"') : "Nikmati drama pendek berkualitas tinggi dari platform GoodShort.";
                            const cover = coverMatch ? coverMatch[1].replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : "";
                            const totalEpisodes = epTotalMatch ? parseInt(epTotalMatch[1]) : 0;

                            const episodes = [];
                            // Jika ada pola episode di HTML
                            const epRegex = /\\"episodeNum\\":(\d+)/g;
                            let epMatch;
                            const foundEpNums = new Set();
                            while ((epMatch = epRegex.exec(html)) !== null) {
                                const num = parseInt(epMatch[1]);
                                if (!foundEpNums.has(num)) {
                                    episodes.push({
                                        id: `${bookId}-${num}`,
                                        index: num,
                                        title: `Episode ${num}`,
                                        videoAddress: ""
                                    });
                                    foundEpNums.add(num);
                                }
                            }

                            // Fill remaining episodes if totalEpisodes is known
                            if (totalEpisodes > 0 && episodes.length < totalEpisodes) {
                                for (let i = 1; i <= totalEpisodes; i++) {
                                    if (!foundEpNums.has(i)) {
                                        episodes.push({
                                            id: `${bookId}-${i}`,
                                            index: i,
                                            title: `Episode ${i}`,
                                            videoAddress: ""
                                        });
                                    }
                                }
                                episodes.sort((a, b) => a.index - b.index);
                            }

                            return {
                                id: bookId,
                                title: title,
                                cover: cover,
                                description: description,
                                episodes: episodes,
                                totalEpisodes: totalEpisodes || episodes.length,
                                provider: 'goodshort'
                            };
                        }

                        // Pola Lama (sebagai cadangan extra)
                        const infoMatch = html.match(/\{"id":"(\d+)","title":"([^"]+)","genre":"([^"]*)","description":"([^"]*)"/) ||
                            html.match(/\{"shortPlayId":"(\d+)","shortPlayName":"([^"]+)","shortPlayCover":"([^"]+)"/);
                        const legacyCoverMatch = html.match(/"poster":"([^"]+)"/) || html.match(/"cover":"([^"]+)"/) || html.match(/"shortPlayCover":"([^"]+)"/);

                        if (infoMatch) {
                            console.log(`[GoodShort] ✅ Found drama info in HTML (Legacy Pattern) for ID: ${bookId}`);
                            const title = infoMatch[2];
                            const cover = (legacyCoverMatch ? legacyCoverMatch[1] : "").replace(/\\u0026/g, '&');
                            const episodes = [];
                            // Mencari pola episode: {"id":"...","title":"Episode 1",...}
                            const epRegex = /\{"id":"(\d+)","title":"([^"]*Episode[^"]*)","videoUrl":"([^"]*)"/g;
                            let epMatch;
                            while ((epMatch = epRegex.exec(html)) !== null) {
                                episodes.push({
                                    id: epMatch[1],
                                    index: episodes.length + 1,
                                    title: epMatch[2] || `Episode ${episodes.length + 1}`,
                                    videoAddress: epMatch[3].replace(/\\u0026/g, '&')
                                });
                            }

                            // Jika tidak ketemu via regex sederhana, kita buat dummy list berdasarkan jumlah episode yang biasanya ada di meta
                            if (episodes.length === 0) {
                                const epCountMatch = html.match(/"episodes":(\d+)/) || html.match(/"episodeCount":(\d+)/);
                                const totalEp = epCountMatch ? parseInt(epCountMatch[1]) : 0;
                                for (let i = 1; i <= totalEp; i++) {
                                    episodes.push({
                                        id: `${bookId}-${i}`,
                                        index: i,
                                        title: `Episode ${i}`,
                                        videoAddress: "" // Akan ditarik via getStream
                                    });
                                }
                            }

                            return {
                                id: bookId,
                                title: title,
                                cover: cover,
                                description: infoMatch[4] || "Nikmati drama pendek berkualitas tinggi dari platform GoodShort.",
                                episodes: episodes,
                                totalEpisodes: episodes.length,
                                provider: 'goodshort'
                            };
                        }
                    }
                } catch (scrapingError) {
                    console.error(`[GoodShort] ❌ Scraping Fallback failed: ${scrapingError.message}`);
                }
            }

            if (data) {
                const info = data.data?.videoInfo || data.data || {};
                const episodesRaw = data.data?.episodesList || data.data?.epList || data.data?.episodesInfo?.rows || [];

                return {
                    id: info.id || info.shortPlayId || bookId,
                    title: info.name || info.title || info.shortPlayName || "GoodShort Drama",
                    cover: info.cover || info.poster || info.shortPlayCover || "",
                    description: info.introduction || info.description || "Nikmati drama pendek berkualitas tinggi dari platform GoodShort.",
                    episodes: episodesRaw.map((ep, idx) => ({
                        id: ep.id || ep.chapterId || (idx + 1).toString(),
                        index: ep.episodeNo !== undefined ? ep.episodeNo : (idx + 1),
                        title: ep.title || ep.name || `Episode ${idx + 1}`,
                        videoAddress: ep.videoPath || ep.videoAddress || "",
                    })),
                    totalEpisodes: info.episodes || info.episodeCount || episodesRaw.length,
                    provider: 'goodshort'
                };
            }

            // Fallback Terakhir: Gunakan data di dramaStore jika ada (Setidaknya judul dan cover tampil)
            const cached = this.dramaStore.get(bookId);
            if (cached) {
                console.log(`[GoodShort] 💡 Using cached info for ${bookId}`);
                return {
                    ...cached,
                    description: "Nikmati drama pendek berkualitas tinggi dari platform GoodShort.",
                    episodes: [],
                    totalEpisodes: 0
                };
            }

            console.error(`[GoodShort] ❌ Detail failed for ${bookId} after trying all methods.`);
            return null;
        } catch (e) {
            console.error(`[GoodShort] ❌ Detail Error: ${e.message}`);
            return null;
        }
    }

    async getStream(bookId, episodeIndex) {
        try {
            console.log(`[GoodShort] 📺 Fetching Stream Video: ${bookId} - Episode ${episodeIndex}`);

            // Endpoint baru berbasis Next.js Server Action
            const watchUrl = `https://vidrama.asia/watch/drama--${bookId}/${episodeIndex}?provider=goodshort`;
            const nextActionId = '60e49e392bbb652158b23d591ff7c29adb578f1484'; // ID terbaru dari Vidrama

            const res = await this._requestWithAuth({
                method: 'POST',
                url: watchUrl,
                data: `["${bookId}",${parseInt(episodeIndex)}]`,
                headers: {
                    'content-type': 'text/plain;charset=UTF-8',
                    'next-action': nextActionId,
                    'accept': 'text/x-component'
                }
            });

            const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            const streamMatch = content.match(/"videoUrl":"([^"]+)"/);

            if (streamMatch) {
                let streamUrl = streamMatch[1].replace(/\\u0026/g, '&');
                if (streamUrl.startsWith('/api/')) {
                    streamUrl = `https://vidrama.asia${streamUrl}`;
                }
                console.log(`[GoodShort] ✅ Stream URL found via next-action: ${streamUrl}`);
                return {
                    url: streamUrl,
                    subtitle: ""
                };
            }

            console.log(`[GoodShort] ⚠️ Stream not found in next-action RSC, trying legacy fallbacks...`);

            // Pola lama sebagai cadangan
            const patterns = [
                { bookId: bookId, episode: episodeIndex, lang: 'in' },
                { id: bookId, episode: episodeIndex, lang: 'in' }
            ];

            for (const params of patterns) {
                const queryStr = new URLSearchParams(params).toString();
                const url = `https://vidrama.asia/api/video-proxy-goodshort?${queryStr}`;

                try {
                    const resLegacy = await this._requestWithAuth({ url });
                    const data = resLegacy.data;
                    if (data && (data.success || data.videoUrl)) {
                        let sUrl = data.videoUrl || data.data?.url || data.url;
                        if (sUrl) {
                            const finalUrl = sUrl.startsWith('/') ? `https://vidrama.asia${sUrl}` : sUrl;
                            return {
                                url: finalUrl,
                                subtitle: ""
                            };
                        }
                    }
                } catch (e) { }
            }

            // Fallback terakhir ke detail metadata cache
            const detail = await this.getDetail(bookId);
            const ep = detail?.episodes?.find(e => e.index === parseInt(episodeIndex));
            if (ep?.videoAddress) {
                return {
                    url: ep.videoAddress,
                    subtitle: ""
                };
            }
            return null;

        } catch (e) {
            console.error(`[GoodShort] Stream Error for ${bookId}: ${e.message}`);
            return null;
        }
    }

    async search(keyword) {
        try {
            console.log(`[GoodShort] 🔎 Searching (RSC Pure): ${keyword}`);
            const url = `https://vidrama.asia/search?q=${encodeURIComponent(keyword)}&provider=goodshort`;
            const nextActionId = '70c18f6e0c27f60d1b86df02893991f65c74bb76e0';

            // Bypass token Auth menggunakan _pureRequest ke Rute RSC
            const res = await this._pureRequest(url, `["${keyword}"]`, 2, {
                forceReferer: 'https://vidrama.asia/'
            });

            // _pureRequest bisa saja mengembalikan objek jika sebelumnya ter-cache dalam JSON.
            // RSC Action dari NextJS akan return string tipe RSC.
            let content = '';
            // Karena _pureRequest menggunakan axios.get default jika kita memberikan object,
            // Namun untuk RSC kita HARUS menggunakan POST.
            // AHA! _pureRequest pada BaseProvider mendukung axios.get jika options bukan method POST.
            // mari gunakan trik bypass tanpa token secara manual jika gagal dengan GET:
        } catch(e) {}
        
        // REWRITE CARA AMAN (Tanpa_pureRequest karena RSC _harus_ POST raw string):
        try {
            console.log(`[GoodShort] 🔎 Searching (RSC Manual Bypass Auth): ${keyword}`);
            const url = `https://vidrama.asia/search?q=${encodeURIComponent(keyword)}&provider=goodshort`;
            const nextActionId = '70c18f6e0c27f60d1b86df02893991f65c74bb76e0';

            const res = await axios.post(url, `["${keyword}"]`, {
                headers: {
                    'content-type': 'text/plain;charset=UTF-8',
                    'next-action': nextActionId,
                    'accept': 'text/x-component',
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 10000
            });

            const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            const items = [];

            // Memperlebar Regex agar support angka tanpa tanda kutip (ex: "id":78)
            const patterns = [
                /["']shortPlayId["']\s*:\s*["']?(\w+|[0-9]+)["']?\s*,\s*["']shortPlayName["']\s*:\s*["']([^"']+)["']\s*,\s*["']shortPlayCover["']\s*:\s*["']([^"']+)["']/g,
                /{\s*["']id["']\s*:\s*["']?(\w+|[0-9]+)["']?\s*,\s*["']title["']\s*:\s*["']([^"']+)["']\s*,\s*["']cover["']\s*:\s*["']([^"']+)["']/g
            ];

            for (const regex of patterns) {
                let match;
                while ((match = regex.exec(content)) !== null) {
                    const id = match[1];
                    const title = match[2];
                    const cover = match[3].replace(/\\u0026/g, '&').replace(/\\/g, '');

                    if (!items.find(i => i.id === id)) {
                        let finalCover = cover;
                        if (cover && !cover.includes('wsrv.nl')) {
                            finalCover = `https://wsrv.nl/?url=${encodeURIComponent(cover)}&w=300&output=webp`;
                        }

                        items.push({
                            id,
                            title,
                            cover: finalCover,
                            provider: 'goodshort'
                        });
                    }
                }
                if (items.length > 0) break;
            }

            console.log(`[GoodShort] ✅ Search found ${items.length} items`);
            return items;
        } catch (e) {
            console.error(`[GoodShort] Search Error: ${e.message}`);
            return [];
        }
    }
}

export default new GoodShortService();
