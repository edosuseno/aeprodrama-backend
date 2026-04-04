
import shortmaxService from './src/services/ShortmaxService.js';

async function getSampleData() {
    try {
        console.log("Mengambil data Foryou untuk mendapatkan ID drama...");
        const foryou = await shortmaxService.getForyou(1);
        const firstDrama = foryou.data[0];
        
        if (!firstDrama) {
            console.log("Tidak ada drama ditemukan di Foryou.");
            return;
        }
        
        console.log(`Drama: ${firstDrama.title} (${firstDrama.shortPlayId})`);
        
        console.log("Mengambil Episode 1...");
        const episode = await shortmaxService.getEpisode(firstDrama.shortPlayId, 1);
        
        if (!episode || !episode.episode.videoUrl) {
            console.log("Gagal mendapatkan URL video episode 1.");
            return;
        }
        
        console.log(`URL Video: ${episode.episode.videoUrl}`);
        console.log(`JSON Lengkap: ${JSON.stringify(episode, null, 2)}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

getSampleData();
