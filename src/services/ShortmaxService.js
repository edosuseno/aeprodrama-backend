import axios from 'axios';
import BaseProvider from './BaseProvider.js';
import stardustTVService from './StardustTVService.js';

class ShortmaxService extends BaseProvider {
    constructor() {
        super('Shortmax', 'https://vidrama.asia');
        this.actions = {
            LIST: '406d8e0caefc77495a4c251c1367b17ccf461cb2d9',
            STREAM: '6030279ed2c8d20df120bee45db93351134e494326',
            SEARCH: '60337c4531b9f311ec45cf952b4117795937743e1b'
        };
        this.sessionCookie = null;
        this.lastCookieRefresh = 0;
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
                'Referer': config.url || 'https://vidrama.asia/',
                ...(config.headers || {})
            };
            if (this.sessionCookie) baseHeaders['Cookie'] = this.sessionCookie;

            const res = await axios({ ...config, headers: baseHeaders, timeout: 20000 });

            if (res.status === 401 || res.status === 403 || res.data?.error === 'invalid_token') {
                console.log('[Shortmax] Token expired, refreshing via StardustTV...');
                await stardustTVService._refreshAccessToken();
                baseHeaders['Authorization'] = `Bearer ${stardustTVService.accessToken}`;
                return await axios({ ...config, headers: baseHeaders, timeout: 20000 });
            }

