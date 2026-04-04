
import axios from 'axios';

async function finalVeloloTest() {
    const rawSubUrl = "https://res.velolo.tv/indonesiaPlay/2038555063199985666/%E6%99%9A%E9%A3%8E%E8%BF%87%E5%A4%84%E6%95%A3%E6%89%BF%E8%AF%BAsrt/1.id.srt";
    
    // Test 1: Menggunakan Referer Melolo
    console.log('--- TEST 1: REFERER MELOLO ---');
    try {
        const res1 = await axios.get(rawSubUrl, {
            headers: { 'Referer': 'https://www.melolo.vip/', 'User-Agent': 'Mozilla/5.0' }
        });
        console.log(`Status 1: ${res1.status}, Length: ${res1.data.length}`);
        if(res1.data.includes('1')) console.log('✅ Berhasil ambil Konten SRT');
    } catch (e) {
        console.log(`❌ Gagal Link Melolo: ${e.message}`);
    }

    // Test 2: Menggunakan Referer Vidrama
    console.log('\n--- TEST 2: REFERER VIDRAMA ---');
    try {
        const res2 = await axios.get(rawSubUrl, {
            headers: { 'Referer': 'https://www.vidrama.asia/', 'User-Agent': 'Mozilla/5.0' }
        });
        console.log(`Status 2: ${res2.status}, Length: ${res2.data.length}`);
        if(res2.data.includes('1')) console.log('✅ Berhasil ambil Konten SRT dengan Vidrama');
    } catch (e) {
        console.log(`❌ Gagal Link Vidrama: ${e.message}`);
    }
}

finalVeloloTest();
