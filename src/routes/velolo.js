import { Router } from 'express';
import veloloService from '../services/VeloloService.js';

const router = Router();

router.get('/explore', async (req, res) => {
    const { page } = req.query;
    const data = await veloloService.getHome(page || 1);
    res.json({ success: true, data: veloloService.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const { query } = req.query;
    const data = await veloloService.search(query);
    res.json({ success: true, data: veloloService.encrypt(data) });
});

router.get('/detail', async (req, res) => {
    const bookId = req.query.bookId || req.query.id;
    const data = await veloloService.getDetail(bookId);
    res.json({ success: true, data: veloloService.encrypt(data) });
});

router.get('/watch', async (req, res) => {
    const { id, bookId, episodeIndex, chapterIndex } = req.query;
    const targetId = id || bookId;
    const targetIndex = episodeIndex || chapterIndex || 1;
    const data = await veloloService.getStream(targetId, targetIndex);
    res.json({ success: true, data: veloloService.encrypt(data) });
});

export default router;
