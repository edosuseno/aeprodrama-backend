import BaseProvider from './BaseProvider.js';
import axios from 'axios';
import stardustTVService from './StardustTVService.js';

class Dramabox2Service extends BaseProvider {
    constructor() {
        super('Dramabox2', 'https://vidrama.asia');
        // User-Agent Desktop Chrome (lebih menyerupai browser nyata untuk bypass Cloudflare)
        this.desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        this.iphoneUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
        // Next-Action ID untuk endpoint /provider/dramabox2 (RSC POST)
        this.nextActionHome = "60b3687be7816ff646b5d17573993209051413fd56";
        // Next-Action ID untuk endpoint /watch/drama--ID/episode (RSC POST)
        this.nextActionWatch = "60e49e392bbb652158b23d591ff7c29adb578f1484";
        // Cookie sesi dan Cloudflare clearance dari environment variables
        // Set DRAMABOX2_COOKIE dan CF_CLEARANCE_VIDRAMA di Vercel → Project → Settings → Environment Variables
        const cleanEnv = (v) => (process.env[v] || '').replace(/\r\n|\r|\n/g, '').trim();
        this.sessionCookie = cleanEnv('DRAMABOX2_COOKIE') || cleanEnv('VIDRAMA_COOKIE') || '';
        // cf_clearance: cookie Cloudflare yang diperlukan agar IP Vercel tidak di-block (403)
        // Cara mendapatkan: buka vidrama.asia di browser → DevTools → Application → Cookies → copy nilai cf_clearance
        this.cfClearance = cleanEnv('CF_CLEARANCE_VIDRAMA') || '';
        if (this.cfClearance) {
            console.log('[Dramabox2] ✅ CF Clearance cookie loaded dari env (bypass Cloudflare aktif)');
        } else {
            console.warn('[Dramabox2] ⚠️ CF_CLEARANCE_VIDRAMA tidak ditemukan! Request ke vidrama.asia mungkin kena 403 di Vercel.');
        }
    }

