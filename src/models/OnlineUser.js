import mongoose from 'mongoose';

const onlineUserSchema = new mongoose.Schema({
    // Store unique signature (IP or Session)
    signature: { type: String, required: true, unique: true },
    lastSeen: { type: Date, default: Date.now, index: { expires: '10m' } } // Auto-delete in 10 minutes
});

export default mongoose.model('OnlineUser', onlineUserSchema);
