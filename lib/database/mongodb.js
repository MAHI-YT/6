// ═══════════════════════════════════════════════════════════
// 🗄️ MONGODB CONNECTION HANDLER - DARKZONE-MD
// ═══════════════════════════════════════════════════════════

const mongoose = require('mongoose');

let isConnected = false;

const connectMongoDB = async () => {
    if (isConnected) {
        console.log('[MongoDB] Already connected ✅');
        return true;
    }

    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

    if (!MONGODB_URI) {
        console.log('[MongoDB] No MONGODB_URI provided - Using local JSON storage');
        return false;
    }

    try {
        mongoose.set('strictQuery', false);
        
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        console.log('[MongoDB] Connected successfully ✅');
        
        mongoose.connection.on('error', (err) => {
            console.error('[MongoDB] Connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('[MongoDB] Disconnected');
            isConnected = false;
        });

        return true;
    } catch (error) {
        console.error('[MongoDB] Connection failed:', error.message);
        return false;
    }
};

const isMongoConnected = () => isConnected;

module.exports = {
    connectMongoDB,
    isMongoConnected,
    mongoose
};
