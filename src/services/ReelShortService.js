import BaseProvider from './BaseProvider.js';
import Drama from '../models/Drama.js';
import mongoose from 'mongoose';

class ReelShortService extends BaseProvider {
    constructor() {
        super('ReelShort', 'https://api.sansekai.my.id/api/reelshort');
        this.megaweBase = 'https://api.megawe.net/api/reelshort';
    }

    async getHome() {
        let data = null;

        // Coba Sansekai /homepage (Primary)
        try {
            console.log(`[ReelShort] Fetching Home (Sansekai)`);
            const res = await this._pureRequest(`${this.baseUrl}/homepage`);
            data = res?.data || res;
            if (data && (data.lists || (Array.isArray(data) && data.length > 0))) {
                return data;
            }
        } catch (e) {
            console.warn(`[ReelShort] Sansekai Home failed: ${e.message}`);
        }

        return [];
    }

    async getExplore(page = 1) {
        try {
            console.log(`[ReelShort] Fetching Explore (Sansekai) Page: ${page}`);
            // Use /foryou instead of /explore because /explore returns HTML
            let data = await this._pureRequest(`${this.baseUrl}/foryou`, { page });

            // Extract logic
            if (data?.data?.lists) return data.data.lists;
            if (data?.lists) return data.lists;
            return Array.isArray(data) ? data : (data?.data || []);
        } catch (e) {
            console.error(`[ReelShort] Explore Failed: ${e.message}`);
            return [];
        }
    }

    async getForyou(page = 1) {
        return this.getExplore(page);
    }

    async getHotrank() {
        // Fallback to explore/foryou since hotrank fails
        return this.getExplore(1);
    }

    async getLatest() {
        // Fallback to explore/foryou since latest fails
        return this.getExplore(1);
    }

    async search(query) {
        let items = [];
        const params = { query, keyword: query };

        // Priority: Sansekai
        try {
            const data = await this._pureRequest(`${this.baseUrl}/search`, params);
            items = Array.isArray(data) ? data : (data?.results || data?.data || data?.items || data?.list || []);
        } catch (e) {
            console.error(`[ReelShort] Sansekai Search failed: ${e.message}`);
        }

        // Normalize to ReelShort format if needed (book_id, book_title, book_pic)
        return items.map(item => ({
            ...item,
            book_id: item.book_id || item.id || item.shortPlayId || item.bookId,
            book_title: item.book_title || item.title || item.bookName || item.shortPlayName,
            book_pic: item.book_pic || item.cover || item.coverWap || item.bookPic || item.poster,
            special_desc: item.special_desc || item.introduction || item.description || item.abstract || ""
        }));
    }

    async getDetail(bookId) {
        // Taktik Racing: Coba beberapa jalur sekaligus untuk kecepatan maksimal
        const paths = [
            { url: `${this.baseUrl}/detail`, params: { bookId } },
            { url: `${this.baseUrl}/detail/${bookId}`, params: {} }
        ];

        console.log(`[ReelShort] Racing Detail for ${bookId}...`);
        
        // Kita gunakan yang pertama kali sukses memberikan data valid
        const data = await Promise.any(paths.map(p => 
            this._pureRequest(p.url, p.params).then(res => {
                const finalData = res?.data || res;
                if (!finalData || (!finalData.bookName && !finalData.title && !finalData.bookId)) {
                    throw new Error('Invalid ReelShort data');
                }
                return finalData;
            })
        )).catch(() => null);

        // Save Background
        if (data && mongoose.connection.readyState === 1) {
            const title = data.bookName || data.title;
            const cover = data.coverWap || data.cover;
            if (title) {
                Drama.findOne({ bookId: bookId.toString() }).then(exists => {
                    if (!exists) {
                        new Drama({
                            bookId: bookId.toString(),
                            source: 'reelshort',
                            title: title,
                            cover: cover,
                            totalEpisodes: data.chapterCount || data.totalEpisodes,
                            lastUpdated: new Date()
                        }).save().catch(() => { });
                    }
                });
            }
        }
        return data;
    }

