import axios from 'axios';

async function testRSCSearch() {
    const keyword = 'luka dan bara';
    console.log(`[TEST] RSC Searching for: ${keyword}`);
    
    try {
        const url = `https://vidrama.asia/search?q=${encodeURIComponent(keyword)}&provider=meloshort`;
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
        console.log(`[TEST] Data Length: ${content.length}`);
        
        let found = false;
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
                    console.log(`-> ${match[2]}`);
                    found = true;
                }
            }
        }
        
        if (!found) {
            console.log("Not found any standard RSC items.");
            console.log(content.substring(0, 1000));
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

testRSCSearch();
