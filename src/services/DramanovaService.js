import BaseProvider from './BaseProvider.js';
import Drama from '../models/Drama.js';
import mongoose from 'mongoose';

/**
 * DRAMANOVA SERVICE
 * Menggunakan API aggregator Sansekai untuk performa yang lebih stabil.
 */
class DramanovaService extends BaseProvider {
    constructor() {
        super('Dramanova', 'https://api.sansekai.my.id/api/dramanova');
    }

    /**
     * Helper untuk memetakan item drama agar sesuai standar frontend
     */
    _mapDramaItem(item) {
        const id = item.dramaId || item.id || item.bookId;
        const title = item.title || item.bookName || item.book_title || item.shortPlayName;
        const rawCover = item.posterImgUrl || item.bookPic || item.cover || item.posterImg;

        return {
            id: String(id),
            title: title || 'Untitled Drama',
            cover: rawCover || '',
            book_id: String(id),
            book_title: title,
            book_pic: rawCover || '',
            chapterCount: item.totalEpisodes || item.chapterCount || item.total_episodes || 0,
            provider: 'dramanova'
        };
    }

    /**
     * Mendapatkan daftar drama di home
     */
    async getHome(pageInput = 1) {
        let allItems = [];
        const maxPages = 2; // Tweak for speed: only fetch 2 pages max in one go
        const startPage = parseInt(pageInput) || 1;

        try {
            console.log(`[Dramanova] 🚀 Scraping Home (Pages ${startPage} to ${startPage + maxPages - 1})`);
            const requests = [];
            for (let p = startPage; p < startPage + maxPages; p++) {
                // Gunakan stealth mode dan bypass antrian berat jika bisa
                requests.push(this._pureRequest(`${this.baseUrl}/home`, { page: p }, 1, { stealth: true }));
            }

            const results = await Promise.allSettled(requests);

            results.forEach(res => {
                if (res.status === 'fulfilled' && res.value) {
                    const data = res.value;
                    const list = data?.rows || data?.data || data || [];
                    if (Array.isArray(list)) {
                        allItems.push(...list.map(item => this._mapDramaItem(item)));
                    }
                }
            });

            const seen = new Set();
            return allItems.filter(item => {
                const id = item.id;
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
            });
        } catch (e) {
            console.warn(`[Dramanova] Home scrape error: ${e.message}`);
        }
        return allItems;
    }

    /**
     * Mendapatkan daftar drama 18+
     */
    async getDrama18(pageInput = 1) {
        let allItems = [];
        const maxPages = 2; // Speed optimization
        const startPage = parseInt(pageInput) || 1;

        try {
            console.log(`[Dramanova] 🚀 Scraping Drama 18+ (Pages ${startPage} to ${startPage + maxPages - 1})`);
            const requests = [];
            for (let p = startPage; p < startPage + maxPages; p++) {
                requests.push(this._pureRequest(`${this.baseUrl}/drama18`, { page: p }, 1, { stealth: true }));
            }

            const results = await Promise.allSettled(requests);

            results.forEach(res => {
                if (res.status === 'fulfilled' && res.value) {
                    const data = res.value;
                    const categories = data?.data || [];
                    if (Array.isArray(categories)) {
                        categories.forEach(cat => {
                            const dramas = cat.recommendModules || [];
                            if (Array.isArray(dramas)) {
                                allItems.push(...dramas.map(item => this._mapDramaItem(item)));
                            }
                        });
                    }
                }
            });

            const seen = new Set();
            return allItems.filter(item => {
                const id = item.id;
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
            });

        } catch (e) {
            console.warn(`[Dramanova] Drama18 scrape error: ${e.message}`);
        }
        return allItems;
    }

