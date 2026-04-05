import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testMovieBox() {
    const apiKey = process.env.TMDB_API_KEY || '6e4753bae68fd1cc02a3ced27fabebd2';
    console.log(`[TEST] Using TMDB API Key: ${apiKey}`);
    
    try {
        const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&language=en-US`;
        const res = await axios.get(url);
        
        console.log(`[TEST] Status: ${res.status}`);
        console.log(`[TEST] Results count: ${res.data?.results?.length || 0}`);
        
        if (res.data?.results && res.data.results.length > 0) {
            res.data.results.slice(0, 3).forEach((m, i) => {
                console.log(`[${i+1}] ID: ${m.id} | Title: ${m.title}`);
            });
        }
    } catch (e) {
        console.error('[TEST] Error:', e.response?.data || e.message);
    }
}

testMovieBox();
