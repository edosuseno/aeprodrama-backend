import { Router } from 'express';
import Dramabox2Service from '../services/Dramabox2Service.js';

const router = Router();

router.get('/explore', async (req, res) => {
    const { page } = req.query;
    const data = await Dramabox2Service.getHome(page || 1);
    res.json({ success: true, data: Dramabox2Service.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const { query } = req.query;
    const data = await Dramabox2Service.search(query);
    res.json({ success: true, data: Dramabox2Service.encrypt(data) });
});

router.get('/detail', async (req, res) => {
    const bookId = req.query.bookId || req.query.id;
    const data = await Dramabox2Service.getDetail(bookId);
    res.json({ success: true, data: Dramabox2Service.encrypt(data) });
});

router.get('/watch', async (req, res) => {
    try {
        const { id, bookId, episodeIndex, chapterIndex } = req.query;
        const targetId = id || bookId;
        const targetIndex = episodeIndex || chapterIndex || 1;
        const rawUrl = await Dramabox2Service.getStream(targetId, targetIndex);
        
        if (rawUrl) {
            // Kembalikan URL murni, biarkan frontend yang membungkus dengan proxy universal
            res.json({ success: true, data: Dramabox2Service.encrypt(rawUrl) });
        } else {
            res.status(404).json({ success: false, error: 'Stream not found' });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/debug', async (req, res) => {
    try {
        console.log('[Debug] Fetching raw data for Dramabox2...');
        const data = await Dramabox2Service.getHome(1);
        res.json({ success: true, count: data?.length || 0, data: data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Endpoint diagnostic: melihat raw RSC response dari vidrama.asia
// Berguna untuk deteksi apakah IP Vercel diblokir atau parsing bermasalah
router.get('/raw-debug', async (req, res) => {
    const axios = (await import('axios')).default;
    const page = req.query.page || 1;
    const actionId = req.query.actionId || '60b3687be7816ff646b5d17573993209051413fd56';
    const payload = req.query.payload || `[${page},"in"]`;
    try {
        const rscRes = await axios({
            method: 'POST',
            url: 'https://vidrama.asia/provider/dramabox2',
            data: payload,
            headers: {
                'content-type': 'text/plain;charset=UTF-8',
                'next-action': actionId,
                'accept': 'text/x-component',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
                'Referer': 'https://vidrama.asia/provider/dramabox2',
                'Origin': 'https://vidrama.asia',
            },
            timeout: 20000,
        });
        const raw = typeof rscRes.data === 'string' ? rscRes.data : JSON.stringify(rscRes.data);
        res.json({
            success: true,
            status: rscRes.status,
            contentLength: raw.length,
            preview: raw.substring(0, 2000),
            hasListKeyword: raw.includes('"list"'),
            hasShortPlayId: raw.includes('"shortPlayId"'),
            hasIdTitle: raw.includes('"id"') && raw.includes('"title"'),
        });
    } catch (e) {
        res.status(500).json({
            success: false,
            error: e.message,
            statusCode: e.response?.status,
            responsePreview: typeof e.response?.data === 'string'
                ? e.response.data.substring(0, 500)
                : JSON.stringify(e.response?.data || {}).substring(0, 500)
        });
    }
});

export default router;
