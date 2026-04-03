import { Router } from 'express';
import dramanovaService from '../services/DramanovaService.js';

const router = Router();

router.get('/explore', async (req, res) => {
    const { page, category } = req.query;
    const data = await dramanovaService.getExplore(page || 1, category || 'all');
    res.json({ success: true, data: dramanovaService.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const { query } = req.query;
    const data = await dramanovaService.search(query);
    res.json({ success: true, data: dramanovaService.encrypt(data) });
});

router.get('/detail', async (req, res) => {
    const bookId = req.query.bookId || req.query.id;
    const data = await dramanovaService.getDetail(bookId);
    res.json({ success: true, data: dramanovaService.encrypt(data) });
});

router.get('/allepisode', async (req, res) => {
    const bookId = req.query.bookId || req.query.id;
    const data = await dramanovaService.getAllEpisodes(bookId);
    res.json({ success: true, data: dramanovaService.encrypt(data) });
});

router.get('/watch', async (req, res) => {
    const { id, bookId, episodeIndex, chapterIndex, quality } = req.query;
    const targetId = id || bookId;
    const targetIndex = episodeIndex || chapterIndex || 1;
    const data = await dramanovaService.getStream(targetId, targetIndex, quality || '720p');
    res.json({ success: true, data: dramanovaService.encrypt(data) });
});

export default router;
