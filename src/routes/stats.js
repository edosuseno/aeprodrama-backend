import express from 'express';
import OnlineUser from '../models/OnlineUser.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Hubungi Server (Heartbeat) - Setiap kali user buka web
 * Kita catat signature (HASH IP) agar tetap anonim tapi terhitung unik
 */
router.post('/heartbeat', async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const signature = crypto.createHash('md5').update(ip).digest('hex');

        // Update lastSeen atau Upsert (Insert if not exists)
        await OnlineUser.findOneAndUpdate(
            { signature },
            { lastSeen: new Date() },
            { upsert: true, new: true }
        ).catch(() => null); // Silently ignore if DB fails

        res.json({ success: true });
    } catch (e) {
        res.json({ success: true }); // Tetap return sukses agar frontend tidak error
    }
});

router.get('/online', async (req, res) => {
    try {
        const count = await OnlineUser.countDocuments({
            lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 Menit Terakhir
        }).catch(() => 1);

        res.json({ success: true, count: count > 0 ? count : 1 });
    } catch (e) {
        res.json({ success: true, count: 1 }); // Fallback 1 jika DB gagal
    }
});

export default router;
