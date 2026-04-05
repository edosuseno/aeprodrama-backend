import BaseProvider from './BaseProvider.js';
import axios from 'axios';
import stardustTVService from './StardustTVService.js';

class MeloShortService extends BaseProvider {
    constructor() {
        super('MeloShort', 'https://vidrama.asia');
        // Cookie opsional
        const cleanEnv = (v) => (process.env[v] || '').replace(/\r\n|\r|\n/g, '').trim();
        this.sessionCookie = cleanEnv('VIDRAMA_COOKIE') || cleanEnv('VELOLO_COOKIE') || '';
    }

    async _requestWithAuth(config) {
        try {
            // Spoof IP Indonesia
            const randomIP = `114.122.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

            // KUNCI SAKTI: Gunakan token yang sama dengan StardustTV (dan biarkan StardustTV yang me-refresh-nya)
            let currentToken = stardustTVService.accessToken;

            const baseHeaders = {
                'Authorization': `Bearer ${currentToken}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'X-Forwarded-For': randomIP,
                'X-Real-IP': randomIP,
                'Origin': 'https://vidrama.asia',
                'Referer': 'https://vidrama.asia/',
                ...(config.headers || {})
            };
            if (this.sessionCookie) baseHeaders['Cookie'] = this.sessionCookie;

            const res = await axios({ ...config, headers: baseHeaders, timeout: 15000 });

            // Jika token expired (401/403), coba refresh via stardustTVService dan retry sekali
            if (res.status === 401 || res.status === 403 || res.data?.error === 'invalid_token') {
                console.log('[MeloShort] Token expired, requesting refresh from StardustTV...');
                await stardustTVService._refreshAccessToken();
                baseHeaders['Authorization'] = `Bearer ${stardustTVService.accessToken}`;
                return await axios({ ...config, headers: baseHeaders, timeout: 15000 });
            }

            return res;
        } catch (error) {
            // Jika error adalah 401/403 dari axios, coba refresh juga
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log('[MeloShort] Token rejected (401/403), refreshing via StardustTV...');
                await stardustTVService._refreshAccessToken();
                const randomIP2 = `114.122.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
                const retryHeaders = {
                    ...config.headers,
                    'Authorization': `Bearer ${stardustTVService.accessToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-Forwarded-For': randomIP2,
                    'X-Real-IP': randomIP2,
                    'Origin': 'https://vidrama.asia',
                    'Referer': 'https://vidrama.asia/'
                };
                if (this.sessionCookie) retryHeaders['Cookie'] = this.sessionCookie;
                return await axios({ ...config, headers: retryHeaders, timeout: 15000 });
            }

