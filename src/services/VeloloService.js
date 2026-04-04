import BaseProvider from './BaseProvider.js';
import axios from 'axios';
import stardustTVService from './StardustTVService.js';

class VeloloService extends BaseProvider {
    constructor() {
        super('Velolo', 'https://vidrama.asia');
        const cleanEnv = (v) => (process.env[v] || '').replace(/\r\n|\r|\n/g, '').trim();
        this.sessionCookie = cleanEnv('VIDRAMA_COOKIE') || cleanEnv('VELOLO_COOKIE') || '';
    }

    async _requestWithAuth(config) {
        try {
            const randomIP = `114.122.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
            let currentToken = stardustTVService.accessToken;

            const baseHeaders = {
                'Authorization': `Bearer ${currentToken}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'X-Forwarded-For': randomIP,
                'X-Real-IP': randomIP,
                'Origin': 'https://vidrama.asia',
                'Referer': 'https://vidrama.asia/provider/velolo',
                ...(config.headers || {})
            };
            if (this.sessionCookie) baseHeaders['Cookie'] = this.sessionCookie;

            const res = await axios({ ...config, headers: baseHeaders, timeout: 15000 });

            if (res.status === 401 || res.status === 403 || res.data?.error === 'invalid_token') {
                console.log('[Velolo] Token expired, refreshing via StardustTV...');
                await stardustTVService._refreshAccessToken();
                baseHeaders['Authorization'] = `Bearer ${stardustTVService.accessToken}`;
                return await axios({ ...config, headers: baseHeaders, timeout: 15000 });
            }
            return res;
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log('[Velolo] Auth rejected, refreshing via StardustTV...');
                await stardustTVService._refreshAccessToken();
                const retryHeaders = {
                    ...config.headers,
                    'Authorization': `Bearer ${stardustTVService.accessToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Origin': 'https://vidrama.asia',
                    'Referer': 'https://vidrama.asia/provider/velolo'
                };
                return await axios({ ...config, headers: retryHeaders, timeout: 15000 });
            }
            throw error;
        }
    }

    async getHome(page = 1) {
        const endpoints = [
            `${this.baseUrl}/api/velolo/home?lang=id&page=${page}&page_size=30`,
            `${this.baseUrl}/api/velolo?action=list&page=${page}&page_size=25`,
            `${this.baseUrl}/api/melolo?action=list&page=${page}&page_size=25`
        ];

        for (const url of endpoints) {
            try {
                console.log(`[Velolo] 🚀 Home via GET: ${url}`);
                const res = await this._requestWithAuth({ method: 'GET', url });
                let raw = res.data;
                const items = raw?.rows || raw?.dataList || raw?.dramas || raw?.data || raw?.list || (Array.isArray(raw) ? raw : null);

                if (Array.isArray(items) && items.length > 0) {
                    return items.map(item => {
                        let originalCover = (item.cover || item.image || item.thumb_url || item.poster || item.verticalCover || '').replace(/\\/g, '');
                        // Hindari Double Proxy wsrv.nl
                        let coverUrl = originalCover;
                        if (originalCover && !originalCover.includes('wsrv.nl')) {
                            coverUrl = `https://wsrv.nl/?url=${encodeURIComponent(originalCover)}&w=300&output=webp`;
                        }

                        return {
                            id: String(item.id || item.intId || ''),
                            title: item.name || item.title || '',
                            cover: coverUrl,
                            description: item.introduction || item.description || "",
                            chapterCount: item.episode || item.totalEpisodes || 0,
                            provider: 'velolo'
                        };
                    }).filter(d => d.id && d.title);
                }
            } catch (e) {
                console.warn(`[Velolo] ⚠️ Failed at ${url}: ${e.message}`);
            }
        }
        return [];
    }

    async getDetail(id) {
        const endpoints = [
            `${this.baseUrl}/api/velolo/drama/${id}?lang=id`,
            `${this.baseUrl}/api/velolo?action=detail&id=${id}`,
            `${this.baseUrl}/api/melolo?action=detail&id=${id}`
        ];

        let data = null;
        for (const url of endpoints) {
            try {
                const res = await this._requestWithAuth({ method: 'GET', url });
                data = res.data?.data || res.data;
                if (data && (data.id || data.title || data.name)) break;
            } catch (e) {}
        }

        if (!data) return null;

        const info = data.videoInfo || data || {};
        let rawChapters = data.episodesInfo?.rows || data.episodes || data.episodeList || data.chapters || data.list || [];
        
        const episodes = rawChapters.map((ch, idx) => ({
            id: String(ch.id || idx + 1),
            index: Number(ch.index || ch.orderNumber || idx + 1),
            title: ch.name || ch.title || `Episode ${idx + 1}`,
            videoAddress: ch.videoAddress || "",
            subtitle: ch.subtitle || ch.zimu || ""
        })).sort((a, b) => a.index - b.index);

        // Ambil cover yang paling mungkin ada
        let originalCover = (info.cover || info.poster || info.verticalCover || info.thumbnail || info.image || '').replace(/\\/g, '');
        let coverUrl = originalCover;
        if (originalCover && !originalCover.includes('wsrv.nl')) {
            coverUrl = `https://wsrv.nl/?url=${encodeURIComponent(originalCover)}&w=500&output=webp`;
        }

        return {
            id: String(info.id || id),
            title: info.name || info.title || '',
            cover: coverUrl,
            description: info.introduction || info.description || "Drama pendek berkualitas dari Velolo.",
            episodes: episodes,
            totalEpisodes: info.episodeCount || info.totalEpisodes || episodes.length,
            provider: 'velolo'
        };
    }

    async getStream(dramaId, chapterId) {
        try {
            // First try to find in detail if videoAddress is already there
            const detail = await this.getDetail(dramaId);
            if (detail && detail.episodes) {
                const ep = detail.episodes.find(e => e.id === String(chapterId) || e.index === Number(chapterId));
                if (ep && ep.videoAddress) {
                    let streamUrl = ep.videoAddress;
                    if (streamUrl.startsWith('/')) streamUrl = `https://vidrama.asia${streamUrl}`;
                    
                    let subtitle = ep.subtitle || "";
                    let subtitles = [];
                    if (subtitle) {
                        const relativeProxy = `/api/proxy?url=${encodeURIComponent(subtitle)}`;
                        subtitles = [{
                            label: 'Indonesia',
                            language: 'id',
                            url: relativeProxy,
                            format: 'srt'
                        }];
                        subtitle = relativeProxy;
                    }
                    
                    return { url: streamUrl, subtitle: subtitle, subtitles: subtitles };
                }
            }

            const endpoints = [
                `${this.baseUrl}/api/velolo/watch?id=${dramaId}&episodeIndex=${chapterId}`,
                `${this.baseUrl}/api/velolo?action=episode_video&dramaId=${dramaId}&chapterId=${chapterId}`,
                `${this.baseUrl}/api/melolo?action=episode_video&dramaId=${dramaId}&chapterId=${chapterId}`
            ];

            const mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

            for (const url of endpoints) {
                try {
                    const res = await this._requestWithAuth({ method: 'GET', url, headers: { 'User-Agent': mobileUa } });
                    const vid = res.data?.data || res.data;
                    let playUrl = vid.play_url_720p || vid.play_url || vid.videoUrl || vid.url;

                    if (playUrl) {
                        if (playUrl.startsWith('/')) playUrl = `https://vidrama.asia${playUrl}`;
                        const sublist = vid.sublist || vid.sub_list || vid.subtitle_list || [];
                        if (sublist.length > 0) {
                            const findInList = (langs) => sublist.find(s => {
                                const l = (s.language || s.lang || s.label || '').toLowerCase();
                                return langs.some(target => l.includes(target));
                            });

                            const indo = findInList(['id', 'ind', 'bhs', 'indo']) || sublist[0];

                            if (indo?.url) {
                                let sUrl = indo.url.startsWith('/') ? `https://vidrama.asia${indo.url}` : indo.url;
                                // Gunakan proxy backend (absolut) agar support SRT ke VTT dan bypass CORS di lintas domain
                                const relativeProxy = `/api/proxy?url=${encodeURIComponent(sUrl)}`;
                                subtitle = relativeProxy;
                                subtitles = [{
                                    label: 'Indonesia',
                                    language: 'id',
                                    url: relativeProxy,
                                    format: 'srt'
                                }];
                            }
                        }
                        return { url: playUrl, subtitle: subtitle, subtitles: subtitles };
                    }
                } catch (e) {}
            }
            return null;
        } catch (e) { return null; }
    }

    async search(keyword) {
        try {
            const res = await this._requestWithAuth({
                method: 'GET',
                url: `${this.baseUrl}/api/velolo?action=search&keyword=${encodeURIComponent(keyword)}`
            });
            const items = (res.data?.data || res.data || []).map(item => ({
                id: item.id,
                title: item.title || item.name,
                cover: item.cover ? `https://wsrv.nl/?url=${encodeURIComponent(item.cover)}&w=300&output=webp` : '',
                provider: 'velolo'
            }));
            return items;
        } catch (e) { return []; }
    }
}

export default new VeloloService();
