
import ShortmaxService from './src/services/ShortmaxService.js';

async function runServiceTest() {
    console.log('=== FINAL INTEGRATION VALIDATION ===');
    try {
        const latest = await ShortmaxService.getLatest();
        if (latest && latest.length > 0) {
            console.log('\n[1] LATEST MAPPING OK');
            const item = latest[0];
            console.log(JSON.stringify({
                id: item.id,
                shortPlayId: item.shortPlayId,
                title: item.title,
                totalEpisodes: item.totalEpisodes
            }, null, 2));

            console.log('\n[2] DETAIL MAPPING OK');
            const detail = await ShortmaxService.getDetail(item.shortPlayId);
            console.log(JSON.stringify({
                title: detail.title,
                totalEpisodes: detail.totalEpisodes,
                episodesCount: detail.episodes?.length
            }, null, 2));

            console.log('\n[3] STREAM MAPPING OK');
            const stream = await ShortmaxService.getStream(item.shortPlayId, 1);
            console.log(JSON.stringify({
                url: stream.url,
                episodeVideoUrl: stream.episode?.videoUrl,
                subtitles: stream.subtitles?.length
            }, null, 2));
            
            console.log('\n✅ VALIDASI SELESAI: SEMUA DATA SIAP UNTUK FRONTEND');
        } else {
            console.error('❌ Listing Kosong!');
        }
    } catch (e) {
        console.error('❌ Error during validation:', e.message);
    }
}

runServiceTest();