    async getAllEpisodes(bookId) {
        const urls = [
            `${this.baseUrl}/allepisode/${bookId}`,
            `${this.baseUrl}/allepisode?bookId=${bookId}`,
            `${this.baseUrl}/detail?bookId=${bookId}`, // Tambahan: Sansekai sering taruh episode di detail
            `${this.baseUrl}/all/${bookId}`
        ];

        console.log(`[ReelShort] Racing Episodes for ${bookId}...`);

        const items = await Promise.any(urls.map(url => 
            this._pureRequest(url).then(res => {
                const list = this._extractEpisodeList(res);
                if (!list || list.length === 0) throw new Error('Empty episodes');
                return list;
            })
        )).catch(() => []);

        const mapped = items.map((item, idx) => {
            const videoUrl = item.videoUrl || item.mp4 || item.m3u8Url || this._extractVideoFromCdn(item.cdnList);
            const chapterIndex = item.chapterIndex !== undefined ? item.chapterIndex : (item.index !== undefined ? item.index : idx + 1);

            return {
                chapterId: item.chapterId || item.id,
                title: item.chapterName || item.title || `Episode ${chapterIndex}`,
                chapterIndex: chapterIndex,
                isLocked: item.isLocked || item.isCharge || false,
                videoUrl: videoUrl || null,
                cdnList: item.cdnList || []
            };
        });

        // Background update cache
        mapped.forEach(ep => {
            if (ep.videoUrl) {
                this._updateEpisodeLink(bookId, ep.chapterId, ep.videoUrl);
            }
        });

        return mapped;
    }

    _extractVideoFromCdn(cdnList) {
        if (!Array.isArray(cdnList) || cdnList.length === 0) return null;
        const defaultCdn = cdnList.find(c => c.isDefault === 1) || cdnList[0];
        if (!defaultCdn || !defaultCdn.videoPathList) return null;
        const path = defaultCdn.videoPathList.find(v => v.quality === 720 || v.isDefault === 1) || defaultCdn.videoPathList[0];
        return path?.videoPath || null;
    }

    _extractEpisodeList(res) {
        if (!res) return [];
        // [FIX] Ditambahkan field 'chapters' untuk kompatibilitas Sansekai Reelshort terbaru
        return res.data || res.items || res.list || res.chapterList || res.chapters || (Array.isArray(res) ? res : []);
    }

    async watch(bookId, chapterId) {
        // 1. Cek DB Cache
        try {
            if (mongoose.connection.readyState === 1) {
                const bank = await Drama.findOne({ bookId: bookId.toString() });
                if (bank && bank.episodes) {
                    const epInBank = bank.episodes.find(e =>
                        e.chapterId == chapterId.toString() ||
                        e.chapterIndex == parseInt(chapterId)
                    );

                    if (epInBank && epInBank.videoUrl) {
                        console.log(`[ReelShort] Hit Cache: ${bookId}/${chapterId}`);
                        return { videoUrl: epInBank.videoUrl, title: epInBank.title };
                    }
                }
            }
        } catch (e) { }

        // 2. Priority: Sansekai (Direct)
        const formatUrls = [
            `${this.baseUrl}/watch?bookId=${bookId}&chapterId=${chapterId}`,
            `${this.baseUrl}/episode?bookId=${bookId}&episodeNumber=${chapterId}`,
            `${this.baseUrl}/play/${bookId}/${chapterId}`
        ];

        for (const url of formatUrls) {
            try {
                console.log(`[ReelShort] Try Format Sansekai: ${url}`);
                const playRes = await this._pureRequest(url);
                const videoUrl = playRes?.videoUrl || playRes?.data?.videoUrl || (Array.isArray(playRes?.videoList) ? playRes.videoList[0]?.url : null) || this._extractVideoFromCdn(playRes?.cdnList || playRes?.data?.cdnList);

                if (videoUrl) {
                    this._updateEpisodeLink(bookId, chapterId, videoUrl);
                    return { ...playRes, videoUrl };
                }
            } catch (e) { }
        }

        return null;
    }

    async getEpisode(bookId, chapterId) {
        return this.watch(bookId, chapterId);
    }

    async _updateEpisodeLink(bookId, chapterId, videoUrl) {
        if (!videoUrl || mongoose.connection.readyState !== 1) return;
        try {
            const newEpisode = {
                chapterId: chapterId.toString(),
                videoUrl: videoUrl,
                isUnlocked: true,
                lastUpdated: new Date()
            };

            await Drama.updateOne(
                { bookId: bookId.toString() },
                {
                    $set: { lastUpdated: new Date() },
                    $pull: { episodes: { chapterId: chapterId.toString() } }
                }
            );

            await Drama.updateOne(
                { bookId: bookId.toString() },
                { $push: { episodes: newEpisode } }
            );
        } catch (e) {
            console.error(`[ReelShort] Error update link:`, e.message);
        }
    }
}

export default new ReelShortService();
