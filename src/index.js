
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// --- IMPORT ROUTES ---
import statsRoutes from './routes/stats.js';
import toolsRoutes from './routes/tools.js';
import dramanovaRoutes from './routes/dramanova.js';
import veloloRoutes from './routes/velolo.js';
import stardusttvRoutes from './routes/stardusttv.js';
import dramaboxRoutes from './routes/dramabox.js';
import dramabox2Routes from './routes/dramabox2.js';
import dramawaveRoutes from './routes/dramawave.js';
import flickreelsRoutes from './routes/flickreels.js';
import freereelsRoutes from './routes/freereels.js';
import goodshortRoutes from './routes/goodshort.js';
import meloshortRoutes from './routes/meloshort.js';
import meloloRoutes from './routes/melolo.js';
import movieboxRoutes from './routes/moviebox.js';
import reelshortRoutes from './routes/reelshort.js';
import shortmaxRoutes from './routes/shortmax.js';
import dotdramaRoutes from './routes/dotdrama.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Database Connection (Background - don't block boot)
connectDB(process.env.MONGODB_URI || process.env.MONGO_URI).catch(e => console.error('Initial DB Error:', e.message));

app.set('trust proxy', 1); // Vercel & reverse proxy: agar req.protocol = 'https' bukan 'http'
app.use(cors());
app.use(express.json());

// --- ROUTES ---
app.use('/api', reelshortRoutes); // Prefix root for reelshort/netshort files
app.use('/api/stats', statsRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/dramanova', dramanovaRoutes);
app.use('/api/velolo', veloloRoutes);
app.use('/api/stardusttv', stardusttvRoutes);
app.use('/api/dramabox', dramaboxRoutes);
app.use('/api/dramabox2', dramabox2Routes);
app.use('/api/dramawave', dramawaveRoutes);
app.use('/api/flickreels', flickreelsRoutes);
app.use('/api/freereels', freereelsRoutes);
app.use('/api/goodshort', goodshortRoutes);
app.use('/api/meloshort', meloshortRoutes);
app.use('/api/melolo', meloloRoutes);
app.use('/api/moviebox', movieboxRoutes);
app.use('/api/shortmax', shortmaxRoutes);
app.use('/api/dotdrama', dotdramaRoutes);

// --- SHARED PROXY LOGIC ---
const handleProxyRequest = async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing URL');

    try {
        const lowerUrl = targetUrl.toLowerCase();
        // Cek apakah ini subtitle (SRT/VTT)
        const isSubtitle = lowerUrl.includes('.srt') || lowerUrl.includes('.vtt') || lowerUrl.includes('mime_type=text_plain') || targetUrl.includes('hikeuniverses.xyz');

        let referer = 'https://vidrama.asia/';
        let origin = 'https://vidrama.asia';

        // Khusus Velolo gunakan referer vidrama.asia agar tembus blokir
        if (targetUrl.includes('velolo') || targetUrl.includes('melolo')) {
            referer = 'https://vidrama.asia/';
            origin = 'https://vidrama.asia';
        } else if (targetUrl.includes('sansekai') || targetUrl.includes('hikeuniverses')) {
            referer = 'https://www.vidrama.asia/';
            origin = 'https://www.vidrama.asia';
        }

        const response = await axios({
            method: 'get',
            url: targetUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': referer,
                'Origin': origin,
                'host': new URL(targetUrl).host
            },
            responseType: isSubtitle ? 'text' : 'stream',
            timeout: 10000,
            validateStatus: false
        });

        res.setHeader('Access-Control-Allow-Origin', '*');

        if (isSubtitle && response.status === 200) {
            let content = response.data;
            if (typeof content !== 'string') content = content.toString('utf8');

            // Bersihkan BOM jika ada
            content = content.replace(/^\ufeff/, '').trim();

            let vttContent = content;
            if (!content.startsWith('WEBVTT')) {
                // Regex Robust: Menangani jam 1-2 digit, menit/detik 2 digit, milidetik 2-3 digit
                vttContent = 'WEBVTT\n\n' + content.replace(/(\d{1,2}:\d{2}:\d{2}),(\d{2,3})/g, '$1.$2');
            }
            return res.status(200).type('text/vtt; charset=utf-8').send(vttContent);
        }

        res.status(response.status);
        if (response.headers['content-type']) res.type(response.headers['content-type']);

        if (response.data && typeof response.data.pipe === 'function') {
            response.data.pipe(res);
        } else {
            res.send(response.data);
        }

    } catch (e) {
        if (!res.headersSent) res.status(500).send(`Proxy Error: ${e.message}`);
    }
};

app.get('/api/proxy', handleProxyRequest);
app.get('/api/subtitle-proxy', handleProxyRequest);

app.get('/', (req, res) => res.send('AE PRO DRAMA BACKEND API IS RUNNING'));

// --- START SERVER ---
// Hindari duplicate listen jika diimport untuk testing
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('index.js');

if (isMainModule || (process.env.VERCEL && process.env.NODE_ENV === 'production')) {
    app.listen(PORT, () => console.log(`Backend server matching your request is running on port ${PORT}`));
}

export default app;
