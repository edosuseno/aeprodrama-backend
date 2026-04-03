
import axios from 'axios';
import BaseProvider from './BaseProvider.js';

/**
 * VIDRAMA SOURCE SERVICE (Shortmax Alternative)
 * Mendapatkan URL m3u8 dari vidrama.asia sebagai alternatif stabil.
 */
class VidramaService extends BaseProvider {
    constructor() {
        super('Vidrama', 'https://vidrama.asia');
    }

    /**
     * Mendapatkan daftar drama Shortmax paling populer dari halaman provider Vidrama.
     * (Scraping mode karena API Sansekai sudah mati)
     */
    async getHome(page = 1) {
        console.log(`[Vidrama] Scraping Home Shortmax (Page ${page})...`);
        try {
            const url = `${this.baseUrl}/provider/shortmax`;
            const html = await this._pureRequest(url, {}, 2, {
                forceReferer: 'https://vidrama.asia/'
            });

            if (!html || typeof html !== 'string') {
                throw new Error("HTML content empty or not a string");
            }
            const dramas = [];

            // Regex yang lebih fleksibel untuk menangkap Movie Card
            // Pola: <a ... href="/movie/slug--id?provider=shortmax" ...> ... <img src="cover" alt="title" /> ... </div>
            const movieBlockRegex = /<a[^>]+href=["']\/movie\/([^"']+)--([^"']+)[\?&]provider=shortmax["'][^>]*>([\s\S]*?)<\/a>/g;
            let match;

            while ((match = movieBlockRegex.exec(html)) !== null) {
                const slug = match[1];
                const id = match[2];
                const innerHtml = match[3];

                // Cari Judul: Biasanya di alt gambar atau di dalam div terakhir
                const titleMatch = innerHtml.match(/alt="([^"]+)"/) || innerHtml.match(/>([^<]{2,})<\/div>\s*$/);
                let title = titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, ' ');
                
                // Bersihkan title dari kurung/prefix jika ada (opsional, tapi bagus untuk estetika)
                title = title.replace(/^\[.*?\]/, '').trim();

                // Cari Cover
                const coverMatch = innerHtml.match(/src="([^"]+)"/) || innerHtml.match(/data-src="([^"]+)"/);
                let cover = coverMatch ? coverMatch[1] : '';
                
                // Pastikan absolute URL untuk cover
                if (cover && cover.startsWith('/')) cover = `https://vidrama.asia${cover}`;

                dramas.push({
                    id: `${slug}--${id}`,
                    title: title,
                    cover: cover,
                    provider: 'shortmax',
                    source: 'vidrama'
                });
            }

            console.log(`✅ [Vidrama] Berhasil menemukan ${dramas.length} drama.`);
            return dramas;
        } catch (e) {
            console.error(`[Vidrama] Gagal scraping home: ${e.message}`);
            return [];
        }
    }

    /**
     * Mendapatkan detail drama dan daftar episode dari Vidrama (Scraping mode)
     */
    async getDetail(dramaId) {
        console.log(`[Vidrama] Scraping Detail untuk: ${dramaId}`);
        try {
            const url = `${this.baseUrl}/movie/${dramaId}?provider=shortmax`;
            const html = await this._pureRequest(url, {}, 2, {
                forceReferer: `${this.baseUrl}/provider/shortmax`
            });

            if (!html || typeof html !== 'string') {
                throw new Error("HTML content empty or not a string");
            }
            const episodes = [];

            // Ekstrak Title & Synopsis
            const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
            const title = titleMatch ? titleMatch[1] : dramaId.split('--')[0].replace(/-/g, ' ');
            
            const synopsisMatch = html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/);
            const synopsis = synopsisMatch ? synopsisMatch[1].trim() : "Tidak ada deskripsi.";

            // Regex untuk menangkap episode link: <a href="/watch/drama-slug--id/1?provider=shortmax">
            const epRegex = /<a[^>]+href="\/watch\/([^"]+)--([^/]+)\/([^"?]+)\?provider=shortmax"[^>]*>([\s\S]*?)<\/a>/g;
            let match;
            while ((match = epRegex.exec(html)) !== null) {
                const epIndex = match[3];
                const epTitle = match[4].replace(/<[^>]+>/g, '').trim();

                episodes.push({
                    id: epIndex,
                    chapterId: epIndex,
                    title: epTitle || `Episode ${epIndex}`,
                    chapterIndex: parseInt(epIndex),
                    index: parseInt(epIndex),
                    episodeNumber: parseInt(epIndex),
                    isFree: true
                });
            }

            console.log(`✅ [Vidrama] Berhasil menemukan ${episodes.length} episode.`);
            return {
                id: dramaId,
                title: title,
                description: synopsis,
                synopsis: synopsis,
                totalEpisodes: episodes.length,
                episodes: episodes,
                provider: 'shortmax',
                source: 'vidrama'
            };
        } catch (e) {
            console.error(`[Vidrama] Gagal scraping detail: ${e.message}`);
            return null;
        }
    }

    /**
     * Mengambil URL Video Episode tertentu dari website Vidrama secara dinamis.
     * @param {string} dramaId - Slug drama (misal: 'mencintai-orang-yang-benar--956711')
     * @param {number} episode - Nomor episode
     */
    async getShortmaxStream(dramaId, episode = 1) {
        console.log(`[Vidrama] Investigasi Stream Episode ${episode} untuk Drama: ${dramaId}`);

        try {
            // Kita gunakan Next.js Server Action ID yang kita temukan dari audit terbaru
            const actionId = "f3cded4a9b587d5bdccf5e1350a80e1a1795c479";
            const authToken = "MASUKKAN_TOKEN_LIFETIME_ANDA_DI_SINI"; // Ganti dengan token asli Anda
            
            // Format ID Vidrama biasanya: Judul--ID (misal: 'misteri-hubungan-darah--847795')
            const numericId = dramaId.split('--').pop();

            const url = `${this.baseUrl}/watch/${dramaId}/${episode}?provider=shortmax`;
            
            const res = await axios.post(url, [numericId, episode], {
                headers: {
                    'next-action': actionId,
                    'Authorization': `Bearer ${authToken}`, // Ubah format jika bukan Bearer
                    'Cookie': `auth_token=${authToken}`,   // Ubah format jika menggunakan cookie
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Referer': url
                }
            });

            // Analisis respons (Biasanya format Next.js Action sedikit unik)
            const jsonText = res.data.toString();
            // Ekstrak bagian JSON dari data stream Next.js
            const jsonMatch = jsonText.match(/\{"videoUrl":.*?\}/);
            
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                console.log(`✅ [Vidrama] Berhasil mendapatkan m3u8 dari Vidrama.`);
                return {
                    videoUrl: data.videoUrl,
                    provider: 'vidrama-shortmax'
                };
            }

            throw new Error("Metadata video tidak ditemukan dalam respons Vidrama.");
        } catch (e) {
            console.error(`[Vidrama] Gagal menarik stream dari Vidrama: ${e.message}`);
            return null;
        }
    }
}

export default new VidramaService();
