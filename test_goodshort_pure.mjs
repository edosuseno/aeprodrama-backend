import axios from 'axios';

async function testGoodShortRSCSearch() {
    const keyword = 'cinta';
    console.log(`[TEST] GoodShort RSC Searching for: ${keyword}`);
    
    try {
        const url = `https://vidrama.asia/search?q=${encodeURIComponent(keyword)}&provider=goodshort`;
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
        console.log(`[TEST] Content returned:`, content.substring(0, 300));
        
        const items = [];
        const regexes = [
            /["']shortPlayId["']\s*:\s*["'](\d+)["']\s*,\s*["']shortPlayName["']\s*:\s*["']([^"']+)["']/g,
            /{\s*["']id["']\s*:\s*["'](\d+)["']\s*,\s*["']title["']\s*:\s*["']([^"']+)["']/g
        ];

        for (const regex of regexes) {
            let match;
            while ((match = regex.exec(content)) !== null) {
                if (!items.find(i => i.id === match[1])) {
                    items.push({ id: match[1], title: match[2] });
                }
            }
        }
        
        console.log(`[TEST] Found ${items.length} items`);
        items.slice(0, 5).forEach(i => console.log(i));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testGoodShortRSCSearch();
