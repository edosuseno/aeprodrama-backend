import BaseProvider from './BaseProvider.js';
import axios from 'axios';

class MovieBoxVidSrcService extends BaseProvider {
    constructor() {
        super('MovieBox-VidSrc', 'https://api.themoviedb.org/3');

        // TMDB Configuration
        this.tmdbApiKey = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY_HERE';
        this.imageBaseUrl = 'https://image.tmdb.org/t/p/';

        // VidSrc Configuration
        this.vidsrcBaseUrl = 'https://vidsrc.me/embed';

        // Cache
        this.homeCache = null;
        this.lastHomeFetch = 0;
        this.detailCache = new Map();
        this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes
    }

    _log(msg) {
        console.error(`[MovieBox-VidSrc] ${msg}`);
    }

    // Helper to build TMDB request URL
    _tmdbUrl(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        url.searchParams.append('api_key', this.tmdbApiKey);
        url.searchParams.append('language', 'en-US');

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });

        return url.toString();
    }

    // Normalize TMDB movie to our format
    _normalizeMovie(movie) {
        return {
            id: String(movie.id),
            title: movie.title || movie.name,
            poster: movie.poster_path ? `${this.imageBaseUrl}w500${movie.poster_path}` : '',
            backdrop: movie.backdrop_path ? `${this.imageBaseUrl}original${movie.backdrop_path}` : '',
            synopsis: movie.overview || '',
            rating: movie.vote_average ? movie.vote_average.toFixed(1) : '',
            release: movie.release_date || movie.first_air_date || '',
            year: (movie.release_date || movie.first_air_date || '').substring(0, 4),
            type: movie.media_type === 'tv' ? 'Series' : 'Movie',
            genre: movie.genre_ids || []
        };
    }

    async getHomepage() {
        const now = Date.now();
        if (this.homeCache && (now - this.lastHomeFetch < this.CACHE_TTL)) {
            return { data: this.homeCache };
        }

        try {
            this._log('Fetching trending movies from TMDB...');

            // Get trending movies (last week)
            const trendingUrl = this._tmdbUrl('/trending/movie/week');
            const response = await axios.get(trendingUrl);
            const data = response.data;

            if (!data.results || data.results.length === 0) {
                this._log('No trending movies found');
                return { data: [] };
            }

            const movies = data.results.slice(0, 50).map(m => this._normalizeMovie(m));

            this._log(`Found ${movies.length} trending movies`);
            this.homeCache = movies;
            this.lastHomeFetch = now;

            return { data: movies };
        } catch (e) {
            this._log(`Homepage Error: ${e.message}`);
            return { data: this.homeCache || [] };
        }
    }

    async getTrending() {
        try {
            this._log('Fetching top rated movies...');

            const url = this._tmdbUrl('/movie/top_rated', { page: 1 });
            const response = await axios.get(url);
            const data = response.data;

            const movies = (data.results || []).slice(0, 20).map(m => this._normalizeMovie(m));
            return { data: movies };
        } catch (e) {
            this._log(`Trending Error: ${e.message}`);
            return { data: [] };
        }
    }

    async search(keyword) {
        try {
            this._log(`Searching for: ${keyword}`);

            const url = this._tmdbUrl('/search/movie', { query: keyword, page: 1 });
            const response = await axios.get(url);
            const data = response.data;

            const movies = (data.results || []).map(m => this._normalizeMovie(m));
            this._log(`Search found ${movies.length} results`);

            return { data: movies };
        } catch (e) {
            this._log(`Search Error: ${e.message}`);
            return { data: [] };
        }
    }

    async getPopular() {
        try {
            this._log('Fetching popular movies...');

            const url = this._tmdbUrl('/movie/popular', { page: 1 });
            const response = await axios.get(url);
            const data = response.data;

            const movies = (data.results || []).slice(0, 20).map(m => this._normalizeMovie(m));
            return { data: movies };
        } catch (e) {
            this._log(`Popular Error: ${e.message}`);
            return { data: [] };
        }
    }

    async getNowPlaying() {
        try {
            this._log('Fetching now playing movies...');

            const url = this._tmdbUrl('/movie/now_playing', { page: 1 });
            const response = await axios.get(url);
            const data = response.data;

            const movies = (data.results || []).slice(0, 20).map(m => this._normalizeMovie(m));
            return { data: movies };
        } catch (e) {
            this._log(`Now Playing Error: ${e.message}`);
            return { data: [] };
        }
    }

    async getUpcoming() {
        try {
            this._log('Fetching upcoming movies...');

            const url = this._tmdbUrl('/movie/upcoming', { page: 1 });
            const response = await axios.get(url);
            const data = response.data;

            const movies = (data.results || []).slice(0, 20).map(m => this._normalizeMovie(m));
            return { data: movies };
        } catch (e) {
            this._log(`Upcoming Error: ${e.message}`);
            return { data: [] };
        }
    }

    async getExplore(page = 1) {
        try {
            this._log(`Fetching explore page ${page}...`);

            // Use popular movies for explore with pagination
            const url = this._tmdbUrl('/movie/popular', { page });
            const response = await axios.get(url);
            const data = response.data;

            const movies = (data.results || []).map(m => this._normalizeMovie(m));
            this._log(`Explore page ${page}: Found ${movies.length} movies`);

            return {
                data: movies,
                hasMore: page < (data.total_pages || 1),
                currentPage: page,
                totalPages: data.total_pages || 1
            };
        } catch (e) {
            this._log(`Explore Error: ${e.message}`);
            return { data: [], hasMore: false, currentPage: page, totalPages: 1 };
        }
    }

    async getDetail(id) {
        if (this.detailCache.has(String(id))) {
            return { data: this.detailCache.get(String(id)) };
        }

        try {
            this._log(`Fetching detail for TMDB ID: ${id}`);

            // Get movie details
            const detailUrl = this._tmdbUrl(`/movie/${id}`, { append_to_response: 'credits' });
            const response = await axios.get(detailUrl);
            const movie = response.data;

            if (movie.status_code === 34) {
                this._log(`Movie not found: ${id}`);
                return { data: null };
            }

            // Extract cast and crew
            const cast = (movie.credits?.cast || []).slice(0, 10).map(c => c.name);
            const director = (movie.credits?.crew || []).find(c => c.job === 'Director')?.name || '';

            const detail = {
                id: String(movie.id),
                title: movie.title,
                poster: movie.poster_path ? `${this.imageBaseUrl}w500${movie.poster_path}` : '',
                backdrop: movie.backdrop_path ? `${this.imageBaseUrl}original${movie.backdrop_path}` : '',
                synopsis: movie.overview || '',
                genre: (movie.genres || []).map(g => g.name),
                rating: movie.vote_average ? movie.vote_average.toFixed(1) : '',
                release: movie.release_date || '',
                year: (movie.release_date || '').substring(0, 4),
                duration: movie.runtime ? `${movie.runtime} min` : '',
                type: 'Movie',
                cast: cast,
                director: director,
                tagline: movie.tagline || '',
                budget: movie.budget || 0,
                revenue: movie.revenue || 0,
                episodes: null // Movies don't have episodes
            };

            this._log(`Detail fetched: ${detail.title}`);
            this.detailCache.set(String(id), detail);

            return { data: detail };
        } catch (e) {
            this._log(`Detail Error: ${e.message}`);
            return { data: null };
        }
    }

    async getSources(id, episodeId = null) {
        try {
            this._log(`Generating VidSrc embed URL for TMDB ID: ${id}`);

            // VidSrc embed URL format: https://vidsrc.me/embed/movie?tmdb={id}
            const embedUrl = `${this.vidsrcBaseUrl}/movie?tmdb=${id}`;

            // Return as iframe source
            const sources = [{
                url: embedUrl,
                quality: 'Auto',
                isM3U8: false,
                isEmbed: true, // Flag to indicate this is an embed URL
                type: 'iframe',
                provider: 'VidSrc'
            }];

            this._log(`VidSrc embed URL generated: ${embedUrl}`);
            return { data: sources };
        } catch (e) {
            this._log(`Sources Error: ${e.message}`);
            return { data: [] };
        }
    }
}

export default new MovieBoxVidSrcService();
