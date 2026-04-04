
import axios from 'axios';
import shortmaxService from './src/services/ShortmaxService.js';

async function auditShortMaxV2() {
    console.log("--- MEMULAI AUDIT PEMUTARAN SHORTMAX V2 ---\n");

    try {
        // [1] Cari drama acak dari Foryou
        console.log("[1] Mengambil daftar drama terbaru dari Foryou...");
        const foryou = await shortmaxService.getForyou(1);
        const sampleDrama = foryou.data[Math.min(2, foryou.data.length - 1)]; // Ambil drama ke-3 jika ada
        
        if (!sampleDrama) throw new Error("Tidak ada drama ditemukan.");
        console.log(`Drama Terpilih: ${sampleDrama.title} (ID: ${sampleDrama.shortPlayId})`);

        // [2] Ambil Episode 1
        console.log(`[2] Mengambil URL video Episode 1...`);
        const episodeInfo = await shortmaxService.getEpisode(sampleDrama.shortPlayId, 1);
        const m3u8Url = episodeInfo?.episode?.videoUrl;
        
        if (!m3u8Url) throw new Error("Gagal mendapatkan URL Manifest (m3u8).");
        console.log(`URL Manifest Asli: ${m3u8Url.split('?')[0]}`);

        // [3] Simulasi Header Android Terbaru
        const spoofedUA = 'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 ShortMax/1.6.0';
        const headers = {
            'Host': new URL(m3u8Url).host,
            'User-Agent': spoofedUA,
            'Referer': 'https://h5.shortmax.com/',
            'X-Requested-With': 'com.shortmax.video',
            'Accept-Encoding': 'identity'
        };

        // [4] Tes Ambil Manifest
        console.log(`[3] Mengambil Manifest melalu proxy (Simulasi)...`);
        const resM3u8 = await axios.get(m3u8Url, { headers });
        console.log(`Status Manifest: ${resM3u8.status}`);
        
        const m3u8Lines = resM3u8.data.split('\n');
        let firstTs = "";
        for (let line of m3u8Lines) {
            if (line.trim() && !line.startsWith('#')) {
                firstTs = line.trim();
                break;
            }
        }

        if (!firstTs) throw new Error("Tidak ada segmen TS dalam manifest.");
        console.log(`Potongan segmen pertama: ${firstTs}`);

        // [5] Tes Ambil Segmen TS
        const urlObj = new URL(m3u8Url);
        const baseUrl = urlObj.origin + urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
        const tsFullUrl = new URL(firstTs, baseUrl).toString().split('?')[0] + '?' + urlObj.searchParams.toString();

        console.log(`\n[4] Menguji pemmbersihan SAMPAH di segmen: ${tsFullUrl.split('?')[0].substring(0, 50)}...`);
        const resTs = await axios.get(tsFullUrl, { 
            headers, 
            responseType: 'arraybuffer' 
        });

        console.log(`Ukuran Mentah dari Shortmax: ${resTs.data.byteLength} bytes`);
        const buffer = Buffer.from(resTs.data);

        // LOGIKA BARU: maxSearch 50,000
        let startOffset = -1;
        const maxSearch = Math.min(buffer.length - 376, 50000);
        for (let i = 0; i < maxSearch; i++) {
            if (buffer[i] === 0x47 && buffer[i + 188] === 0x47 && buffer[i + 376] === 0x47) {
                startOffset = i;
                break;
            }
        }

        console.log(`Hasil Pencarian Sync Byte (0x47): Offset ${startOffset}`);

        if (startOffset !== -1) {
            const clean = buffer.subarray(startOffset);
            console.log(`✅ BERHASIL: Sync Byte ditemukan!`);
            console.log(`Header Bersih (HEX pertama 8 byte): ${clean.slice(0, 8).toString('hex')}`);
            if (clean[0] === 0x47) {
                console.log("🚀 KONFIRMASI: Video valid dan siap diputar di browser!");
            }
        } else {
            console.log(`🚨 GAGAL: Tidak menemukan sync byte MPEG-TS di 50KB pertama!`);
            console.log(`Isi header 32 byte pertama (HEX): ${buffer.slice(0, 32).toString('hex')}`);
        }

    } catch (e) {
        console.error(`ERROR AUDIT: ${e.message}`);
        if (e.response) {
             console.error(`Status Server Asal: ${e.response.status}`);
        }
    }
}

auditShortMaxV2();
