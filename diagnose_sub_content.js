import axios from 'axios';
import fs from 'fs';

async function diagnoseSubtitleProxy() {
    console.log("=== DIAGNOSA OUTPUT PROXY SUBTITLE ===");

    const testUrls = [
        {
            name: "DramaWave (SRT)",
            url: "https://video-v6.mydramawave.com/vt/18267/231538ce-5eec-4f81-9056-933881b8c2ae.srt"
        },
        {
            name: "Velolo (SRT)",
            url: "https://res.velolo.tv/indonesiaPlay/2038555063199985666/晚风过处散承诺srt/1.id.srt"
        }
    ];

    for (const test of testUrls) {
        console.log(`\nTesting: ${test.name}`);
        try {
            // Kita simulasikan apa yang dilakukan oleh /api/proxy di backend/src/index.js
            const response = await axios.get(test.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
                    'Referer': test.url.includes('mydramawave') ? 'https://www.mydramawave.com/' : 'https://vidrama.asia/'
                },
                timeout: 10000
            });

            let content = response.data;
            console.log(`> Raw Content Type: ${response.headers['content-type']}`);
            console.log(`> Raw Content Length: ${content.length} chars`);

            // --- Simulasi Logika Backend Index.js ---
            content = content.replace(/^\ufeff/, '').trim();
            let vttContent = content;
            if (!content.startsWith('WEBVTT')) {
                vttContent = 'WEBVTT\n\n' + content;
            }
            vttContent = vttContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
            // ----------------------------------------

            console.log("> Preview 5 baris pertama hasil konversi:");
            console.log("----------------------------------------");
            console.log(vttContent.split('\n').slice(0, 5).join('\n'));
            console.log("----------------------------------------");

            // Cek apakah ada karakter aneh atau format yang merusak VTT
            if (vttContent.includes('WEBVTT') && vttContent.includes('-->')) {
                console.log("✅ STRUKTUR VTT TAMPAK VALID");
            } else {
                console.log("❌ STRUKTUR VTT TIDAK VALID (Mungkin bukan SRT asli)");
            }

        } catch (e) {
            console.error(`🔴 Gagal mengambil subtitle: ${e.message}`);
        }
    }
}

diagnoseSubtitleProxy();
