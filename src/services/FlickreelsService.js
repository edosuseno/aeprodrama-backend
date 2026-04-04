import BaseProvider from './BaseProvider.js';

class FlickreelsService extends BaseProvider {
    constructor() {
        super('Flickreels', 'https://api.sansekai.my.id/api/flickreels');
    }

    async getExplore(page = 1) {
        let raw = await this._pureRequest(`${this.baseUrl}/explore`, { page }, { forceReferer: 'https://www.flickreels.com/' });

        if (raw?.data?.list) return raw.data.list;
        if (raw?.list) return raw.list;
        if (Array.isArray(raw)) return raw;
        return [];
    }

    async getForyou() {
        const raw = await this._pureRequest(`${this.baseUrl}/foryou`, {}, { forceReferer: 'https://www.flickreels.com/' });
        if (raw?.data?.list) return raw;
        if (raw?.list) return { data: { list: raw.list } };
        if (Array.isArray(raw)) return { data: { list: raw } };
        return { data: { list: [] } };
    }

    async getLatest() {
        const raw = await this._pureRequest(`${this.baseUrl}/latest`, {}, { forceReferer: 'https://www.flickreels.com/' });
        if (Array.isArray(raw?.data)) return raw;
        if (Array.isArray(raw)) return { data: raw };
        return { data: [] };
    }

    async getHotrank() {
        const raw = await this._pureRequest(`${this.baseUrl}/hotrank`, {}, { forceReferer: 'https://www.flickreels.com/' });
        if (Array.isArray(raw?.data)) return raw;
        if (Array.isArray(raw)) return { data: raw };
        return { data: [] };
    }

    async getDetail(id) {
        const data = await this._pureRequest(`${this.baseUrl}/detailAndAllEpisode`, { id }, { forceReferer: 'https://www.flickreels.com/' });
        if (!data || !data.data) return data;

        const info = data.data.info || {};
        const episodes = (data.data.list || []).map((ep) => ({
            id: ep.id?.toString() || ep.chapter_id?.toString(),
            name: ep.chapter_title || `Episode ${ep.chapter_num}`,
            index: ep.chapter_num,
            unlock: true,
            raw: {
                chapter_id: ep.chapter_id?.toString(),
                chapter_num: ep.chapter_num,
                is_lock: 0,
                chapter_cover: ep.chapter_cover,
                introduce: ep.introduce,
                chapter_title: ep.chapter_title,
                videoUrl: ep.video_url || ep.video_path || ep.videoUrl || "",
            },
        }));

        return {
            drama: {
                title: info.title || info.name,
                cover: info.cover || info.image,
                description: info.introduce || info.description,
                chapterCount: info.total_num || info.chapterCount || episodes.length,
                labels: info.playlet_tag_name || [],
                viewCount: info.hot_num || 0,
                source: "FlickReels",
            },
            episodes,
        };
    }

    async search(query) {
        let items = [];
        const params = { query, keyword: query };

        // Priority: Sansekai (Primary)
        try {
            const raw = await this._pureRequest(`${this.baseUrl}/search`, params, 2, { forceReferer: 'https://www.flickreels.com/' });
            const data = raw?.data || raw;
            items = data?.list || (Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(`[FlickReels] Sansekai Search failed: ${e.message}`);
        }

        const cleanText = (str) => typeof str === 'string' ? str.replace(/<[^>]*>/g, '').trim() : str;

        const list = (Array.isArray(items) ? items : []).map(item => ({
            playlet_id: item.playlet_id || item.id || item.shortPlayId,
            title: cleanText(item.title || item.name || item.shortPlayName),
            cover: item.cover || item.image || item.imageWap || item.shortPlayCover,
            introduce: cleanText(item.introduce || item.description || item.summary || item.shotIntroduce || ""),
            tagNames: (Array.isArray(item.playlet_tag_name) ? item.playlet_tag_name : (item.tags || item.labels || [])).map(cleanText)
        }));

        return { data: list };
    }
}

export default new FlickreelsService();
