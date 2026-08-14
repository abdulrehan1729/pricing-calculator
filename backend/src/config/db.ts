import mongoose from 'mongoose'
import { logger } from '../utils/logger';


export async function connectDB():Promise<void> {
    // Use a local MongoDB instance for development when no hosted URI is set.
    const uri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/pricing_calculator';
    try {
        logger.info('Connecting to MongoDB');
        await mongoose.connect(uri);
        logger.info('MongoDB connected');
    } catch (error) {
        logger.error('MongoDB connection failed', { error });
        throw error;
    }
}
