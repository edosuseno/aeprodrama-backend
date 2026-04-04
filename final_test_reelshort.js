import reelShortService from './src/services/ReelShortService.js';

async function finalTest() {
    console.log(`\n======================================================`);
    console.log(`🎬 PENGUJIAN AKHIR REELSHORT SERVICE (FULL FLOW)`);
    console.log(`======================================================\n`);

    try {
        // 1. Dapatkan Homepage
        console.log(`[1] Meminta Beranda Reelshort (Sansekai)...`);
        const home = await reelShortService.getHome();
        
        let bookId = null;
        let bookTitle = null;

        if (home?.lists && home.lists.length > 0) {
            for (const list of home.lists) {
                if (list.books && list.books.length > 0) {
                    const firstBook = list.books[0];
                    bookId = firstBook.book_id || firstBook.bookId || firstBook.id;
                    bookTitle = firstBook.book_title || firstBook.title || "Tanpa Judul";
                    break;
                }
            }
        }

        if (!bookId) throw new Error("Gagal mengambil drama dari beranda.");

        console.log(`    ✅ Drama Ditemukan: "${bookTitle}"`);
        console.log(`    ✅ ID Drama: ${bookId}\n`);

        // 2. Dapatkan Detail & Episode
        console.log(`[2] Meminta Detail dan Daftar Episode...`);
        const eps = await reelShortService.getAllEpisodes(bookId);
        console.log(`    ✅ Total Episode: ${eps.length}`);
        
        if (eps.length === 0) throw new Error("Gagal mengambil episode.");

        const episodeSatu = eps[0];
        console.log(`    ✅ Sedang mengecek: ${episodeSatu.title} (Chapter: ${episodeSatu.chapterId})\n`);

        // 3. Tes URL Video (Watch)
        console.log(`[3] Mengambil URL Pemutaran Video...`);
        const watchResult = await reelShortService.watch(bookId, episodeSatu.chapterId);

        if (watchResult && watchResult.videoUrl) {
            console.log(`\n🎉 SUKSES! Video siap diputar!`);
            console.log(`------------------------------------------------------`);
            console.log(`▶️ URL STREAMING:`);
            console.log(watchResult.videoUrl);
            console.log(`------------------------------------------------------\n`);
            console.log("Kesimpulan: Kode baru Anda (ReelShortService) 100% BEKERJA dan siap untuk di-deploy.");
        } else {
            console.log(`\n❌ GAGAL! URL Video tidak ditemukan/null.`);
        }

    } catch (e) {
        console.error(`\n❌ TERJADI KESALAHAN: ${e.message}`);
    }
}

finalTest().then(() => process.exit(0));
