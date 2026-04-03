import axios from 'axios';

/**
 * SIMPLE DRAMABOX SERVICE - NO COMPLICATIONS
 * Minimal implementation untuk test functionality
 */
class DramaboxServiceSimple {
    constructor() {
        // API endpoint
        this.baseUrl = 'https://api.sansekai.my.id/api/dramabox';

        // Simple axios instance
        this.api = axios.create({
            baseURL: this.baseUrl,
            timeout: 15000,
            headers: {
                'Accept': 'application/json'
            }
        });
    }

    /**
     * Helper untuk fetch data
     */
    async fetch(endpoint, params = {}) {
        try {
            console.log(`[Simple] Fetching: ${endpoint}`);
            const response = await this.api.get(endpoint, { params });
            return response.data;
        } catch (error) {
            console.error(`[Simple] Error:`, error.message);
            return null;
        }
    }

    /**
     * Get ForYou
     */
    async getForYou() {
        const data = await this.fetch('/foryou');
        return Array.isArray(data) ? data : [];
    }

    /**
     * Get Latest
     */
    async getLatest() {
        const data = await this.fetch('/latest');
        return Array.isArray(data) ? data : [];
    }

    /**
     * Get Trending
     */
    async getTrending() {
        const data = await this.fetch('/trending');
        return Array.isArray(data) ? data : [];
    }

    /**
     * Get DubIndo
     */
    async getDubIndo() {
        const data = await this.fetch('/dubindo', {
            classify: 'terbaru',
            page: '1'
        });
        return Array.isArray(data) ? data : [];
    }

    /**
     * Search
     */
    async search(query) {
        const data = await this.fetch('/search', { query });
        return Array.isArray(data) ? data : [];
    }

    /**
     * Get Detail - Return data mentah dari API
     */
    async getDetail(bookId) {
        const data = await this.fetch(`/detail/${bookId}`);
        return data;
    }

    /**
     * Get Episodes - Return data mentah dari API
     */
    async getAllEpisodes(bookId) {
        const data = await this.fetch(`/allepisode/${bookId}`);
        return data;
    }
}

export default new DramaboxServiceSimple();
