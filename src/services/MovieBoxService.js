import BaseProvider from './BaseProvider.js';

class MovieBoxService extends BaseProvider {
    constructor() {
        super('MovieBox', 'https://api.sansekai.my.id/api/moviebox');

        // Initial Cache
        this.homeCache = null;
        this.lastHomeFetch = 0;
        this.detailCache = new Map();
        this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes
    }

    _log(msg) {
        console.error(`[MovieBox] ${msg}`);
    }

    // Helper to normalize movie items
    _normalizeItem(item) {
        if (!item) return null;
        const node = item.subject || item;
        let finalId = item.subjectId || node.subjectId || node.id || item.id;

        return {
            id: String(finalId),
            title: node.title || item.title || "Unknown Title",
            poster: node.cover?.url || node.cover || node.poster || item.image || "",
            quality: node.quality || "",
            rating: node.imdbRating || node.rating || "",
            year: node.releaseDate ? new Date(node.releaseDate).getFullYear() : (node.year || ""),
            type: node.subjectType === 1 || node.subjectType === 'Movie' ? 'Movie' : (node.subjectType === 2 || node.subjectType === 'Series' ? 'Series' : 'Movie')
        };
    }

    async getHomepage() {
        const now = Date.now();
        if (this.homeCache && (now - this.lastHomeFetch < this.CACHE_TTL)) {
            return { data: this.homeCache };
        }

        try {
            this._log('Fetching Homepage via Sansekai...');
            const data = await this._pureRequest(`${this.baseUrl}/homepage`);

            this._log(`Homepage raw response keys: ${Object.keys(data || {}).join(', ')}`);

            let allItems = [];

            // Try multiple data sources
            const sources = [
                data.operatingList || [],
                data.homeList || [],
                data.topPickList || []
            ];

            sources.forEach((sourceArray, sourceIndex) => {
                if (Array.isArray(sourceArray) && sourceArray.length > 0) {
                    this._log(`Processing source ${sourceIndex} with ${sourceArray.length} sections`);

                    sourceArray.forEach(row => {
                        // Extract items from various structures
                        let sectionItems = [];

                        if (row.items) sectionItems = sectionItems.concat(row.items);
                        if (row.subjects) sectionItems = sectionItems.concat(row.subjects);
                        if (row.banner && row.banner.items) sectionItems = sectionItems.concat(row.banner.items);

                        sectionItems.forEach(item => {
                            const norm = this._normalizeItem(item);
                            if (norm && norm.title && norm.id) {
                                allItems.push(norm);
                            }
                        });
                    });
                }
            });

            this._log(`Total items collected: ${allItems.length}`);

            // Deduplicate items by ID
            const uniqueItems = [];
            const seenIds = new Set();
            for (const item of allItems) {
                if (!seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    uniqueItems.push(item);
                }
            }

            this._log(`Unique items after dedup: ${uniqueItems.length}`);
            this.homeCache = uniqueItems;
            this.lastHomeFetch = now;
            return { data: uniqueItems };
        } catch (e) {
            this._log(`Home Error: ${e.message}`);
            return { data: this.homeCache || [] };
        }
    }

    async getTrending() {
        try {
            const data = await this._pureRequest(`${this.baseUrl}/trending`);
            const list = Array.isArray(data) ? data : (data.data || []);
            let items = list.map(s => this._normalizeItem(s)).filter(i => i && i.title);

            if (items.length === 0) {
                const home = await this.getHomepage();
                items = home.data.slice(0, 15);
            }
            return { data: items };
        } catch (e) {
            return { data: [] };
        }
    }

    async search(keyword) {
        try {
            const data = await this._pureRequest(`${this.baseUrl}/search`, { query: keyword });
            const list = Array.isArray(data) ? data : (data.data || data.items || []);
            const items = list.map(s => this._normalizeItem(s)).filter(i => i && i.title);
            return { data: items };
        } catch (e) {
            return { data: [] };
        }
    }