            console.error(`[MeloShort] Upstream Error: ${error.message}`);
            throw error;
        }
    }

    async getHome(page = 1) {
        // Endpoint REST API — tidak kena Cloudflare bot detection seperti RSC POST
        // StardustTV juga pakai /api/ endpoint dan terbukti lolos dari Vercel
        const endpoints = [
            `${this.baseUrl}/api/meloshort?action=list&page=${page}&page_size=30`,
            `${this.baseUrl}/api/melolo?action=list&page=${page}&page_size=30`,
        ];

        for (const url of endpoints) {
            try {
                console.log(`[MeloShort] 🚀 Fetching Home via GET: ${url}`);
                const res = await this._requestWithAuth({ method: 'GET', url });

                let raw = res.data;
                if (typeof raw === 'string') {
                    try { raw = JSON.parse(raw); } catch (_) {}
                }

                // Format respons: { dramas: [...] } atau { data: [...] } atau array langsung
                const items =
                    raw?.dramas ||
                    raw?.data ||
                    raw?.list ||
                    raw?.items ||
                    (Array.isArray(raw) ? raw : null);

                if (Array.isArray(items) && items.length > 0) {
                    const dramas = items.map(item => {
                        let originalCover = (item.cover || item.image || item.thumb_url || '').replace(/\\/g, '');
                        // Gunakan wsrv.nl untuk bypass Cloudflare Hotlinking protection di Vercel
                        // Seringkali kartu dianggap "hilang" karena gambar diblokir (403), padahal datanya ada.
                        let proxiedCover = originalCover ? `https://wsrv.nl/?url=${encodeURIComponent(originalCover)}&w=300&output=webp` : '';

                        return {
                            id: String(item.id || item.intId || ''),
                            title: item.title || item.name || '',
                            cover: proxiedCover || originalCover,
                            provider: 'meloshort'
                        };
                    }).filter(d => d.id && d.title);

                    console.log(`[MeloShort] ✅ Found ${dramas.length} dramas from: ${url}`);
                    return dramas;
                }
            } catch (e) {
                console.warn(`[MeloShort] ⚠️ getHome failed at ${url}: ${e.message}`);
            }
        }

        console.error('[MeloShort] getHome: semua endpoint gagal');
        return [];
    }

    async getDetail(id) {
        try {
            console.log(`[MeloShort] 🔍 Fetching Detail ID: ${id}`);

            // Try meloshort first, then fallback to melolo
            const endpoints = [
                `${this.baseUrl}/api/meloshort?action=detail&id=${id}`,
                `${this.baseUrl}/api/melolo?action=detail&id=${id}`
            ];

            let data = null;
            for (const url of endpoints) {
                console.log(`[MeloShort] 🌐 Trying endpoint: ${url}`);
                try {
                    const res = await this._requestWithAuth({ method: 'GET', url });

                    let rawData = res.data;
                    if (typeof rawData === 'string') {
                        try { rawData = JSON.parse(rawData); } catch (e) { }
                    }

                    const currentData = rawData?.data || rawData;

                    // Check if we got valid data
                    if (currentData && (currentData.id || currentData.title)) {
                        data = currentData;
                        console.log(`[MeloShort] ✅ Found data at: ${url}`);
                        break;
                    }
                } catch (e) {
                    console.log(`[MeloShort] ⚠️ Failed at ${url}: ${e.message}`);
                }
            }

            if (!data) {
                console.warn('[MeloShort] ⚠️ No data found on any endpoint for ID:', id);
                return null;
            }

            // Extract episodes from various possible fields, ensuring it is an array
            let rawChapters = [];
            const possibleFields = ['episodes', 'episodeList', 'chapters', 'chapterList', 'list', 'data'];

            for (const field of possibleFields) {
                if (data[field] && Array.isArray(data[field])) {
                    rawChapters = data[field];
                    break;
                }
            }

            const episodes = rawChapters.map((ch, idx) => ({
                id: String(ch.id || ch.chapterId || ch.episodeId || ''),
                index: Number(ch.index || ch.chapterIndex || ch.episodeIndex || idx + 1),
                title: ch.name || ch.chapterName || ch.title || ch.episodeName || `Episode ${ch.index || idx + 1}`,
                videoAddress: ""
            }));

            episodes.sort((a, b) => a.index - b.index);

            return {
                id: String(data.id || id),
                title: data.title || data.name || '',
                cover: (data.cover || data.poster || data.verticalCover || '').replace(/\\/g, ''),
                description: data.description || data.intro || data.synopsis || data.summary || "",
                episodes: episodes,
                totalEpisodes: Number(data.totalEpisodes || data.chapters || rawChapters.length || 0),
                provider: 'meloshort'
            };
        } catch (e) {
            console.error(`[MeloShort] getDetail Error: ${e.message}`);
            return null;
        }
    }

    async getStream(dramaId, chapterId) {
        try {
            console.log(`[MeloShort] 🎥 Fetching Stream for ID: ${dramaId}, Chapter: ${chapterId}`);

            const endpoints = [
                `${this.baseUrl}/api/meloshort?action=episode_video&dramaId=${dramaId}&chapterId=${chapterId}`,
                `${this.baseUrl}/api/melolo?action=episode_video&dramaId=${dramaId}&chapterId=${chapterId}`
            ];

            let playUrl = null;
            let finalVidData = null;
            const mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

            for (const url of endpoints) {
                try {
                    const res = await this._requestWithAuth({
                        method: 'GET',
                        url,
                        headers: { 'User-Agent': mobileUa }
                    });
                    const vidData = res.data?.data || res.data;

                    playUrl = vidData.play_url_720p || 
                              vidData.play_url_1080p ||
                              vidData._h265 ||
                              vidData._h264 ||
                              vidData.play_url || 
                              vidData.playUrl || 
                              vidData.videoUrl ||
                              vidData.video_url ||
                              vidData.url;

                    if (playUrl) {
                        finalVidData = vidData;
                        console.log(`[MeloShort] ✅ Stream found at: ${url}`);
                        break;
                    }
                } catch (e) {
                    console.log(`[MeloShort] ⚠️ Stream fetch failed at ${url}: ${e.message}`);
                }
            }

            if (playUrl) {
                // Pastikan URL absolute
                if (playUrl.startsWith('/')) {
                    playUrl = `https://vidrama.asia${playUrl}`;
                }

                let subtitle = '';
                if (finalVidData && finalVidData.sublist && finalVidData.sublist.length > 0) {
                    const indoSub = finalVidData.sublist.find(s => s.language === 'ind-ID' || s.languageId === 23) || finalVidData.sublist[0];
                    if (indoSub && indoSub.url) {
                        subtitle = indoSub.url;
                        if (subtitle.startsWith('/')) subtitle = `https://vidrama.asia${subtitle}`;
                    }
                }

                return {
                    url: playUrl,
                    subtitle: subtitle
                };
            }
            return null;
        } catch (e) {
            console.error(`[MeloShort] getStream Error: ${e.message}`);
            return null;
        }
    }

    async search(keyword) {
        console.log(`[MeloShort] 🔎 Searching (via Melolo Aggregator): ${keyword}`);
        try {
            // Gunakan _pureRequest untuk bypass Token yang rawan Expired / 401 Unauthorized
            const data = await this._pureRequest(`https://vidrama.asia/api/melolo`, {
                action: 'search',
                keyword: keyword
            }, 2, {
                forceReferer: 'https://vidrama.asia/'
            });

            const list = data?.dataList || data?.rows || data?.data || data || [];
            
            const items = (Array.isArray(list) ? list : []).map(item => {
                const id = item.id || item.intId || item.dramaId || item.short_play_id || '';
                const title = item.name || item.title || item.book_name || '';
                let cover = item.image || item.cover || item.thumb_url || item.poster || '';
                
                if (cover && !cover.startsWith('http')) {
                    cover = `https://vidrama.asia${cover.startsWith('/') ? '' : '/'}${cover}`;
                }

                // Cegah double wsrv.nl yang bikin error 404
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
                    provider: 'meloshort'
                };
            }).filter(i => i.id && i.title);

            console.log(`[MeloShort] ✅ Found ${items.length} items for "${keyword}"`);
            return items;
        } catch (e) {
            console.error(`[MeloShort] search Error: ${e.message}`);
            return [];
        }
    }
}

export default new MeloShortService();
