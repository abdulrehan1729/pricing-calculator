import mongoose from 'mongoose'
import { logger } from '../utils/logger';


export async function connectDB():Promise<void> {
    const uri = process.env.MONGO_URI;

    if(!uri){
        throw new Error('MongoDB uri is not found!!')
    }
    try {
        logger.info('Connecting to MongoDB');
        await mongoose.connect(uri);
        logger.info('MongoDB connected');
    } catch (error) {
        logger.error('MongoDB connection failed', { error });
        throw error;
    }
}
