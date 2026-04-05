import BaseProvider from './BaseProvider.js';
import axios from 'axios';
import stardustTVService from './StardustTVService.js';

class Dramabox2Service extends BaseProvider {
    constructor() {
        super('Dramabox2', 'https://vidrama.asia');
        // KUNCI IPHONE - Bypass Cloudflare di Vercel
        this.iphoneUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
        // Updated Next-Action ID from browser inspection
        this.nextActionHome = "60b3687be7816ff646b5d17573993209051413fd56";
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
                'Accept': config.headers?.Accept || 'text/x-component',
                'Next-Action': config.headers?.['Next-Action'] || '',
                ...(config.headers || {})
            };

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
                const retryHeaders = {
                    ...config.headers,
                    'Authorization': `Bearer ${stardustTVService.accessToken}`,
                    'User-Agent': this.iphoneUa,
                    'X-Forwarded-For': `114.122.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                    'Origin': 'https://vidrama.asia',
                    'Referer': 'https://vidrama.asia/'
                };
                return await axios({ ...config, headers: retryHeaders, timeout: 30000 });
            }

            console.error(`[Dramabox2] Req Error: ${error.message}`);
            throw error;
        }
    }

    async getHome(page = 1) {
        try {
            console.log(`[Dramabox2] 🚀 Fetching Home (Original Dramabox2 RSC) - Page ${page}`);

            // Gunakan RSC POST dengan Action ID terbaru
            const res = await this._requestWithAuth({
                method: 'POST',
                url: `${this.baseUrl}/provider/dramabox2?lang=in&page=${page}`,
                headers: {
                    'Next-Action': this.nextActionHome,
                    'Content-Type': 'text/plain;charset=UTF-8'
                },
                data: JSON.stringify([page])
            });

            const rawData = String(res.data);

            // Regex untuk menangkap data dari stream RSC
            // Format: {"id":"42000008498","title":"...","cover":"..."}
            const dramaRegex = /\{"id":"(\d+)","title":"(.*?)"(.*?)"cover":"(.*?)"/g;
            const dramas = [];
            let m;
            while ((m = dramaRegex.exec(rawData)) !== null) {
                const id = m[1];
                const title = m[2];
                const cover = m[4].replace(/\\/g, '');

                if (!dramas.find(d => d.id === id)) {
                    dramas.push({
                        id,
                        title,
                        cover: cover || '',
                        provider: 'dramabox2'
                    });
                }
            }

            // Jika RSC gagal (kosong), fallback ke scraping HTML sederhana jika diperlukan
            if (dramas.length === 0) {
                console.warn('[Dramabox2] RSC response was empty, trying HTML Scraping fallback...');
                const htmlRes = await this._requestWithAuth({
                    method: 'GET',
                    url: `${this.baseUrl}/provider/dramabox2?lang=in&page=${page}`,
                    headers: { 'Accept': 'text/html' }
                });
                const html = String(htmlRes.data);
                const htmlRegex = /href="\/movie\/.*?--(\d+)\?provider=dramabox2.*?>(.*?)<\/a>/g;
                while ((m = htmlRegex.exec(html)) !== null) {
                    const id = m[1];
                    const title = m[2].trim();
                    if (!dramas.find(d => d.id === id)) {
                        dramas.push({ id, title, cover: '', provider: 'dramabox2' });
                    }
                }
            }

            console.log(`[Dramabox2] ✅ Found ${dramas.length} dramas from original source.`);
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
                const apiRes = await this._requestWithAuth({
                    method: 'GET',
                    url: apiUrl,
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

            const res = await this._requestWithAuth({
                method: 'GET',
                url,
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
            const res = await this._requestWithAuth({
                method: 'GET',
                url: `${this.baseUrl}/api/melolo?action=search&keyword=${encodeURIComponent(keyword)}`,
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
