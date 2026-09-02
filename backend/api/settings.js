import { supabase } from './_lib.js';
import { requirePermission } from './_permissions.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      await requirePermission(req, res, 'masters.view');
      if (res.headersSent) return;

      const { data, error } = await supabase
        .from('dt_settings')
        .select('*');

      if (error) throw error;
      
      const settings = (data || []).reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});

      return res.status(200).json(settings);
    } 
    else if (req.method === 'PUT') {
      await requirePermission(req, res, 'masters.edit'); // Only admins/authorized can edit
      if (res.headersSent) return;

      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'Key is required' });

      // Upsert the setting
      const { data, error } = await supabase
        .from('dt_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } 
    else {
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Settings API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
}
