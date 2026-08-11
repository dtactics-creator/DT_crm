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
      // Import the default exported handler
      const module = await import(pathToFileURL(filePath).href);
      if (module.default && typeof module.default === 'function') {
        const routePath = `/api/${routeName}`;
        // Map all HTTP methods to the same handler, just like Vercel serverless functions
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
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend API Server running at http://localhost:${PORT}`);
    console.log(`Ensure your Vite frontend proxies /api to this port (or connects to it directly).\n`);
  });
});