    /**
     * Mendapatkan daftar Komik
     */
    async getKomik(page = 1) {
        try {
            console.log(`[Dramanova] 🚀 Fetching Komik (Page ${page})`);
            const data = await this._pureRequest(`${this.baseUrl}/komik`, { page }, 1, { stealth: true });
            const list = data?.rows || data?.data || data || [];

            if (Array.isArray(list)) {
                return list.map(item => this._mapDramaItem(item));
            }
        } catch (e) {
            console.warn(`[Dramanova] Komik error: ${e.message}`);
        }
        return [];
    }

    /**
     * Explore: Default ke 18+ jika diminta, atau home
     */
    async getExplore(page = 1, category = 'all') {
        if (category === 'drama18' || category === '18plus' || category === 'hot') {
            return this.getDrama18(page);
        }
        if (category === 'komik') {
            return this.getKomik(page);
        }
        return this.getHome(page);
    }

    /**
     * Pencarian drama
     */
    async search(query) {
        try {
            console.log(`[Dramanova] Search (Sansekai): ${query}`);
            const data = await this._pureRequest(`${this.baseUrl}/search`, { query });
            const list = data?.rows || data?.data?.rows || data?.data || data || [];

            return list.map(item => this._mapDramaItem(item));
        } catch (e) {
            console.warn(`[Dramanova] Search Error: ${e.message}`);
            return [];
        }
    }

    /**
     * Detail drama
     */
    async getDetail(dramaId) {
        let data = null;
        try {
            console.log(`[Dramanova] Fetching Detail for: ${dramaId}`);
            const res = await this._pureRequest(`${this.baseUrl}/detail`, { dramaId });
            data = res?.data || res;
        } catch (e) {
            console.warn(`[Dramanova] Detail Sansekai failed for ${dramaId}: ${e.message}`);
        }

        if (data) {
            const mapped = this._mapDramaItem(data);

            // Gabungkan data asli dengan mapping standar kita
            Object.assign(data, mapped);

            // Pastikan field deskripsi ada (Dramanova pakai 'synopsis' atau 'description')
            data.introduction = data.synopsis || data.description || "";

            // Background update drama database
            if (mongoose.connection.readyState === 1) {
                Drama.findOne({ bookId: dramaId.toString() }).then(exists => {
                    if (!exists) {
                        new Drama({
                            bookId: dramaId.toString(),
                            source: 'dramanova',
                            title: data.title,
                            cover: data.book_pic,
                            totalEpisodes: data.totalEpisodes,
                            lastUpdated: new Date()
                        }).save().catch(() => { });
                    }
                });
            }
        }
        return data;
    }

    /**
     * Daftar Semua Episode
     */
    /**
     * Daftar Semua Episode
     */
    async getAllEpisodes(dramaId) {
        try {
            console.log(`[Dramanova] Getting All Episodes for: ${dramaId}`);
            const detail = await this.getDetail(dramaId);
            const rawEpisodes = detail?.episodes || detail?.data?.episodes || [];

            return rawEpisodes.map((item, idx) => ({
                id: String(item.id || item.episodeId),
                chapterId: String(item.id || item.episodeId),
                title: item.episodeTitle || `Episode ${item.episodeNumber || idx + 1}`,
                chapterIndex: item.episodeNumber || idx + 1,
                index: item.episodeNumber || idx + 1,
                episodeNumber: item.episodeNumber || idx + 1,
                videoUrl: null,
                isFree: true,
                thumbnail: item.thumbnailImg || null,
                fileId: item.fileId || null,
                subtitles: (item.subtitleTracks || []).map(s => ({
                    label: s.language === 'in' ? 'Indonesia' : (s.language === 'en' ? 'English' : 'Subtitle'),
                    language: s.language === 'in' ? 'id' : (s.language === 'en' ? 'en' : 'id'),
                    url: s.label || s.url || '',
                    format: 'srt'
                }))
            }));
        } catch (e) {
            console.error(`[Dramanova] getAllEpisodes error: ${e.message}`);
            return [];
        }
    }

