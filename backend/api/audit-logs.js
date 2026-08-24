import { supabase, preflight, fail } from './_lib.js';
import { requirePermission } from './_permissions.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, req.query?.export ? 'audit_logs.export' : 'audit_logs.view');
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const {
        page = 1,
        pageSize = 20,
        search,
        user_id,
        action,
        module,
        status,
        entity_id,
        start_date,
        end_date,
        export: isExport
      } = req.query;

      let q = supabase.from('audit_logs').select('*', { count: 'exact' });

      // Apply filters
      if (user_id) q = q.eq('user_id', user_id);
      if (action) q = q.eq('action', action);
      if (module) q = q.eq('module', module);
      if (status) q = q.eq('status', status);
      if (entity_id) q = q.eq('entity_id', entity_id);
      if (start_date) q = q.gte('created_at', new Date(start_date).toISOString());
      if (end_date) q = q.lte('created_at', new Date(end_date).toISOString());

      if (search) {
        q = q.or(`username.ilike.%${search}%,user_email.ilike.%${search}%,description.ilike.%${search}%,entity.ilike.%${search}%`);
      }

      // Handle export
      if (isExport) {
        const { data, error } = await q.order('created_at', { ascending: false }).limit(5000); // max 5k rows for CSV to prevent memory issues
        if (error) throw error;
        
        const { logAudit } = await import('./_audit.js');
        await logAudit({ req, user, action: 'EXPORT', module: 'Audit Logs', description: `Exported ${data.length} audit logs` });

        // Generate CSV
        const headers = ['Date', 'Time', 'Username', 'Email', 'Role', 'Action', 'Module', 'Entity', 'Entity ID', 'Status', 'IP Address', 'Description'];
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
          const [datePart, timePart] = (row.created_at || '').split('T');
          const timeVal = timePart ? timePart.split('.')[0] + (timePart.endsWith('Z') || timePart.includes('+') ? '' : 'Z') : '';
          
          let formattedDate = datePart;
          if (datePart && datePart.includes('-')) {
            const [yyyy, mm, dd] = datePart.split('-');
            formattedDate = `${dd}-${mm}-${yyyy.slice(-2)}`;
          }
          
          csvRows.push([
            formattedDate,
            timeVal,
            `"${(row.username || '').replace(/"/g, '""')}"`,
            `"${(row.user_email || '').replace(/"/g, '""')}"`,
            `"${(row.user_role || '').replace(/"/g, '""')}"`,
            row.action,
            row.module,
            row.entity || '',
            row.entity_id || '',
            row.status,
            row.ip_address || '',
            `"${(row.description || '').replace(/"/g, '""')}"`
          ].join(','));
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
        return res.status(200).send(csvRows.join('\n'));
      }

      // Handle pagination
      const p = Math.max(1, parseInt(page, 10));
      const size = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
      const from = (p - 1) * size;
      const to = from + size - 1;

      const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to);
      
      if (error) throw error;

      return res.status(200).json({
        data,
        meta: {
          total: count,
          page: p,
          pageSize: size,
          totalPages: Math.ceil(count / size)
        }
      });
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
