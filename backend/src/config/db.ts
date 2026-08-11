import mongoose from 'mongoose'


export async function connectDB():Promise<void> {
    const uri = process.env.MONGO_URI;

    if(!uri){
        throw new Error('MongoDB uri is not found!!')
    }
    try {
        console.log('connecting Database...')
        await mongoose.connect(uri);
        console.log('Mongo DB Connected.')
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
        
    }
}