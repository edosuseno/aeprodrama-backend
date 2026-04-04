import shortmaxService from './src/services/ShortmaxService.js';

async function huntKey() {
    console.log(`[1] Meminta Data Episode Mentah (Raw JSON) dari Sansekai 🕵️‍♂️...\n`);
    
    // Kita gunakan ID Drama & Episode yang tadi berhasil
    const targetId = '18449'; // "Mencintai Orang Yang Benar"
    const episodeNum = 1;

    try {
        const rawRes = await shortmaxService._pureRequest(`${shortmaxService.baseUrl}/episode`, { 
            shortPlayId: targetId, 
            episodeNumber: episodeNum 
        });

        console.log(`✅ BERHASIL MENDAPATKAN BLUEPRINT EPISODE!\n`);
        
        console.log(`--- ISI LENGKAP RAW DATA DARI SANSEKAI ---`);
        console.log(JSON.stringify(rawRes, null, 2));
        console.log(`------------------------------------------\n`);

        if (JSON.stringify(rawRes).toLowerCase().includes('key') || JSON.stringify(rawRes).toLowerCase().includes('token')) {
            console.log(`🎉 ADA KUNCI! Sistem mengantongi string "key" atau "token", kita bisa meretas kembali M3U8 nya!`);
        } else {
            console.log(`❌ ZONK! Data sangat minim, kita harus meretas proxy ini dari jalur M3U8 Master Shortmax secara mandiri.`);
        }

    } catch (e) {
        console.error(`Gagal menghubungkan: ${e.message}`);
    }
}

huntKey().then(() => process.exit(0));
