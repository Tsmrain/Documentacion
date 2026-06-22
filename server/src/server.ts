import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sessionRoutes from './routes/sessionRoutes';
import ragRoutes from './routes/ragRoutes';
import profileRoutes from './routes/profileRoutes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/session', sessionRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/profile', profileRoutes);

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
