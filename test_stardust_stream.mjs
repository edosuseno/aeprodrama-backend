
import stardustTVService from './src/services/StardustTVService.js';
import axios from 'axios';

async function test() {
    console.log('--- TESTING STARDUSTTV STREAM API ---');
    const token = stardustTVService.accessToken;
    const dramaId = '847688';
    const episode = 1;

    try {
        const urls = [
            `https://vidrama.asia/api/stardusttv?action=stream&id=${dramaId}&episodeNumber=${episode}&provider=shortmax`,
            `https://vidrama.asia/api/stardusttv?action=episode&id=${dramaId}&episodeNumber=${episode}&provider=shortmax`,
            `https://vidrama.asia/api/stardusttv?action=detail&id=${dramaId}&provider=shortmax`
        ];

        for (const url of urls) {
            console.log('Trying:', url);
            const res = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ RESPONSE:', JSON.stringify(res.data).substring(0, 300));
            if (res.data?.data?.videoUrl || res.data?.videoUrl) {
                console.log('🌟 FOUND VIDEO URL!');
            }
        }
    } catch (e) {
        console.error('Test FAILED:', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
    }
}

test();
