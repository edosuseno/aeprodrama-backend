
import axios from 'axios';

async function checkSansekai() {
    const endpoints = ['explore', 'foryou', 'hotrank', 'latest', 'trending', 'hot'];
    console.log('--- STARTING SANSEKAI REELSHORT PROBE ---');
    
    for (const p of endpoints) {
        try {
            const start = Date.now();
            const res = await axios.get(`https://api.sansekai.my.id/api/reelshort/${p}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000 
            });
            const dataLength = res.data?.data?.lists?.length || (Array.isArray(res.data?.data) ? res.data.data.length : 0);
            console.log(`${p}: ✅ SUCCESS (${dataLength} items) in ${Date.now() - start}ms`);
        } catch (e) {
            console.log(`${p}: ❌ FAILED (${e.message})`);
        }
    }
}

checkSansekai();
