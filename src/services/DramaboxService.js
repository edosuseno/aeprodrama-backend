import BaseProvider from './BaseProvider.js';
import axios from 'axios';
import Drama from '../models/Drama.js';
import mongoose from 'mongoose';

class DramaboxService extends BaseProvider {
    constructor() {
        super('Dramabox', 'https://api.sansekai.my.id/api/dramabox');
    }

    async getHome() {
        try {
            console.log(`[Dramabox] Fetching Home (Sansekai)`);
            const data = await this._pureRequest(`${this.baseUrl}/homepage`);
            if (data && (data.data || (Array.isArray(data) && data.length > 0))) {
                return data?.data || data;
            }
        } catch (e) {
            console.warn(`[Dramabox] Home Sansekai Failed: ${e.message}`);
            return [];
        }
    }

    async getForYou() {
        const data = await this._pureRequest(`${this.baseUrl}/foryou`);
        return Array.isArray(data) ? data : (data?.data || []);
    }

    async getTrending() {
        const data = await this._pureRequest(`${this.baseUrl}/trending`);
        return Array.isArray(data) ? data : (data?.data || []);
    }

    async getLatest() {
        const data = await this._pureRequest(`${this.baseUrl}/latest`);
        return Array.isArray(data) ? data : (data?.data || []);
    }

    async getDubIndo() {
        let items = [];
        try {
            const data = await this._pureRequest(`${this.baseUrl}/dubindo`, {
                classify: 'terbaru',
                page: '1'
            });
            items = Array.isArray(data) ? data : (data?.data || []);
        } catch (e) {
            console.warn(`[Dramabox] DubIndo failed: ${e.message}`);
        }

        if (items.length === 0) {
            console.log(`[Dramabox] DubIndo empty, falling back to search "Indo"`);
            items = await this.search("Indo");
        }

        return items;
    }

    async getExplore(page = 1) {
        try {
            console.log(`[Dramabox] Fetching Explore (Sansekai) Page: ${page}`);
            const sansekaiData = await this._pureRequest(`${this.baseUrl}/foryou`, { page });
            const items = Array.isArray(sansekaiData) ? sansekaiData : (sansekaiData?.data || []);

            if (items && items.length > 0) {
                console.log(`[Dramabox] Explore: Got ${items.length} items from Sansekai`);
                return items;
            }

            return [];
        } catch (e) {
            console.error(`[Dramabox] Explore Critical Error: ${e.message}`);
            return [];
        }
    }

    async search(query) {
        try {
            console.log(`[Dramabox] Search Sansekai (Primary): ${query}`);
            const data = await this._pureRequest(`${this.baseUrl}/search`, { query });
            const items = Array.isArray(data) ? data : (data?.data || []);
            if (items.length > 0) return items;
        } catch (e) {
            console.warn(`[Dramabox] Search Sansekai failed: ${e.message}`);
        }
        return [];
    }

    async getDetail(bookId) {
        let data = null;
        // Priority 1: Sansekai
        try {
            console.log(`[Dramabox] Fetching Detail (Sansekai Query): ${bookId}`);
            data = await this._pureRequest(`${this.baseUrl}/detail`, { bookId });
            data = data?.data || data;
        } catch (e) { }

        if (!data) {
            try {
                console.log(`[Dramabox] Fetching Detail (Sansekai Path): ${bookId}`);
                data = await this._pureRequest(`${this.baseUrl}/detail/${bookId}`);
                data = data?.data || data;
            } catch (e) { }
        }

        // Save Background
        if (data && mongoose.connection.readyState === 1) {
            const title = data.bookName || data.title;
            const cover = data.coverWap || data.cover;
            if (title) {
                Drama.findOne({ bookId: bookId.toString() }).then(exists => {
                    if (!exists) {
                        new Drama({
                            bookId: bookId.toString(),
                            source: 'dramabox',
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
        let items = [];
        // Priority: Sansekai (Primary)
        const sansekaiUrls = [
            `${this.baseUrl}/allepisode/${bookId}`,
            `${this.baseUrl}/all/${bookId}`,
            `${this.baseUrl}/allepisode?bookId=${bookId}`
        ];
        for (const url of sansekaiUrls) {
            try {
                console.log(`[Dramabox] Fetching Episodes (Sansekai): ${url}`);
                const data = await this._pureRequest(url);
                items = this._extractEpisodeList(data);
                if (items && items.length > 0) break;
            } catch (e) { }
        }

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

        // Background update if we found hidden links
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

        // Cari quality 720p atau default
        const path = defaultCdn.videoPathList.find(v => v.quality === 720 || v.isDefault === 1) || defaultCdn.videoPathList[0];
        return path?.videoPath || null;
    }

    _extractEpisodeList(res) {
        if (!res) return [];
        return res.data || res.items || res.list || res.chapterList || (Array.isArray(res) ? res : []);
    }

    async getPlayUrl(bookId, chapterId) {
        // 1. Coba fetch Link segar dari Sansekai /play (Modern)
        try {
            console.log(`[Dramabox] Fetching Play link from Sansekai: ${bookId}/${chapterId}`);
            const playRes = await this._pureRequest(`${this.baseUrl}/play/${bookId}/${chapterId}`);
            let videoUrl = playRes?.videoUrl || playRes?.data?.videoUrl || playRes?.data?.playUrl;
            if (videoUrl) {
                if (videoUrl.includes('.encrypt.mp4') || videoUrl.includes('etavirp_nuyila')) {
                    console.log(`[Dramabox] Encrypted detected, applying Sansekai Decryptor...`);
                    videoUrl = `https://api.sansekai.my.id/api/dramabox/decrypt?url=${encodeURIComponent(videoUrl)}`;
                }
                this._updateEpisodeLink(bookId, chapterId, videoUrl);
                return videoUrl;
            }
        } catch (e) {
            console.warn(`[Dramabox] Sansekai Play API failed for ${chapterId}: ${e.message}`);
        }

        // 2. Cek DB Cache (Lama)
        try {
            if (mongoose.connection.readyState === 1) {
                const bank = await Drama.findOne({ bookId: bookId.toString() });
                if (bank && bank.episodes) {
                    const epInBank = bank.episodes.find(e =>
                        e.chapterId == chapterId.toString() ||
                        e.chapterIndex == parseInt(chapterId)
                    );

                    if (epInBank && epInBank.videoUrl) {
                        console.log(`[Dramabox] Hit Cache: ${bookId}/${chapterId}`);
                        return epInBank.videoUrl;
                    }
                }
            }
        } catch (e) { }

        // Sansekai Fallback (Primary Try Again)
        try {
            const playRes = await this._pureRequest(`${this.baseUrl}/watch?bookId=${bookId}&chapterId=${chapterId}`);
            let videoUrl = playRes?.videoUrl || playRes?.data?.videoUrl;
            if (videoUrl) {
                if (videoUrl.includes('.encrypt.mp4') || videoUrl.includes('etavirp_nuyila')) {
                    videoUrl = `https://api.sansekai.my.id/api/dramabox/decrypt?url=${encodeURIComponent(videoUrl)}`;
                }
                this._updateEpisodeLink(bookId, chapterId, videoUrl);
                return videoUrl;
            }
        } catch (e) { }

        return null;
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
            console.error(`[Dramabox] Error update link:`, e.message);
        }
    }
}

export default new DramaboxService();
