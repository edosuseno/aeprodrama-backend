import { Router } from 'express';
import flickreelsService from '../services/FlickreelsService.js';

const router = Router();

router.get('/explore', async (req, res) => {
    const { page } = req.query;
    const data = await flickreelsService.getExplore(page || 1);
    res.json({ success: true, data: flickreelsService.encrypt(data) });
});

router.get('/foryou', async (req, res) => {
    const data = await flickreelsService.getForyou();
    res.json({ success: true, data: flickreelsService.encrypt(data) });
});

router.get('/latest', async (req, res) => {
    const data = await flickreelsService.getLatest();
    res.json({ success: true, data: flickreelsService.encrypt(data) });
});

router.get('/hotrank', async (req, res) => {
    const data = await flickreelsService.getHotrank();
    res.json({ success: true, data: flickreelsService.encrypt(data) });
});

router.get('/detail', async (req, res) => {
    const { id } = req.query;
    const data = await flickreelsService.getDetail(id);
    res.json({ success: true, data: flickreelsService.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const query = req.query.query || req.query.keyword;
    const data = await flickreelsService.search(query);
    res.json({ success: true, data: flickreelsService.encrypt(data) });
});

export default router;
