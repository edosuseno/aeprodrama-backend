import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async (dbUrl) => {
    try {
        if (!dbUrl) {
            console.log('⚠️ MongoDB URL not found, skipping database connection.');
            return;
        }

        const conn = await mongoose.connect(dbUrl, {
            // Opsi modern Mongoose 6+ sudah default, tapi kita pasang kalau perlu
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error connecting to MongoDB: ${error.message}`);
        // Jangan exit process agar backend tetap jalan walau DB down (fallback mode)
    }
};

export default connectDB;
