import { Router } from 'express';
import DotDramaService from '../services/DotDramaService.js';

const router = Router();

router.get('/explore', async (req, res) => {
    const { page } = req.query;
    const data = await DotDramaService.getHome(page || 1);
    res.json({ success: true, data: DotDramaService.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const { query } = req.query;
    const data = await DotDramaService.search(query);
    res.json({ success: true, data: DotDramaService.encrypt(data) });
});

router.get('/detail', async (req, res) => {
    const { id } = req.query;
    const data = await DotDramaService.getDetail(id);
    res.json({ success: true, data: DotDramaService.encrypt(data) });
});

router.get('/watch', async (req, res) => {
    try {
        const { id, episodeIndex } = req.query;
        const rawUrl = await DotDramaService.getStream(id, episodeIndex || 1);
        
        if (rawUrl) {
            // Biarkan frontend yang membungkus dengan proxy universal
            res.json({ success: true, data: DotDramaService.encrypt(rawUrl) });
        } else {
            res.status(404).json({ success: false, error: 'Stream not found' });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
