import { Router } from 'express';
import dramawaveService from '../services/DramaWaveService.js';

const router = Router();

router.get('/explore', async (req, res) => {
    const { page, category } = req.query;
    const data = await dramawaveService.getExplore(page || 1, category || 'popular');
    res.json({ success: true, data: dramawaveService.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const { query, page } = req.query;
    const data = await dramawaveService.search(query, page || 1);
    res.json({ success: true, data: dramawaveService.encrypt(data) });
});

router.get('/detail', async (req, res) => {
    const { shortPlayId } = req.query;
    const data = await dramawaveService.getDetail(shortPlayId);
    res.json({ success: true, data: dramawaveService.encrypt(data) });
});

router.get('/stream', async (req, res) => {
    const { shortPlayId, episodeNo } = req.query;
    const data = await dramawaveService.getStream(shortPlayId, episodeNo || 0);
    res.json({ success: true, data: dramawaveService.encrypt(data) });
});

export default router;
