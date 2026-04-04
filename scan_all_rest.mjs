
import stardustTVService from './src/services/StardustTVService.js';
import axios from 'axios';

async function test() {
    console.log('--- SCANNING ALL PROVIDER APIS ---');
    const token = stardustTVService.accessToken;
    const providers = ['shortmax', 'shortmax_id', 'shorttv', 'shorts', 'shortly', 'velolo', 'meloshort', 'goodshort', 'stardusttv', 'reelshort'];
    const actions = ['list', 'home', 'episode_video', 'detail'];

    for (const p of providers) {
        for (const a of actions) {
            const url = `https://vidrama.asia/api/${p}?action=${a}&dramaId=847688&chapterId=1&id=847688`;
            try {
                const res = await axios.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    timeout: 5000
                });
                if (res.status === 200 && res.data) {
                    console.log(`✅ FOUND: ${p} / ${a} Response:`, JSON.stringify(res.data).substring(0, 100));
                    if (res.data.data || (Array.isArray(res.data) && res.data.length > 0)) {
                         console.log(`🌟 MATCH AT: ${p} / ${a}`);
                         return;
                    }
                }
            } catch (e) {
                // console.log(`❌ ${p}/${a} Failed: ${e.message}`);
            }
        }
    }
}

test();
