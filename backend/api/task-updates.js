import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission } from './_permissions.js';
import { employeeMap } from './_join.js';
import { logAudit } from './_audit.js';
import { fetchTasks, fetchTaskUpdates, insertTaskUpdate, updateTaskRecord } from './_tasks_db.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, req.method === 'GET' ? 'tasks.view' : 'tasks.edit');
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { task_id } = req.query || {};
      if (!task_id) return fail(res, 400, 'task_id is required');

      const [data, emps] = await Promise.all([
        fetchTaskUpdates(task_id),
        employeeMap()
      ]);

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

      const { data: task } = await fetchTasks({ id: task_id });
      if (!task) return fail(res, 404, 'Task not found');

      const statusFrom = task.status;
      const nextStatus = status_to || statusFrom;

      // Create update entry
      const updateData = await insertTaskUpdate({
        task_id,
        employee_id: user.employee_id || null,
        update_note: update_note.trim(),
        status_from: statusFrom,
        status_to: nextStatus
      });

      // Update task status if changed
      if (nextStatus !== statusFrom) {
        const patch = {
          status: nextStatus,
          updated_at: new Date().toISOString()
        };
        if (nextStatus === 'completed') patch.completed_at = new Date().toISOString();
        else patch.completed_at = null;

        await updateTaskRecord(task_id, patch);
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

