import express from 'express';
import MovieBoxService from '../services/MovieBoxService.js';
import MovieBoxVidSrcService from '../services/MovieBoxVidSrcService.js';

const router = express.Router();

// Pilih service yang aktif (Default: Sansekai, Fallback: VidSrc if needed)
// Namun karena frontend butuh Popular/NowPlaying/Upcoming yang hanya ada di VidSrcService, 
// kita bisa gabungkan atau pilih salah satu.
// Mari kita gunakan VidSrcService sebagai basis utama karena fiturnya lebih lengkap untuk MovieBox.

router.get('/homepage', async (req, res) => {
    try {
        const data = await MovieBoxVidSrcService.getHomepage();
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/trending', async (req, res) => {
    try {
        const data = await MovieBoxVidSrcService.getTrending();
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/popular', async (req, res) => {
    try {
        const data = await MovieBoxVidSrcService.getPopular();
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/now-playing', async (req, res) => {
    try {
        const data = await MovieBoxVidSrcService.getNowPlaying();
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/upcoming', async (req, res) => {
    try {
        const data = await MovieBoxVidSrcService.getUpcoming();
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/explore', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const data = await MovieBoxVidSrcService.getExplore(page);
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/search', async (req, res) => {
    try {
        const data = await MovieBoxVidSrcService.search(req.query.query);
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/detail', async (req, res) => {
    try {
        const data = await MovieBoxVidSrcService.getDetail(req.query.id);
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/sources', async (req, res) => {
    try {
        const { id, episodeId } = req.query;
        const data = await MovieBoxVidSrcService.getSources(id, episodeId);
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/generate', async (req, res) => {
    try {
        const data = await MovieBoxService.generateStream(req.query.url);
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

export default router;
