import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';
import storageService from '../services/storage/storage-service.js';
import { requireAuth, cors, preflight } from './_lib.js';

// Controlled temporary storage directory for incoming upload streams
const tempUploadDir = path.join(os.tmpdir(), 'crm-upload-temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(tempUploadDir)) {
      fs.mkdirSync(tempUploadDir, { recursive: true });
    }
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `stream-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// Multer configured with zero artificial application-level file size limit cap
const upload = multer({
  storage: diskStorage,
  fileFilter: (req, file, cb) => {
    if (!file || !file.originalname) {
      return cb(new Error('Invalid file payload provided.'));
    }
    cb(null, true);
  },
}).single('image');

export default async function handler(req, res) {
  if (preflight(req, res)) return;

  // Enforce CRM User Authentication
  const user = await requireAuth(req, res);
  if (!user) return; // requireAuth sends 401 response if user is unauthenticated

  if (req.method === 'DELETE') {
    try {
      const { urls } = req.body || {};
      if (!urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'Missing or invalid urls array' });
      }

      if (urls.length === 0) {
        return res.status(200).json({ success: true, message: 'No valid filenames to delete' });
      }

      const deleted = await storageService.deleteMany(urls);
      return res.status(200).json({ success: true, deleted });
    } catch (err) {
      console.error('Delete handler error:', err);
      return res.status(500).json({ error: 'Failed to delete files from storage' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return new Promise((resolve) => {
    upload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: err.message });
        return resolve();
      } else if (err) {
        res.status(400).json({ error: err.message });
        return resolve();
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return resolve();
      }

      const tempFilePath = req.file.path;

      try {
        const folder = req.body?.folder || 'campaigns';
        const result = await storageService.upload({
          filePath: tempFilePath,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          folder,
        });

        res.status(200).json({
          url: result.url,
          filename: result.filename,
          size: result.size,
          mimeType: result.mimeType,
        });
      } catch (uploadErr) {
        console.error('Upload handler error:', uploadErr);
        res.status(500).json({ error: uploadErr.message || 'Failed to upload file to storage' });
      } finally {
        // GUARANTEED CLEANUP: Always remove temporary file from local disk immediately after completion or failure
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.promises.unlink(tempFilePath).catch((unlinkErr) => {
            console.error('Error cleaning up temp file:', tempFilePath, unlinkErr);
          });
        }
        resolve();
      }
    });
  });
}
