import { Router } from 'express';
import reelShortService from '../services/ReelShortService.js';
import netshortService from '../services/NetshortService.js';

const router = Router();

// --- REELSHORT ---
router.get('/reelshort/homepage', async (req, res) => {
    const data = await reelShortService.getHome();
    res.json({ success: true, data: reelShortService.encrypt(data) });
});

router.get('/reelshort/detail', async (req, res) => {
    const { bookId } = req.query;
    const data = await reelShortService.getDetail(bookId);
    res.json({ success: true, data: reelShortService.encrypt(data) });
});

router.get('/reelshort/search', async (req, res) => {
    const query = req.query.query || req.query.keyword;
    const data = await reelShortService.search(query);
    res.json({ success: true, data: reelShortService.encrypt(data) });
});

router.get('/reelshort/explore', async (req, res) => {
    const { page } = req.query;
    const data = await reelShortService.getExplore(page || 1);
    res.json({ success: true, data: reelShortService.encrypt(data) });
});

router.get('/reelshort/foryou', async (req, res) => {
    const { page } = req.query;
    const data = await reelShortService.getForyou(page || 1);
    res.json({ success: true, data: reelShortService.encrypt(data) });
});

router.get('/reelshort/hotrank', async (req, res) => {
    const data = await reelShortService.getHotrank();
    res.json({ success: true, data: reelShortService.encrypt(data) });
});

router.get('/reelshort/latest', async (req, res) => {
    const data = await reelShortService.getLatest();
    res.json({ success: true, data: reelShortService.encrypt(data) });
});

router.get('/reelshort/allepisode/:id?', async (req, res) => {
    try {
        const id = req.params.id || req.query.bookId || req.query.id;
        if (!id) return res.status(400).json({ success: false, error: 'Missing bookId' });
        const data = await reelShortService.getAllEpisodes(id);
        res.json({ success: true, data: reelShortService.encrypt(data) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/reelshort/watch', async (req, res) => {
    const { bookId, chapterId, episodeNumber } = req.query;
    const data = await reelShortService.watch(bookId, chapterId || episodeNumber);
    res.json({ success: true, data: reelShortService.encrypt(data) });
});

router.get('/reelshort/episode', async (req, res) => {
    const { bookId, episodeNumber, chapterId } = req.query;
    const data = await reelShortService.getEpisode(bookId, episodeNumber || chapterId);
    res.json({ success: true, data: reelShortService.encrypt(data) });
});

// --- NETSHORT ---
router.get('/netshort/allepisode', async (req, res) => {
    try {
        const shortPlayId = req.query.shortPlayId || req.query.id;
        if (!shortPlayId) return res.status(400).json({ success: false, error: 'shortPlayId is required' });
        const data = await netshortService.getDetail(shortPlayId);
        res.json({ success: true, ...(data || {}) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/netshort/theaters', async (req, res) => {
    try {
        const data = await netshortService.getTheaters();
        res.json({ success: true, data: netshortService.encrypt(data) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/netshort/foryou', async (req, res) => {
    const { page } = req.query;
    const data = await netshortService.getForyou(page || 1);
    res.json({ success: true, data: netshortService.encrypt(data) });
});

router.get('/netshort/search', async (req, res) => {
    const query = req.query.query || req.query.keyword;
    const data = await netshortService.search(query);
    res.json({ success: true, data: netshortService.encrypt(data) });
});

router.get('/netshort/explore', async (req, res) => {
    const { page } = req.query;
    const data = await netshortService.getForyou(page || 1);
    res.json({ success: true, data: netshortService.encrypt(data) });
});

export default router;
