import BaseProvider from './BaseProvider.js';

class NetshortService extends BaseProvider {
    constructor() {
        super('Netshort', 'https://api.sansekai.my.id/api/netshort');
    }

    async getTheaters() {
        let rawData = await this._pureRequest(`${this.baseUrl}/theaters`);
        const sourceData = rawData?.data || rawData;
        if (!sourceData) return { data: [] };

        const list = (Array.isArray(sourceData) ? sourceData : []).map((group) => ({
            groupId: group.groupId,
            groupName: group.contentName || group.groupName || "Section",
            contentRemark: group.contentRemark,
            dramas: (group.contentInfos || group.dramas || []).map((item) => ({
                shortPlayId: item.shortPlayId || item.id,
                shortPlayLibraryId: item.shortPlayLibraryId,
                title: item.shortPlayName || item.title,
                cover: item.shortPlayCover || item.groupShortPlayCover || item.cover,
                labels: item.labelArray || item.labels || [],
                heatScore: item.heatScoreShow || item.heatScore || "",
                scriptName: item.scriptName,
                totalEpisodes: item.totalEpisode || item.totalEpisodes || 0,
            })),
        }));

        return { data: list };
    }

    async getForyou(page = 1) {
        let raw = await this._pureRequest(`${this.baseUrl}/foryou`, { page });
        const source = raw?.data || raw;
        if (!source) return { data: [] };

        const items = source.contentInfos || source.items || (Array.isArray(source) ? source : []);

        const dramas = items.map((item) => ({
            shortPlayId: item.shortPlayId || item.id,
            shortPlayLibraryId: item.shortPlayLibraryId,
            title: item.shortPlayName || item.title,
            cover: item.shortPlayCover || item.cover,
            labels: item.labelArray || item.labels || [],
            heatScore: item.heatScoreShow || item.heatScore || "",
            scriptName: item.scriptName,
            totalEpisodes: item.totalEpisode || item.totalEpisodes || 0,
        }));

        return {
            data: dramas,
            maxOffset: source.maxOffset,
            completed: source.completed,
        };
    }

    async getDetail(shortPlayId) {
        const paths = [
            { url: `${this.baseUrl}/allepisode`, params: { shortPlayId } }
        ];

        console.log(`[Netshort] Fetching Detail for ${shortPlayId}...`);

        const data = await Promise.any(paths.map(p => 
            this._pureRequest(p.url, p.params).then(res => {
                const finalData = res?.data || res;
                if (!finalData || (!finalData.shortPlayName && !finalData.title && !finalData.shortPlayId)) {
                    throw new Error('Invalid Netshort data');
                }
                return finalData;
            })
        )).catch(() => null);

        if (!data) return null;

        const episodes = (data.shortPlayEpisodeInfos || data.episodes || []).map((ep) => ({
            episodeId: ep.episodeId || ep.id,
            episodeNo: ep.episodeNo || ep.index,
            cover: ep.episodeCover || ep.cover,
            videoUrl: ep.playVoucher || ep.videoUrl,
            quality: ep.playClarity || ep.quality || "720p",
            isLock: ep.isLock ?? ep.locked,
            likeNums: ep.likeNums || "0",
            subtitleUrl: ep.subtitleList?.[0]?.url || ep.subtitleUrl || "",
        }));

        return {
            success: true,
            shortPlayId: data.shortPlayId || data.id,
            shortPlayLibraryId: data.shortPlayLibraryId,
            title: data.shortPlayName || data.title,
            cover: data.shortPlayCover || data.cover,
            description: data.shotIntroduce || data.description,
            labels: data.shortPlayLabels || data.labels || [],
            totalEpisodes: data.totalEpisode || data.totalEpisodes,
            isFinish: data.isFinish === 1 || data.isFinish === true,
            payPoint: data.payPoint || 0,
            episodes,
        };
    }

    async search(keyword) {
        let items = [];
        const params = { query: keyword, keyword: keyword };

        // Priority: Sansekai (Primary)
        try {
            const raw = await this._pureRequest(`${this.baseUrl}/search`, params);
            const data = raw?.data || raw;
            if (data) {
                items = data.searchCodeSearchResult || data.contentInfos || data.items || data.list || (Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error(`[Netshort] Sansekai search failed: ${e.message}`);
        }

        const cleanText = (str) => typeof str === 'string' ? str.replace(/<[^>]*>/g, '').trim() : str;

        const list = (Array.isArray(items) ? items : []).map((item) => ({
            shortPlayId: item.shortPlayId || item.id,
            shortPlayLibraryId: item.shortPlayLibraryId,
            title: cleanText(item.shortPlayName || item.title || item.name),
            cover: item.shortPlayCover || item.cover || item.image || item.poster,
            labels: (Array.isArray(item.labelArray) ? item.labelArray :
                Array.isArray(item.labels) ? item.labels :
                    typeof item.labelNames === 'string' ? item.labelNames.split(',').filter(Boolean).map(cleanText) :
                        typeof item.labels === 'string' ? item.labels.split(',').filter(Boolean).map(cleanText) : []),
            heatScore: item.heatScoreShow || item.heatScore || item.popularityValue || "",
            scriptName: cleanText(item.scriptName),
            totalEpisodes: item.totalEpisode || item.totalEpisodes || 0,
        }));

        return { data: list };
    }
}

export default new NetshortService();