    async _requestWithAuth(config) {
        try {
            // Spoof IP Indonesia
            const randomIP = `114.122.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

            // Gunakan token terbaru dari StardustTV (Pro Edo Suseno)
            let currentToken = stardustTVService.accessToken;

            const baseHeaders = {
                'Authorization': `Bearer ${currentToken}`,
                'User-Agent': this.iphoneUa,
                'Referer': 'https://vidrama.asia/',
                'Origin': 'https://vidrama.asia',
                'X-Forwarded-For': randomIP,
                'X-Real-IP': randomIP,
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                ...(config.headers || {})
            };

            // Tambahkan cookie sesi jika tersedia
            if (this.sessionCookie) baseHeaders['Cookie'] = this.sessionCookie;

            const res = await axios({
                ...config,
                headers: baseHeaders,
                timeout: 30000
            });

            // Refresh token jika terdeteksi expired (401/403)
            if (res.status === 401 || res.status === 403 || res.data?.error === 'invalid_token') {
                console.log('[Dramabox2] Token expired, requesting refresh from StardustTV...');
                await stardustTVService._refreshAccessToken();
                baseHeaders['Authorization'] = `Bearer ${stardustTVService.accessToken}`;
                return await axios({ ...config, headers: baseHeaders, timeout: 30000 });
            }

            return res;
        } catch (error) {
            // Jika error adalah 401/403 dari axios, coba refresh juga
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log('[Dramabox2] Token rejected (401/403), refreshing via StardustTV...');
                await stardustTVService._refreshAccessToken();
                const randomIP2 = `114.122.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
                const retryHeaders = {
                    ...config.headers,
                    'Authorization': `Bearer ${stardustTVService.accessToken}`,
                    'User-Agent': this.iphoneUa,
                    'X-Forwarded-For': randomIP2,
                    'X-Real-IP': randomIP2,
                    'Origin': 'https://vidrama.asia',
                    'Referer': 'https://vidrama.asia/'
                };
                if (this.sessionCookie) retryHeaders['Cookie'] = this.sessionCookie;
                return await axios({ ...config, headers: retryHeaders, timeout: 30000 });
            }

            console.error(`[Dramabox2] Req Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Auto-discovery Next-Action ID dari HTML halaman.
     * Bergunasaat Next-Action ID berubah akibat Vidrama.asia deploy ulang.
     * Kita baca script src .js dari HTML, lalu cari pola action ID.
     */
    async _getActionId(page = 'provider/dramabox2') {
        try {
            const res = await axios.get(`${this.baseUrl}/${page}`, {
                headers: {
                    'User-Agent': this.iphoneUa,
                    'Accept': 'text/html',
                    'Referer': `${this.baseUrl}/`
                },
                timeout: 10000
            });
            const html = String(res.data);
            // Next.js menyematkan action ID dalam format hex (panjang 40-46 char) di JSON flight/RSC
            const matched = html.match(/\"([0-9a-f]{40,46})\"/g) || [];
            // Filter kandidat yang valid (khusus hex murni)
            const candidates = matched
                .map(s => s.replace(/"/g, ''))
                .filter(s => s.length >= 40 && s.length <= 46 && /^[0-9a-f]+$/.test(s));
            if (candidates.length > 0) {
                console.log(`[Dramabox2] 🔑 Auto-discovered Action IDs: ${candidates.slice(0, 3).join(', ')}`);
                return candidates[0];
            }
        } catch (e) {
            console.warn(`[Dramabox2] _getActionId failed: ${e.message}`);
        }
        return null;
    }

    async getHome(page = 1) {
        try {
            console.log(`[Dramabox2] 🚀 Fetching Home via POST RSC (Next-Action) - Page ${page}`);

            // STRATEGI UTAMA: POST RSC (Next.js Server Action)
            const url = `${this.baseUrl}/provider/dramabox2`;

            // Helper parse RSC: ekstrak JSON list drama dari response RSC text
            const parseRscContent = (content) => {
                const found = [];
                if (!content || content.length < 10) return found;

                // --- FORMAT BARU (2025+): RSC stream format ---
                // RSC terbaru vidrama.asia menggunakan field id, title, cover dalam "list":[]
                // RSC dikirim sebagai baris terpisah, misal: 1:{"list":[{...}],"hasMore":true}
                try {
                    // Split per baris RSC (setiap baris dimulai dengan digit:JSON)
                    const lines = content.split('\n');
                    for (const line of lines) {
                        // Format RSC: "N:{...}" atau "{...}"
                        const jsonPart = line.replace(/^\d+:/, '').trim();
                        if (!jsonPart.startsWith('{') && !jsonPart.startsWith('[')) continue;
                        try {
                            const parsed = JSON.parse(jsonPart);
                            // Cari field "list" di dalam objek (bisa nested)
                            const checkObj = (obj) => {
                                if (!obj || typeof obj !== 'object') return;
                                if (Array.isArray(obj.list) && obj.list.length > 0) {
                                    for (const item of obj.list) {
                                        if (item.id && item.title && !found.find(d => d.id === String(item.id))) {
                                            let rawCover = (item.cover || '').replace(/\\u0026/g, '&').replace(/\\/g, '');
                                            found.push({
                                                id: String(item.id),
                                                title: item.title,
                                                cover: rawCover ? `https://wsrv.nl/?url=${encodeURIComponent(rawCover)}&w=300&output=webp` : '',
                                                provider: 'dramabox2'
                                            });
                                        }
                                    }
                                }
                                // Cek level satu ke dalam (untuk objek wrapper)
                                for (const key of Object.keys(obj)) {
                                    if (typeof obj[key] === 'object' && Array.isArray(obj[key]?.list)) {
                                        checkObj(obj[key]);
                                    }
                                }
                            };
                            checkObj(parsed);
                        } catch (_) { /* skip baris invalid */ }
                    }
                } catch (_) { }

                if (found.length > 0) return found;

                // --- FORMAT LAMA (fallback): Regex shortPlayId/shortPlayName/shortPlayCover ---
                const rscPattern1 = /"shortPlayId":"(\d+)","shortPlayName":"([^"]+)","shortPlayCover":"([^"]+)"/g;
                let m;
                while ((m = rscPattern1.exec(content)) !== null) {
                    const id = m[1];
                    let rawCover = m[3].replace(/\\u0026/g, '&').replace(/\\/g, '');
                    if (!found.find(d => d.id === id)) {
                        found.push({
                            id,
                            title: m[2],
                            cover: `https://wsrv.nl/?url=${encodeURIComponent(rawCover)}&w=300&output=webp`,
                            provider: 'dramabox2'
                        });
                    }
                }

                if (found.length > 0) return found;

                // --- FALLBACK 2: Regex id/title/cover (format generik) ---
                // Untuk RSC yang menampilkan item individual bukan dalam list block
                const rscPattern2 = /"id":"(\d{10,15})","title":"([^"]+)","cover":"(https?:[^"]+)"/g;
                while ((m = rscPattern2.exec(content)) !== null) {
                    const id = m[1];
                    const rawCover = m[3].replace(/\\u0026/g, '&').replace(/\\/g, '');
                    if (!found.find(d => d.id === id)) {
                        found.push({
                            id,
                            title: m[2],
                            cover: rawCover ? `https://wsrv.nl/?url=${encodeURIComponent(rawCover)}&w=300&output=webp` : '',
                            provider: 'dramabox2'
                        });
                    }
                }

                return found;
            };

            const postRsc = async (actionId, payload, useAuth = true) => {
                // Bangun cookie string: gabungkan cf_clearance + sessionCookie
                const cookieParts = [];
                if (this.cfClearance) cookieParts.push(`cf_clearance=${this.cfClearance}`);
                if (this.sessionCookie) cookieParts.push(this.sessionCookie.replace(/^cookie:\s*/i, '').trim());
                const cookieStr = cookieParts.join('; ');

                const headers = {
                    'content-type': 'text/plain;charset=UTF-8',
                    'next-action': actionId,
                    'accept': 'text/x-component',
                    // Header RSC wajib agar server mengembalikan data RSC bukan HTML
                    'rsc': '1',
                    'next-router-state-tree': encodeURIComponent(JSON.stringify([["",["__PAGE__",{}],[],null],null,null,null,true])),
                    // User-Agent desktop Chrome lebih dipercaya oleh Cloudflare
                    'User-Agent': this.desktopUa,
                    'Referer': `${this.baseUrl}/provider/dramabox2`,
                    'Origin': this.baseUrl,
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                };
                if (cookieStr) headers['Cookie'] = cookieStr;
                if (useAuth && stardustTVService.accessToken) {
                    const randomIP = `114.122.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
                    headers['Authorization'] = `Bearer ${stardustTVService.accessToken}`;
                    headers['X-Forwarded-For'] = randomIP;
                    headers['X-Real-IP'] = randomIP;
                }

                return await axios({
                    method: 'POST',
                    url,
                    data: payload,
                    headers,
                    timeout: 25000,
                    maxRedirects: 5,
                });
            };

            let dramas = [];
            let content = '';

            // Percobaan 1: POST RSC dengan Next-Action ID saat ini (format baru: [page, "in"])
            const payloads = [
                `[${page},"in"]`,   // format baru
                `[0,${page}]`,       // format lama
            ];

            for (const payload of payloads) {
                if (dramas.length > 0) break;
                try {
                    const res = await postRsc(this.nextActionHome, payload, true);
                    content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                    console.log(`[Dramabox2] RSC Content Length (payload=${payload}): ${content.length}`);
                    dramas = parseRscContent(content);
                } catch (e1) {
                    console.warn(`[Dramabox2] POST auth gagal (${e1.message}), coba tanpa auth...`);
                    try {
                        const res = await postRsc(this.nextActionHome, payload, false);
                        content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                        dramas = parseRscContent(content);
                    } catch (e2) {
                        console.warn(`[Dramabox2] POST tanpa auth juga gagal: ${e2.message}`);
                    }
                }
            }

            // Percobaan 2: Auto-discover Action ID lalu retry
            if (dramas.length === 0) {
                console.warn(`[Dramabox2] ⚠️ RSC POST empty. Auto-discovering Next-Action ID...`);
                const discoveredId = await this._getActionId('provider/dramabox2');
                if (discoveredId && discoveredId !== this.nextActionHome) {
                    console.log(`[Dramabox2] 🔑 Discovered new Action ID: ${discoveredId}, retrying...`);
                    this.nextActionHome = discoveredId; // Update ID for future calls
                    for (const payload of payloads) {
                        if (dramas.length > 0) break;
                        try {
                            const res = await postRsc(discoveredId, payload, false);
                            content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                            dramas = parseRscContent(content);
                        } catch (e3) {
                            console.warn(`[Dramabox2] Discovery retry failed: ${e3.message}`);
                        }
                    }
                }
            }

            console.log(`[Dramabox2] ✅ Total found from Vidrama: ${dramas.length} dramas.`);
            return dramas;
        } catch (e) {
            console.error(`[Dramabox2] getHome Error: ${e.message}`);
            return [];
        }
    }

    async getDetail(id) {
        try {
            console.log(`[Dramabox2] 🔍 Fetching Detail via API: ${id}`);

            // Jalur API bersih yang ditemukan oleh investigasi browser
            const apiUrl = `${this.baseUrl}/api/dramabox2/detail?bookId=${id}&lang=in`;
            
            try {
                const apiRes = await axios.get(apiUrl, {
                    headers: { 'Accept': 'application/json' }
                });

                const json = apiRes.data;
                const data = json?.data || json;

                if (data && (data.id || data.title)) {
                    console.log(`[Dramabox2] ✅ Found detail via REST API: ${apiUrl}`);

                    let rawChapters = data.episodesList || data.episodes || data.chapters || data.list || [];
                    const episodes = rawChapters.map((ch, idx) => ({
                        id: String(ch.id || ch.episodeId || idx + 1),
                        index: Number(ch.index || idx + 1),
                        title: ch.name || ch.title || `Episode ${ch.index || idx + 1}`,
                        videoAddress: ""
                    }));

                    return {
                        id: String(data.id || id),
                        title: data.title || 'Dramabox2 Drama',
                        cover: (data.cover || '').replace(/\\/g, ''),
                        description: data.description || data.intro || "",
                        episodes: episodes.sort((a, b) => a.index - b.index),
                        totalEpisodes: data.chapterCount || episodes.length,
                        provider: 'dramabox2'
                    };
                }
            } catch (apiErr) {
                console.warn(`[Dramabox2] API Detail failed: ${apiErr.message}`);
            }

            // Fallback: Scraping HTML (Jika API gagal)
            console.log(`[Dramabox2] 🔍 Falling back to HTML Scraping for Detail: ${id}`);
            const url = `${this.baseUrl}/movie/drama--${id}?provider=dramabox2&lang=in`;
            const res = await this._requestWithAuth({
                method: 'GET',
                url,
                headers: { 'Accept': 'text/html' }
            });

            const html = String(res.data);
            
            const titleMatch = html.match(/"twitter:title","content":"(.*?)"/) || 
                               html.match(/<h1.*?>(?:<.*?>)?(.*?)(?:<\/.*?>)?<\/h1>/) || 
                               html.match(/"title":"(.*?)"/);
            
            const descMatch = html.match(/"og:description","content":"(.*?)"/) || 
                              html.match(/<p class=".*?">(.*?)<\/p>/) || 
                              html.match(/"description":"(.*?)"/);
            
            const coverMatch = html.match(/"og:image","content":"(.*?)"/) || 
                               html.match(/"cover":"(.*?)"/);

            const totalEpMatch = html.match(/(\d+)\s+episode tersedia/) || html.match(/"episodes":(\d+)/);
            const totalEpisodes = totalEpMatch ? parseInt(totalEpMatch[1]) : 0;

            const epRegex = /\{"id":"(episode--\d+)","index":(\d+),"name":"(.*?)"/g;
            const episodes = [];
            let m;
            while ((m = epRegex.exec(html)) !== null) {
                episodes.push({
                    id: m[1].replace('episode--', ''),
                    index: parseInt(m[2]),
                    title: m[3] || `Episode ${m[2]}`,
                    videoAddress: ""
                });
            }

            if (episodes.length === 0 && totalEpisodes > 0) {
                for (let i = 1; i <= totalEpisodes; i++) {
                    episodes.push({ id: String(i), index: i, title: `Episode ${i}`, videoAddress: "" });
                }
            }

            return {
                id,
                title: titleMatch ? titleMatch[1] : 'Dramabox2 Drama',
                cover: coverMatch ? coverMatch[1].replace(/\\/g, '') : '',
                description: descMatch ? descMatch[1] : "",
                episodes: episodes.sort((a, b) => a.index - b.index),
                totalEpisodes: Math.max(episodes.length, totalEpisodes),
                provider: 'dramabox2'
            };
        } catch (e) {
            console.error(`[Dramabox2] getDetail Global Error: ${e.message}`);
            return null;
        }
    }

    async getStream(dramaId, chapterId) {
        try {
            console.log(`[Dramabox2] 🎥 Original Stream for ID: ${dramaId}, Episode: ${chapterId}`);

            // Bersihkan ID dari prefix jika ada
            const cleanDramaId = String(dramaId).replace('drama--', '');
            // chapterId di sini seringkali adalah index di frontend baru
            const cleanEpIndex = String(chapterId).replace('episode--', '');

            // API Watch asli Vidrama untuk Dramabox2
            // bookId=42000008498&episode=1
            const url = `${this.baseUrl}/api/dramabox2/watch?bookId=${cleanDramaId}&episode=${cleanEpIndex}&direction=1&lang=in`;
            
            const res = await axios.get(url, {
                headers: { 
                    'Accept': 'application/json',
                    'Referer': `${this.baseUrl}/watch/drama--${cleanDramaId}/${cleanEpIndex}?provider=dramabox2&lang=in`
                }
            });

            const vidData = res.data?.data || res.data;
            // Dramabox2 asli sering mengembalikan play_url atau url langsung
            let playUrl = vidData.play_url || vidData.playUrl || vidData.url || vidData.videoUrl || vidData.play_url_720p || vidData._h264 || vidData._h265;

            if (playUrl) {
                if (playUrl.startsWith('/')) playUrl = `https://vidrama.asia${playUrl}`;
                console.log(`[Dramabox2] ✅ Original Stream Found: ${playUrl}`);
                return { 
                    url: playUrl, 
                    subtitle: vidData.subtitle || '' 
                };
            }
            
            console.warn('[Dramabox2] Stream not found in response:', JSON.stringify(vidData).slice(0, 200));
            return null;
        } catch (e) {
            console.error(`[Dramabox2] getStream Error: ${e.message}`);
            return null;
        }
    }

    async search(keyword) {
        try {
            console.log(`[Dramabox2] 🔎 Searching Original: ${keyword}`);
            // Gunakan API search melolo/meloshort tapi filter provider 'dramabox2' di frontend (opsional)
            // Atau coba cari endpoint search khusus dramabox2 jika ada
            const res = await axios.get(`${this.baseUrl}/api/melolo?action=search&keyword=${encodeURIComponent(keyword)}`, {
                headers: { 'Accept': 'application/json' }
            });

            const data = res.data?.data || res.data;
            const items = (Array.isArray(data) ? data : []).map(item => ({
                id: String(item.id),
                title: item.title,
                cover: (item.cover || '').replace(/\\/g, ''),
                provider: 'dramabox2'
            }));

            return items;
        } catch (e) {
            console.error(`[Dramabox2] search Error: ${e.message}`);
            return [];
        }
    }
}

export default new Dramabox2Service();
