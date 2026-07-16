import express from 'express';
import cors from 'cors';
import { router } from './routes.js';
import { syncSongs } from './sync.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

const PORT = process.env.PORT || 3001;

async function startServer() {
  if (!process.env.ADMIN_API_KEY) {
    console.warn("WARNING: ADMIN_API_KEY is not set. Admin panel access will be blocked!");
  }
  
  try {
    // Sync song database on startup
    await syncSongs();
  } catch (err) {
    console.error("Failed to sync songs on startup:", err);
    // Don't crash, we might have songs in DB already
  }

  app.listen(PORT, () => {
    console.log(`ChuniTrrracker API server running on port ${PORT}`);
  });
}

startServer();
