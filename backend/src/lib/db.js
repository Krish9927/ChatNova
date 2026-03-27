import mongoose from 'mongoose';

export const connectDB = async () => {                 
    try {
        const MONGO_URI = process.env.MONGO_URI;
        if (!MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        const uri = process.env.MONGO_URI;
        // Extract db name from mongodb URI like: mongodb+srv://user:pass@host/<db>?...
        const dbName = uri?.match(/\/([^\/\?]+)(?:\?|$)/)?.[1];
        console.log('[db] Connecting to MongoDB database:', dbName);

        const conn = await mongoose.connect(uri);
        console.log('Mongodb Connected', conn.connection.host);
        
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};