
import express from 'express';
import axios from 'axios';
import ShortmaxService from '../services/ShortmaxService.js';
import stardustTVService from '../services/StardustTVService.js';

const router = express.Router();

// Cache sederhana untuk menyimpan auth_key Akamai secara internal
// Agara manifest yang dikirim ke browser tetap bersih (seperti Vidrama)
const authCache = new Map();

router.get('/latest', async (req, res) => {
    try {
        const { page } = req.query;
        const data = await ShortmaxService.getLatest(page || 1);
        res.json({ success: true, data: ShortmaxService.encrypt(data) });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get(['/explore', '/rekomendasi'], async (req, res) => {
    try {
        const { page } = req.query;
        const data = await ShortmaxService.getHome(page || 1);
        res.json({ success: true, data: ShortmaxService.encrypt(data) });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/foryou', async (req, res) => {
    try {
        const { page } = req.query;
        const data = await ShortmaxService.getForyou(page || 1);
        res.json({ success: true, data: ShortmaxService.encrypt(data) });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/categories', async (req, res) => {
    try {
        const data = await ShortmaxService.getCategories();
        res.json({ success: true, data: ShortmaxService.encrypt(data) });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/search', async (req, res) => {
    try {
        const { q, query, page } = req.query;
        const searchTerm = q || query || "";
        const data = await ShortmaxService.search(searchTerm, page || 1);
        res.json({ success: true, data: ShortmaxService.encrypt(data) });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/detail', async (req, res) => {
    try {
        const { shortPlayId } = req.query;
        const data = await ShortmaxService.getDetail(shortPlayId);
        res.json({ success: true, data: ShortmaxService.encrypt(data) });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get(['/stream', '/episode'], async (req, res) => {
    try {
        const { shortPlayId, episodeNo, episodeNumber } = req.query;
        const ep = episodeNo || episodeNumber || 1;
        const data = await ShortmaxService.getStream(shortPlayId, ep);

        if (data) {
            const host = req.get('host');
            // Gunakan x-forwarded-proto (Vercel/reverse proxy) atau paksa https jika bukan localhost
            const proto = req.headers['x-forwarded-proto'] || req.protocol;
            const isVercel = host && !host.includes('localhost');
            const protocol = isVercel ? 'https' : proto;
            const baseUrl = `${protocol}://${host}`;

            const proxyfy = (url) => {
                if (!url) return "";
                if (url.includes('/api/shortmax/proxy') || url.includes('/api/shortmax/hls')) return url;
                return `${baseUrl}/api/shortmax/proxy?url=${encodeURIComponent(url)}`;
            };

            // Proxy Video
            if (data.url) data.url = proxyfy(data.url);
            if (data.episode) data.episode.videoUrl = proxyfy(data.episode.videoUrl || data.url);

            // Proxy Subtitles
            if (data.subtitle) data.subtitle = proxyfy(data.subtitle);
            if (Array.isArray(data.subtitles)) {
                data.subtitles = data.subtitles.map(s => ({
                    ...s,
                    url: proxyfy(s.url)
                }));
            }
        }

        res.json({ success: true, data: ShortmaxService.encrypt(data) });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/debug/raw-rsc', async (req, res) => {
    try {
        const actionId = '406d8e0caefc77495a4c251c1367b17ccf461cb2d9';
        const rawResponse = await ShortmaxService._callAction(actionId, ["recommend"]);
        res.type('text/plain').send(rawResponse || "FAILED: NO RESPONSE");
    } catch (e) {
        res.status(500).send(`DEBUG ERROR: ${e.message}`);
    }
});

router.get('/debug', async (req, res) => {
    try {
        const result = await axios.get(`https://vidrama.asia/api/stardusttv?action=combined&page=1&page_size=10`, { timeout: 10000 });
        res.json({
            success: true,
            status: result.status,
            raw_count: result.data?.data?.length || 0,
            sample: result.data?.data?.[0] || null
        });
    } catch (e) {
        res.status(500).json({
            success: false,
            error: e.message,
            response: e.response?.data
        });
    }
});

router.get(['/proxy', '/hls'], async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing URL');

    const isManifest = targetUrl.includes('.m3u8');
    const isTsSegment = targetUrl.includes('.ts');

    // --- SMART TOKEN INJECTION ---
    // Jika ada permintaan TS tapi tidak punya auth_key, kita coba ambil dari cache
    if (isTsSegment && !targetUrl.includes('auth_key')) {
        try {
            const urlObj = new URL(targetUrl);
            const folderPath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/'));
            const cachedKey = authCache.get(folderPath);
            if (cachedKey) {
                targetUrl += (targetUrl.includes('?') ? '&' : '?') + `auth_key=${cachedKey}`;
                // console.log(`[ShortMax Proxy] Melekatkan Cached Auth Key ke: ${folderPath}`);
            }
        } catch (e) { }
    }

    const randomIP = `114.122.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const headers = {
        'User-Agent': 'ShortMax/1.6.0 (Linux; Android 13; SM-S911B)',
        'X-Forwarded-For': randomIP,
        'X-Real-IP': randomIP,
        'Referer': 'https://h5.shortmax.com/',
        'Origin': 'https://h5.shortmax.com',
        'X-Requested-With': 'com.shortmax.video'
    };

    // Sertakan Authorization hanya jika target adalah Vidrama
    if (targetUrl.includes('vidrama.asia')) {
        headers['Authorization'] = `Bearer ${stardustTVService.accessToken}`;
    }

    const axiosConfig = {
        headers,
        timeout: 20000,
        validateStatus: false
    };

    if (isTsSegment) {
        axiosConfig.responseType = 'arraybuffer';
        delete req.headers['range']; // Mencegah fragmentasi
    }

    try {
        const response = await axios.get(targetUrl, axiosConfig);

        if (response.status >= 400) return res.status(response.status).send('Origin Error');

        if (isManifest) {
            // Ekstrak auth_key dari manifest URL untuk disisipkan langsung ke URL segmen
            // KRITIS: Tidak boleh bergantung pada authCache karena Vercel Serverless
            // setiap request bisa jadi instance berbeda → authCache selalu kosong
            let manifestAuthKey = null;
            try {
                const urlObj = new URL(targetUrl);
                manifestAuthKey = urlObj.searchParams.get('auth_key');
                if (manifestAuthKey) {
                    const folderPath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/'));
                    authCache.set(folderPath, manifestAuthKey); // tetap simpan untuk fallback lokal
                }
            } catch (e) { }

            // --- REWRITE MANIFEST: Sematkan auth_key langsung ke setiap URL segmen ---
            let manifest = response.data.toString();
            // Gunakan x-forwarded-proto agar proxyBase selalu HTTPS di Vercel
            // Tanpa ini, req.protocol = 'http' di Vercel → Mixed Content → browser blokir semua segmen
            const proxyHost = req.get('host');
            const proxyProto = req.headers['x-forwarded-proto'] || req.protocol;
            const proxyProtocol = (proxyHost && !proxyHost.includes('localhost')) ? 'https' : proxyProto;
            const proxyBase = `${proxyProtocol}://${proxyHost}/api/shortmax/proxy?url=`;

            manifest = manifest.split('\n').map(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    // Pastikan URL absolut
                    let absUrl = trimmed;
                    if (!absUrl.startsWith('http')) {
                        const base = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
                        absUrl = new URL(trimmed, base).toString();
                    }

                    // --- FIX UTAMA VERCEL: Sematkan auth_key ke URL segmen ---
                    // Jika segmen tidak punya auth_key tapi manifest punya, sisipkan langsung
                    // Ini memastikan Akamai tidak 403 saat Vercel serverless instance berbeda
                    if (manifestAuthKey) {
                        try {
                            const segUrlObj = new URL(absUrl);
                            if (!segUrlObj.searchParams.has('auth_key')) {
                                segUrlObj.searchParams.set('auth_key', manifestAuthKey);
                                absUrl = segUrlObj.toString();
                            }
                        } catch (e) { }
                    }

                    return `${proxyBase}${encodeURIComponent(absUrl)}`;
                }
                return line;
            }).join('\n');

            res.status(200);
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(manifest);
        } else {
            // Untuk TS Segment atau aset lain (Relay Murni)
            const buffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);

            res.status(200);
            res.setHeader('Content-Type', isTsSegment ? 'video/MP2T' : (response.headers['content-type'] || 'application/octet-stream'));
            res.setHeader('Content-Length', buffer.length.toString());
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(buffer);
        }
    } catch (e) {
        if (!res.headersSent) res.status(e.response?.status || 500).send(e.message);
    }
});

export default router;
