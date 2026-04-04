import { Router } from 'express';
import dramaboxService from '../services/DramaboxService.js';

const router = Router();

router.get('/foryou', async (req, res) => {
    const data = await dramaboxService.getForYou();
    res.json({ success: true, data: dramaboxService.encrypt(data) });
});

router.get('/trending', async (req, res) => {
    const data = await dramaboxService.getTrending();
    res.json({ success: true, data: dramaboxService.encrypt(data) });
});

router.get('/latest', async (req, res) => {
    const data = await dramaboxService.getLatest();
    res.json({ success: true, data: dramaboxService.encrypt(data) });
});

router.get('/dubindo', async (req, res) => {
    const data = await dramaboxService.getDubIndo();
    res.json({ success: true, data: dramaboxService.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const query = req.query.query || req.query.keyword;
    const data = await dramaboxService.search(query);
    res.json({ success: true, data: dramaboxService.encrypt(data) });
});

router.get('/explore', async (req, res) => {
    const { page } = req.query;
    const data = await dramaboxService.getExplore(page || 1);
    res.json({ success: true, data: dramaboxService.encrypt(data) });
});

router.get('/detail/:id?', async (req, res) => {
    try {
        const id = req.params.id || req.query.bookId || req.query.id;
        if (!id) return res.status(400).json({ success: false, error: 'Missing bookId' });
        const data = await dramaboxService.getDetail(id);
        if (!data) return res.status(404).json({ success: false, error: 'Drama not found' });
        res.json({ success: true, data: dramaboxService.encrypt(data) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/allepisode/:id?', async (req, res) => {
    try {
        const id = req.params.id || req.query.bookId || req.query.id;
        const data = await dramaboxService.getAllEpisodes(id, req.query);
        res.json({ success: true, data: dramaboxService.encrypt(data) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
