import reelShortService from './src/services/ReelShortService.js';

console.log('='.repeat(60));
console.log('TESTING REELSHORT API');
console.log('='.repeat(60));
console.log('');

async function testReelShort() {
    // Test 1: Homepage
    console.log('[TEST 1] Homepage...');
    const home = await reelShortService.getHome();
    console.log(`✓ Homepage: ${home ? 'SUCCESS' : 'FAILED'}`);
    if (home) {
        console.log(`  Data keys: ${Object.keys(home).join(', ')}`);

        // Debug: Log structure of ALL lists
        if (home.lists && home.lists.length > 0) {
            console.log(`  List count: ${home.lists.length}`);
            home.lists.forEach((list, index) => {
                console.log(`  List [${index}] keys:`, Object.keys(list).join(', '));
                if (list.books) {
                    console.log(`    Has books: ${list.books.length}`);
                    if (list.books.length > 0) console.log('    First book keys:', Object.keys(list.books[0]).join(', '));
                }
            });
        }

        // Try to get a sample bookId
        let sampleBookId = null;

        // Traverse lists to find items
        if (home.lists && Array.isArray(home.lists)) {
            // Priority: Check books list first
            for (const list of home.lists) {
                if (list.books && Array.isArray(list.books) && list.books.length > 0) {
                    const item = list.books[0];
                    const id = item.book_id || item.bookId || item.id;
                    if (id) {
                        sampleBookId = id;
                        console.log(`  Found bookId in list (books): ${sampleBookId}`);
                        console.log(`  Book Title: ${item.book_title || item.title}`);
                        break;
                    }
                }
            }

            // Fallback: Check banners
            if (!sampleBookId) {
                for (const list of home.lists) {
                    if (list.banners && Array.isArray(list.banners) && list.banners.length > 0) {
                        const item = list.banners[0];
                        if (item.jump_param) {
                            try {
                                const param = typeof item.jump_param === 'string' ? JSON.parse(item.jump_param) : item.jump_param;
                                if (param.book_id) {
                                    sampleBookId = param.book_id;
                                    console.log(`  Found bookId in list (banners jump_param): ${sampleBookId}`);
                                    break;
                                }
                            } catch (e) { }
                        }
                    }
                }
            }
        }

        console.log(`  Sample bookId: ${sampleBookId || 'NONE'}`);
        console.log('');

        if (sampleBookId) {
            // Test 2: Detail
            console.log(`[TEST 2] Detail for ${sampleBookId}...`);
            const detail = await reelShortService.getDetail(sampleBookId);
            console.log(`✓ Detail: ${detail ? 'SUCCESS' : 'FAILED'}`);
            if (detail) {
                console.log(`  Title: ${detail.title || detail.bookName || 'N/A'}`);
            }
            console.log('');

            // Test 3: Watch/Episodes
            console.log(`[TEST 3] Watch/Episodes for ${sampleBookId}...`);
            const watch = await reelShortService.watch(sampleBookId);
            console.log(`✓ Watch: ${watch ? 'SUCCESS' : 'FAILED'}`);
            if (watch) {
                console.log(`  Data keys: ${Object.keys(watch).join(', ')}`);
                if (watch.episodes) {
                    console.log(`  Episodes count: ${watch.episodes.length}`);
                    if (watch.episodes[0]) {
                        console.log(`  First episode unlocked: ${watch.episodes[0].unlock}`);
                        // Check for video URL
                        const ep = watch.episodes[0];
                        const hasVideoUrl = ep.videoUrl || ep.videoPath || ep.url ||
                            (ep.cdnList && ep.cdnList[0]?.videoPathList);
                        console.log(`  Video URL available: ${hasVideoUrl ? 'YES' : 'NO'}`);
                    }
                }
            }
            console.log('');
        }
    }

    console.log('='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
}

testReelShort().catch(console.error);
