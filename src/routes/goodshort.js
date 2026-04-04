import express from 'express';
import goodshortService from '../services/GoodShortService.js';

const router = express.Router();

router.get('/explore', async (req, res) => {
    const { page } = req.query;
    const data = await goodshortService.getHome(page || 1);
    res.json({ success: true, data: goodshortService.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const { keyword } = req.query;
    const data = await goodshortService.search(keyword);
    res.json({ success: true, data: goodshortService.encrypt(data) });
});

router.get('/detail', async (req, res) => {
    const bookId = req.query.bookId || req.query.id;
    const data = await goodshortService.getDetail(bookId);
    res.json({ success: true, data: goodshortService.encrypt(data) });
});

router.get(['/watch', '/stream'], async (req, res) => {
    const bookId = req.query.bookId || req.query.id;
    const { episodeIndex } = req.query;
    const data = await goodshortService.getStream(bookId, episodeIndex || 1);
    res.json({ success: true, data: goodshortService.encrypt(data) });
});

export default router;