    /**
     * Link Stream Video
     */
    /**
     * Link Stream Video
     */
    async getStream(dramaId, chapterId) {
        try {
            console.log(`[Dramanova] Fetching Stream for index/id ${chapterId} on drama ${dramaId}`);
            const episodes = await this.getAllEpisodes(dramaId);

            let targetEpisode = null;

            // Check if chapterId matches exactly as index
            const targetIndex = parseInt(chapterId);
            targetEpisode = episodes.find(e => e.episodeNumber == targetIndex || e.index == targetIndex)
                || episodes.find(e => e.id == chapterId || e.chapterId == chapterId)
                || episodes[targetIndex - 1];

            if (!targetEpisode || !targetEpisode.fileId) {
                // If still missing, try searching by id inside the list
                targetEpisode = episodes.find(e => e.id == chapterId || e.chapterId == chapterId);
            }

            if (!targetEpisode || !targetEpisode.fileId) {
                console.warn(`[Dramanova] Cannot find episode or fileId for ${chapterId}`);
                return null;
            }

            console.log(`[Dramanova] Fetching Stream: fileId=${targetEpisode.fileId}`);
            let res = await this._pureRequest(`${this.baseUrl}/getvideo`, { fileId: targetEpisode.fileId }, 1, { stealth: false });

            // LOG RAW RESPONSE FOR DEBUGGING

            // --- EKSTRAKSI SUBTITLE (DENGAN FALLBACK) ---
            let subsData = res?.data?.Result?.SubtitleInfoList || res?.Result?.SubtitleInfoList ||
                res?.data?.Result?.SubtitleList || res?.Result?.SubtitleList ||
                res?.data?.SubtitleInfoList || res?.SubtitleInfoList ||
                res?.data?.subtitles || res?.subtitles || [];


            // Check in multiple places for play url
            const playList = res?.data?.Result?.PlayInfoList || res?.Result?.PlayInfoList || res?.data?.Result?.PlayUrls || [];
            const mainUrl = res?.MainPlayUrl || res?.data?.MainPlayUrl || res?.playUrl || res?.data?.playUrl;
            const subtitlesFromVideo = (Array.isArray(subsData) ? subsData : []).map(s => {
                let label = s.Language || (s.LanguageId === 23 ? 'Indonesia' : (s.LanguageId === 1 ? 'English' : 'Subtitle'));
                return {
                    label: label,
                    language: s.LanguageId === 23 ? 'id' : (s.LanguageId === 1 ? 'en' : 'id'),
                    url: s.SubtitleUrl || s.StoreUri || '',
                    format: s.Format || 'srt'
                };
            }).filter(s => s.url);

            // GABUNGKAN: Prioritaskan dari getvideo, tapi jika kosong pakai dari detail (re-mapping)
            let subtitles = subtitlesFromVideo.length > 0 ? subtitlesFromVideo : (targetEpisode.subtitles || []);

            // FIX: Tambahkan proxy ke semua subtitle URL agar bisa dikonversi SRT -> VTT dan bypass CORS
            // Menggunakan URL absolut agar bekerja meskipun dipanggil dari frontend yang berbeda domain
            subtitles = subtitles.map(s => ({
                ...s,
                url: s.url.startsWith('http') ? `/api/proxy?url=${encodeURIComponent(s.url)}` : s.url
            }));

            if (mainUrl) {
                return {
                    videoUrl: mainUrl,
                    subtitles,
                    subtitle: subtitles.length > 0 ? subtitles[0].url : ''
                };
            }

            if (playList && playList.length > 0) {
                const bestVideo = playList.find(p => p.Definition === '720p' || p.Definition === '1080p') || playList[0];
                const finalStreamUrl = bestVideo.PlayURL || bestVideo.MainPlayUrl || bestVideo.Url || bestVideo.url || bestVideo.playUrl;
                return {
                    videoUrl: finalStreamUrl,
                    subtitles,
                    subtitle: subtitles.length > 0 ? subtitles[0].url : ''
                };
            }
            return null;
        } catch (e) {
            console.warn(`[Dramanova] Stream failed: ${e.message}`);
            return null;
        }
    }
}

export default new DramanovaService();
