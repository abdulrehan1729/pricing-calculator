import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes'

dotenv.config()
const app = express();
const PORT = process.env.PORT || 4000


app.use(cors());
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', details: null });
});

app.use(errorHandler);

connectDB().then(()=>{
    app.listen(PORT, ()=>{
        console.log(`Server is running on port: ${PORT} for health check go on : http://localhost:4000/health`)
    })
})
