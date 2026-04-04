import { Router } from 'express';
import meloloService from '../services/MeloloService.js';

const router = Router();

router.get('/explore', async (req, res) => {
    const { page } = req.query;
    const data = await meloloService.getExplore(page || 1);
    res.json({ success: true, data: meloloService.encrypt(data) });
});

router.get('/trending', async (req, res) => {
    const data = await meloloService.getTrending();
    res.json({ success: true, data: meloloService.encrypt(data) });
});

router.get('/latest', async (req, res) => {
    const data = await meloloService.getLatest();
    res.json({ success: true, data: meloloService.encrypt(data) });
});

router.get('/detail', async (req, res) => {
    const { bookId } = req.query;
    const data = await meloloService.getDetail(bookId);
    res.json({ success: true, data: meloloService.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const query = req.query.query || req.query.keyword;
    const data = await meloloService.search(query);
    res.json({ success: true, data: meloloService.encrypt(data) });
});

router.get('/stream', async (req, res) => {
    const { videoId } = req.query;
    const data = await meloloService.getStream(videoId);
    res.json({ success: true, data: meloloService.encrypt(data) });
});

export default router;
