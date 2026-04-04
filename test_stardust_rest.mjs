
import stardustTVService from './src/services/StardustTVService.js';
import axios from 'axios';

async function test() {
    console.log('--- TESTING STARDUSTTV REST API FOR SHORTMAX ---');
    const token = stardustTVService.accessToken;
    const dramaId = '847688';
    const episode = 1;

    try {
        console.log('[1] Fetching LIST...');
        const resList = await axios.get(`https://vidrama.asia/api/stardusttv?action=list&page=1&page_size=10&provider=shortmax`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const items = resList.data?.data || resList.data;
        console.log('Found', (Array.isArray(items) ? items.length : 0), 'items');

        console.log('[2] Fetching DETAIL...');
        const resDetail = await axios.get(`https://vidrama.asia/api/stardusttv?action=detail&id=${dramaId}&provider=shortmax`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Detail Name:', resDetail.data?.data?.name || resDetail.data?.name);

        console.log('[3] Fetching STREAM (episode_video)...');
        // Common patterns for episode_video
        const epUrls = [
            `https://vidrama.asia/api/stardusttv?action=episode_video&dramaId=${dramaId}&chapterId=${episode}&provider=shortmax`,
            `https://vidrama.asia/api/shortmax?action=episode_video&dramaId=${dramaId}&chapterId=${episode}`,
            `https://vidrama.asia/api/stardusttv/watch?id=${dramaId}&episodeIndex=${episode}&provider=shortmax`
        ];

        for (const url of epUrls) {
            console.log('Trying:', url);
            const resUrl = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resUrl.data?.data?.videoUrl || resUrl.data?.videoUrl) {
                console.log(`✅ SUCCESS at ${url}:`, resUrl.data?.data || resUrl.data);
                return;
            } else {
                console.log('Empty response:', JSON.stringify(resUrl.data).substring(0, 100));
            }
        }
    } catch (e) {
        console.error('Test FAILED:', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
    }
}

test();
