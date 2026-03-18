const mongoose = require('mongoose');
const { isSupabaseEnabled } = require('./supabase');

const connectDB = async () => {
    // Debug log to confirm function is running
    console.log('Attempting to connect to database...');
    console.log(`Supabase Enabled: ${isSupabaseEnabled()}`);
    console.log(`Mongo URI: ${process.env.MONGO_URI}`);

    if (isSupabaseEnabled()) {
        console.log('USE_SUPABASE=true, skipping MongoDB connection.');
        return;
    }

    try {
        // Use 127.0.0.1 to avoid IPv6 issues with 'localhost'
        const uri = process.env.MONGO_URI.replace('localhost', '127.0.0.1'); 
        const conn = await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // Fail faster if no mongo
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        if (process.env.ALLOW_DEV_GOOGLE_BYPASS === 'true') {
            console.warn('MongoDB unavailable. Continuing in development bypass mode.');
            return;
        }
        process.exit(1);
    }
};

module.exports = connectDB;
