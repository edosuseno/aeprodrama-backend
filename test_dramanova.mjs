import axios from 'axios';

async function testDramaNovaRSCSearch() {
    const keyword = 'cinta';
    console.log(`[TEST] DramaNova RSC Searching for: ${keyword}`);
    
    try {
        const url = `https://vidrama.asia/search?q=${encodeURIComponent(keyword)}&provider=dramanova`;
        const nextActionId = '70c18f6e0c27f60d1b86df02893991f65c74bb76e0';

        const res = await axios.post(url, `["${keyword}"]`, {
            headers: {
                'content-type': 'text/plain;charset=UTF-8',
                'next-action': nextActionId,
                'accept': 'text/x-component',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        console.log(`[TEST] Content returned length:`, content.length);
        
        const items = [];
        const patterns = [
            /["']shortPlayId["']\s*:\s*["']?(\w+|[0-9]+)["']?\s*,\s*["']shortPlayName["']\s*:\s*["']([^"']+)["']\s*,\s*["']shortPlayCover["']\s*:\s*["']([^"']+)["']/g,
            /{\s*["']id["']\s*:\s*["']?(\w+|[0-9]+)["']?\s*,\s*["']title["']\s*:\s*["']([^"']+)["']\s*,\s*["']cover["']\s*:\s*["']([^"']+)["']/g
        ];

        for (const regex of patterns) {
            let match;
            while ((match = regex.exec(content)) !== null) {
                if (!items.find(i => i.id === match[1])) {
                    items.push({ id: match[1], title: match[2], cover: match[3] });
                }
            }
        }
        
        console.log(`[TEST] Found ${items.length} items`);
        items.slice(0, 3).forEach((item, i) => {
            console.log(`[${i+1}] ID: ${item.id} | Title: ${item.title}`);
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

testDramaNovaRSCSearch();
