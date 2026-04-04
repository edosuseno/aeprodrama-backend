import express from 'express';
import mongoose from 'mongoose';
import dramaboxService from '../services/DramaboxService.js';
import reelShortService from '../services/ReelShortService.js';
import Drama from '../models/Drama.js';
// Tambahkan provider lain di sini nanti

const router = express.Router();

/**
 * Generate M3U Playlist dari Backend
 * Mengambil data REAL dari database MongoDB Anda
 */
router.post('/generate-playlist', async (req, res) => {
    const { source, bookId, baseUrl } = req.body;

    try {
        let episodes = [];
        let title = `${source}-${bookId}`;

        if (source === 'dramabox') {
            episodes = await dramaboxService.getAllEpisodes(bookId);
            title = `DramaBox-${bookId}`;
        } else if (source === 'reelshort') {
            // Reelshort logic di backend Anda biasanya per watch, tapi kita coba getDetail
            const detail = await reelShortService.getDetail(bookId);
            episodes = detail?.episodes || [];
            title = `ReelShort-${detail?.bookName || bookId}`;
        }

        if (!episodes || episodes.length === 0) {
            return res.status(404).json({ success: false, error: 'Episodes not found in Database' });
        }

        let m3u = "#EXTM3U\n";
        episodes.forEach((ep, index) => {
            const epNum = ep.chapterIndex || ep.episodeNumber || (index + 1);
            const chId = ep.chapterId || ep.id;

            // Link Resolver mengarah ke Backend ini juga
            const resolveUrl = `${baseUrl}/api/tools/resolve?source=${source}&bookId=${bookId}&chapterId=${chId}&ep=${epNum}`;
            m3u += `#EXTINF:-1, Episode ${epNum}\n${resolveUrl}\n`;
        });

        res.setHeader('Content-Type', 'application/x-mpegurl');
        res.setHeader('Content-Disposition', `attachment; filename="${title}.m3u8"`);
        res.send(m3u);

    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * Stream Resolver di Backend
 * Langsung melempar (redirect) ke video asli
 */
// Handle HEAD request explicitly for players verifying stream availability
router.head('/resolve', (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");
    res.status(200).send();
});

router.get('/resolve', async (req, res) => {
    const { source, bookId, chapterId, ep } = req.query;

    // Manual CORS Header untuk Redirect agar tidak diblokir browser (Failed to fetch)
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");

    try {
        let videoUrl = "";

        if (source === 'dramabox') {
            // Safe DB Check
            try {
                if (mongoose.connection.readyState === 1) {
                    const drama = await Drama.findOne({ bookId: bookId.toString() });
                    const found = drama?.episodes?.find(e => e.chapterId == chapterId || e.chapterIndex == ep);
                    videoUrl = found?.videoUrl;
                }
            } catch (e) { }

            // JIKA MASIH KOSONG, Ambil Paksa (On-Demand)
            if (!videoUrl && bookId && chapterId) {
                console.log(`🔍 [Resolve] Fetching missing URL for Dramabox ${bookId} Ep ${chapterId}`);
                videoUrl = await dramaboxService.getPlayUrl(bookId, chapterId);
            }

            if (videoUrl) {
                // REDIRECT LEWAT PROXY (Untuk atasi layar hitam / CORS)
                const proxiedUrl = `/api/dramabox/proxy?url=${encodeURIComponent(videoUrl)}`;
                console.log(`✅ [Resolve] Success! Proxied Redirect to: ${proxiedUrl.substring(0, 60)}...`);
                return res.status(302).redirect(proxiedUrl);
            }
        } else if (source === 'reelshort') {
            const data = await reelShortService.getEpisode(bookId, chapterId || ep);
            videoUrl = data?.videoUrl || (data?.videoList ? data.videoList[0]?.url : "");
            if (videoUrl) {
                return res.status(302).redirect(videoUrl);
            }
        }

        console.log(`❌ [Resolve] Video not found for ${source} ${bookId} Ep ${ep || chapterId}`);
        res.status(404).send('Video not found');
    } catch (e) {
        console.error("Resolve Error:", e);
        res.status(500).send("Internal Server Error");
    }
});

export default router;
