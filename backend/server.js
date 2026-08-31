import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support large imports
app.use(express.urlencoded({ extended: true }));

async function mountApiRoutes() {
  const apiDir = path.join(__dirname, 'api');

  if (!fs.existsSync(apiDir)) {
    console.warn('/api directory not found');
    return;
  }

  const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.js') && !f.startsWith('_') && !f.startsWith('db-'));

  for (const file of files) {
    const routeName = path.basename(file, '.js');
    const filePath = path.join(apiDir, file);

    try {
      const module = await import(pathToFileURL(filePath).href);
      if (module.default && typeof module.default === 'function') {
        const routePath = `/api/${routeName}`;
        app.all(routePath, async (req, res) => {
          try {
            await module.default(req, res);
          } catch (error) {
            console.error(`Error in route ${routePath}:`, error);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Internal Server Error' });
            }
          }
        });
        console.log(`Mounted API route: ${routePath}`);
      }
    } catch (err) {
      console.error(`Failed to load route /api/${routeName} from ${file}:`, err);
    }
  }
}

mountApiRoutes().then(() => {
  // Public short URL shortcuts (Must be mounted BEFORE static SPA fallback)
  app.get('/t/sdk.js', async (req, res) => {
    try {
      const module = await import(pathToFileURL(path.join(__dirname, 'api', 'lead-url-sdk.js')).href);
      return module.default(req, res);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/t/:tracking_token', async (req, res) => {
    try {
      const module = await import(pathToFileURL(path.join(__dirname, 'api', 't.js')).href);
      return module.default(req, res);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve static frontend files if dist directory exists
  const distDir = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
    console.log(`Mounted static frontend from ${distDir}`);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Backend API Server running at http://localhost:${PORT}`);
    console.log(`Ensure reverse proxy forwards /t/* and /api/* to this port.\n`);
  });
});
