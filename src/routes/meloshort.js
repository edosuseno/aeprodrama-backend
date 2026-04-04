import { Router } from 'express';
import meloshortService from '../services/MeloShortService.js';

const router = Router();

router.get('/explore', async (req, res) => {
    try {
        const { page } = req.query;
        const data = await meloshortService.getHome(page || 1);
        res.json({ success: true, data: meloshortService.encrypt(data) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/search', async (req, res) => {
    try {
        const { query, keyword } = req.query;
        const data = await meloshortService.search(query || keyword);
        res.json({ success: true, data: meloshortService.encrypt(data) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/detail', async (req, res) => {
    try {
        const { id, bookId } = req.query;
        const targetId = id || bookId;
        const data = await meloshortService.getDetail(targetId);
        res.json({ success: true, data: meloshortService.encrypt(data) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/watch', async (req, res) => {
    try {
        const { id, dramaId, chapterId, episodeId } = req.query;
        const targetDramaId = id || dramaId;
        const targetChapterId = chapterId || episodeId;
        const rawUrl = await meloshortService.getStream(targetDramaId, targetChapterId);
        
        if (rawUrl) {
            res.json({ success: true, data: meloshortService.encrypt(rawUrl) });
        } else {
            res.status(404).json({ success: false, error: 'Stream not found' });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
