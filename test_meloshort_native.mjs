import axios from 'axios';

async function testOriginalMeloShortSearch() {
    const keyword = 'luka dan bara';
    console.log(`[TEST] Searching for: ${keyword} ON MELOSHORT NATIVE API`);
    
    try {
        const res = await axios.get(`https://vidrama.asia/api/meloshort?action=search&keyword=${encodeURIComponent(keyword)}`, {
            headers: {
                'Referer': 'https://vidrama.asia/',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        const data = res.data?.dataList || res.data?.rows || res.data?.data || res.data || [];
        console.log(`[TEST] Total Results: ${data.length}`);
        
        data.forEach((item, i) => {
            console.log(`[${i+1}] ID: ${item.id || item.intId} | Title: ${item.title || item.name || item.book_name}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testOriginalMeloShortSearch();
