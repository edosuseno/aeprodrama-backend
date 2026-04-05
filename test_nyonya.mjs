import axios from 'axios';

async function testNyonyaSearch() {
    const keyword = 'Nyonya Gendut dan Anak Peramal';
    console.log(`[TEST] Searching for: ${keyword}`);
    
    try {
        const res = await axios.get(`https://vidrama.asia/api/melolo?action=search&keyword=${encodeURIComponent(keyword)}`, {
            headers: {
                'Referer': 'https://vidrama.asia/',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        const data = res.data?.dataList || res.data?.rows || res.data?.data || res.data || [];
        console.log(`[TEST MELOLO] Total Results: ${data.length}`);
        
        data.forEach((item, i) => {
            console.log(`[${i+1}] ID: ${item.id || item.intId} | Title: ${item.title || item.name || item.book_name} | Provider: ${item.provider || item.platform}`);
        });

        console.log("\n=========================\n");
        console.log("[TEST RSC] SEARCH:");
        const url = `https://vidrama.asia/search?q=${encodeURIComponent(keyword)}&provider=meloshort`;
        const res2 = await axios.post(url, `["${keyword}"]`, {
            headers: {
                'content-type': 'text/plain;charset=UTF-8',
                'next-action': '70c18f6e0c27f60d1b86df02893991f65c74bb76e0',
                'accept': 'text/x-component'
            }
        });
        
        const content = typeof res2.data === 'string' ? res2.data : JSON.stringify(res2.data);
        const regex = /["']shortPlayId["']\s*:\s*["'](\d+)["']\s*,\s*["']shortPlayName["']\s*:\s*["']([^"']+)["']/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            console.log(`[RSC] ID: ${match[1]} | Title: ${match[2]}`);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

testNyonyaSearch();
