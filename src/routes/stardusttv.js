import { Router } from 'express';
import stardusttvService from '../services/StardustTVService.js';
import Drama from '../models/Drama.js';

const router = Router();

router.get('/explore', async (req, res) => {
    const { page, categoryId } = req.query;
    const data = await stardusttvService.getExplore(page || 1, categoryId);
    res.json({ success: true, data: stardusttvService.encrypt(data) });
});

router.get('/categories', async (req, res) => {
    const data = await stardusttvService.getCategories();
    res.json({ success: true, data: stardusttvService.encrypt(data) });
});

router.get('/search', async (req, res) => {
    const { query, page } = req.query;
    const data = await stardusttvService.search(query, page || 1);
    res.json({ success: true, data: stardusttvService.encrypt(data) });
});

router.get('/detail', async (req, res) => {
    const { shortPlayId } = req.query;
    const data = await stardusttvService.getDetail(shortPlayId);
    res.json({ success: true, data: stardusttvService.encrypt(data) });
});

router.get('/stream', async (req, res) => {
    const { shortPlayId, episodeNo } = req.query;
    const data = await stardusttvService.getStream(shortPlayId, episodeNo || 1);
    res.json({ success: true, data: stardusttvService.encrypt(data) });
});

router.get('/sync', async (req, res) => {
    try {
        const categories = await stardusttvService.getCategories();
        const categoryList = [{ category_id: null, display_name: 'Semua' }, ...categories];
        let total = 0;
        for (const cat of categoryList) {
            const items = await stardusttvService.getExplore(1, cat.category_id);
            for (const item of items) {
                const detail = await stardusttvService.getDetail(item.id);
                if (!detail) continue;
                const eps = detail.episodes || detail.list || [];
                const episodes = eps.map(ep => ({
                    chapterId: ep.id?.toString(),
                    title: ep.title || ep.name,
                    videoUrl: ep._h264 || ep._h265 || ep.videoUrl,
                    duration: ep.duration?.toString(),
                    isUnlocked: true
                }));
                await Drama.findOneAndUpdate(
                    { bookId: item.id.toString() },
                    { bookId: item.id.toString(), bookName: item.title, cover: item.poster, cpName: 'StardustTV', episodes: episodes, lastUpdated: new Date() },
                    { upsert: true }
                );
                total++;
            }
        }
        res.json({ success: true, message: `Synced ${total} dramas.` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
