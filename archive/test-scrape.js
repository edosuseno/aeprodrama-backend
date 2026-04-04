import axios from 'axios';
import fs from 'fs';

console.log('='.repeat(60));
console.log('DRAMABOX SCRAPING TEST');
console.log('Target: https://www.dramabox.com/videos/42000003970');
console.log('='.repeat(60));

// URL halaman detail yang user biasa buka
const TARGET_URL = 'https://www.dramabox.com/videos/42000003970';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.dramabox.com/'
};

async function scrapePage() {
    try {
        console.log(`Fetching HTML from ${TARGET_URL}...`);
        const res = await axios.get(TARGET_URL, { headers: HEADERS });

        console.log(`✅ Success! Status: ${res.status}`);
        const html = res.data;

        // Save to file for inspection
        fs.writeFileSync('dramabox_dump.html', html);
        console.log('Saved to dramabox_dump.html');

        // Search for Next.js Data
        console.log('\nScanning for __NEXT_DATA__...');
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);

        if (match && match[1]) {
            console.log('🎯 FOUND NEXT_DATA!');
            const json = JSON.parse(match[1]);

            // Inspect content
            if (json.props && json.props.pageProps) {
                const props = json.props.pageProps;
                console.log('Keys in pageProps:', Object.keys(props).join(', '));

                if (props.detail || props.bookInfo) {
                    console.log('✅ DETAIL INFO FOUND!');
                }

                if (props.chapterList || props.episodeList) {
                    console.log('✅ EPISODE LIST FOUND!');
                    const episodes = props.chapterList || props.episodeList;
                    console.log(`Count: ${episodes.length}`);
                    console.log('Sample Episode:', JSON.stringify(episodes[0], null, 2));
                }
            }
        } else {
            console.log('❌ __NEXT_DATA__ not found directly.');

            // Search other patterns
            console.log('Scanning for other JSON patterns...');
            const scriptMatches = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/);
            if (scriptMatches) {
                console.log('🎯 FOUND INITIAL_STATE!');
            }
        }

    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
        if (e.response) {
            console.log(`Status: ${e.response.status}`);
        }
    }
}

scrapePage();
