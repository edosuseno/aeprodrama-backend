import { Router } from 'express';
import freereelsService from '../services/FreereelsService.js';

const router = Router();

router.get('/explore', async (req, res) => {
    const { page } = req.query;
    const data = await freereelsService.getExplore(page || 1);
    res.json({ success: true, data: freereelsService.encrypt(data) });
});

router.get(['/home', '/homepage'], async (req, res) => {
    const data = await freereelsService.getHome();
    res.json({ success: true, data: freereelsService.encrypt(data) });
});

router.get('/foryou', async (req, res) => {
    const data = await freereelsService.getForyou();
    res.json({ success: true, data: freereelsService.encrypt(data) });
});

router.get('/anime', async (req, res) => {
    const data = await freereelsService.getAnime();
    res.json({ success: true, data: freereelsService.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const query = req.query.query || req.query.keyword;
    const data = await freereelsService.search(query);
    res.json({ success: true, data: freereelsService.encrypt(data) });
});

router.get('/detail', async (req, res) => {
    const bookId = req.query.bookId || req.query.id || req.query.key;
    const data = await freereelsService.getDetail(bookId);
    res.json({ success: true, data: freereelsService.encrypt(data) });
});

router.get('/detailAndAllEpisode', async (req, res) => {
    const bookId = req.query.bookId || req.query.id || req.query.key;
    const data = await freereelsService.getDetail(bookId);
    res.json({ success: true, data: freereelsService.encrypt(data) });
});

export default router;
