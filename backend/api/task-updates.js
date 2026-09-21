import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission } from './_permissions.js';
import { employeeMap } from './_join.js';
import { logAudit } from './_audit.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, req.method === 'GET' ? 'tasks.view' : 'tasks.edit');
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { task_id } = req.query || {};
      if (!task_id) return fail(res, 400, 'task_id is required');

      const [{ data, error }, emps] = await Promise.all([
        supabase
          .from('dt_task_updates')
          .select('*')
          .eq('task_id', task_id)
          .order('created_at', { ascending: false }),
        employeeMap()
      ]);

      if (error) throw error;
      const enriched = (data || []).map(u => ({
        ...u,
        employee: u.employee_id ? emps[u.employee_id] || null : null
      }));

      return res.status(200).json(enriched);
    }

    if (req.method === 'POST') {
      const { task_id, update_note, status_to } = req.body || {};
      if (!task_id) return fail(res, 400, 'task_id is required');
      if (!update_note || !update_note.trim()) return fail(res, 400, 'Work update note is required');

      const { data: task, error: taskErr } = await supabase
        .from('dt_tasks')
        .select('*')
        .eq('id', task_id)
        .is('deleted_at', null)
        .single();

      if (taskErr || !task) return fail(res, 404, 'Task not found');

      const statusFrom = task.status;
      const nextStatus = status_to || statusFrom;

      // Create update entry
      const { data: updateData, error: updateErr } = await supabase
        .from('dt_task_updates')
        .insert([{
          task_id,
          employee_id: user.employee_id || null,
          update_note: update_note.trim(),
          status_from: statusFrom,
          status_to: nextStatus
        }])
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Update task status if changed
      if (nextStatus !== statusFrom) {
        const patch = {
          status: nextStatus,
          updated_at: new Date().toISOString()
        };
        if (nextStatus === 'completed') patch.completed_at = new Date().toISOString();
        else patch.completed_at = null;

        await supabase.from('dt_tasks').update(patch).eq('id', task_id);
      }

      await logAudit({ req, user, action: 'UPDATE', module: 'Tasks', entity: 'TaskUpdate', entityId: updateData.id, description: `Added work update to task ${task.task_no || task.id}` });
      return res.status(201).json(updateData);
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    const isValidation = /required|valid|must|too long/i.test(err.message || '');
    return fail(res, isValidation ? 400 : 500, err.message);
  }
}