            return res;
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log('[Shortmax] Auth rejected, refreshing via StardustTV...');
                await stardustTVService._refreshAccessToken();
                const retryHeaders = {
                    ...config.headers,
                    'Authorization': `Bearer ${stardustTVService.accessToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Origin': 'https://vidrama.asia',
                    'Referer': config.url || 'https://vidrama.asia/'
                };
                if (this.sessionCookie) retryHeaders['Cookie'] = this.sessionCookie;
                return await axios({ ...config, headers: retryHeaders, timeout: 20000 });
            }
            throw error;
        }
    }

    _parseRsc(text, targetKey) {
        if (!text || typeof text !== 'string') return null;
        try {
            const dataToSearch = text.replace(/\\r/g, ''); 
            const keyIdx = dataToSearch.indexOf('\"' + targetKey + '\"');
            if (keyIdx === -1) return null;
            const startIdx = dataToSearch.lastIndexOf('{', keyIdx);
            if (startIdx === -1) return null;
            let jsonStr = dataToSearch.substring(startIdx);
            let bracketCount = 0;
            let endIdx = -1;
            for (let i = 0; i < jsonStr.length; i++) {
                if (jsonStr[i] === '{') bracketCount++;
                else if (jsonStr[i] === '}') {
                    bracketCount--;
                    if (bracketCount === 0) {
                        endIdx = i + 1;
                        break;
                    }
                }
            }
            if (endIdx !== -1) {
                const finalJson = jsonStr.substring(0, endIdx);
                try {
                    return JSON.parse(finalJson);
                } catch (parseErr) {
                    const cleaned = finalJson.replace(/^[^\{]+/, '');
                    return JSON.parse(cleaned);
                }
            }
        } catch (e) {
            console.error(`[Shortmax] Parsing RSC failed: ${e.message}`);
        }
        return null;
    }

    async _getNewSession() {
        try {
            console.log(`[Shortmax] Obtaining session from Vidrama...`);
            const res = await this._requestWithAuth({
                method: 'GET',
                url: `${this.baseUrl}/provider/shortmax`,
                timeout: 15000
            });
            const cookies = res.headers['set-cookie'];
            if (cookies) {
                this.sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
                this.lastCookieRefresh = Date.now();
                console.log(`[Shortmax] Session updated`);
            }
        } catch (e) {
            console.error(`[Shortmax] Failed to get session: ${e.message}`);
        }
    }

    async _callAction(actionId, payload, dynamicUrl = null) {
        const url = dynamicUrl || `${this.baseUrl}/provider/shortmax`;
        if (!this.sessionCookie || (Date.now() - this.lastCookieRefresh > 300000)) {
            await this._getNewSession();
        }
        try {
            const res = await this._requestWithAuth({
                method: 'POST',
                url,
                data: JSON.stringify(payload),
                responseType: 'text',
                headers: {
                    'Accept': 'text/x-component',
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'Next-Action': actionId,
                    'Next-Router-State-Tree': '%5Bnull%2Cnull%2Cnull%2Cnull%5D'
                }
            });
            return res.data;
        } catch (e) {
            console.error(`[Shortmax] Action ${actionId} failed: ${e.message}`);
            return null;
        }
    }

    async getHome(page = 1) {
        console.log(`[Shortmax] Fetching Home (RSC)...`);
        try {
            const rsc = await this._callAction(this.actions.LIST, ['recommend']);
            const data = this._parseRsc(rsc, 'dataList');
            if (data && Array.isArray(data.dataList)) {
                return data.dataList.map(item => ({
                    id: String(item.shortPlayId || item.id),
                    shortPlayId: String(item.shortPlayId || item.id),
                    title: (item.title || item.shortPlayName || '').replace(/^\[.*?\]/, '').trim(),
                    cover: item.cover || item.shortPlayCover || '',
                    totalEpisodes: item.episodeCount || 0,
                    provider: 'shortmax'
                }));
            }
        } catch (e) { }
        return [];
    }

    async getLatest(page = 1) {
        console.log(`[Shortmax] Fetching Latest (RSC)...`);
        return this.getHome(page);
    }

    async getForyou(page = 1) {
        return this.getHome(page);
    }

    async getDetail(id) {
        console.log(`[Shortmax] Fetching Detail (RSC): ${id}...`);
        try {
            // Coba dari list rekomendasi dulu (cepat)
            const rsc = await this._callAction(this.actions.LIST, ['recommend']);
            const data = this._parseRsc(rsc, 'dataList');
            const drama = data?.dataList?.find(d => String(d.shortPlayId) === String(id));
            if (drama) {
                const episodes = [];
                const total = drama.episodeCount || 0;
                for (let i = 1; i <= total; i++) episodes.push({ id: String(i), index: i, title: 'Episode ' + i });
                return {
                    id: String(drama.shortPlayId),
                    shortPlayId: String(drama.shortPlayId),
                    title: (drama.title || drama.shortPlayName).replace(/^\[.*?\]/, '').trim(),
                    cover: drama.cover || drama.shortPlayCover || '',
                    description: drama.introduction || '',
                    totalEpisodes: total,
                    updateEpisode: total,
                    episodes: episodes,
                    provider: 'shortmax'
                };
            }

            // Fallback: Fetch halaman movie langsung (Scraping/RSC GET)
            // Format ID: sl--847688 (biasanya hanya angka pun tak masalah jika provider=shortmax)
            const movieUrl = `${this.baseUrl}/movie/drama--${id}?provider=shortmax`;
            const res = await this._requestWithAuth({ method: 'GET', url: movieUrl });
            const html = res.data.toString();
            
            // Ekstrak Title, Cover, Synopsis dari HTML/RSC
            const titleMatch = html.match(/class[Nn]ame\\":\\"[^\\"]+title\\",\\"children\\":\\"([^\\"]+?)\\"/) || html.match(/\\"shortPlayName\\":\\"([^\\"]+?)\\"/) || html.match(/"og:title"\s+content="([^"]+)"/);
            const coverMatch = html.match(/\\"shortPlayCover\\":\\"([^\\"]+?)\\"/) || html.match(/"og:image"\s+content="([^"]+)"/);
            const introMatch = html.match(/\\"shortPlayIntroduction\\":\\"([^\\"]+?)\\"/) || html.match(/"og:description"\s+content="([^"]+)"/);
            const totalMatch = html.match(/\\"totalEpisodes\\":(\d+)/);

            if (titleMatch) {
                const total = totalMatch ? parseInt(totalMatch[1]) : 0;
                const episodes = [];
                for (let i = 1; i <= total; i++) episodes.push({ id: String(i), index: i, title: 'Episode ' + i });
                return {
                    id: String(id),
                    shortPlayId: String(id),
                    title: titleMatch[1].replace(/\\"/g, '"').trim(),
                    cover: coverMatch ? coverMatch[1].replace(/\\u0026/g, '&') : '',
                    description: introMatch ? introMatch[1].replace(/\\"/g, '"') : '',
                    totalEpisodes: total,
                    updateEpisode: total,
                    episodes: episodes,
                    provider: 'shortmax'
                };
            }
        } catch (e) {
            console.error(`[Shortmax] Detail error: ${e.message}`);
        }
        return null;
    }

    async getStream(dramaId, episodeNumber) {
        console.log(`[Shortmax] Fetching Stream (RSC): ${dramaId} Ep ${episodeNumber}...`);
        try {
            const watchUrl = `${this.baseUrl}/watch/drama--${dramaId}/${episodeNumber}?provider=shortmax`;
            
            const rsc = await this._callAction(this.actions.STREAM, [String(dramaId), parseInt(episodeNumber)], watchUrl);
            const data = this._parseRsc(rsc, 'videoUrl');
            if (data && (data.videoUrl || data.url)) {
                let playUrl = data.videoUrl || data.url;
                
                // Jika sudah diproksi oleh Vidrama, ambil URL aslinya agar diproksi oleh Backend kita sendiri
                if (playUrl.includes('/api/shortmax/proxy?url=')) {
                    try {
                        const urlObj = new URL(playUrl);
                        const originalUrl = urlObj.searchParams.get('url');
                        if (originalUrl) playUrl = decodeURIComponent(originalUrl);
                    } catch (e) {}
                }
                
                // Struktur konsisten: url (top-level) + episode.videoUrl (nested)
                // Ini memastikan baik route shortmax.js maupun Watch Page bisa membacanya
                return { 
                    url: playUrl, 
                    episode: { videoUrl: playUrl },
                    subtitles: data.subtitles || [],
                    subtitle: data.subtitle || null,
                    provider: 'shortmax' 
                };
            }
        } catch (e) { 
            console.error(`[Shortmax] getStream error: ${e.message}`);
        }
        return null;
    }

    async search(keyword) {
        return [];
    }

    async getCategories() {
        return [
            { id: 'all', name: 'Semua' },
            { id: 'recommend', name: 'Rekomendasi' }
        ];
    }
}

export default new ShortmaxService();
