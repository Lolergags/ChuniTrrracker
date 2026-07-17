
import express from 'express';
import cors from 'cors';
import { router } from './routes.js';
import { syncSongs } from './sync.js';
import { initScheduler } from './scheduler.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

// Serve frontend in production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

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
    initScheduler();
  });
}

startServer();
