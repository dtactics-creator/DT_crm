import multer from 'multer';
import path from 'path';
import supabase from './db-client.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed!'));
  }
}).single('image');

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      const { urls } = req.body;
      if (!urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'Missing or invalid urls array' });
      }

      const filenames = urls.map(url => {
        // Handle full Supabase URLs and extract the filename.
        // e.g. "https://xxxx.supabase.co/storage/v1/object/public/campaigns/12345.jpg"
        const parts = url.split('/');
        return parts[parts.length - 1];
      }).filter(Boolean);

      if (filenames.length === 0) {
        return res.status(200).json({ success: true, message: 'No valid filenames to delete' });
      }

      const { data, error } = await supabase.storage
        .from('campaigns')
        .remove(filenames);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      return res.status(200).json({ success: true, deleted: filenames });
    } catch (err) {
      console.error('Delete handler error:', err);
      return res.status(500).json({ error: 'Failed to delete images from storage' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + path.extname(req.file.originalname);

      const { data, error } = await supabase.storage
        .from('campaigns')
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('campaigns')
        .getPublicUrl(filename);

      return res.status(200).json({ url: publicUrlData.publicUrl });
    } catch (uploadErr) {
      return res.status(500).json({ error: 'Failed to upload image to storage' });
    }
  });
}
