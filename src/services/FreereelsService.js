import BaseProvider from './BaseProvider.js';

class FreereelsService extends BaseProvider {
    constructor() {
        super('Freereels', 'https://api.sansekai.my.id/api/freereels');
    }

    async getExplore(page = 1) {
        let raw = await this._pureRequest(`${this.baseUrl}/foryou`, { page });
        if (raw?.data?.items) return raw.data.items;
        if (raw?.items) return raw.items;
        if (Array.isArray(raw)) return raw;
        return [];
    }

    async getHome() {
        let raw = await this._pureRequest(`${this.baseUrl}/homepage`);
        console.log(`[FreeReels Debug] Raw Homepage Length: ${JSON.stringify(raw).length}`);
        // Expected by frontend: { data: { items: [ modules... ] } }
        if (raw?.data?.items) return raw;
        if (raw?.items) return { data: { items: raw.items } };
        if (Array.isArray(raw)) return { data: { items: raw } };
        return { data: { items: [] } };
    }

    async getForyou() {
        let raw = await this._pureRequest(`${this.baseUrl}/foryou`);
        // Expected: { data: { items: [ items... ] } }
        if (raw?.data?.items) return raw;
        if (raw?.items) return { data: { items: raw.items } };
        if (Array.isArray(raw)) return { data: { items: raw } };
        return { data: { items: [] } };
    }

    async getAnime() {
        let raw = await this._pureRequest(`${this.baseUrl}/anime`);
        if (raw?.data?.items) return raw;
        if (raw?.items) return { data: { items: raw.items } };
        if (Array.isArray(raw)) return { data: { items: raw } };
        return { data: { items: [] } };
    }

    async getDetail(id) {
        // Sansekai menggunakan param 'key', bukan 'id'
        // Coba dengan param 'key' dulu (format utama Sansekai)
        let data = await this._pureRequest(`${this.baseUrl}/detailAndAllEpisode`, { key: id });
        if (!data || (!data.data && !data.info)) {
            // Fallback: coba dengan param 'id'
            data = await this._pureRequest(`${this.baseUrl}/detailAndAllEpisode`, { id });
        }
        return data;
    }

    async search(query) {
        const cleanText = (str) => typeof str === 'string' ? str.replace(/<[^>]*>/g, '').trim() : str;
        const q = (query || '').toLowerCase().trim();
        if (!q) return { data: { items: [] } };

        // [FIX] Sansekai tidak punya endpoint search yang berfungsi.
        // Strategi: ambil semua konten dari homepage + foryou lalu filter lokal.
        let allItems = [];

        try {
            const [homeRaw, foryouRaw] = await Promise.allSettled([
                this._pureRequest(`${this.baseUrl}/homepage`),
                this._pureRequest(`${this.baseUrl}/foryou`),
            ]);

            // Ekstrak dari homepage (bisa berupa modules dengan items di dalamnya)
            if (homeRaw.status === 'fulfilled') {
                const homeData = homeRaw.value?.data || homeRaw.value;
                const modules = homeData?.items || (Array.isArray(homeData) ? homeData : []);
                modules.forEach(mod => {
                    const pool = mod.items || mod.playlets || mod.list || (Array.isArray(mod) ? mod : []);
                    allItems.push(...pool);
                });
            }

            // Ekstrak dari foryou
            if (foryouRaw.status === 'fulfilled') {
                const fyData = foryouRaw.value?.data || foryouRaw.value;
                const pool = fyData?.items || (Array.isArray(fyData) ? fyData : []);
                allItems.push(...pool);
            }
        } catch (e) {
            console.warn(`[FreeReels] Local search data fetch failed: ${e.message}`);
        }

        // Deduplicate berdasarkan key/id
        const seen = new Set();
        const unique = allItems.filter(item => {
            const id = item.key || item.id || item.shortPlayId;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        // Filter berdasarkan query (match di judul atau desc)
        const matched = unique.filter(item => {
            const title = cleanText(item.title || item.name || '').toLowerCase();
            const desc = cleanText(item.desc || item.description || item.introduce || '').toLowerCase();
            return title.includes(q) || desc.includes(q);
        });

        const list = matched.map(item => {
            const id = item.key || item.id || item.shortPlayId || item.book_id;
            return {
                ...item,
                id: String(id),
                key: String(id),
                title: cleanText(item.title || item.name || item.shortPlayName || item.book_name),
                introduce: cleanText(item.introduce || item.description || item.desc || item.abstract || ''),
                cover: item.cover || item.image || item.shortPlayCover || item.book_pic || item.coverWap,
            };
        });

        return { data: { items: list } };
    }
}

export default new FreereelsService();