    async getDetail(id) {
        if (this.detailCache.has(String(id))) {
            return { data: this.detailCache.get(String(id)) };
        }

        this._log(`Fetching detail for ID: ${id}`);
        let raw = await this._pureRequest(`${this.baseUrl}/detail`, { subjectId: id });
        let data = raw?.data || raw || {};

        let node = data.subject || data;
        const isEmpty = !data || (typeof data === 'object' && Object.keys(data).length === 0);
        const isInvalid = !node.title || node.title === 'Unknown Title';

        if (isEmpty || isInvalid) {
            this._log(`ID ${id} is invalid, recovering via title search...`);
            try {
                const homeRes = await this.getHomepage();
                const targetHeader = homeRes.data.find(i => String(i.id) === String(id));

                if (targetHeader && targetHeader.title) {
                    this._log(`Recovering title: ${targetHeader.title}`);
                    const searchRes = await this.search(targetHeader.title);
                    if (searchRes.data && searchRes.data.length > 0) {
                        const real = searchRes.data[0];
                        this._log(`New Real ID: ${real.id}`);
                        let retryRaw = await this._pureRequest(`${this.baseUrl}/detail`, { subjectId: real.id });
                        data = retryRaw?.data || retryRaw || real;
                        node = data.subject || data;
                    }
                }
            } catch (err) { this._log(`Recovery Error: ${err.message}`); }
        }

        // Extract episodes
        let episodes = [];
        if (data.resource && data.resource.seasons) {
            data.resource.seasons.forEach(s => {
                const epCount = s.maxEp || (s.resolutions ? Math.max(...s.resolutions.map(r => r.epNum || 0)) : 0);
                if (epCount > 0) {
                    for (let i = 1; i <= epCount; i++) {
                        episodes.push({ id: String(i), title: `Episode ${i}`, season: s.se });
                    }
                }
            });
        }

        const finalData = {
            id: id,
            realId: node.subjectId || data.subjectId || data.id || id,
            title: node.title || "Unknown Title",
            poster: node.cover?.url || node.cover || node.poster || "",
            synopsis: node.description || node.intro || "",
            genre: Array.isArray(node.genre) ? node.genre : (typeof node.genre === 'string' ? node.genre.split(',').map(s => s.trim()) : []),
            rating: node.imdbRating || node.rating || "",
            release: node.releaseDate || node.year || "",
            duration: node.duration ? `${Math.round(node.duration / 60)} min` : "",
            type: node.subjectType === 1 ? 'Movie' : (node.subjectType === 2 ? 'Series' : 'Movie'),
            cast: (data.stars || node.stars || []).map(s => s.name),
            episodes: episodes.length > 0 ? episodes : null
        };

        if (finalData.title && finalData.title !== 'Unknown Title') {
            this.detailCache.set(String(id), finalData);
        }

        return { data: finalData };
    }

    async getSources(id, episodeId = null) {
        let targetId = id;
        let cached = null;

        if (this.detailCache.has(String(id))) {
            cached = this.detailCache.get(String(id));
            targetId = cached.realId || id;
        } else {
            const det = await this.getDetail(id);
            cached = det.data;
            if (cached && cached.realId) targetId = cached.realId;
        }

        this._log(`Sources for ${targetId} (${cached?.title || 'Unknown'})`);
        const params = { subjectId: targetId };
        if (episodeId) params.episodeId = episodeId;

        // Long timeout for sources
        const raw = await this._pureRequest(`${this.baseUrl}/sources`, params, 2);
        const data = raw?.data || raw || {};

        let sources = [];
        const referer = data.referer || "https://h5.aoneroom.com";

        // 1. Process processedSources
        const processed = data.processedSources || data.data?.processedSources;
        if (Array.isArray(processed)) {
            processed.forEach(s => {
                const url = s.directUrl || s.url;
                if (url) {
                    sources.push({
                        url,
                        quality: s.quality ? (String(s.quality).includes('p') ? s.quality : `${s.quality}p`) : "HD",
                        isM3U8: url.includes('.m3u8') || url.includes('/playlist.m3u8'),
                        referer
                    });
                }
            });
        }

        // 2. Fallback to resource.seasons
        if (sources.length === 0 && data.resource && data.resource.seasons) {
            const season = episodeId ? data.resource.seasons.find(s => s.resolutions?.some(r => r.epNum == episodeId)) : data.resource.seasons[0];
            if (season?.resolutions) {
                season.resolutions.forEach(res => {
                    if (episodeId && res.epNum != episodeId) return;
                    sources.push({
                        url: res.url || "",
                        quality: `${res.resolution}p`,
                        isM3U8: (res.url || "").includes('.m3u8'),
                        referer
                    });
                });
            }
        }

        // 3. Link Generation for Path-only URLs
        for (let s of sources) {
            if (s.url && !s.url.startsWith('http')) {
                this._log(`Generating Real Link for path: ${s.url}`);
                try {
                    const gen = await this.generateStream(s.url);
                    const genData = gen.data?.data || gen.data || gen;
                    if (genData && (genData.file || genData.url)) {
                        s.url = genData.file || genData.url;
                        s.isM3U8 = s.url.includes('.m3u8');
                    }
                } catch (e) { }
            }
        }

        this._log(`Found ${sources.length} sources.`);
        return { data: sources };
    }

    async generateStream(url) {
        const raw = await this._pureRequest(`${this.baseUrl}/generate-link-stream-video`, { url });
        return { data: raw };
    }
}

export default new MovieBoxService();
