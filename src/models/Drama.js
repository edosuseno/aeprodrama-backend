import mongoose from 'mongoose';

const DramaSchema = new mongoose.Schema({
    bookId: { type: String, required: true, unique: true, index: true },
    bookName: { type: String, required: true },
    cover: String,
    introduction: String,
    category: [String],
    chapterCount: Number,

    // Metadata Tambahan
    cpName: String, // Provider (Dramabox/Reelshort)
    isFinished: Boolean,

    // Data Episode Lengkap (Disimpan di sini!)
    episodes: [{
        chapterId: String,
        title: String,
        videoUrl: String, // Harta Karun Utama (M3U8)
        duration: String,
        isUnlocked: Boolean,
        cdnList: mongoose.Schema.Types.Mixed // Struktur CDN detail
    }],

    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Drama', DramaSchema);
