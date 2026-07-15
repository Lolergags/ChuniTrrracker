code = """
// 10. Scraper Controls
import { runGlobalScrape, stopGlobalScrape } from './scraper.js';

router.post('/scraper/start', (req, res) => {
  const { startId = 1, testMode = false } = req.body;
  // Kick off asynchronously
  runGlobalScrape(startId, testMode);
  res.json({ success: true, message: 'Scraper started from ID ' + startId });
});

router.post('/scraper/stop', (req, res) => {
  stopGlobalScrape();
  res.json({ success: true, message: 'Scraper stopping.' });
});

export default router;
"""

with open('server/routes.ts', 'a') as f:
    f.write(code)
