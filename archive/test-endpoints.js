import DramaboxServiceSimple from './src/services/DramaboxServiceSimple.js';

console.log('='.repeat(50));
console.log('TESTING DRAMABOX API ENDPOINTS');
console.log('='.repeat(50));
console.log('');

async function testEndpoints() {
    // Test 1: ForYou
    console.log('[TEST 1] /foryou endpoint...');
    const foryou = await DramaboxServiceSimple.getForYou();
    console.log(`✓ ForYou: ${Array.isArray(foryou) ? foryou.length : 0} items`);
    if (foryou && foryou[0]) {
        console.log(`  Sample bookId: ${foryou[0].bookId}`);
        console.log(`  Sample title: ${foryou[0].bookName}`);
    }
    console.log('');

    // Test 2: Latest  
    console.log('[TEST 2] /latest endpoint...');
    const latest = await DramaboxServiceSimple.getLatest();
    console.log(`✓ Latest: ${Array.isArray(latest) ? latest.length : 0} items`);
    console.log('');

    // Test 3: Trending
    console.log('[TEST 3] /trending endpoint...');
    const trending = await DramaboxServiceSimple.getTrending();
    console.log(`✓ Trending: ${Array.isArray(trending) ? trending.length : 0} items`);
    console.log('');

    // Test 4: DubIndo
    console.log('[TEST 4] /dubindo endpoint...');
    const dubindo = await DramaboxServiceSimple.getDubIndo();
    console.log(`✓ DubIndo: ${Array.isArray(dubindo) ? dubindo.length : 0} items`);
    console.log('');

    // Get sample bookId for detail test
    const sampleBookId = foryou && foryou[0] ? foryou[0].bookId : null;

    if (sampleBookId) {
        // Test 5: Detail
        console.log(`[TEST 5] /detail/${sampleBookId} endpoint...`);
        const detail = await DramaboxServiceSimple.getDetail(sampleBookId);
        console.log(`✓ Detail: ${detail ? 'SUCCESS' : 'FAILED'}`);
        if (detail) {
            console.log(`  Data keys: ${Object.keys(detail).join(', ')}`);
        }
        console.log('');

        // Test 6: Episodes
        console.log(`[TEST 6] /allepisode/${sampleBookId} endpoint...`);
        const episodes = await DramaboxServiceSimple.getAllEpisodes(sampleBookId);
        console.log(`✓ Episodes: ${episodes ? 'SUCCESS' : 'FAILED'}`);
        if (episodes) {
            if (Array.isArray(episodes)) {
                console.log(`  Episodes count: ${episodes.length}`);
                if (episodes[0]) {
                    console.log(`  Sample episode keys: ${Object.keys(episodes[0]).join(', ')}`);
                }
            } else {
                console.log(`  Response type: ${typeof episodes}`);
                console.log(`  Response keys: ${Object.keys(episodes).join(', ')}`);
            }
        }
        console.log('');
    }

    console.log('='.repeat(50));
    console.log('TEST COMPLETE');
    console.log('='.repeat(50));
}

testEndpoints().catch(console.error);
