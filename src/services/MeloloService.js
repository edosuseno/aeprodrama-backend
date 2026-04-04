import BaseProvider from './BaseProvider.js';

class MeloloService extends BaseProvider {
    constructor() {
        super('Melolo', 'https://api.sansekai.my.id/api/melolo');
    }

    _normalizeBooks(books) {
        if (!Array.isArray(books)) return [];
        return books.map(book => {
            let originalImg = book.thumb_url || book.cover || book.book_cover || book.book_pic || book.poster || book.pic_url || '';
            
            // Fix Mixed Content (HTTP on HTTPS site)
            if (originalImg && originalImg.startsWith('http://')) {
                originalImg = originalImg.replace('http://', 'https://');
            }

            // Convert fizzopic signed HEIC URLs to unsigned ibyteimg WEBP URLs
            // This safely bypasses browser format incompatibility and CDN signature issues
            if (originalImg && originalImg.includes('fizzopic.org') && originalImg.includes('.heic')) {
                originalImg = originalImg.replace(/-sign-sg\.fizzopic\.org/g, '-sg.ibyteimg.com');
                originalImg = originalImg.replace(/\.heic(\?.*)?$/i, '.webp');
            } else if (originalImg && originalImg.includes('.heic')) {
                // generic HEIC replace just in case
                originalImg = originalImg.replace(/\.heic(\?.*)?$/i, '.webp');
            }

            return {
                ...book,
                thumb_url: originalImg,
                cover: originalImg
            };
        });
    }

    async getExplore(page = 1) {
        let data = await this._pureRequest(`${this.baseUrl}/trending`, { page });

        if (data?.data?.books) return this._normalizeBooks(data.data.books);
        if (data?.books) return this._normalizeBooks(data.books);
        return this._normalizeBooks(Array.isArray(data) ? data : []);
    }

    async getTrending() {
        let res = await this._pureRequest(`${this.baseUrl}/trending`);
        if (res?.books) {
            res.books = this._normalizeBooks(res.books);
        } else if (res?.data?.books) {
            res.data.books = this._normalizeBooks(res.data.books);
        }
        return res;
    }

    async getLatest() {
        let res = await this._pureRequest(`${this.baseUrl}/latest`);
        if (res?.books) {
            res.books = this._normalizeBooks(res.books);
        } else if (res?.data?.books) {
            res.data.books = this._normalizeBooks(res.data.books);
        }
        return res;
    }

    async getDetail(bookId) {
        const paths = [
            { url: `${this.baseUrl}/detail`, params: { bookId } }
        ];

        console.log(`[Melolo] Fetching Detail for ${bookId}...`);

        const result = await Promise.any(paths.map(p => 
            this._pureRequest(p.url, p.params).then(res => {
                if (!res) throw new Error('Empty Melolo response');
                if (!res.data && !res.video_data) throw new Error('Invalid Melolo structure');
                return res;
            })
        )).catch(() => null);

        let videoDataObj = result?.data?.video_data || result?.video_data;
        if (videoDataObj?.series_cover) {
            let cov = videoDataObj.series_cover;
            if (cov.includes('fizzopic.org') && cov.includes('.heic')) {
                cov = cov.replace(/-sign-sg\.fizzopic\.org/g, '-sg.ibyteimg.com');
                cov = cov.replace(/\.heic(\?.*)?$/i, '.webp');
            } else if (cov.includes('.heic')) {
                cov = cov.replace(/\.heic(\?.*)?$/i, '.webp');
            }
            if (cov.startsWith('http://')) cov = cov.replace('http://', 'https://');
            videoDataObj.series_cover = cov;
        }

        if (result && !result.data) {
            return { data: result };
        }
        return result;
    }

    async getStream(videoId) {
        return await this._pureRequest(`${this.baseUrl}/stream`, { videoId, definition: '720p' });
    }

    async search(query) {
        let items = [];
        const params = { query, keyword: query };

        // Priority: Sansekai
        try {
            const raw = await this._pureRequest(`${this.baseUrl}/search`, params);
            items = raw?.data?.search_data || raw?.search_data || raw?.data?.books || raw?.books || [];
        } catch (e) {
            console.error(`[Melolo] Sansekai search failed: ${e.message}`);
        }

        const cleanText = (str) => typeof str === 'string' ? str.replace(/<[^>]*>/g, '').trim() : str;

        // Normalize if books are nested in search_data
        if (Array.isArray(items) && items.some(i => i.books)) {
            items = items.flatMap(i => i.books || []);
        }

        let list = (Array.isArray(items) ? items : []).map(book => ({
            ...book,
            book_id: book.book_id || book.id,
            book_name: cleanText(book.book_name || book.title),
            abstract: cleanText(book.abstract || book.description || "")
        }));

        list = this._normalizeBooks(list);

        return { search_data: [{ books: list }] }; // Matches Header.tsx expectation
    }
}

export default new MeloloService();
